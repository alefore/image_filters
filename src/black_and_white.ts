import {FilterConfig, ImageFilter, ImageFilterFactory} from './filter.js';

export class BlackAndWhiteFilter implements ImageFilter {
  constructor(private inputMat: any, private outputMat: any) {}

  public update(preview: boolean): void {
    window.cv.cvtColor(
        this.inputMat, this.outputMat, window.cv.COLOR_RGBA2GRAY);
    window.cv.cvtColor(
        this.outputMat, this.outputMat, window.cv.COLOR_GRAY2RGBA);
  }

  public getConfig(): FilterConfig {
    return {
      type: 'Black & White',
    };
  }

  public loadConfig(config: FilterConfig): void {}
}

export class BlackAndWhiteFilterFactory implements ImageFilterFactory {
  public install(
      container: HTMLElement, inputCanvas: HTMLCanvasElement, inputMat: any,
      outputMat: any, onUpdate: () => void): ImageFilter {
    return new BlackAndWhiteFilter(inputMat, outputMat);
  }

  public name() {
    return 'Black & White';
  }
}