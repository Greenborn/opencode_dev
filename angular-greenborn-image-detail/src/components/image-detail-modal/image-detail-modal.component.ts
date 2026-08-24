import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { ZoomableImageComponent } from '../zoomable-image/zoomable-image.component';
import { ImageDetailItem } from '../../models/image-detail.model';

@Component({
  standalone: true,
  imports: [CommonModule, ZoomableImageComponent],
  selector: 'gb-image-detail-modal',
  templateUrl: './image-detail-modal.component.html',
  styleUrls: ['./image-detail-modal.component.scss'],
})
export class ImageDetailModalComponent {
  @Input() images: ImageDetailItem[] = [];
  @Input() startIndex = 0;
  @Input() open = false;
  @Input() showDownload = false;
  @Input() showFullscreen = true;
  @Input() showMetadata = true;

  @Output() openChange = new EventEmitter<boolean>();
  @Output() indexChange = new EventEmitter<number>();
  @Output() closed = new EventEmitter<void>();
  @Output() previous = new EventEmitter<void>();
  @Output() navigated = new EventEmitter<number>();
  @Output() fullscreenChange = new EventEmitter<boolean>();

  currentIndex = 0;

  get currentItem(): ImageDetailItem | null {
    return this.images[this.currentIndex] ?? null;
  }

  get currentSrc(): string {
    return this.currentItem?.url ?? '';
  }

  get currentTitle(): string {
    return this.currentItem?.title ?? '';
  }

  get hasPrev(): boolean {
    return this.images.length > 1;
  }

  get hasNext(): boolean {
    return this.images.length > 1;
  }

  ngOnInit() {
    this.currentIndex = this.startIndex;
  }

  ngOnChanges(changes: any) {
    if (changes['open'] && this.open) {
      this.currentIndex = this.startIndex;
    }
  }

  goTo(index: number) {
    if (index < 0) index = this.images.length - 1;
    if (index >= this.images.length) index = 0;
    this.currentIndex = index;
    this.indexChange.emit(index);
  }

  prev() {
    if (!this.hasPrev) return;
    this.goTo(this.currentIndex - 1);
    this.previous.emit();
  }

  next() {
    if (!this.hasNext) return;
    this.goTo(this.currentIndex + 1);
    this.navigated.emit(this.currentIndex);
  }

  close() {
    this.open = false;
    this.openChange.emit(false);
    this.closed.emit();
  }

  onFullscreenChange(value: boolean) {
    this.fullscreenChange.emit(value);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (!this.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    }
  }
}
