import {FilterConfig, ImageFilter, ImageFilterFactory, Point} from './filter.js';
import {filterRegistry} from './registry.js';
import {SettingsContainer} from './settings.js';

declare const cv: any;

export class ColorTuneFilter implements ImageFilter {
  private settings: SettingsContainer;
  private saturationSlider: HTMLInputElement;
  private warmthSlider: HTMLInputElement;

  constructor(
      parametersContainer: HTMLElement, private inputMat: any,
      private outputMat: any, onUpdate: () => void) {
    this.settings = new SettingsContainer(parametersContainer, onUpdate);

    this.saturationSlider = this.settings.addRangeSlider({
      id: 'saturation',
      label: 'Saturation',
      min: 0.0,
      max: 3.0,
      step: 0.1,
      initialValue: 1.0
    });

    this.warmthSlider = this.settings.addRangeSlider({
      id: 'warmth',
      label: 'Warmth',
      min: -50,
      max: 50,
      step: 1,
      initialValue: 0
    });
  }

  update(preview: boolean): void {
    const saturation = parseFloat(this.saturationSlider.value);
    const warmth = parseFloat(this.warmthSlider.value);

    const hsv = new cv.Mat();
    const hsvChannels = new cv.MatVector();
    const rgb = new cv.Mat();
    const rgbChannels = new cv.MatVector();
    let warmthMat: any = null;

    try {
      // 1. SATURATION (Process in HSV space)
      cv.cvtColor(this.inputMat, hsv, cv.COLOR_RGBA2RGB);
      cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);

      cv.split(hsv, hsvChannels);
      const s = hsvChannels.get(1);

      // Multiply Saturation channel
      s.convertTo(s, -1, saturation, 0);
      hsvChannels.set(1, s);
      cv.merge(hsvChannels, hsv);
      s.delete();

      // 2. WARMTH (Process in RGB space)
      cv.cvtColor(hsv, rgb, cv.COLOR_HSV2RGB);
      cv.split(rgb, rgbChannels);

      const r = rgbChannels.get(0);
      const b = rgbChannels.get(2);

      // Create a scalar matrix to add/subtract warmth
      warmthMat =
          new cv.Mat(r.rows, r.cols, r.type(), new cv.Scalar(Math.abs(warmth)));

      if (warmth > 0) {
        cv.add(r, warmthMat, r);
        cv.subtract(b, warmthMat, b);
      } else if (warmth < 0) {
        cv.subtract(r, warmthMat, r);
        cv.add(b, warmthMat, b);
      }

      rgbChannels.set(0, r);
      rgbChannels.set(2, b);
      cv.merge(rgbChannels, rgb);

      r.delete();
      b.delete();

      // Convert back to RGBA for the output canvas
      cv.cvtColor(rgb, this.outputMat, cv.COLOR_RGB2RGBA);
    } finally {
      hsv.delete();
      hsvChannels.delete();
      rgb.delete();
      rgbChannels.delete();
      if (warmthMat) warmthMat.delete();
    }
  }

  getConfig(): FilterConfig {
    return this.settings.augmentConfig({type: 'Color Tune'});
  }

  loadConfig(config: FilterConfig): void {
    this.settings.loadConfig(config);
  }
}

export class ColorTuneFactory implements ImageFilterFactory {
  install(
      parametersContainer: HTMLElement, inputCanvas: HTMLCanvasElement,
      inputMat: any, outputMat: any, onUpdate: () => void): ImageFilter {
    return new ColorTuneFilter(
        parametersContainer, inputMat, outputMat, onUpdate);
  }

  name(): string {
    return 'Color Tune';
  }
}

filterRegistry.register(new ColorTuneFactory());
