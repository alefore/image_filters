import {FilterConfig, ImageFilter, ImageFilterFactory, Point} from './filter.js';

class LensCorrectionFilter implements ImageFilter {
  private readonly distortionValue: HTMLInputElement;

  constructor(
      private readonly container: HTMLElement, private readonly inputMat: any,
      private readonly outputMat: any, private readonly onUpdate: () => void) {
    const div = document.createElement('div');
    container.append(div);

    const label = document.createElement('label') as HTMLLabelElement;
    label.htmlFor = 'distortion';
    label.textContent = 'Lens: ';
    div.append(label);

    // Create the input element
    this.distortionValue = document.createElement('input') as HTMLInputElement;
    this.distortionValue.type = 'range';
    this.distortionValue.min = '-1.0';
    this.distortionValue.max = '1.0';
    this.distortionValue.step = '0.01';
    this.distortionValue.value = '0';
    this.distortionValue.id = 'distortion';
    this.distortionValue.addEventListener(
        'input', (e: Event) => this.onUpdate());
    div.append(this.distortionValue);
  }

  public getConfig(): FilterConfig {
    return {
      type: 'LensCorrectionFilter',
      distortionValue: parseFloat(this.distortionValue.value)
    };
  }

  public loadConfig(config: FilterConfig): void {
    this.distortionValue.value = `${config.distortionValue}`;
    this.onUpdate();
  }

  public update(preview: boolean): void {
    const value = parseFloat(this.distortionValue.value);
    const cv = (window as any).cv;

    if (value === 0) {
      this.inputMat.copyTo(this.outputMat);
      return;
    }
    const f = Math.max(this.inputMat.cols, this.inputMat.rows);
    const cx = this.inputMat.cols / 2.0;
    const cy = this.inputMat.rows / 2.0;

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
