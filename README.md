gif2zxs
=======
> convert GIF animations into ZX-Spectrum screens

Install this globally and you'll have access to the `gif2zxs` command anywhere on your system:

```shell
npm install -g gif2zxs
```

## Usage: ##
>+ `$ gif2scr [options] <input.gif...>`

## Options: ##
>- `-d`, `--dir`        --- output directory
>- `-t`, `--threshold`  --- threshold integer value _(0..255, default 128)_
>- `-a`, `--attr`       --- ZX-Spectrum color attribute value _(0..127, default 56)_
>- `-r`, `--resizer`    --- image resample method:
>  * `"none"`           --- Nearest-neighbor _(default)_
>  * `"bilinear"`       --- Bilinear interpolation
>  * `"bicubic"`        --- Bicubic interpolation
>  * `"hermite"`        --- Hermite curve interpolation
>  * `"bezier"`         --- Bezier curve interpolation
>- `--dither`           --- dither method:
>  * `"none"`           --- Simple threshold, no dither _(default)_
>  * `"bayer4"`         --- Bayer 4x4 matrix ordered dither
>  * `"bayer8"`         --- Bayer 8x8 matrix ordered dither
>  * `"floydsteinberg"` --- Floyd-Steinberg error diffusion
>  * `"atkinson"`       --- Atkinson error diffusion
