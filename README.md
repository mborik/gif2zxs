gif2zxs
=======
convert GIF animations into ZX-Spectrum screens

## Usage: ##
>+ `node gif2scr.js [options] file.gif [...files.gif]`

## Options: ##
>- `-d`, `--dir`        --- output directory
>- `-t`, `--threshold`  --- threshold integer value _(default=128)_
>- `--dither`           --- dither method:
>  * `"bayer4"`         --- Bayer 4x4 matrix ordered dither
>  * `"bayer8"`         --- Bayer 8x8 matrix ordered dither
>  * `"floydsteinberg"` --- Floyd-Steinberg error diffusion
>  * `"atkinson"`       --- Atkinson error diffusion
