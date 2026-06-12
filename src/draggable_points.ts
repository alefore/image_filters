import {FilterConfig, ImageFilter, Point} from './filter.js'

export abstract class DraggablePointsFilter implements ImageFilter {
  // x and y are normalized to the interval [0, 1).
  protected points: Point[] = [];
  protected dragRadius = 0.05;

  private draggingPointIndex: number|null = null;
  private lastPointerPos: Point|null = null;
  private activePointerId: number|null = null;

  constructor(
      protected readonly inputCanvas: HTMLCanvasElement,
      protected readonly inputMat: any,
      protected readonly onUpdate: () => void) {
    this.attachEventListeners();
  }

  public abstract update(preview: boolean): void;
  protected abstract get filterType(): string;

  protected addDraggablePoints(pt: Point[]) {
    this.points.push(...pt);
  }

  public getConfig(): FilterConfig {
    // Deliberately do a deep-copy of points.
    return {
      type: this.filterType,
      points: this.points.map(p => ({x: p.x, y: p.y}))
    };
  }

  public loadConfig(config: FilterConfig): void {
    if (config.points && Array.isArray(config.points)) {
      this.points = config.points.map((p: any) => ({x: p.x, y: p.y}));
    }
  }

  private attachEventListeners(): void {
    // Prevent the browser from streating drags as scroll/zoom gestures.
    this.inputCanvas.style.touchAction = 'none';
    this.inputCanvas.addEventListener(
        'pointerdown', this.onPointerDown.bind(this));
    this.inputCanvas.addEventListener(
        'pointermove', this.onPointerMove.bind(this));
    this.inputCanvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    this.inputCanvas.addEventListener(
        'pointercancel', this.onPointerUp.bind(this));
  }

  private getPointerPos(e: PointerEvent): Point {
    const rect = this.inputCanvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return {x: 0, y: 0};

    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;

    return {
      x: Math.max(0, Math.min(normX, 0.9999)),
      y: Math.max(0, Math.min(normY, 0.9999))
    };
  }

  private onPointerDown(e: PointerEvent): void {
    if (this.activePointerId !== null)
      return;  // Already dragging with another finger.
    const pos = this.getPointerPos(e);

    // Fingers are less precise than a cursor.
    const radius =
        e.pointerType === 'touch' ? this.dragRadius * 2 : this.dragRadius;

    for (let i = 0; i < this.points.length; i++) {
      const pt = this.points[i];
      if (Math.hypot(pt.x - pos.x, pt.y - pos.y) < radius) {
        this.draggingPointIndex = i;
        this.lastPointerPos = pos;
        this.activePointerId = e.pointerId;
        this.inputCanvas.setPointerCapture(e.pointerId);
        e.preventDefault();
        return;
      }
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (e.pointerId !== this.activePointerId) return;
    if (this.draggingPointIndex === null || !this.lastPointerPos) return;

    const pos = this.getPointerPos(e);
    let dx = pos.x - this.lastPointerPos.x;
    let dy = pos.y - this.lastPointerPos.y;

    if (e.shiftKey) {
      dx *= 0.1;
      dy *= 0.1;
    }

    const p = this.points[this.draggingPointIndex];
    p.x = Math.max(0, Math.min(p.x + dx, 0.9999999));
    p.y = Math.max(0, Math.min(p.y + dy, 0.9999999));
    this.lastPointerPos = pos;
    this.onUpdate();
  }

  private onPointerUp(e: PointerEvent): void {
    if (e.pointerId !== this.activePointerId) return;
    this.draggingPointIndex = null;
    this.lastPointerPos = null;
    this.activePointerId = null;
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
