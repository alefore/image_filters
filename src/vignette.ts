import {DraggablePointsFilter, FilterConfig, ImageFilter, ImageFilterFactory} from './filter.js';
import {newRangeSliderControl} from './settings.js';

class VignetteFilter extends DraggablePointsFilter {
  private readonly maxOpacity: HTMLInputElement;

  private tempCanvas: HTMLCanvasElement;

  constructor(
      container: HTMLElement, inputCanvas: HTMLCanvasElement, inputMat: any,
      private outputMat: any, onUpdate: () => void) {
    super(inputCanvas, inputMat, onUpdate);

    this.tempCanvas = document.createElement('canvas');
    this.addDraggablePoints([{x: 0.5, y: 0.5}]);

    const div = document.createElement('div');
    this.maxOpacity = newRangeSliderControl(div, {
      id: 'max-opacity',
      label: 'Opacity',
      min: 0,
      max: 1.0,
      step: 0.01,
      initialValue: 0.55,
      onUpdate: onUpdate
    });
    container.appendChild(div);
  }

  protected get filterType(): string {
    return 'VignetteFilter';
  }

  public getConfig(): FilterConfig {
    const baseConfig = super.getConfig();
    return {...baseConfig, opacity: parseFloat(this.maxOpacity.value)};
  }

  public loadConfig(config: FilterConfig): void {
    super.loadConfig(config);
    if (typeof config.opacity === 'number') {
      this.maxOpacity.value = `${config.opacity}`;
    }
  }

  public update(preview: boolean): void {
    const maxOpacityValue = parseFloat(this.maxOpacity.value);
    if (maxOpacityValue === 0) {
      this.inputMat.copyTo(this.outputMat);
      return;
    }

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
      const currentOpacity = maxOpacityValue * easedT;

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
      outputMat: any, onUpdate: () => void): ImageFilter {
    return new VignetteFilter(
        container, inputCanvas, inputMat, outputMat, onUpdate);
  }

  public name() {
    return 'Vignette';
  }
}
