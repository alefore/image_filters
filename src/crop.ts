import {DraggablePointsFilter} from './draggable_points.js';
import {FilterConfig, ImageFilter, ImageFilterFactory} from './filter.js';
import {filterRegistry} from './registry.js';
import {SettingsContainer} from './settings.js';

const ASPECT_RATIOS: Record<string, number|null> = {
  'Free': null,
  '1:1': 1,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
};

class CropFilter extends DraggablePointsFilter {
  private readonly settings: SettingsContainer;
  private readonly aspectRatio: HTMLSelectElement;

  constructor(
      container: HTMLElement, inputCanvas: HTMLCanvasElement, inputMat: any,
      private outputMat: any, onUpdate: () => void) {
    super(inputCanvas, inputMat, onUpdate);
    this.settings = new SettingsContainer(container, onUpdate);
    this.aspectRatio = this.settings.addSelect({
      id: 'aspect-ratio',
      label: 'Aspect Ratio',
      options: Object.keys(ASPECT_RATIOS),
      defaultOption: 'Free'
    });
    this.addDraggablePoints([{x: 0.25, y: 0.25}, {x: 0.75, y: 0.75}]);
  }

  protected get filterType(): string {
    return 'Crop';
  }

  public getConfig(): FilterConfig {
    return this.settings.augmentConfig(super.getConfig())
  }

  public loadConfig(config: FilterConfig): void {
    super.loadConfig(config);
    this.settings.loadConfig(config);
  }

  public update(preview: boolean): void {
    const cv = (window as any).cv;

    const p1 = this.getPixelPoint(this.points[0]);
    const p2 = this.getPixelPoint(this.points[1]);

    let x = Math.min(p1.x, p2.x);
    let y = Math.min(p1.y, p2.y);
    let width = Math.max(p1.x, p2.x) - x;
    let height = Math.max(p1.y, p2.y) - y;

    const targetRatio = ASPECT_RATIOS[this.aspectRatio.value] ?? null;
    if (targetRatio !== null) {
      const currentRatio = width / height;
      if (currentRatio > targetRatio) {
        width = Math.round(height * targetRatio);
      } else {
        height = Math.round(width / targetRatio);
      }
    }

    const rect = new cv.Rect(x, y, width, height);
    const region = this.inputMat.roi(rect);
    region.copyTo(this.outputMat);
    region.delete();
    this.drawInputPoints();
  }
}

export class CropFilterFactory implements ImageFilterFactory {
  public install(
      container: HTMLElement, inputCanvas: HTMLCanvasElement, inputMat: any,
      outputMat: any, onUpdate: () => void): ImageFilter {
    return new CropFilter(
        container, inputCanvas, inputMat, outputMat, onUpdate);
  }

  public name() {
    return 'Crop';
  }
}

filterRegistry.register(new CropFilterFactory());
