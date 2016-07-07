'use strict';

let fs = require('fs');
let path = require('path');
let args = require('minimist')(process.argv.slice(2));

let GIFDecoder = require('gif-stream/decoder');
let ScreenAniStream = require('./ScreenAniStream');
//---------------------------------------------------------------------------------------
let dir = __dirname;
if (args.dir || args.d) {
	let cd = args.dir || args.d || '.';
    if (path.isAbsolute(cd))
    	dir = cd;
	else
		dir = path.resolve(dir, cd);

	fs.mkdir(dir, (err) => { return true});
}

if (args._.length) {
	args._.forEach(function(file) {
		let ext = path.extname(file);
		if (ext.toLowerCase() !== '.gif') {
			console.warn("%s hasn't proper extension, you've been warned!");
		}

		let basename = path.basename(file, ext);

		console.log('processing %s...', file);
		let stream = fs.createReadStream(path.resolve(__dirname, file));

		stream
			.pipe(new GIFDecoder)
			.pipe(new ScreenAniStream({
				name: basename,
				dir: dir
			}));
	});
}
else {
	console.log('usage:\n\tnode %s file.gif [...files.gif] [--dir | -d output/dir]',
		path.basename(process.argv[1]));
}
