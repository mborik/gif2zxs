/**
 * Lossy image optimizing algorithms
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

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
const applyImageOptimization = function (input) {
	let nonvalue = 0xff,
		simpler = new Buffer(256 * 192);

	const fn = (operator, store) => {
		let x, y, i, c;
		for (y = 0; y < 192; y++) {
			for (x = 0; x < 256; x++) {
				i = (y * 256) + x;

				c = operator(i);
				if (x > 0 && y > 0)
					c = operator(i - 257, c);
				if (y > 0)
					c = operator(i - 256, c);
				if (x < 255 && y > 0)
					c = operator(i - 255, c);
				if (x > 0)
					c = operator(i - 1, c);
				if (x < 255)
					c = operator(i + 1, c);
				if (x > 0 && y < 191)
					c = operator(i + 255, c);
				if (y <  191)
					c = operator(i + 256, c);
				if (x < 255 && y < 191)
					c = operator(i + 257, c);

				store(i, c);
			}
		}
	};

	const isValue = (value) => (typeof value === "number" && !isNaN(value)) ? value : nonvalue;
	const andFn = (ptr, val) => (isValue(val) & input[ptr]);
	const oriFn = (ptr, val) => (isValue(val) | simpler[ptr]);

	fn(andFn, (ptr, c) => (simpler[ptr] = c));
	nonvalue = 0;
	fn(oriFn, (ptr, c) => (input[ptr] = c));
};
//-----------------------------------------------------------------------------
const removeMinorBytes = function (screen) {
	for (let i = 0, c; i < 6144; i++) {
		if ((c = screen[i]) && !(c & (c - 1)))
			screen[i] = 0;
	}
};
//-----------------------------------------------------------------------------
module.exports = {
	applyImageOptimization: applyImageOptimization,
	removeMinorBytes: removeMinorBytes
};
