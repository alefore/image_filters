import {FilterConfig, ImageFilter, ImageFilterFactory} from './filter.js';
import {filterRegistry} from './registry.js';
import {SettingsContainer} from './settings.js';

declare const cv: any;

export class ContrastBrightnessFilter implements ImageFilter {
  private readonly settings: SettingsContainer;
  private readonly contrastSlider: HTMLInputElement;
  private readonly brightnessSlider: HTMLInputElement;

  constructor(
      parametersContainer: HTMLElement, private inputMat: any,
      private outputMat: any, onUpdate: () => void) {
    this.settings = new SettingsContainer(parametersContainer, onUpdate);
    this.contrastSlider = this.settings.addRangeSlider({
      id: 'contrast',
      label: 'Contrast',
      min: 0.0,
      max: 3.0,
      step: 0.1,
      initialValue: 1.0
    });
    this.brightnessSlider = this.settings.addRangeSlider({
      id: 'brightness',
      label: 'Brightness',
      min: -100,
      max: 100,
      step: 1,
      initialValue: 0
    });
  }

  update(preview: boolean): void {
    const contrast = parseFloat(this.contrastSlider.value);
    const brightness = parseFloat(this.brightnessSlider.value);

    // convertTo(dest, rtype, alpha, beta)
    // output = input * alpha + beta
    this.inputMat.convertTo(this.outputMat, -1, contrast, brightness);
  }

  getConfig(): FilterConfig {
    return this.settings.augmentConfig({type: 'Contrast & Brightness'});
  }

  loadConfig(config: FilterConfig): void {
    this.settings.loadConfig(config);
  }
}

export class ContrastBrightnessFactory implements ImageFilterFactory {
  install(
      parametersContainer: HTMLElement, inputCanvas: HTMLCanvasElement,
      inputMat: any, outputMat: any, onUpdate: () => void): ImageFilter {
    return new ContrastBrightnessFilter(
        parametersContainer, inputMat, outputMat, onUpdate);
  }

  name(): string {
    return 'Contrast & Brightness';
  }
}

filterRegistry.register(new ContrastBrightnessFactory());
