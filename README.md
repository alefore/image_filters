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

## Design goals

* Sequence of independent filters.
  To edit an image means simply creating a sequence (or pipeline)
  of independent filters.
  Each filter receives as its input the output of the previous filter.
  Allow visualization of all intermediate stages.

* Reuse logic from OpenCV as much as possible.
  Filter implementations should be trivial shells
  that just call into OpenCV
  (but allow real-time visualization of the resulting images).

* Non-destructive.
  The original input image should never be modified.
  Instead, we configure a sequence (or pipeline) of filters,
  and export the configuration as a JSON file.

* Completely client-side (browser-based).
  No server component.
  In the future, I would like to have a CLI implementation
  (to enable "re-apply all filters"-type scripting).

* Image manipulations stored in text-oriented format.
  The configuration (of the sequence of filters applied to an image)
  should be exported in a format that allows us to easily modify it
  with a text editor (or other text-oriented tools)
  and commit it to a source-code repository.

## Usage

The expected usage is:

1. Click "Choose File" to select an image file
   (no actual upload happens: the file remains local in your browser).
   This shows a small preview.

2. Optionally, use the 2nd "Choose File" button to select a template
   specifying a sequence of filters to apply.
   This adds a visualization of the output of each filter.
   This can be used to quickly set some pre-defined modifications.

3. Adjust filter parameters.
   The visualizations in canvases and the JSON code (at the bottom)
   are adjusted in real time.

4. Click "Save" to download the modified JPEG and save it next to the original.

5. Optionally, select and save the JSON parameters,
   which fully specify the filters applied.

I usually end up with 3 files:

* xxxx.original.jpg: The original (input) file, unmodified.
* xxxx.jpg: The output of applying all the filters.
* xxxx.json: The small JSON file with the set of filters applied

When dragging points over an image
(e.g., to configure the center of the vignette),
pressing Shift while dragging reduces the effect of dragging by 10.

## Example template

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

The current JSON configuration (for the filters)
is shown at the bottom of the page (initially just `[]`).
As you add filters or modify their parameters,
this configuration is updated.

## Filters implemented

* Lens Correction
* Perspective
* Vignette
* Black & White
* Rotate
* Crop
