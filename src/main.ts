import {generateImageCanvas, type Point} from './image.js';

declare global {
  interface Window {
    onOpenCvReady: () => void;
    cv: any;
  }
}

class PerspectiveEditor {
  private editorCanvas: HTMLCanvasElement;
  private previewCanvas: HTMLCanvasElement;
  private status: HTMLElement;
  private editorCtx: CanvasRenderingContext2D;
  private previewCtx: CanvasRenderingContext2D;

  private highResImage: HTMLImageElement|null = null;
  private originalImage: HTMLImageElement|null = null;
  private baseMat: any = null;   // Raw, unaltered uploaded image.
  private imageMat: any = null;  // Lens-corrected image.
  private scaleRatio: number = 1;

  private points: Point[] = [];
  private draggingIdx: number|null = null;
  private lastMousePos: Point|null = null;
  private dragRadius: number = 35;
  private w: number = 0;
  private h: number = 0;

  private distortionValue: number = 0;  // From -1 to 1.

  private focalPoint: Point = {x: 0, y: 0};
  private draggingFocalPoint: boolean = false;

  constructor(
      public readonly generator:
          ((points: Point[], sourceMat: any, showGrid: boolean,
            focalPoint?: Point) => HTMLCanvasElement)) {
    this.editorCanvas =
        document.getElementById('editorCanvas') as HTMLCanvasElement;
    this.previewCanvas =
        document.getElementById('previewCanvas') as HTMLCanvasElement;
    this.editorCtx = this.editorCanvas.getContext('2d')!;
    this.previewCtx = this.previewCanvas.getContext('2d')!;

    this.editorCanvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.editorCanvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.originalImage) {
        this.saveImage();
      }
    });
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
      this.scaleRatio = 1;

      // Calculate ratio and create the smaller UI proxy
      if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
        const ratio =
            Math.min(MAX_DIMENSION / targetWidth, MAX_DIMENSION / targetHeight);
        targetWidth = Math.round(targetWidth * ratio);
        targetHeight = Math.round(targetHeight * ratio);
        this.scaleRatio = 1 / ratio;
      }

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = targetWidth;
      tempCanvas.height = targetHeight;
      const ctx = tempCanvas.getContext('2d')!;
      ctx.drawImage(this.highResImage!, 0, 0, targetWidth, targetHeight);

      this.originalImage = new Image();
      this.originalImage.onload = () => {
        this.w = this.originalImage!.width;
        this.h = this.originalImage!.height;


        this.editorCanvas.width = this.w;
        this.editorCanvas.height = this.h;

        if (this.baseMat) this.baseMat.delete();
        if (this.imageMat) this.imageMat.delete();
        this.baseMat = window.cv.imread(this.originalImage);
        this.imageMat = new window.cv.Mat();

        this.points = [
          {x: this.w * 0.1, y: this.h * 0.1},
          {x: this.w * 0.9, y: this.h * 0.1},
          {x: this.w * 0.9, y: this.h * 0.9}, {x: this.w * 0.1, y: this.h * 0.9}
        ];

        this.focalPoint = {x: 0.5 * this.w, y: 0.5 * this.h};
        this.applyLensCorrection();
        this.updateDisplay();
        URL.revokeObjectURL(url);
      };

      this.originalImage.src = tempCanvas.toDataURL('image/jpeg', 0.95);
    };

    this.highResImage.src = url;
  }

  public setDistortion(value: number): void {
    this.distortionValue = value;
    this.applyLensCorrection();
    this.updateDisplay();
  }

  private applyLensCorrection(): void {
    const cv = (window as any).cv;

    if (this.distortionValue === 0) {
      this.baseMat.copyTo(this.imageMat);
    } else {
      const f = Math.max(this.w, this.h);
      const cx = this.w / 2.0;  // Optical center X
      const cy = this.h / 2.0;  // Optical center Y

      // 3x3 Camera Matrix must be CV_64F (double precision)
      const cameraMatrix =
          cv.matFromArray(3, 3, cv.CV_64F, [f, 0, cx, 0, f, cy, 0, 0, 1]);

      // We only care about k1 for primary barrel/pincushion correction
      const distCoeffs =
          cv.matFromArray(1, 5, cv.CV_64F, [this.distortionValue, 0, 0, 0, 0]);

      cv.undistort(this.baseMat, this.imageMat, cameraMatrix, distCoeffs);
      cameraMatrix.delete();
      distCoeffs.delete();
    }

    cv.imshow(this.editorCanvas, this.imageMat);
  }

  private getMousePos(e: MouseEvent): Point {
    const rect = this.editorCanvas.getBoundingClientRect();
    const scaleX = this.editorCanvas.width / rect.width;
    const scaleY = this.editorCanvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private onMouseDown(e: MouseEvent): void {
    if (!this.originalImage) return;
    const pos = this.getMousePos(e);

    for (let i = 0; i < this.points.length; i++) {
      const pt = this.points[i];
      const dist = Math.hypot(pt.x - pos.x, pt.y - pos.y);
      if (dist < this.dragRadius) {
        this.draggingIdx = i;
        this.lastMousePos = pos;
        return;
      }
    }

    const distFocal =
        Math.hypot(this.focalPoint.x - pos.x, this.focalPoint.y - pos.y);
    if (distFocal < this.dragRadius) {
      this.draggingFocalPoint = true;
      this.lastMousePos = pos;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if ((this.draggingIdx === null && !this.draggingFocalPoint) ||
        !this.lastMousePos)
      return;

    const pos = this.getMousePos(e);
    let dx = pos.x - this.lastMousePos.x;
    let dy = pos.y - this.lastMousePos.y;

    if (e.shiftKey) {
      dx *= 0.1;
      dy *= 0.1;
    }

    if (this.draggingIdx !== null) {
      this.points[this.draggingIdx].x += dx;
      this.points[this.draggingIdx].y += dy;
    } else if (this.draggingFocalPoint) {
      this.focalPoint.x += dx;
      this.focalPoint.y += dy;
    }

    this.lastMousePos = pos;
    this.updateDisplay();
  }

  private onMouseUp(): void {
    this.draggingIdx = null;
    this.draggingFocalPoint = false;
    this.lastMousePos = null;
  }

  private updateDisplay(): void {
    if (!this.originalImage) return;

    this.drawEditor();

    const previewImg =
        this.generator(this.points, this.imageMat, true, this.focalPoint);

    this.status.innerHTML = `Output ${previewImg.width * this.scaleRatio} by ${
        previewImg.height * this.scaleRatio}.`;

    this.previewCanvas.width = previewImg.width;
    this.previewCanvas.height = previewImg.height;
    this.previewCtx.clearRect(
        0, 0, this.previewCanvas.width, this.previewCanvas.height);
    this.previewCtx.drawImage(previewImg, 0, 0);
  }

  private drawCircle(pt: Point, fillStyle: string) {
    this.editorCtx.beginPath();
    this.editorCtx.arc(pt.x, pt.y, 12, 0, Math.PI * 2);
    this.editorCtx.fillStyle = fillStyle;
    this.editorCtx.fill();

    this.editorCtx.beginPath();
    this.editorCtx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
    this.editorCtx.fillStyle = 'rgb(255, 255, 255)';
    this.editorCtx.fill();
  }

  private drawEditor(): void {
    const cv = (window as any).cv;
    cv.imshow(this.editorCanvas, this.imageMat);
    this.editorCtx.beginPath();
    this.editorCtx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      this.editorCtx.lineTo(this.points[i].x, this.points[i].y);
    }
    this.editorCtx.closePath();
    this.editorCtx.lineWidth = 2;
    this.editorCtx.strokeStyle = 'rgb(0, 255, 0)';
    this.editorCtx.stroke();

    this.points.forEach(pt => {
      this.drawCircle(pt, 'rgb(255, 0, 0)');
    });
    this.drawCircle(this.focalPoint, 'rgb(256, 165, 0)')
  }

  private scalePoint(pt: Point): Point {
    return {x: pt.x * this.scaleRatio, y: pt.y * this.scaleRatio};
  }

  public saveImage(): void {
    const cv = window.cv;

    const hrPoints = this.points.map((pt) => this.scalePoint(pt));
    const hrFocalPoint = this.scalePoint(this.focalPoint);
    const highResMat = cv.imread(this.highResImage!);
    const cleanCanvas =
        this.generator(hrPoints, highResMat, false, hrFocalPoint);

    const link = document.createElement('a');
    link.download = 'output.jpg';
    link.href = cleanCanvas.toDataURL('image/jpeg', 0.95);
    link.click();

    highResMat.delete();
  }
}

let app: PerspectiveEditor;

window.onOpenCvReady = () => {
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  app = new PerspectiveEditor(generateImageCanvas);

  document.getElementById('imageInput')
      ?.addEventListener('change', (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          app.loadImage(file);
          saveBtn.disabled = false;
        }
      });
  saveBtn.addEventListener('click', () => app.saveImage());

  const distortionSlider =
      document.getElementById('distortion')! as HTMLInputElement;
  distortionSlider.addEventListener('input', (e: Event) => {
    const target = e.target as HTMLInputElement;
    const value = parseFloat(target.value);
    app.setDistortion(value)
  });
};
