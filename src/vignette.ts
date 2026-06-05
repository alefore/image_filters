import {DraggablePointsFilter, ImageFilter, ImageFilterFactory, Point} from './filter.js';

class VignetteFilter extends DraggablePointsFilter {
  private maxOpacity = 0.85;

  private tempCanvas: HTMLCanvasElement;

  constructor(
      inputCanvas: HTMLCanvasElement, inputMat: any, private outputMat: any) {
    super(inputCanvas, inputMat);

    this.tempCanvas = document.createElement('canvas');
    this.addDraggablePoints([{x: 0.5, y: 0.5}]);
  }

  public update(preview: boolean): void {
    const focalPoint = this.getPixelPoint(this.points[0]!);
    const maxWidth = this.inputMat.cols;
    const maxHeight = this.inputMat.rows;
    const innerRadius = Math.max(maxWidth, maxHeight) * 0.4;

    console.log(
        'Vignette updating', focalPoint, maxWidth, maxHeight, innerRadius);

    this.tempCanvas.width = maxWidth;
    this.tempCanvas.height = maxHeight;

    const tempCtx =
        this.tempCanvas.getContext('2d', {willReadFrequently: true}) as
        CanvasRenderingContext2D;

    window.cv.imshow(this.tempCanvas, this.inputMat);

    const distTL = Math.hypot(focalPoint.x, focalPoint.y);
    const distTR = Math.hypot(maxWidth - focalPoint.x, focalPoint.y);
    const distBL = Math.hypot(focalPoint.x, maxHeight - focalPoint.y);
    const distBR =
        Math.hypot(maxWidth - focalPoint.x, maxHeight - focalPoint.y);
    const outerRadius = Math.max(distTL, distTR, distBL, distBR);

    const gradient = tempCtx.createRadialGradient(
        focalPoint.x, focalPoint.y, innerRadius, focalPoint.x, focalPoint.y,
        outerRadius);

    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;

      // Smoothstep formula
      const easedT = (t * t * (3 - 2 * t));
      const currentOpacity = this.maxOpacity * easedT;

      gradient.addColorStop(t, `rgba(0, 0, 0, ${currentOpacity})`);
    }

    tempCtx.fillStyle = gradient;
    tempCtx.fillRect(0, 0, maxWidth, maxHeight);

    const resultMat = window.cv.imread(this.tempCanvas);
    resultMat.copyTo(this.outputMat);
    resultMat.delete();
    if (preview) {
      this.drawInputPoints();
    }
  }
}

export class VignetteFilterFactory implements ImageFilterFactory {
  public install(
      container: HTMLElement, inputCanvas: HTMLCanvasElement, inputMat: any,
      outputMat: any): ImageFilter {
    return new VignetteFilter(inputCanvas, inputMat, outputMat);
  }

  public name() {
    return 'Vignette';
  }
}
