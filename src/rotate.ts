import {DraggablePointsFilter} from './draggable_points.js';
import {FilterConfig, ImageFilter, ImageFilterFactory} from './filter.js';
import {filterRegistry} from './registry.js';
import {SettingsContainer} from './settings.js';

class RotateFilter extends DraggablePointsFilter {
  private readonly settings: SettingsContainer;
  private readonly angle: HTMLInputElement;

  constructor(
      container: HTMLElement, inputCanvas: HTMLCanvasElement, inputMat: any,
      private outputMat: any, onUpdate: () => void) {
    super(inputCanvas, inputMat, onUpdate);

    this.settings = new SettingsContainer(container, onUpdate);

    this.angle = this.settings.addRangeSlider({
      id: 'angle',
      label: 'Angle',
      min: -180,
      max: 180,
      step: 1,
      initialValue: 0,
    });

    this.addDraggablePoints([{x: 0.5, y: 0.5}]);
  }

  protected get filterType(): string {
    return 'Rotate';
  }

  public getConfig(): FilterConfig {
    return this.settings.augmentConfig(super.getConfig());
  }

  public loadConfig(config: FilterConfig): void {
    super.loadConfig(config);
    this.settings.loadConfig(config);
  }

  public update(preview: boolean): void {
    const cv = (window as any).cv;
    const angleValue = parseFloat(this.angle.value);
    if (angleValue === 0) {
      this.inputMat.copyTo(this.outputMat);
      return;
    }

    const centerPoint = this.getPixelPoint(this.points[0]);
    const center = new cv.Point(centerPoint.x, centerPoint.y);
    const M = cv.getRotationMatrix2D(center, angleValue, 1.0);
    const dsize = new cv.Size(this.inputMat.cols, this.inputMat.rows);
    cv.warpAffine(
        this.inputMat, this.outputMat, M, dsize, cv.INTER_LINEAR,
        cv.BORDER_CONSTANT, new cv.Scalar());
    M.delete();
    this.drawInputPoints();
  }
}

export class RotateFilterFactory implements ImageFilterFactory {
  public install(
      container: HTMLElement, inputCanvas: HTMLCanvasElement, inputMat: any,
      outputMat: any, onUpdate: () => void): ImageFilter {
    return new RotateFilter(
        container, inputCanvas, inputMat, outputMat, onUpdate);
  }

  public name() {
    return 'Rotate';
  }
}

filterRegistry.register(new RotateFilterFactory());
