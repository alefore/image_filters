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
  // Creates a new ImageFilter. On `update`, will read from `inputMat`, apply a
  // filter, and write the output to `outputMat`. If it needs to display input
  // points, displays them in inputCanvas. If it needs to add input elements (to
  // configure filter parameters), adds them to parametersContainer.
  install(
      parametersContainer: HTMLElement, inputCanvas: HTMLCanvasElement,
      inputMat: any, outputMat: any, onUpdate: () => void): ImageFilter;

  name(): string;
}

export interface Point {
  x: number;
  y: number;
}
