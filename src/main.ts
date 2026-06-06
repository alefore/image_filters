import {BlackAndWhiteFilterFactory} from './black_and_white.js';
import {type FilterConfig, type ImageFilter, type Point} from './filter.js';
import {generateImageCanvas} from './image.js';
import {LensCorrectionFilterFactory} from './lens_correction.js';
import {PerspectiveFilterFactory} from './perspective.js';
import {VignetteFilterFactory} from './vignette.js';

// declare global {
//   interface Window {
//     onOpenCvReady: () => void;
//     cv: any;
//   }
// }

interface FilterData {
  filter: ImageFilter;
  outputMat: any;
  outputCanvas: HTMLCanvasElement;
}

class PerspectiveEditor {
  private status: HTMLElement;

  private highResImage: HTMLImageElement|null = null;
  private lowResImage: HTMLImageElement|null = null;
  private inputMat: any = null;

  private filtersData: FilterData[] = [];

  constructor(
      public readonly generator:
          ((points: Point[], sourceMat: any, showGrid: boolean,
            focalPoint?: Point) => HTMLCanvasElement)) {
    this.status = document.getElementById('status')!;
    this.status.innerText = 'Upload an image to begin.';
  }

  public loadImage(file: File): void {
    const url = URL.createObjectURL(file);
    this.highResImage = new Image();

    this.highResImage.onload = () => {
      const MAX_DIMENSION = 800;
      let targetWidth = this.highResImage!.width;
      let targetHeight = this.highResImage!.height;

      // Calculate ratio and create the smaller UI proxy
      if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
        const ratio =
            Math.min(MAX_DIMENSION / targetWidth, MAX_DIMENSION / targetHeight);
        targetWidth = Math.round(targetWidth * ratio);
        targetHeight = Math.round(targetHeight * ratio);
      }

      const inputCanvas = document.createElement('canvas');
      inputCanvas.width = targetWidth;
      inputCanvas.height = targetHeight;
      const ctx = inputCanvas.getContext('2d')!;
      ctx.drawImage(this.highResImage!, 0, 0, targetWidth, targetHeight);

      this.lowResImage = new Image();
      this.lowResImage.onload = () => {
        this.installFilters(inputCanvas, targetWidth, targetHeight);
        this.updateDisplay();
        URL.revokeObjectURL(url);
      };
      this.lowResImage.src = inputCanvas.toDataURL('image/jpeg', 0.95);
    };

    this.highResImage.src = url;
  }

  private installFilters(
      initialCanvas: HTMLCanvasElement, targetWidth: number,
      targetHeight: number): void {
    const filterFactories = [
      new LensCorrectionFilterFactory(), new PerspectiveFilterFactory(),
      new VignetteFilterFactory(), new BlackAndWhiteFilterFactory()
    ];
    let container = document.getElementById('canvas-container')!;
    this.inputMat = new window.cv.Mat();
    let inputMat = this.inputMat;
    let inputCanvas = initialCanvas;
    filterFactories.forEach((factory, index) => {
      const details = document.createElement('details');
      details.open = true;
      const summary = document.createElement('summary');
      summary.innerHTML = factory.name();
      details.appendChild(summary);
      const cv = (window as any).cv;
      const outputMat = new cv.Mat();
      const filter = factory.install(
          details, inputCanvas, inputMat, outputMat,
          () => this.applyFilters(true, index));
      const outputCanvas = document.createElement('canvas');
      details.appendChild(outputCanvas);
      container.appendChild(details);
      this.filtersData.push({filter, outputMat, outputCanvas});
      inputMat = outputMat;
      inputCanvas = outputCanvas;
    });
  }

  private applyFilters(preview: boolean, initialIndex: number) {
    const inputMat = initialIndex === 0 ?
        window.cv.imread(preview ? this.lowResImage : this.highResImage) :
        this.filtersData[initialIndex - 1].outputMat;
    inputMat.copyTo(this.inputMat);
    this.filtersData.slice(initialIndex).forEach((filterData) => {
      filterData.filter.update(preview);
      if (preview) {
        filterData.outputCanvas.width = filterData.outputMat.cols;
        filterData.outputCanvas.height = filterData.outputMat.rows;
        window.cv.imshow(filterData.outputCanvas, filterData.outputMat);
      }
    });
    if (initialIndex === 0) inputMat.delete();

    document.getElementById('filter-config')!.textContent = JSON.stringify(
        this.filtersData.map(filterData => filterData.filter.getConfig()), null,
        2);
  }

  public async loadConfig(file: File): Promise<void> {
    const jsonString = await file.text();
    try {
      const loadedConfigs: FilterConfig[] = JSON.parse(jsonString);
      this.filtersData.forEach(
          (filterData, index) =>
              filterData.filter.loadConfig(loadedConfigs[index]));
    } catch (error) {
      console.error('Failed to parse config', error);
      return;
    }
    this.updateDisplay();
  }

  public updateDisplay(): void {
    this.applyFilters(true, 0);
    // this.status.innerHTML = `Output ${previewImg.width * this.scaleRatio}
    // by
    // ${ previewImg.height * this.scaleRatio}.`;
  }

  public saveImage(): void {
    const cv = window.cv;
    const link = document.createElement('a');
    this.applyFilters(false, 0);
    link.download = 'output.jpg';
    const lastFilterData = this.filtersData[this.filtersData.length - 1];
    const tmpCanvas = document.createElement('canvas');
    window.cv.imshow(tmpCanvas, lastFilterData.outputMat);
    link.href = tmpCanvas.toDataURL('image/jpeg', 0.95);
    link.click();
  }
}

let app: PerspectiveEditor;

window.onOpenCvReady = () => {
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const updateBtn = document.getElementById('updateBtn') as HTMLButtonElement;
  app = new PerspectiveEditor(generateImageCanvas);

  document.getElementById('imageInput')
      ?.addEventListener('change', (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          app.loadImage(file);
          saveBtn.disabled = false;
          updateBtn.disabled = false;
        }
      });
  document.getElementById('configInput')
      ?.addEventListener('change', async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          await app.loadConfig(file);
        }
      });
  saveBtn.addEventListener('click', () => app.saveImage());
  updateBtn.addEventListener('click', () => app.updateDisplay());
};
