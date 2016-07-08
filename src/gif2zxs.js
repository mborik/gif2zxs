'use strict';

let fs = require('fs');
let path = require('path');
let args = require('minimist')(process.argv.slice(2));

let GIFDecoder = require('gif-stream/decoder');
let ScreenAniStream = require('./ScreenAniStream');
//---------------------------------------------------------------------------------------
let opt = {};
let ditherMethod = 'threshold';

if (args.dir || args.d) {
	let dir, cd = args.dir || args.d || '.';
	if (path.isAbsolute(cd))
		dir = cd;
	else
		dir = path.resolve(__dirname, cd);

	fs.mkdir(dir, (err) => true);
	opt.dir = dir;
}

if (args.threshold || args.t) {
	let val = parseInt(args.threshold || args.t || '');
	if (val != NaN)
		opt.threshold = val;
}

if (args.dither)
	opt.dither = args.dither;

if (args._.length) {
	args._.forEach(function (file) {
		let ext = path.extname(file);
		if (ext.toLowerCase() !== '.gif') {
			console.warn("%s hasn't proper extension, you've been warned!");
		}

		opt.name = path.basename(file, ext);
		console.log('processing %s...', file);

		let stream = fs.createReadStream(path.resolve(__dirname, file));
		stream
			.pipe(new GIFDecoder)
			.pipe(new ScreenAniStream(opt));
	});
} else {
	console.log('Usage:\n\tnode %s [options] file.gif [...files.gif]\n\nOptions:',
			path.basename(process.argv[1]));

	console.log('\t-d, --dir        output directory');
	console.log('\t-t, --threshold  threshold integer value (default=128)');
	console.log('\n\t--dither         dither method:');
	console.log('\t\t"bayer4"         - Bayer 4x4 matrix ordered dither');
	console.log('\t\t"bayer8"         - Bayer 8x8 matrix ordered dither');
	console.log('\t\t"floydsteinberg" - Floyd-Steinberg error diffusion');
	console.log('\t\t"atkinson"       - Atkinson error diffusion');
}
