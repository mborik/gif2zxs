#!/usr/bin/env node
'use strict';

const appname = 'gif2zxs';
const path = require('path');
const meow = require('meow');
const gif2zxs = require('../src/gif2zxs.js');

let cli = meow(`
	Usage:
		$ ${appname} [options] <input.gif...>

	Options:
		-d, --dir            Output directory
		-t, --threshold      Threshold integer value (0..255, default 128)
		--dither             Dither method:
		    "none"           Simple threshold, no dither (default)
		    "bayer4"         Bayer 4x4 matrix ordered dither
		    "bayer8"         Bayer 8x8 matrix ordered dither
		    "floydsteinberg" Floyd-Steinberg error diffusion
		    "atkinson"       Atkinson error diffusion

		-h, --help             Show help
		-v, --version          Version number
`, {
	string:  [ 'dither' ],
	alias: {
		h: 'help',
		v: 'version',
		t: 'threshold',
		d: 'dir'
	}
});

if (!cli.input.length)
	cli.showHelp();

cli.input.forEach((file) => gif2zxs(file, cli.flags));
