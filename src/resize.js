/**
 * Various image resizing algorithms in RGB depth:
 *     nearest-neigbour and bilinear, bicubic, hermite, bezier interpolations.
 * Based on Guyon Roche's imagejs/lib/resize.js [github.com/guyonroche/imagejs]
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
//-----------------------------------------------------------------------------
const interpolate2D = function (src, dst, opt, callback) {
	let wSrc = opt.width;
	let hSrc = opt.height;

	let wDst = opt.result.width;
	let hDst = opt.result.height;

	// when dst smaller than src/2, interpolate first to a multiple between 0.5 and 1.0 src, then sum squares
	let wM = Math.max(1, Math.floor(wSrc / wDst));
	let wDst2 = wDst * wM;
	let hM = Math.max(1, Math.floor(hSrc / hDst));
	let hDst2 = hDst * hM;

	// ===========================================================
	// Pass 1 - interpolate rows
	// buf1 has width of dst2 and height of src
	let buf1 = new Buffer(wDst2 * hSrc * 3);
	for (let i = 0; i < hSrc; i++) {
		for (let j = 0; j < wDst2; j++) {
			// i in src coords, j in dst coords

			// calculate x in src coords
			// this interpolation requires 4 sample points and the two inner ones must be real
			// the outer points can be fudged for the edges.
			// therefore (wSrc-1)/wDst2
			let x = j * (wSrc - 1) / wDst2;
			let xPos = Math.floor(x);
			let t = x - xPos;
			let srcPos = (i * wSrc + xPos) * 3;
			let buf1Pos = (i * wDst2 + j) * 3;

			for (let k = 0; k < 3; k++) {
				let kPos = srcPos + k;
				let x0 = (xPos > 0) ? src[kPos - 3] : 2 * src[kPos] - src[kPos + 3];
				let x1 = src[kPos];
				let x2 = src[kPos + 3];
				let x3 = (xPos < wSrc - 2) ? src[kPos + 6] : 2 * src[kPos + 3] - src[kPos];

				buf1[buf1Pos + k] = callback(x0, x1, x2, x3, t);
			}
		}
	}

	// ===========================================================
	// Pass 2 - interpolate columns
	// buf2 has width and height of dst2
	let buf2 = new Buffer(wDst2 * hDst2 * 3);
	for (let i = 0; i < hDst2; i++) {
		for (let j = 0; j < wDst2; j++) {
			// i&j in dst2 coords

			// calculate y in buf1 coords
			// this interpolation requires 4 sample points and the two inner ones must be real
			// the outer points can be fudged for the edges.
			// therefore (hSrc-1)/hDst2
			let y = i * (hSrc - 1) / hDst2;
			let yPos = Math.floor(y);
			let t = y - yPos;
			let buf1Pos = (yPos * wDst2 + j) * 3;
			let buf2Pos = (i * wDst2 + j) * 3;

			for (let k = 0; k < 3; k++) {
				let kPos = buf1Pos + k;
				let y0 = (yPos > 0) ? buf1[kPos - wDst2 * 3] : 2 * buf1[kPos] - buf1[kPos + wDst2 * 3];
				let y1 = buf1[kPos];
				let y2 = buf1[kPos + wDst2 * 3];
				let y3 = (yPos < hSrc - 2) ? buf1[kPos + wDst2 * 6] : 2 * buf1[kPos + wDst2 * 3] - buf1[kPos];

				buf2[buf2Pos + k] = callback(y0, y1, y2, y3, t);
			}
		}
	}

	// ===========================================================
	// Pass 3 - scale to dst
	let m = wM * hM;
	if (m > 1) {
		for (let i = 0; i < hDst; i++) {
			for (let j = 0; j < wDst; j++) {
				// i&j in dst bounded coords
				let r = 0;
				let g = 0;
				let b = 0;

				for (let y = 0; y < hM; y++) {
					let yPos = i * hM + y;
					for (let x = 0; x < wM; x++) {
						let xPos = j * wM + x;
						let xyPos = (yPos * wDst2 + xPos) * 3;

						r += buf2[xyPos];
						g += buf2[xyPos + 1];
						b += buf2[xyPos + 2];
					}
				}

				let pos = (i * wDst + j) * 3;

				dst[pos] = Math.round(r / m);
				dst[pos + 1] = Math.round(g / m);
				dst[pos + 2] = Math.round(b / m);
			}
		}
	}
};
//-----------------------------------------------------------------------------
class resize {
	constructor (method, src, opt) {
		this.buf = new Buffer(opt.result.width * opt.result.height * 3);
		this.buf.fill(0);

		switch (method) {
			case 'bilinear':
			case 'bicubic':
			case 'hermite':
			case 'bezier':
				break;
			default:
				method = 'nearestNeighbor';
				break;
		}

		this[method](src, opt);
		return this.buf;
	}

	nearestNeighbor (src, opt) {
		let wSrc = opt.width;
		let hSrc = opt.height;

		let wDst = opt.result.width;
		let hDst = opt.result.height;

		for (let y = 0; y < hDst; y++) {
			for (let x = 0; x < wDst; x++) {
				let posDst = (y * wDst + x) * 3;

				let iSrc = Math.round(y * hSrc / hDst);
				let jSrc = Math.round(x * wSrc / wDst);
				let posSrc = (iSrc * wSrc + jSrc) * 3;

				this.buf[posDst++] = src[posSrc++];
				this.buf[posDst++] = src[posSrc++];
				this.buf[posDst++] = src[posSrc++];
			}
		}
	}

	bilinear (src, opt) {
		let wSrc = opt.width;
		let hSrc = opt.height;

		let wDst = opt.result.width;
		let hDst = opt.result.height;

		const interpolate = function (k, kMin, vMin, kMax, vMax) {
			// special case - k is integer
			if (kMin === kMax)
				return vMin;

			return Math.round((k - kMin) * vMax + (kMax - k) * vMin);
		};

		const assign = function (pos, offset, x, xMin, xMax, y, yMin, yMax) {
			let posMin = (yMin * wSrc + xMin) * 3 + offset;
			let posMax = (yMin * wSrc + xMax) * 3 + offset;
			let vMin = interpolate(x, xMin, src[posMin], xMax, src[posMax]);

			// special case, y is integer
			if (yMax === yMin) {
				this.buf[pos + offset] = vMin;
			} else {
				posMin = (yMax * wSrc + xMin) * 3 + offset;
				posMax = (yMax * wSrc + xMax) * 3 + offset;
				let vMax = interpolate(x, xMin, src[posMin], xMax, src[posMax]);

				this.buf[pos + offset] = interpolate(y, yMin, vMin, yMax, vMax);
			}
		};

		for (let y = 0; y < hDst; y++) {
			for (let x = 0; x < wDst; x++) {
				let posDst = (y * wDst + x) * 3;

				// x & y in src coordinates
				x = x * wSrc / wDst;
				let xMin = Math.floor(x);
				let xMax = Math.min(Math.ceil(x), wSrc - 1);

				y = y * hSrc / hDst;
				let yMin = Math.floor(y);
				let yMax = Math.min(Math.ceil(y), hSrc - 1);

				assign(posDst, 0, x, xMin, xMax, y, yMin, yMax);
				assign(posDst, 1, x, xMin, xMax, y, yMin, yMax);
				assign(posDst, 2, x, xMin, xMax, y, yMin, yMax);
			}
		}
	}

	bicubic (src, opt) {
		return interpolate2D(src, this.buf, opt, (x0, x1, x2, x3, t) => {
			let a0 = x3 - x2 - x0 + x1;
			let a1 = x0 - x1 - a0;
			let a2 = x2 - x0;
			let a3 = x1;

			return clamp(Math.round((a0 * (t * t * t)) + (a1 * (t * t)) + (a2 * t) + (a3)), 0, 255);
		});
	}

	hermite (src, opt) {
		return interpolate2D(src, this.buf, opt, (x0, x1, x2, x3, t) => {
			let c0 = x1;
			let c1 = 0.5 * (x2 - x0);
			let c2 = x0 - (2.5 * x1) + (2 * x2) - (0.5 * x3);
			let c3 = (0.5 * (x3 - x0)) + (1.5 * (x1 - x2));

			return clamp(Math.round((((((c3 * t) + c2) * t) + c1) * t) + c0), 0, 255);
		});
	}

	bezier (src, opt) {
		// between 2 points y(n), y(n+1), use next points out, y(n-1), y(n+2)
		// to predict control points (a & b) to be placed at n+0.5
		//  ya(n) = y(n) + (y(n+1)-y(n-1))/4
		//  yb(n) = y(n+1) - (y(n+2)-y(n))/4
		// then use std bezier to interpolate [n,n+1)
		//  y(n+t) = y(n)*(1-t)^3 + 3 * ya(n)*(1-t)^2*t + 3 * yb(n)*(1-t)*t^2 + y(n+1)*t^3
		//  note the 3* factor for the two control points
		// for edge cases, can choose:
		//  y(-1) = y(0) - 2*(y(1)-y(0))
		//  y(w) = y(w-1) + 2*(y(w-1)-y(w-2))
		// but can go with y(-1) = y(0) and y(w) = y(w-1)
		return interpolate2D(src, this.buf, opt, (x0, x1, x2, x3, t) => {
			// x1, x2 are the knots, use x0 and x3 to calculate control points
			let cp1 = x1 + (x2 - x0) / 4;
			let cp2 = x2 - (x3 - x1) / 4;
			let nt = 1 - t;
			let c0 = x1 * nt * nt * nt;
			let c1 = 3 * cp1 * nt * nt * t;
			let c2 = 3 * cp2 * nt * t * t;
			let c3 = x2 * t * t * t;

			return clamp(Math.round(c0 + c1 + c2 + c3), 0, 255);
		});
	}
};
//-----------------------------------------------------------------------------
module.exports = resize;
