import {FilterConfig} from './filter.js';

export interface RangeSliderSettings {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  initialValue: number;
}

export class SettingsContainer {
  sliders: HTMLInputElement[] = [];

  constructor(
      private readonly container: HTMLDivElement,
      private readonly onUpdate: () => void) {}

  addRangeSlider(slider: RangeSliderSettings): HTMLInputElement {
    const label = document.createElement('label') as HTMLLabelElement;
    label.htmlFor = slider.id;
    label.textContent = `${slider.label}: `;

    const input = document.createElement('input') as HTMLInputElement;
    input.type = 'range';
    input.min = `${slider.min}`;
    input.max = `${slider.max}`;
    input.step = `${slider.step}`;
    input.value = `${slider.initialValue}`;
    input.id = slider.id;
    input.addEventListener('input', (e: Event) => this.onUpdate());

    this.container.appendChild(label);
    this.container.appendChild(input);
    this.sliders.push(input);
    return input;
  }

  augmentConfig(baseConfig: FilterConfig): FilterConfig {
    const slidersConfig = Object.fromEntries(
        this.sliders.map(input => [input.id, parseFloat(input.value)]));
    return {...baseConfig, ...slidersConfig};
  }

  loadConfig(config: FilterConfig) {
    this.sliders.map(input => {
      if (input.id in config) {
        if (typeof config[input.id] === 'number') {
          input.value = `${config[input.id]}`;
        } else {
          throw new Error(
              `Invalid type for ${input.id}: ${typeof config[input.id]}`);
        }
      }
    });
    this.onUpdate();
  }
}
