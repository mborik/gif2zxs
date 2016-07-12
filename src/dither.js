/**
 * Dithering methods that can be applied to monochromatic bitmap data:
 * - Bayer's matrix ordered dither methods (4x4 or 8x8 matrixes)
 * - Floyd-Steinberg's error diffusion
 * - Atkinson's error diffusion
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

const clamp = require('./utils').clamp;

const bayer4x4ThresholdMap = [
	[  15, 135,  45, 165 ],
	[ 195,  75, 225, 105 ],
	[  60, 180,  30, 150 ],
	[ 240, 120, 210,  90 ]
];
const bayer8x8ThresholdMap = [
	[   4, 192,  51, 239,  16, 204,  63, 251 ],
	[ 129,  67, 177, 114, 141,  78, 188, 126 ],
	[  35, 224,  20, 208,  47, 235,  31, 220 ],
	[ 161,  98, 145,  82, 173, 110, 157,  94 ],
	[  12, 200,  59, 247,   8, 196,  55, 243 ],
	[ 137,  75, 184, 122, 133,  71, 180, 118 ],
	[  43, 231,  27, 216,  39, 228,  24, 212 ],
	[ 169, 106, 153,  90, 165, 102, 149,  86 ]
];
//-----------------------------------------------------------------------------
const dither = (method, buffer, x, y, w) => {
	let ptr = x + (y * w),
		value = buffer[ptr], err,
		result = (value > 128) ? 255 : 0;

	const applyValueChange = (addX, addY, plus, mul) => {
		let newX = x + addX,
			newY = y + addY;
		if (newX < 0 || newX >= w)
			return;

		mul = mul || 1;

		let newptr = newX + (newY * w),
			newval = buffer[newptr] + (plus * mul);

		if (newptr < buffer.length)
			buffer[newptr] = clamp(Math.floor(newval), 0, 255);
	};

	switch (method) {
		case 'bayer4':
			value = (value + bayer4x4ThresholdMap[x % 4][y % 4]) >>> 1;
			break;

		case 'bayer':
		case 'bayer8':
			value = (value + bayer8x8ThresholdMap[x % 8][y % 8]) >>> 1;
			break;

		case 'floydsteinberg':
			err = (value - result) / 16;
			value = result;

			applyValueChange(+1, 0, err, 7);
			applyValueChange( 0, 1, err, 5);
			applyValueChange(-1, 1, err, 3);
			applyValueChange(+1, 1, err, 1);
			break;

		case 'atkinson':
			err = (value - result) / 8;
			value = result;

			applyValueChange(+1, 0, err);
			applyValueChange(+2, 0, err);
			applyValueChange( 0, 1, err);
			applyValueChange(-1, 1, err);
			applyValueChange(+1, 1, err);
			applyValueChange( 0, 2, err);
			break;
	}

	return value;
};
//-----------------------------------------------------------------------------
module.exports = dither;
