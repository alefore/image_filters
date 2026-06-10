# Image Filters

## Introduction

TypeScript browser-based[^clientside] non-destructive[^nondestructive]
image editor based on OpenCV.

[^clientside]:
    There's no server synchronization of any kind.
    Everything happens entirely in your browser.

[^nondestructive]:
    Edits are stored as two separate files:
    the output JPEG image and a JSON file describing the filters applied.

You can use it at:
[https://alefore.github.io/image_filters/](https://alefore.github.io/image_filters/)

I use this for
[my public photos](http://alejo.ch/3kq) and my
[sequence of Züri Portals](http://alejo.ch/3ks).

## Usage

The expected usage is:

1. Upload an image file.
   This shows a small preview.

2. Optionally, upload a template specifying a sequence of filters to apply.
   See [examples/](examples/) for some examples.
   This adds a visualization of the output of each filter.
   This can be used to quickly set some pre-defined modifications.

3. Adjust filter parameters.
   The visualizations in canvases and the JSON code (at the bottom)
   are adjusted in real time.

4. Click "Save" to download the modified JPEG and save it next to the original.

5. Optionally, select and save the JSON parameters,
   which fully specify the filters applied.

I usually end up with 3 files:

xxxx.original.jpg
:   The original (input) file, unmodified.

xxxx.jpg
:   The output of applying all the filters.

xxxx.json
:    The small JSON file with the set of filters applied

## Example JSON

The following template selects a few filters with their default parameters:

    [
      {
        "type": "Lens Correction"
      },
      {
        "type": "Perspective"
      },
      {
        "type": "Vignette"
      },
      {
        "type": "Black & White"
      }
    ]

## Filters implemented

* Lens Correction
* Perspective
* Vignette
* Black & White
* Rotate
* Crop
