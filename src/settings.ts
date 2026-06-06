export interface RangeSliderSettings {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  initialValue: number;
  onUpdate: () => void;
}

export function newRangeSliderControl(
    container: HTMLDivElement, slider: RangeSliderSettings): HTMLInputElement {
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
  input.addEventListener('input', (e: Event) => slider.onUpdate());

  container.appendChild(label);
  container.appendChild(input);
  return input;
}
