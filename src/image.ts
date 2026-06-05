import {Point} from './filter.js';

declare global {
  interface Window {
    onOpenCvReady: () => void;
    cv: any;
  }
}

export function generateImageCanvas(
    points: Point[], sourceMat: any, showGrid: boolean, focalPoint?: Point,
    maxOpacity: number = 0.7): HTMLCanvasElement {
  const cv = window.cv;
  const [tl, tr, br, bl] = points;

  const widthA = Math.hypot(br.x - bl.x, br.y - bl.y);
  const widthB = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const maxWidth = Math.max(Math.floor(widthA), Math.floor(widthB));

  const heightA = Math.hypot(tr.x - br.x, tr.y - br.y);
  const heightB = Math.hypot(tl.x - bl.x, tl.y - bl.y);
  const maxHeight = Math.max(Math.floor(heightA), Math.floor(heightB));

  const srcCoords = cv.matFromArray(
      4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
  const dstCoords = cv.matFromArray(
      4, 1, cv.CV_32FC2,
      [0, 0, maxWidth - 1, 0, maxWidth - 1, maxHeight - 1, 0, maxHeight - 1]);

  const dsize = new cv.Size(maxWidth, maxHeight);
  const M = cv.getPerspectiveTransform(srcCoords, dstCoords);
  const warpedMat = new cv.Mat();

  cv.warpPerspective(
      sourceMat, warpedMat, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT,
      new cv.Scalar());

  const tempCanvas = document.createElement('canvas');
  cv.imshow(tempCanvas, warpedMat);

  if (showGrid) {
    const ctx = tempCanvas.getContext('2d')!;
    const thickness =
        Math.max(1, Math.floor(Math.max(maxWidth, maxHeight) / 500));
    ctx.lineWidth = thickness;
    ctx.strokeStyle = 'rgb(0, 255, 255)';

    ctx.beginPath();
    for (let i = 1; i < 10; i++) {
      const x = maxWidth * (i / 10.0);
      const y = maxHeight * (i / 10.0);

      ctx.moveTo(x, 0);
      ctx.lineTo(x, maxHeight);

      ctx.moveTo(0, y);
      ctx.lineTo(maxWidth, y);
    }
    ctx.stroke();
  }

  srcCoords.delete();
  dstCoords.delete();
  M.delete();
  warpedMat.delete();

  return tempCanvas;
}
