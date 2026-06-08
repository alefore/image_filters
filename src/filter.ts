export interface FilterConfig {
  type: string;
  [key: string]: any;
}

export interface ImageFilter {
  update(preview: boolean): void;

  getConfig(): FilterConfig;
  loadConfig(config: FilterConfig): void;
}

export interface ImageFilterFactory {
  install(
      parametersContainer: HTMLElement, inputCanvas: HTMLCanvasElement,
      inputMat: any, outputMat: any, onUpdate: () => void): ImageFilter;

  name(): string;
}

export interface Point {
  x: number;
  y: number;
}
