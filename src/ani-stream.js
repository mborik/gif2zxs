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
const arrayGroupBy = require('./utils').arrayGroupBy;
//-----------------------------------------------------------------------------
function SpeccyAnimationStream (opt) {
	Transform.call(this);

	this.outputName = (opt.dir || '.') + '/' + (opt.name || 'output') + '.ani.bin';
	this.enabled = !!opt.ani;
	this.holeTolerance = opt.holes || 2;
	this.scanline = opt.scanline || 1;
	this.linearOrder = false;
	this.lossy = opt.lossy || false;

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

	if (this.enabled)
		console.log('animation builder started (holeTolerance:%d, format:%s%s, scanline:%d%s)...',
			this.holeTolerance, this.format, (this.linearOrder ? '[linear]' : ''),
			this.scanline, (this.lossy ? ', lossy' : ''));

	this.inputBuffer = new BufferList;
	this.outputBuffer = new BufferList;
	this.compareBuffer = new Buffer(6144);
	this.compareBuffer.fill(0);

	this.prevFrame = void 0;
	this.frameCounter = 0;
	this.filePointer = 0;
	this.consumed = 0;

	this.tempChunks = [];
	this.storedChunks = {};
}
inherits(SpeccyAnimationStream, Transform);

//-----------------------------------------------------------------------------
SpeccyAnimationStream.prototype._transform = function (chunk, enc, done) {
	if (!this.enabled)
		return done();

	let data = (Buffer.isBuffer(chunk)) ? chunk : new Buffer(chunk, enc);

	// simple chunk appender.
	// if there is enough data for speccy screen,
	// consume data and compare with previous frame...
	this.inputBuffer.append(data);

	this.consumed += data.length;
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
	let i, frame = this.inputBuffer.slice(0, 6144);

	if (this.prevFrame) {
		// xor compareBuffer with frame xored with previous.
		// (reason for that is if there are some fragment on screen which
		// was ignored by lossy mode enabled)
		for (i = 0; i < 6144; i++)
			this.compareBuffer[i] ^= (frame[i] ^ this.prevFrame[i]);

		// clear temporary chunk buffer...
		this.tempChunks.length = 0;

		// chunk collector...
		for (i = 0; i < 6144; i++) {
			if (this.compareBuffer[i] === 0)
				continue;

			this.findStandardBlock(this.compareBuffer, i,
				(this.format === 'xor' ? this.compareBuffer : frame));
		}

		this.processChunks();
	}

	this.prevFrame = frame;
};
//-----------------------------------------------------------------------------
SpeccyAnimationStream.prototype.findStandardBlock = function (src, start, data) {
	let ptr = start, i, c,
		block = new Buffer(8);
	block.fill(0);

	// collect data from one attribute chunk with given tolerance for zeroes...
	for (i = 0, c = 0; ptr < 6144, i < 8; ptr += 256, i++) {
		block[i] = data[ptr];

		if (src[ptr])
			c = 0;
		else if (++c > this.holeTolerance)
			break;
	}

	// trim whitespace from end...
	i = Math.min(i + 1, 8) - c;

	// ignore the chunk if it's too short and lossy mode is enabled...
	if (i < 2 && this.lossy)
		return;

	// store the chunk...
	this.tempChunks.push({
		length: i,
		buffer: block,
		scradr: start,
		hexfull: block.toString('hex'),
		hex: block.slice(0, i).toString('hex'),
		h: (((start & 0x1f00) >>> 8) + 8),
		l: (start & 0xff),
		x: (i - 1) << 5
	});

	// clean block from source buffer...
	for (ptr = start, --i; i >= 0; ptr += 256, i--)
		src[ptr] = 0;
};
//-----------------------------------------------------------------------------
SpeccyAnimationStream.prototype.processChunks = function () {
	// sort fn: chunks by screen address, prioritize those for reference...
	const sortChunkByAddrAsc = (a, b) =>
		(a.id ? -1 : (b.id ? 1 : 0)) || (a.scradr - b.scradr);

	// sort fn: chunks in group descending by data length...
	const sortGroupByHexChunkDesc = (a, b) => {
		let ah = a[0].hex, bh = b[0].hex,
			cmp = bh.length - ah.length;
		if (!cmp)
			cmp = (bh > ah) ? 1 : ((bh < ah) ? -1 : 0);
		return cmp;
	}

	// group temporary chunks by hex phrase...
	let allChunks = [],
		chunksGrouped = arrayGroupBy(this.tempChunks, (item) => item.hex);

	// sort and merge all partial hex matches into one big group...
	chunksGrouped.sort(sortGroupByHexChunkDesc);
	for (let i = 0, chunk, str, target; i < chunksGrouped.length;) {
		chunk = chunksGrouped[i];
		str = chunk[0].hex;
		target = chunksGrouped.findIndex((a, idx) => (i !== idx && str.indexOf(a[0].hex) === 0));

		if (~target && chunksGrouped[target]) {
			chunk.push.apply(chunk, chunksGrouped[target]);
			chunksGrouped.splice(target, 1);
			continue;
		}

		i++;
	}

	// for every group with more then one chunk we pick the first one
	// which will be refenced by other children longer than 2 bytes...
	chunksGrouped.forEach((group) => {
		let base = group.shift(), storeKey;
		if (base.length > 2) {
			if (this.storedChunks[base.hexfull]) {
				storeKey = base.hexfull;
				base.parent = storeKey;
				base.x = 0;
			}
			else if (group.length) {
				storeKey = base.id = base.hexfull;
				this.storedChunks[storeKey] = base;
			}
		}
		else if (base.length === 1)
			base.x = (++base.length - 1) << 5;

		group.forEach((item) => {
			if (storeKey && item.length > 2) {
				item.x = 0;
				item.parent = storeKey;
			}
			else if (item.length === 1)
				item.x = (++item.length - 1) << 5;
		});

		group.unshift(base);
		allChunks.push.apply(allChunks, group);
	});

	// sort chunks by screen address and store into output buffer...
	allChunks.sort(sortChunkByAddrAsc);
	allChunks.forEach((item) => {
		this.filePointer += 2;
		this.outputBuffer.append(new Buffer([ item.x | item.h, item.l ]));

		// if there is solid (not repeatable) chunk or if it's "parent chunk"
		// store it with the full data in given length...
		if (item.x) {
			if (item.id)
				this.storedChunks[item.id].filePtr = this.filePointer;

			this.outputBuffer.append(item.buffer.slice(0, item.length));
			this.filePointer += item.length;
		}

		// reference chunk will be stored just as back-reference pointer...
		else if (item.parent) {
			this.filePointer += 2;

			let parent = this.storedChunks[item.parent],
				refLen = (item.length - 1) << 5,
				refPtr = this.filePointer - parent.filePtr;

			if (refPtr < 0x2000) {
				this.outputBuffer.append(new Buffer([
					refLen | ((refPtr & 0x1f00) >>> 8),
					(refPtr & 0xff)
				]));
			}
			else {
				// too far reference!!
				// we need to hack it up, rollback 2 bytes in outputBuffer
				// and define brand new solid chunk to reference on it.
				this.filePointer -= 2;
				parent.filePtr = this.filePointer;

				parent.h = item.h;
				parent.l = item.l;
				item.x = parent.x;

				let lastmark = this.outputBuffer._bufs.pop();
				this.outputBuffer.length -= lastmark.length;

				this.outputBuffer.append(new Buffer([ item.x | item.h, item.l ]));
				this.outputBuffer.append(parent.buffer.slice(0, parent.length));
				this.filePointer += parent.length;
			}
		}
	});

	// flag end of frame...
	this.outputBuffer.append(new Buffer([0]));
	this.filePointer++;
	this.frameCounter++;
};
//-----------------------------------------------------------------------------
module.exports = SpeccyAnimationStream;
