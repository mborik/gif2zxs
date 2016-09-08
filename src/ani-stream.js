/**
 * SpeccyAnimationStream
 * Transform stream to convert ZX-Spectrum screen frames to binary animation.
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
const Transform = require('stream').Transform;
const toWidth = require('./utils').toWidth;
//-----------------------------------------------------------------------------
function SpeccyAnimationStream (opt) {
	Transform.call(this);

	this.outputName = (opt.dir || '.') + '/' + (opt.name || 'output') + '.ani.bin';
	this.enabled = !!opt.ani;
	this.holeTolerance = 2;
	this.linearOrder = false;

	switch (opt.ani) {
		case 'linear-xor':
		case 'linear-direct':
			this.linearOrder = true;
			opt.ani = opt.ani.substr(7);
			/* nobreak */
		case 'xor':
		case 'direct':
			this.format = opt.ani;
			break;

		default:
			this.format = 'xor';
			break;
	}

	this.consumed = 0;
	this.inputBuffer = new BufferList;
	this.outputBuffer = new BufferList;
	this.prevFrame = void 0;
	this.frameCounter = 0;
}
inherits(SpeccyAnimationStream, Transform);

//-----------------------------------------------------------------------------
SpeccyAnimationStream.prototype._transform = function (chunk, enc, done) {
	if (!this.enabled)
		return done();

	let data = (Buffer.isBuffer(chunk)) ? chunk : new Buffer(chunk, enc);

	this.consumed += data.length;
	this.inputBuffer.append(data);

	if (this.consumed >= 6144) {
		this.compareFrames();

		this.consumed -= 6144;
		this.inputBuffer.consume(6144);
	}

	done();
};
//-----------------------------------------------------------------------------
SpeccyAnimationStream.prototype._flush = function (done) {
	if (!this.enabled)
		return done();

	// flag end of animation...
	this.outputBuffer.append(new Buffer([1]));
	fs.writeFile(this.outputName, this.outputBuffer.slice());

	done();
};
//-----------------------------------------------------------------------------
SpeccyAnimationStream.prototype.compareFrames = function () {
	let frame = this.inputBuffer.slice(0, 6144);
	if (this.prevFrame) {
		let i, blocks = 0, compared = new Buffer(6144);

		for (i = 0; i < 6144; i++)
			compared[i] = frame[i] ^ this.prevFrame[i];

		for (i = 0; i < 6144; i++) {
			if (compared[i] === 0)
				continue;

			this.findStandardBlock(compared, i,
				(this.format === 'xor' ? compared : frame));
			blocks++;
		}

		// flag end of frame...
		if (blocks)
			this.outputBuffer.append(new Buffer([0]));
		this.frameCounter++;
	}

	this.prevFrame = frame;
};
//-----------------------------------------------------------------------------
SpeccyAnimationStream.prototype.findStandardBlock = function (src, start, data) {
	let ptr = start, i, c,
		block = new Buffer(8);
	block.fill(0);

	for (i = 0, c = 0; ptr < 6144, i < 8; ptr += 256, i++) {
		block[i] = data[ptr];

		if (src[ptr])
			c = 0;
		else if (++c > this.holeTolerance)
			break;
	}

	// trim end...
	c = i++;
	while (!block[c--])
		i--;

	this.storeBlock(start, block.slice(0, i));

	// clean block from source buffer...
	for (ptr = start, --i; i >= 0; ptr += 256, i--)
		src[ptr] = 0;
};
//-----------------------------------------------------------------------------
SpeccyAnimationStream.prototype.storeBlock = function (adr, data) {
	let x = (data.length - 1) << 5;
	let h = ((adr & 0x1f00) >>> 8) + 8;
	let l = (adr & 0xff);

	this.outputBuffer.append(new Buffer([ x | h, l ]));
	this.outputBuffer.append(data);
};
//-----------------------------------------------------------------------------
module.exports = SpeccyAnimationStream;
