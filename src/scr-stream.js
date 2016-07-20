/**
 * ScreenAniStream
 * PixelStream prototype to convert GIF frames to ZX-Spectrum screen format.
 *
 * Copyright (c) 2016 Martin Bórik <mborik@users.sourceforge.net>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom
 * the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */
'use strict';

const fs = require('fs');
const inherits = require('util').inherits;
const BufferList = require('bl');
const PixelStream = require('pixel-stream');
const toWidth = require('./utils').toWidth;
const downHL = require('./utils').downHL;
const dither = require('./dither');
const resize = require('./resize');
//-----------------------------------------------------------------------------
function ScreenAniStream (opt) {
	PixelStream.call(this);

	this.buffer = new BufferList;

	this.outputName = (opt.dir || '.') + '/' + (opt.name || 'output');
	this.resizeMethod = opt.resizer || 'none';
	this.ditherMethod = opt.dither || 'threshold';
	this.threshold = opt.threshold || 128;
	this.fillAttr = opt.attr || 0x38;
	this.aniMode = !!opt.ani;
}
inherits(ScreenAniStream, PixelStream);

//-----------------------------------------------------------------------------
ScreenAniStream.prototype._start = function (done) {
	console.log('image encoding started (W:%d, H:%d, resizer:%s, dither:%s, attr:%d)...',
			this.format.width, this.format.height,
			this.resizeMethod, this.ditherMethod, this.fillAttr);

	if (this.format.colorSpace !== 'rgb') {
		console.warn("colorSpace won't be different from RGB!");
		done("colorSpace won't be different from RGB!");
		return false;
	}

	let width = this.format.width,
		height = this.format.height,
		thumb_width = 256,
		thumb_height = 192;

	if (this._frameSize !== (width * height * 3)) {
		console.warn("invalid frameSize!");
	}

	let wdeg = width / thumb_width;
	let hdeg = height / thumb_height;
	let scale = Math.max(wdeg, hdeg, 1);

	let denom_width = Math.round(width / scale);
	let denom_height = Math.round(height / scale);

	let offset_width = Math.trunc((thumb_width - denom_width) / 2);
	let offset_height = Math.trunc((thumb_height - denom_height) / 2);

	this.props = {
		width: (this.width = width),
		height: (this.height = height),
		scale: scale,
		result: {
			width: denom_width,
			height: denom_height
		},
		offset: {
			x: offset_width,
			y: offset_height
		}
	};

	this.render = new Buffer(width * height * 3);
	this.render.fill(0);

	this.frameCounter = 0;
	done();
};

ScreenAniStream.prototype._startFrame = function (frame, done) {
	console.log('frame %s, section (X:%d, Y:%d, W:%d, H:%d)',
			toWidth(this.frameCounter, 3),
			frame.x, frame.y,
			frame.width, frame.height);

	this.props.frame = Object.assign({}, frame);
	done();
};

ScreenAniStream.prototype._writePixels = function (data, done) {
	this.buffer.append(data);
	done();
};

ScreenAniStream.prototype._endFrame = function (done) {
	let p = this.props,
		frame = p.frame,
		width = this.width,
		height = this.height;

	for (let srcY = 0, dstY = frame.y; srcY < frame.height; srcY++, dstY++) {
		this.buffer.copy(
			this.render,                         // dest
			((dstY * width) + frame.x) * 3,      // destStart
			(srcY * frame.width * 3),            // srcStart
			((srcY + 1) * frame.width * 3) - 1   // srcEnd
		);
	}

	this.buffer.consume(frame.width * frame.height * 3);

	let image = new Buffer(this.render),
		speccy = new Buffer(256 * 192);
	speccy.fill(0);

	if (p.scale > 1) {
		image = new resize(this.resizeMethod, image, p);
		width = p.result.width;
		height = p.result.height;

		console.log('\tfull-frame resized to (W:%d, H:%d)', width, height);
	}

	let mono = this.rgb2gray(image);
	for (let dstY = p.offset.y, srcY = 0; srcY < height; srcY++, dstY++) {
		for (let dstX = p.offset.x, srcX = 0; srcX < width; srcX++, dstX++) {
			speccy[dstX + (dstY * 256)] =
				(dither(this.ditherMethod, mono, srcX, srcY, width)
					> this.threshold)
						? 1 : 0;
		}
	}

	let screen = new Buffer(6912);
	screen.fill(this.fillAttr, 6144);

	for (let hl = 0, y = 0; y < 192; y++) {
		for (let srcX = 0, dstX = hl; srcX < 256; srcX += 8, dstX++) {
			let byte = 0;
			for (let x = (srcX + (y * 256)), i = 0; i < 8; x++, i++)
				byte |= (speccy[x] << (i ^ 7));

			screen[dstX] = byte;
		}

		hl = downHL(hl);
	}

	this.push(screen.slice(0, 6144));

	// this hack for first screen is for one-frame-gifs or animation output
	let fnadd = (this.frameCounter) ? toWidth(this.frameCounter, 3) : '';
	if (!this.aniMode || !this.frameCounter)
		fs.writeFile(this.outputName + fnadd + '.scr', screen);
	if (this.frameCounter === 1)
		fs.renameSync(this.outputName + '.scr', this.outputName + '000.scr');

	this.frameCounter++;
	done();
};

// transforms RGB colorspace into grayscale
ScreenAniStream.prototype.rgb2gray = function (data) {
	let res = new Buffer(Math.ceil(data.length / 3));
	let i = 0, j = 0;

	while (data.length - i >= 3) {
		res[j++] = 0.2126 * data[i++] + 0.7152 * data[i++] + 0.0722 * data[i++];
	}

	return res;
};
//-----------------------------------------------------------------------------
module.exports = ScreenAniStream;
