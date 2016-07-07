'use strict';

let fs = require('fs');
let util = require('util');
let BufferList = require('bl');
let PixelStream = require('pixel-stream');

let toWidth = (a, width) => {
	let n = '' + (a.valueOf() >> 0);
	return ('0000000000' + n).substr(-Math.max(width || 0, n.length));
};

/*
 * ScreenAniStream
 * custom PixelStream prototype to convert gif frames to ZX-Spectrum screen format.
 */
function ScreenAniStream (opt) {
	PixelStream.call(this);

	this.buffer = new BufferList;

	this.outputName = (opt.dir || '.') + '/' + (opt.name || 'output');
	this.threshold = opt.threshold || 128;
	this.fillAttr = opt.attr || 0x38;
}
util.inherits(ScreenAniStream, PixelStream);

//---------------------------------------------------------------------------------------
ScreenAniStream.prototype._start = function (done) {
	console.log('[ScreenAniStream] image encoding started...');

	if (this.format.colorSpace !== 'rgb') {
		console.warn("[ScreenAniStream] colorSpace won't be different from RGB!");
		done("colorSpace won't be different from RGB!");
		return false;
	}

	let width = this.format.width,
		height = this.format.height,
		thumb_width = 256,
		thumb_height = 192;

	if (this._frameSize !== (width * height * 3)) {
		console.warn("[ScreenAniStream] invalid frameSize!");
	}

	let wdeg = Math.ceil(width / thumb_width);
	let hdeg = Math.ceil(height / thumb_height);
	let scale_den = Math.max(wdeg, hdeg, 1);

	let denom_width = Math.round(width / scale_den);
	let denom_height = Math.round(height / scale_den);

	let offset_width = (thumb_width - denom_width) / 2;
	let offset_height = (thumb_height - denom_height) / 2;

	this.props = {
		scale: scale_den,
		result: {
			width: denom_width,
			height: denom_height
		},
		offset: {
			x: (0 | offset_width),
			y: (0 | offset_height)
		}
	};

	width = Math.max(width, denom_width * scale_den);
	height = Math.max(height, denom_height * scale_den);

	this.props.width = this.width = width;
	this.props.height = this.height = height;
	this.render = new Buffer(width * height);
	this.frameCounter = 0;

	done();
};

ScreenAniStream.prototype._startFrame = function (frame, done) {
	console.log('[ScreenAniStream] frame %s (X:%d, Y:%d, W:%d, H:%d)',
			toWidth(this.frameCounter, 3),
			frame.x, frame.y,
			frame.width, frame.height);

	this.props.frame = Object.assign({}, frame);
	this.props.frame.buffer = new BufferList;
	done();
};

ScreenAniStream.prototype._writePixels = function (data, done) {
	this.buffer.append(data);

	let res = this.rgb2gray(data);
	this.props.frame.buffer.append(res);
	this.buffer.consume(res.length * 3);

	this.push();
	done();
};

ScreenAniStream.prototype._endFrame = function (done) {
	let p = this.props,
		frame = p.frame,
		width = this.width,
		height = this.height;

	for (let srcY = 0, dstY = frame.y; srcY < frame.height; srcY++, dstY++) {
		frame.buffer.copy(
			this.render,					// dest
			(dstY * width) + frame.x,		// destStart
			(srcY * frame.width),			// srcStart
			((srcY + 1) * frame.width) - 1	// srcEnd
		);
	}

	let render = new Buffer(this.render),
		speccy = new Buffer(256 * 192);

	if (p.scale > 1) {
		render = this.resizeBuffer(render, p);
		width = p.result.width;
		height = p.result.height;
	}

	speccy.fill(0);
	for (let dstY = p.offset.y, srcY = 0; srcY < height; srcY++, dstY++) {
		for (let dstX = p.offset.x, srcX = 0; srcX < width; srcX++, dstX++) {
			speccy[dstX + (dstY * 256)] =
				(render[srcX + (srcY * width)] > this.threshold) ? 1 : 0;
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

		hl = this.downHL(hl);
	}

	fs.writeFile(this.outputName + toWidth(this.frameCounter, 3) + '.scr', screen);
	this.frameCounter++;
	done();
};

// transforms RGB colorspace into grayscale
ScreenAniStream.prototype.rgb2gray = function (data) {
	let res = new Buffer(data.length / 3 | 0);
	let i = 0, j = 0;

	while (data.length - i >= 3) {
		res[j++] = 0.2126 * data[i++] + 0.7152 * data[i++] + 0.0722 * data[i++];
	}

	return res;
};

// nearest-neigbour down-scaling
ScreenAniStream.prototype.resizeBuffer = function (input, p) {
	let x, y, i,
		mean = 0,
		scaled = new Buffer(p.width * p.result.height);

	for (let srcY = 0, dstY = 0; srcY < p.height; srcY += p.scale, dstY++) {
		for (x = 0; x < p.width; x++) {
			mean = 0;

			for (y = srcY, i = 0; i < p.scale; i++, y++)
				mean += input[x + (y * p.width)];

			mean /= p.scale;
			scaled[x + (dstY * p.width)] = Math.round(mean);
		}
	}

	let result = new Buffer(p.result.width * p.result.height);
	for (y = 0; y < p.result.height; y++) {
		for (let srcX = 0, dstX = 0; srcX < p.width; srcX += p.scale, dstX++) {
			mean = 0;

			for (x = srcX, i = 0; i < p.scale; i++, x++)
				mean += scaled[x + (y * p.width)];

			mean /= p.scale;
			result[dstX + (y * p.result.width)] = Math.round(mean);
		}
	}

	return result;
};

ScreenAniStream.prototype.downHL = function (hl) {
	var h = hl >>> 8,
		l = hl & 255;

	h++;
	if (!(h & 7)) {
		l += 32;
		if (l < 256)
			h -= 8;
	}

	return (h << 8) | (l & 255);
};

module.exports = ScreenAniStream;
