/**
 * sRGB (gamma-encoded) 8-bit  ->  linear-light float.
 * input:  CV_8UC3 or CV_8UC4, values 0..255, sRGB-encoded
 * output: CV_32FC3 or CV_32FC4, values 0..1, linear
 *
 * Alpha (4th channel), if present, is NOT a color value and must stay
 * linear/untouched.
 */
export function srgbToLinear(input: any, output: any): void {
  // 1. to float 0..1
  const f = new window.cv.Mat();
  input.convertTo(f, window.cv.CV_32F, 1.0 / 255.0);

  const channels = new window.cv.MatVector();
  window.cv.split(f, channels);
  const n = channels.size();
  const colorCount = n === 4 ? 3 : n;  // don't transform alpha

  const mats: any[] = [];
  for (let i = 0; i < colorCount; i++) {
    mats.push(channels.get(i));
  }

  for (let i = 0; i < colorCount; i++) {
    const c = mats[i];
    linearizeChannel(c);
    channels.set(i, c);
  }

  window.cv.merge(channels, output);

  mats.forEach((m) => m.delete());
  channels.delete();
  f.delete();
}

/**
 * linear-light float  ->  sRGB (gamma-encoded) 8-bit.
 * input:  CV_32FC3 or CV_32FC4, values 0..1 (linear)
 * output: CV_8UC3 or CV_8UC4, values 0..255, sRGB-encoded
 *
 * Use this for the per-step display copies AND the final output.
 */
function linearToSrgb(input: any, output: any): void {
  const channels = new window.cv.MatVector();
  window.cv.split(input, channels);
  const n = channels.size();
  const colorCount = n === 4 ? 3 : n;

  const outChannels = new window.cv.MatVector();

  for (let i = 0; i < n; i++) {
    const c = channels.get(i);  // CV_32F, 0..1 linear
    if (i < colorCount) {
      encodeChannel(c);
    }

    const c8 = new window.cv.Mat();
    c.convertTo(c8, window.cv.CV_8U, 255.0);
    outChannels.push_back(c8);

    c8.delete();
    c.delete();
  }

  window.cv.merge(outChannels, output);

  channels.delete();
  outChannels.delete();
}

/**
 * sRGB-encoded -> linear, in place, on one CV_32F channel (0..1).
 *   c <= 0.04045 : c / 12.92
 *   c >  0.04045 : ((c + 0.055) / 1.055) ^ 2.4
 */
function linearizeChannel(c: any): void {
  const lo = new window.cv.Mat();  // c / 12.92
  c.convertTo(lo, -1, 1.0 / 12.92, 0.0);

  // hi = ((c + 0.055)/1.055)^2.4
  const hi = new window.cv.Mat();
  c.convertTo(hi, -1, 1.0 / 1.055, 0.055 / 1.055);  // (c + 0.055)/1.055
  window.cv.pow(hi, 2.4, hi);

  // mask = c > 0.04045  (255 where true, as CV_8U)
  const mask = new window.cv.Mat();
  window.cv.threshold(c, mask, 0.04045, 255, window.cv.THRESH_BINARY);
  mask.convertTo(mask, window.cv.CV_8U);

  // c = lo everywhere, then overwrite with hi where mask
  lo.copyTo(c);
  hi.copyTo(c, mask);

  lo.delete();
  hi.delete();
  mask.delete();
}

/**
 * linear -> sRGB-encoded, in place, on one CV_32F channel (0..1).
 *   c <= 0.0031308 : c * 12.92
 *   c >  0.0031308 : 1.055 * c^(1/2.4) - 0.055
 */
function encodeChannel(c: any): void {
  const lo = new window.cv.Mat();  // c * 12.92
  c.convertTo(lo, -1, 12.92, 0.0);

  // hi = 1.055 * c^(1/2.4) - 0.055
  const hi = new window.cv.Mat();
  window.cv.pow(c, 1.0 / 2.4, hi);
  hi.convertTo(hi, -1, 1.055, -0.055);

  const mask = new window.cv.Mat();
  window.cv.threshold(c, mask, 0.0031308, 255, window.cv.THRESH_BINARY);
  mask.convertTo(mask, window.cv.CV_8U);

  lo.copyTo(c);
  hi.copyTo(c, mask);

  lo.delete();
  hi.delete();
  mask.delete();
}

export function showLinearInCanvas(linearMat: any, canvas: HTMLCanvasElement) {
  canvas.width = linearMat.cols;
  canvas.height = linearMat.rows;
  const tmpMat = new window.cv.Mat();
  linearToSrgb(linearMat, tmpMat);
  window.cv.imshow(canvas, tmpMat);
  tmpMat.delete();
}
