gif2zxs
=======
> convert GIF animations into ZX-Spectrum screens

Install this globally and you'll have access to the `gif2zxs` command line interface anywhere on your system:

```shell
npm install -g gif2zxs
```

## Usage: ##
>+ `$ gif2scr [options] <input.gif...>`

## Options: ##
>- `-d`, `--dir`        --- Output directory
>- `-c`, `--attr`       --- ZX-Spectrum color attribute value _(0..127, default 56)_
>- `-t`, `--threshold`  --- Threshold integer value _(0..255, default 128)_
>- `-r`, `--resizer`    --- Image resample method:
>  * `"none"`           --- Nearest-neighbor _(default)_
>  * `"bilinear"`       --- Bilinear interpolation
>  * `"bicubic"`        --- Bicubic interpolation
>  * `"hermite"`        --- Hermite curve interpolation
>  * `"bezier"`         --- Bezier curve interpolation
>- `-z`, `--dither`     --- Dither method:
>  * `"none"`           --- Simple threshold, no dither _(default)_
>  * `"bayer4"`         --- Bayer 4x4 matrix ordered dither
>  * `"bayer8"`         --- Bayer 8x8 matrix ordered dither
>  * `"floydsteinberg"` --- Floyd-Steinberg error diffusion
>  * `"atkinson"`       --- Atkinson error diffusion
>- `-a`, `--ani`        --- Output animation binary file of type:
>  * `"xor"`            --- ZX-Spectrum screen mode, XOR method _(default)_
>  * `"direct"`         --- ZX-Spectrum screen mode, direct write method
>  * `"linear-xor"`     --- Plain (scanline oriented) screen mode, XOR method
>  * `"linear-direct"`  --- Plain (scanline oriented) screen mode, direct write method
>- `-s`, `--skip`       --- Skip number of frames between each ani-frame _(default 0)_
>- `--lossy`            --- Lossy conversion post-processing
>- `--holes`            --- Hole tolerance while storing ani-chunk _(1..7, default 2)_
>- `--scanline`         --- Process nth scanline into animation _(1..2, default 1)_
>
>- `-h`, `--help`       --- Show help
>- `-v`, `--version`    --- Version number
