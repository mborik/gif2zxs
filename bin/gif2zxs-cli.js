#!/usr/bin/env node
'use strict';

const appname = 'gif2zxs';
const path = require('path');
const meow = require('meow');
const gif2zxs = require('../src');

let cli = meow(`
	Usage:
		$ ${appname} [options] <input.gif...>

	Options:
		-d, --dir              Output directory
		-t, --threshold        Threshold integer value (0..255, default 128)
		-a, --attr             ZX-Spectrum color attribute value (0..127, default 56)
		-s, --skip             skip number of frames between (default 0)
		-r, --resizer          Image resample method:
		    "none"             Nearest-neighbor (default)
		    "bilinear"         Bilinear interpolation
		    "bicubic"          Bicubic interpolation
		    "hermite"          Hermite curve interpolation
		    "bezier"           Bezier curve interpolation
		--dither               Dither method:
		    "none"             Simple threshold, no dither (default)
		    "bayer4"           Bayer 4x4 matrix ordered dither
		    "bayer8"           Bayer 8x8 matrix ordered dither
		    "floydsteinberg"   Floyd-Steinberg error diffusion
		    "atkinson"         Atkinson error diffusion
		--ani                  Output animation binary file of type:
			"xor"              ZX-Spectrum screen mode, XOR method (default)
			"direct"           ZX-Spectrum screen mode, direct write method
			"linear-xor"       Linear screen mode, XOR method
			"linear-direct"    Linear screen mode, direct write method

		-h, --help             Show help
		-v, --version          Version number
`, {
	string:  [ 'ani', 'dither', 'resizer' ],
	alias: {
		d: 'dir',
		t: 'threshold',
		a: 'attr',
		s: 'skip',
		r: 'resizer',
		h: 'help',
		v: 'version'
	}
});

if (!cli.input.length)
	cli.showHelp();

cli.input.forEach((file) => gif2zxs(file, cli.flags));
