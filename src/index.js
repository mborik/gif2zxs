/**
 * gif2zxs
 * converts GIF animations into ZX-Spectrum screens.
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
const path = require('path');
const GIFDecoder = require('gif-stream/decoder');
const ScreenAniStream = require('./scr-stream');
const SpeccyAnimationStream = require('./ani-stream');
const clamp = require('./utils').clamp;
//-----------------------------------------------------------------------------
const gif2zxs = function (file, opt) {
	let cwd = process.cwd();
	let filePath = path.resolve(cwd, file);

	try {
		if (!fs.statSync(filePath).isFile())
			throw new Error("ENOTFILE");
	} catch (err) {
		console.error('Invalid file: "%s" (%s)', filePath,
			(err.code || err.message || err));
		return false;
	}

	let ext = path.extname(file);
	if (ext.toLowerCase() !== '.gif')
		console.warn("%s hasn't proper extension, you've been warned!");

	if (opt.dir) {
		let arg = opt.dir || '.',
			dir = (path.isAbsolute(arg)) ? arg : path.resolve(cwd, arg);

		fs.mkdir(dir, (err) => true);
		opt.dir = dir;
	}

	let value = parseInt(opt.threshold, 10);
	if (opt.threshold && value !== NaN)
		opt.threshold = clamp(value, 0, 255);
	value = parseInt(opt.attr, 10);
	if (opt.attr && value !== NaN)
		opt.attr = clamp(value, 0, 127);
	value = parseInt(opt.skip, 10);
	if (opt.skip && value !== NaN)
		opt.skip = Math.max(value, 0);

	opt.name = path.basename(file, ext);
	console.log('processing `%s`...', file);

	fs.createReadStream(filePath)
		.pipe(new GIFDecoder)
		.pipe(new ScreenAniStream(opt))
		.pipe(new SpeccyAnimationStream(opt));

	return true;
};
//-----------------------------------------------------------------------------
module.exports = gif2zxs;
