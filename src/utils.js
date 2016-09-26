/**
 * helper handy functions
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
module.exports = {
	/**
	 * Clamps numeric value between range
	 * @param {number} input value
	 * @param {number} lower boundary
	 * @param {number} upper boundary
	 * @return {number} clamped value
	 */
	'clamp': (val, min, max) => Math.max(min || 0, Math.min(max || 255, val)),

	/**
	 * Formats positive integer number to given number of places prefixed by 0.
	 * @param {number} input value
	 * @param {number} number of places (optional)
	 * @return {number} formatted value
	 */
	'toWidth': (number, width) => {
		let str = '' + (number.valueOf() >> 0);
		return ('0000000000' + str).substr(-Math.max(width || 0, str.length));
	},

	/**
	 * DOWNHL is best known from ZX-Spectrum - it moves 16-bit memory pointer
	 * to the next scanline in speccyfic ZX-Spectrum screen layout in memory.
	 * @param {number} 16bit memory pointer
	 * @return {number} 16bit memory pointer
	 */
	'downHL': (hl) => {
		let h = hl >>> 8,
			l = hl & 255;

		h++;
		if (!(h & 7)) {
			l += 32;
			if (l < 256)
				h -= 8;
		}

		return (h << 8) | (l & 255);
	},

	/**
	 * Group the array of the objects by properties defined by group functiion.
	 * @param {array} array of objects
	 * @param {function} fn callback which should return the array with values
	 *        of the properties which we want to group by sorted by importance.
	 * @return {array} array of grouped arrays of the source objects.
	 */
	'arrayGroupBy': (array, fn) => {
		let groups = {};

		array.forEach((obj) => {
			let group = fn(obj);
			groups[group] = groups[group] || [];
			groups[group].push(obj);
		});

		return Object.keys(groups).map((group) => groups[group]);
	}
};
//-----------------------------------------------------------------------------
