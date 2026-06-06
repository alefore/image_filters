export interface ImageFilter {
  update(preview: boolean): void;
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

export abstract class DraggablePointsFilter implements ImageFilter {
  // x and y are normalized to the interval [0, 1).
  protected points: Point[] = [];
  protected dragRadius = 0.05;

  private draggingPointIndex: number|null = null;
  private lastMousePos: Point|null = null;

  constructor(
      protected readonly inputCanvas: HTMLCanvasElement,
      protected readonly inputMat: any,
      protected readonly onUpdate: () => void) {
    this.attachEventListeners();
  }

  public abstract update(preview: boolean): void;

  public addDraggablePoints(pt: Point[]) {
    this.points.push(...pt);
  }

  private attachEventListeners(): void {
    this.inputCanvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.inputCanvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.inputCanvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.inputCanvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
  }

  private getMousePos(e: MouseEvent): Point {
    const rect = this.inputCanvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return {x: 0, y: 0};

    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;

    return {
      x: Math.max(0, Math.min(normX, 0.9999)),
      y: Math.max(0, Math.min(normY, 0.9999))
    };
  }

  private onMouseDown(e: MouseEvent): void {
    const pos = this.getMousePos(e);

    for (let i = 0; i < this.points.length; i++) {
      const pt = this.points[i];
      const dist = Math.hypot(pt.x - pos.x, pt.y - pos.y);

      if (dist < this.dragRadius) {
        this.draggingPointIndex = i;
        this.lastMousePos = pos;
        return;
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.draggingPointIndex === null || !this.lastMousePos) return;

    const pos = this.getMousePos(e);
    let dx = pos.x - this.lastMousePos.x;
    let dy = pos.y - this.lastMousePos.y;

    if (e.shiftKey) {
      dx *= 0.1;
      dy *= 0.1;
    }

    this.points[this.draggingPointIndex].x += dx;
    this.points[this.draggingPointIndex].y += dy;
    this.lastMousePos = pos;
    this.onUpdate();
  }

  private onMouseUp(): void {
    this.draggingPointIndex = null;
    this.lastMousePos = null;
  }

  protected getPixelPoint(normalizedPoint: Point): Point {
    return {
      x: normalizedPoint.x * this.inputMat.cols,
      y: normalizedPoint.y * this.inputMat.rows
    };
  }

  protected drawInputPoints(): void {
    window.cv.imshow(this.inputCanvas, this.inputMat);
    const inputCtx = this.inputCanvas.getContext('2d');
    if (!inputCtx) return;
    this.points.forEach(normalizedPoint => {
      const pixelPoint = this.getPixelPoint(normalizedPoint);
      inputCtx.beginPath();
      inputCtx.arc(pixelPoint.x, pixelPoint.y, 12, 0, Math.PI * 2);
      inputCtx.fillStyle = 'rgb(255, 0, 0)';
      inputCtx.fill();

      inputCtx.beginPath();
      inputCtx.arc(pixelPoint.x, pixelPoint.y, 3, 0, Math.PI * 2);
      inputCtx.fillStyle = 'rgb(255, 255, 255)';
      inputCtx.fill();
    });
  }
}
