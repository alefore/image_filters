import {FilterConfig} from './filter.js';

export interface RangeSliderSettings {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  initialValue: number;
}

export interface SelectSettings {
  id: string;
  label: string;
  options: string[];
  defaultOption: string;
}

export class SettingsContainer {
  private div: HTMLElement;
  private sliders: HTMLInputElement[] = [];
  private selects: HTMLSelectElement[] = [];

  constructor(container: HTMLElement, private readonly onUpdate: () => void) {
    this.div = document.createElement('div');
    container.appendChild(this.div);
  }

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

    this.div.appendChild(label);
    this.div.appendChild(input);
    this.sliders.push(input);
    return input;
  }

  addSelect(settings: SelectSettings): HTMLSelectElement {
    const label = document.createElement('label') as HTMLLabelElement;
    label.htmlFor = settings.id;
    label.textContent = `${settings.label}: `;

    const select = document.createElement('select') as HTMLSelectElement;
    select.id = settings.id;

    settings.options.forEach(optionValue => {
      const option = document.createElement('option') as HTMLOptionElement;
      option.value = optionValue;
      option.textContent = optionValue;

      if (optionValue === settings.defaultOption) {
        option.selected = true;
      }

      select.appendChild(option);
    });

    select.addEventListener('change', (e: Event) => this.onUpdate());

    this.div.appendChild(label);
    this.div.appendChild(select);
    this.selects.push(select);

    return select;
  }

  augmentConfig(baseConfig: FilterConfig): FilterConfig {
    const slidersConfig = Object.fromEntries(
        this.sliders.map(input => [input.id, parseFloat(input.value)]));
    const selectsConfig = Object.fromEntries(
        this.selects.map(select => [select.id, select.value]));
    return {...baseConfig, ...slidersConfig, ...selectsConfig};
  }

  loadConfig(config: FilterConfig) {
    this.sliders.forEach(input => {
      if (input.id in config) {
        if (typeof config[input.id] === 'number') {
          input.value = `${config[input.id]}`;
        } else {
          throw new Error(
              `Invalid type for ${input.id}: ${typeof config[input.id]}`);
        }
      }
    });
    this.selects.forEach(select => {
      if (select.id in config) {
        const incomingValue = config[select.id];
        if (typeof incomingValue === 'string') {
          const validOptions = Array.from(select.options).map(opt => opt.value);
          if (!validOptions.includes(incomingValue)) {
            throw new Error(
                `Invalid value for select ${select.id}: ${incomingValue}`);
          }
          select.value = config[select.id] as string;
        } else {
          throw new Error(`Invalid type for select ${
              select.id}: expected string, got ${typeof config[select.id]}`);
        }
      }
    });
  }
}
