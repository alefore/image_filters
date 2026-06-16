import './lens_correction.js';
import './perspective.js';
import './vignette.js';
import './black_and_white.js';
import './rotate.js';
import './crop.js';
import './contrast_brightness.js';
import './color_tune.js';

import {showLinearInCanvas, srgbToLinear} from './encoding.js';
import {type FilterConfig, type ImageFilter, type Point} from './filter.js';
import {generateImageCanvas} from './image.js';
import {filterRegistry} from './registry.js';

interface FilterData {
  filter: ImageFilter;
  outputMat: any;
  outputCanvas: HTMLCanvasElement;
}

interface MatWithOwnershipInfo {
  mat: any;
  owned: boolean;
}

const defaultPreviewResolutionDimension = '800';

class PerspectiveEditor {
  private highResMatLinear: any = new window.cv.Mat();
  private lowResMatLinear: any = new window.cv.Mat();
  private firstFilterInputMat: any = new window.cv.Mat();

  private filtersData: FilterData[] = [];
  private inputCanvas: HTMLCanvasElement = document.createElement('canvas');
  private canvasContainer: HTMLElement;
  private previewResolution: HTMLSelectElement|null = null;
  private jsonView: HTMLTextAreaElement|null = null;

  constructor(
      public readonly generator:
          ((points: Point[], sourceMat: any, showGrid: boolean,
            focalPoint?: Point) => HTMLCanvasElement),
      private readonly controls: HTMLElement) {
    this.canvasContainer = document.getElementById('canvas-container')!;
  }

  private onFirstImageLoaded(): void {
    this.previewResolution = this.appendSelectPreviewResolutionControl();
    this.appendAddFilterControl();
    this.appendSaveButton();
    this.canvasContainer.replaceChildren(this.inputCanvas);

    const h2 = document.createElement('h2');
    h2.textContent = 'Filters Configuration (JSON)';

    this.jsonView = document.createElement('textarea');
    this.jsonView.id = 'filters-config';
    this.jsonView.spellcheck = false;
    this.jsonView.autocomplete = 'off';
    this.jsonView.autocapitalize = 'off';
    this.jsonView.wrap = 'off';
    this.jsonView.setAttribute('autocorrect', 'off');
    this.jsonView.addEventListener(
        'input', () => this.loadConfig(this.jsonView!.value));
    const configOutputDiv = document.getElementById('filters-config')!;
    configOutputDiv.replaceChildren(h2, this.jsonView);
  }

  private syncJsonView() {
    if (document.activeElement === this.jsonView) return;
    this.jsonView!.value = JSON.stringify(
        this.filtersData.map(filterData => filterData.filter.getConfig()), null,
        2);
  }

