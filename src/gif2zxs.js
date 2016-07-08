'use strict';

const fs = require('fs');
const path = require('path');
const GIFDecoder = require('gif-stream/decoder');
const ScreenAniStream = require('./ScreenAniStream');
//---------------------------------------------------------------------------------------
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

	if (opt.threshold && parseInt(args.threshold, 10) !== NaN)
		opt.threshold = parseInt(args.threshold, 10);

	opt.name = path.basename(file, ext);
	console.log('processing `%s`...', file);

	fs.createReadStream(filePath)
		.pipe(new GIFDecoder)
		.pipe(new ScreenAniStream(opt));

	return true;
};
//---------------------------------------------------------------------------------------
module.exports = gif2zxs;
