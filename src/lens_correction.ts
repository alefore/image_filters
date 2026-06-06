import {FilterConfig, ImageFilter, ImageFilterFactory, Point} from './filter.js';
import {newRangeSliderControl} from './settings.js';

class LensCorrectionFilter implements ImageFilter {
  private readonly distortionValue: HTMLInputElement;

  constructor(
      private readonly container: HTMLElement, private readonly inputMat: any,
      private readonly outputMat: any, onUpdate: () => void) {
    const div = document.createElement('div');
    this.distortionValue = newRangeSliderControl(div, {
      id: 'distortion',
      label: 'Lens',
      min: -1.0,
      max: 1.0,
      step: 0.01,
      initialValue: 0,
      onUpdate: onUpdate
    });
    container.appendChild(div);
  }

  public getConfig(): FilterConfig {
    return {
      type: 'LensCorrectionFilter',
      distortionValue: parseFloat(this.distortionValue.value)
    };
  }

  public loadConfig(config: FilterConfig): void {
    this.distortionValue.value = `${config.distortionValue}`;
  }

  public update(preview: boolean): void {
    const value = parseFloat(this.distortionValue.value);
    if (value === 0) {
      this.inputMat.copyTo(this.outputMat);
      return;
    }
    const f = Math.max(this.inputMat.cols, this.inputMat.rows);
    const cx = this.inputMat.cols / 2.0;
    const cy = this.inputMat.rows / 2.0;

    const cv = (window as any).cv;

    // 3x3 Camera Matrix must be CV_64F (double precision)
    const cameraMatrix =
        cv.matFromArray(3, 3, cv.CV_64F, [f, 0, cx, 0, f, cy, 0, 0, 1]);

    // We only care about k1 for primary barrel/pincushion correction
    const distCoeffs = cv.matFromArray(1, 5, cv.CV_64F, [value, 0, 0, 0, 0]);

    cv.undistort(this.inputMat, this.outputMat, cameraMatrix, distCoeffs);
    cameraMatrix.delete();
    distCoeffs.delete();
  }
}

export class LensCorrectionFilterFactory implements ImageFilterFactory {
  public install(
      container: HTMLElement, inputCanvas: HTMLCanvasElement, inputMat: any,
      outputMat: any, onUpdate: () => void): ImageFilter {
    return new LensCorrectionFilter(container, inputMat, outputMat, onUpdate);
  }

  public name() {
    return 'Lens Correction';
  }
}
