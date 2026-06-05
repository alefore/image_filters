declare global {
  interface Window {
    onOpenCvReady: () => void;
    cv: any;
  }
}

export interface Point {
  x: number;
  y: number;
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
  const ctx = tempCanvas.getContext('2d')!;

  if (focalPoint) {
    const focalPtMat =
        cv.matFromArray(1, 1, cv.CV_32FC2, [focalPoint.x, focalPoint.y]);
    const warpedFocalMat = new cv.Mat();

    cv.perspectiveTransform(focalPtMat, warpedFocalMat, M);

    const warpedFocalX = warpedFocalMat.data32F[0];
    const warpedFocalY = warpedFocalMat.data32F[1];

    focalPtMat.delete();
    warpedFocalMat.delete();

    const maxDimension = Math.max(maxWidth, maxHeight);
    const innerRadius = maxDimension * 0.4;

    const distTL = Math.hypot(warpedFocalX, warpedFocalY);
    const distTR = Math.hypot(maxWidth - warpedFocalX, warpedFocalY);
    const distBL = Math.hypot(warpedFocalX, maxHeight - warpedFocalY);
    const distBR =
        Math.hypot(maxWidth - warpedFocalX, maxHeight - warpedFocalY);
    const outerRadius = Math.max(distTL, distTR, distBL, distBR);

    const gradient = ctx.createRadialGradient(
        warpedFocalX, warpedFocalY, innerRadius, warpedFocalX, warpedFocalY,
        outerRadius);

    // gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    // gradient.addColorStop(1, `rgba(0, 0, 0, ${maxOpacity})`);
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;  // From 0.0 to 1.0 linearly.

      // Apply the Smoothstep formula to non-linearly scale the opacity
      const easedT = (t * t * (3 - 2 * t));
      const currentOpacity = maxOpacity * easedT;

      gradient.addColorStop(t, `rgba(0, 0, 0, ${currentOpacity})`);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, maxWidth, maxHeight);
  }

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
