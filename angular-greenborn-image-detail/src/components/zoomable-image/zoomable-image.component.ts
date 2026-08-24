import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'gb-zoomable-image',
  templateUrl: './zoomable-image.component.html',
  styleUrls: ['./zoomable-image.component.scss'],
})
export class ZoomableImageComponent implements OnChanges, OnDestroy, OnInit {

  @Input() src: string = '';
  @Input() title: string = '';
  @Input() resetKey: any = undefined;
  @Input() showDownload: boolean = false;
  @Input() showFullscreen: boolean = true;
  @Output() fullscreenChange = new EventEmitter<boolean>();

  @ViewChild('wrapper') wrapper!: ElementRef<HTMLElement>;

  public yepImg: boolean = true;
  public imageLoading: boolean = true;

  scale: number = 1;
  minScale: number = 1;
  maxScale: number = 25;
  panX: number = 0;
  panY: number = 0;

  isDragging: boolean = false;
  isFullscreen: boolean = false;

  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragStartPanX: number = 0;
  private dragStartPanY: number = 0;

  private isPinching: boolean = false;
  private pinchStartDist: number = 0;
  private pinchStartScale: number = 1;

  get imageTransform(): string {
    if (this.scale <= 1) return 'none';
    return `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
  }

  ngOnInit() {
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['resetKey'] && !changes['resetKey'].firstChange) {
      this.resetZoom();
      this.imageLoading = true;
    }
  }

  ngOnDestroy() {
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
  }

  onImageLoad() {
    this.imageLoading = false;
    this.resetZoom();
  }

  onImageError() {
    this.yepImg = false;
    this.imageLoading = false;
  }

  resetZoom() {
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
  }

  zoomIn() {
    const newScale = Math.min(this.scale + 1, this.maxScale);
    if (newScale !== this.scale) {
      this.scale = newScale;
      this.applyPanConstraints();
    }
  }

  zoomOut() {
    const newScale = Math.max(this.scale - 1, this.minScale);
    if (newScale !== this.scale) {
      this.scale = newScale;
      if (newScale <= 1) {
        this.panX = 0;
        this.panY = 0;
      } else {
        this.applyPanConstraints();
      }
    }
  }

  fit() {
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
  }

  async downloadImage() {
    if (!this.src) return;
    try {
      const response = await fetch(this.src);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = this.title || 'imagen';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(this.src, '_blank');
    }
  }

  onDragStart(event: MouseEvent) {
    if (this.scale <= 1) return;
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragStartPanX = this.panX;
    this.dragStartPanY = this.panY;
  }

  onDragMove(event: MouseEvent) {
    if (!this.isDragging) return;
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    this.panX = this.dragStartPanX + dx;
    this.panY = this.dragStartPanY + dy;
    this.applyPanConstraints();
  }

  onDragEnd() {
    this.isDragging = false;
  }

  onTouchStart(event: TouchEvent) {
    if (event.touches.length === 1 && this.scale > 1) {
      this.isDragging = true;
      this.dragStartX = event.touches[0].clientX;
      this.dragStartY = event.touches[0].clientY;
      this.dragStartPanX = this.panX;
      this.dragStartPanY = this.panY;
    } else if (event.touches.length === 2) {
      this.isDragging = false;
      this.isPinching = true;
      this.pinchStartDist = this.getTouchDist(event.touches);
      this.pinchStartScale = this.scale;
    }
  }

  onTouchMove(event: TouchEvent) {
    if (event.touches.length === 1 && this.isDragging) {
      const dx = event.touches[0].clientX - this.dragStartX;
      const dy = event.touches[0].clientY - this.dragStartY;
      this.panX = this.dragStartPanX + dx;
      this.panY = this.dragStartPanY + dy;
      this.applyPanConstraints();
    } else if (event.touches.length === 2 && this.isPinching) {
      const dist = this.getTouchDist(event.touches);
      const ratio = dist / this.pinchStartDist;
      this.scale = Math.min(Math.max(this.pinchStartScale * ratio, this.minScale), this.maxScale);
      this.applyPanConstraints();
    }
  }

  onTouchEnd() {
    this.isDragging = false;
    this.isPinching = false;
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    if (event.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.zoomIn();
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      this.zoomOut();
    } else if (event.key === '0') {
      event.preventDefault();
      this.fit();
    } else if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      this.toggleFullscreen();
    } else if (event.key === 'd' || event.key === 'D') {
      event.preventDefault();
      this.downloadImage();
    }
  }

  async toggleFullscreen() {
    const el = this.wrapper?.nativeElement?.closest('.visor-container') as HTMLElement;
    if (!el) {
      const host = this.wrapper?.nativeElement?.closest('gb-zoomable-image') as HTMLElement;
      if (!host) return;
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await host.requestFullscreen();
      }
      return;
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await el.requestFullscreen();
    }
  }

  private onFullscreenChange = () => {
    this.isFullscreen = !!document.fullscreenElement;
    this.fullscreenChange.emit(this.isFullscreen);
  };

  private getTouchDist(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private applyPanConstraints() {
    const wrapper = this.wrapper?.nativeElement;
    if (!wrapper) return;
    const cw = wrapper.clientWidth;
    const ch = wrapper.clientHeight;
    if (cw <= 0 || ch <= 0) return;
    const extraX = ((this.scale - 1) * cw) / 2;
    const extraY = ((this.scale - 1) * ch) / 2;
    const marginX = cw * 0.45;
    const marginY = ch * 0.45;
    const limitX = extraX + marginX;
    const limitY = extraY + marginY;
    this.panX = Math.min(Math.max(this.panX, -limitX), limitX);
    this.panY = Math.min(Math.max(this.panY, -limitY), limitY);
  }
}
