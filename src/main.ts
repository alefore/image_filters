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
  private inputCanvas: HTMLCanvasElement;

  constructor(
      public readonly generator:
          ((points: Point[], sourceMat: any, showGrid: boolean,
            focalPoint?: Point) => HTMLCanvasElement),
      private readonly previewResolution: HTMLInputElement) {
    this.status = document.getElementById('status')!;
    this.status.innerText = 'Upload an image to begin.';

    this.previewResolution.addEventListener(
        'change', () => this.updateLowResImage());

    this.inputCanvas = document.createElement('canvas');
    this.installFilters();
  }

  public loadImage(file: File): void {
    const url = URL.createObjectURL(file);
    this.highResImage = new Image();
    this.highResImage.onload = () => {
      this.updateLowResImage();
      URL.revokeObjectURL(url);
    };
    this.highResImage.src = url;
  }

  private updateLowResImage() {
    console.log('updateLowResImage');
    if (!this.highResImage) return;
    let targetWidth = this.highResImage!.width;
    let targetHeight = this.highResImage!.height;
    if (this.previewResolution.value === 'Original') {
      console.log('Image update: No scaling.');
    } else {
      const maxDimension = parseFloat(this.previewResolution.value);
      console.log(`Image update: Scaling: ${maxDimension}`);
      // Calculate ratio and create the smaller UI proxy
      if (targetWidth > maxDimension || targetHeight > maxDimension) {
        const ratio =
            Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
        targetWidth = Math.round(targetWidth * ratio);
        targetHeight = Math.round(targetHeight * ratio);
      }
    }

    this.inputCanvas.width = targetWidth;
    this.inputCanvas.height = targetHeight;
    const ctx = this.inputCanvas.getContext('2d')!;
    ctx.drawImage(this.highResImage!, 0, 0, targetWidth, targetHeight);

    this.lowResImage = new Image();
    this.lowResImage.onload = () => {
      this.updateDisplay();
    };
    this.lowResImage.src = this.inputCanvas.toDataURL('image/jpeg', 0.95);
  }

  private installFilters(): void {
    const filterFactories = [
      new LensCorrectionFilterFactory(), new PerspectiveFilterFactory(),
      new VignetteFilterFactory(), new BlackAndWhiteFilterFactory()
    ];
    let container = document.getElementById('canvas-container')!;
    container.replaceChildren();
    this.inputMat = new window.cv.Mat();
    let inputMat = this.inputMat;
    let inputCanvas = this.inputCanvas;
    this.filtersData = [];
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

window.onOpenCvReady = () => {
  window.cv['onRuntimeInitialized'] = () => {
    const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
    const updateBtn = document.getElementById('updateBtn') as HTMLButtonElement;
    const app = new PerspectiveEditor(
        generateImageCanvas,
        document.getElementById('maxDimension')! as HTMLInputElement);

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
};