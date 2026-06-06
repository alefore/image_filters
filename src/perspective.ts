import {DraggablePointsFilter, ImageFilter, ImageFilterFactory, Point} from './filter.js';

class PerspectiveFilter extends DraggablePointsFilter {
  constructor(
      inputCanvas: HTMLCanvasElement, inputMat: any, private outputMat: any,
      onUpdate: () => void) {
    super(inputCanvas, inputMat, onUpdate);
    this.addDraggablePoints([
      {x: 0.1, y: 0.1}, {x: 0.9, y: 0.1}, {x: 0.9, y: 0.9}, {x: 0.1, y: 0.9}
    ]);
  }

  public update(preview: boolean): void {
    const cv = window.cv;
    const [tl, tr, br, bl] = this.points.map((p) => this.getPixelPoint(p));
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

    cv.warpPerspective(
        this.inputMat, this.outputMat, M, dsize, cv.INTER_LINEAR,
        cv.BORDER_CONSTANT, new cv.Scalar());

    if (preview) {
      const thickness =
          Math.max(1, Math.floor(Math.max(maxWidth, maxHeight) / 500));

      // Cyan color in RGBA (OpenCV.js uses RGBA by default when reading from a
      // Canvas) R=0, G=255, B=255, A=255
      const color = new cv.Scalar(0, 255, 255, 255);

      for (let i = 1; i < 10; i++) {
        const x = Math.round(maxWidth * (i / 10.0));
        const y = Math.round(maxHeight * (i / 10.0));

        // Vertical
        cv.line(
            this.outputMat, new cv.Point(x, 0), new cv.Point(x, maxHeight),
            color, thickness, cv.LINE_8, 0);

        // Horizontal
        cv.line(
            this.outputMat, new cv.Point(0, y), new cv.Point(maxWidth, y),
            color, thickness, cv.LINE_8, 0);
      }
    }

    srcCoords.delete();
    dstCoords.delete();
    M.delete();

    this.drawInputPoints();
  }

  private drawEditor(): void {
    const cv = (window as any).cv;
    const inputCtx = this.inputCanvas.getContext('2d')!;
    inputCtx.beginPath();
    inputCtx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      inputCtx.lineTo(this.points[i].x, this.points[i].y);
    }
    inputCtx.closePath();
    inputCtx.lineWidth = 2;
    inputCtx.strokeStyle = 'rgb(0, 255, 0)';
    inputCtx.stroke();
  }
}

export class PerspectiveFilterFactory implements ImageFilterFactory {
  public install(
      container: HTMLElement, inputCanvas: HTMLCanvasElement, inputMat: any,
      outputMat: any, onUpdate: () => void): ImageFilter {
    return new PerspectiveFilter(inputCanvas, inputMat, outputMat, onUpdate);
  }

  public name() {
    return 'Perspective';
  }
}