  private appendAddFilterControl(): void {
    const popoverId = 'filter-menu-popover';

    const trigger = document.createElement('button');
    trigger.className = 'add-filter-button';
    trigger.textContent = '+Filter';
    trigger.setAttribute('popovertarget', popoverId);

    const popoverDiv = document.createElement('div');
    popoverDiv.id = popoverId;
    popoverDiv.className = 'popover-menu';
    popoverDiv.setAttribute('popover', 'auto');

    const ul = document.createElement('ul');
    ul.className = 'filter-list';

    filterRegistry.getAllNames().forEach((name) => {
      const li = document.createElement('li');
      const filterButton = document.createElement('button');
      filterButton.textContent = name;
      li.appendChild(filterButton);
      ul.appendChild(li);
    });

    popoverDiv.appendChild(ul);

    popoverDiv.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const button = target.closest<HTMLButtonElement>('button')!;
      this.appendFilter(button.textContent);
      this.applyFilters(true, this.filtersData.length - 1);
      if ('hidePopover' in popoverDiv &&
          typeof (popoverDiv as any).hidePopover === 'function') {
        (popoverDiv as any).hidePopover();
      }
    });

    this.controls.appendChild(trigger);
    this.controls.appendChild(popoverDiv);
  }

  private appendSaveButton(): void {
    const button = document.createElement('button');
    button.textContent = 'Save';
    button.addEventListener('click', () => this.saveImage());
    this.controls.appendChild(button);
  }

  private appendSelectPreviewResolutionControl(): HTMLSelectElement {
    const dimensionOptions: string[] =
        ['400', '600', '800', '1024', '2048', 'Original'];
    const selectElement = document.createElement('select');
    dimensionOptions.forEach((optionValue: string) => {
      const optionElement: HTMLOptionElement = document.createElement('option');
      optionElement.textContent = optionValue;
      optionElement.value = optionValue;
      if (optionValue === defaultPreviewResolutionDimension) {
        optionElement.selected = true;
      }
      selectElement.appendChild(optionElement);
    });
    selectElement.addEventListener('change', () => this.updateLowResImage());
    this.controls.appendChild(selectElement);
    return selectElement;
  }

  public loadImage(file: File): void {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const srgbMat = window.cv.imread(image);
      srgbToLinear(srgbMat, this.highResMatLinear);
      srgbMat.delete();
      this.updateLowResImage();
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }

  private updateLowResImage() {
    console.log('updateLowResImage');
    if (!this.highResMatLinear)
      throw new Error('Attempted to update low res without high res.');
    this.inputCanvas.width = this.highResMatLinear.cols;
    this.inputCanvas.height = this.highResMatLinear.rows;
    if (this.previewResolution && this.previewResolution.value === 'Original') {
      console.log('Image update: No scaling.');
    } else {
      const maxDimension = parseFloat(
          this.previewResolution ? this.previewResolution.value :
                                   defaultPreviewResolutionDimension);
      console.log(`Image update: Scaling: ${maxDimension}`);
      if (this.inputCanvas.width > maxDimension ||
          this.inputCanvas.height > maxDimension) {
        const ratio = Math.min(
            maxDimension / this.inputCanvas.width,
            maxDimension / this.inputCanvas.height);
        this.inputCanvas.width = Math.round(this.inputCanvas.width * ratio);
        this.inputCanvas.height = Math.round(this.inputCanvas.height * ratio);
      }
    }

    if (!this.jsonView) {
      this.onFirstImageLoaded();
    }

    const dsize =
        new window.cv.Size(this.inputCanvas.width, this.inputCanvas.height);
    window.cv.resize(
        this.highResMatLinear, this.lowResMatLinear, dsize, 0, 0,
        window.cv.INTER_AREA);
    this.inputCanvas.width = this.inputCanvas.width;
    this.inputCanvas.height = this.inputCanvas.height;
    this.applyFilters(true, 0);
  }

  private appendFilter(filterName: string): FilterData {
    console.log(`Append filter: ${filterName}`);
    const filterFactory = filterRegistry.get(filterName);
    if (!filterFactory) throw new Error(`Unknown filter: ${filterName}`);
    const details = document.createElement('details');
    details.open = true;
    const summary = document.createElement('summary');
    summary.innerHTML = filterFactory.name();
    details.appendChild(summary);

    const outputCanvas = document.createElement('canvas');

    const cv = (window as any).cv;
    const index = this.filtersData.length;
    const inputMat = index === 0 ? this.firstFilterInputMat :
                                   this.filtersData.at(-1)!.outputMat;
    const inputCanvas =
        index === 0 ? this.inputCanvas : this.filtersData.at(-1)!.outputCanvas;
    const outputMat = new window.cv.Mat();

    const filter = filterFactory.install(
        details, inputCanvas, inputMat, outputMat,
        () => this.applyFilters(true, index));

    details.appendChild(outputCanvas);
    this.canvasContainer.appendChild(details);

    const filterData: FilterData = {filter, outputMat, outputCanvas};
    this.filtersData.push(filterData);
    return filterData;
  }

  private installFilters(configs: FilterConfig[]): void {
    this.filtersData.forEach((data) => data.outputMat.delete());
    this.filtersData = [];

    this.canvasContainer.replaceChildren(this.inputCanvas);

    configs.forEach((config, index) => {
      const data = this.appendFilter(config['type']);
      data.filter.loadConfig(config);
      console.log('Filter installed.');
    });
  }

  private applyFilters(preview: boolean, initialIndex: number) {
    if (initialIndex === 0) {
      (preview ? this.lowResMatLinear : this.highResMatLinear)
          .copyTo(this.firstFilterInputMat);
      if (preview)
        showLinearInCanvas(this.firstFilterInputMat, this.inputCanvas);
    } else if (preview) {
      const prev = this.filtersData[initialIndex - 1];
      showLinearInCanvas(prev.outputMat, prev.outputCanvas);
    }

    if (this.filtersData.length === 0) return;

    this.filtersData.slice(initialIndex).forEach((filterData, index) => {
      filterData.filter.update(preview);
      if (preview) {
        showLinearInCanvas(filterData.outputMat, filterData.outputCanvas);
        return;
      }
      // Clean up previous matrices (which we no longer need) to avoid running
      // out of memory.
      const inputMatrix = index === 0 ? this.firstFilterInputMat :
                                        this.filtersData[index - 1].outputMat;
      inputMatrix.create(1, 1, window.cv.CV_8U);
    });
    this.syncJsonView();
  }

  public loadConfig(jsonString: string): void {
    try {
      this.installFilters(JSON.parse(jsonString));
    } catch (error) {
      console.error(error);
      return;
    }
    this.applyFilters(true, 0);
  }

  public saveImage(): void {
    if (this.filtersData.length === 0) throw new Error('No filters set up!');
    const cv = window.cv;
    const link = document.createElement('a');
    this.applyFilters(false, 0);
    link.download = 'output.jpg';
    const tmpCanvas = document.createElement('canvas');
    showLinearInCanvas(
        this.filtersData[this.filtersData.length - 1].outputMat, tmpCanvas);
    link.href = tmpCanvas.toDataURL('image/jpeg', 0.95);
    link.click();
    // Revert back to the preview.
    this.applyFilters(true, 0);
  }
}

window.onOpenCvReady = () => {
  window.cv['onRuntimeInitialized'] = () => {
    const app = new PerspectiveEditor(
        generateImageCanvas, document.getElementById('controls')!);
    document.getElementById('imageInput')
        ?.addEventListener('change', (e: Event) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            app.loadImage(file);
          }
        });
    document.getElementById('configInput')
        ?.addEventListener('change', async (e: Event) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const jsonString = await file.text();
            await app.loadConfig(jsonString);
          }
        });
  };
};