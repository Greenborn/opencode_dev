import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageDetailModalComponent, ImageDetailItem } from 'angular-greenborn-image-detail';

const SAMPLE: ImageDetailItem[] = [
  {
    url: 'https://picsum.photos/id/1015/1200/800',
    title: 'Montañas al amanecer',
    section: 'Paisaje',
    caption: 'Fotografía de paisaje de montaña capturada durante el amanecer.',
    metadata: [
      { label: 'Autor/a', value: 'María López' },
      { label: 'Cámara', value: 'Sony A7 III' },
      { label: 'Premio', value: '1er puesto' },
    ],
  },
  {
    url: 'https://picsum.photos/id/1018/1200/800',
    title: 'Reflejos urbanos',
    section: 'Ciudad',
    caption: 'Detalle urbano con reflejos sobre vidrio.',
    metadata: [
      { label: 'Autor/a', value: 'Juan Pérez' },
      { label: 'Cámara', value: 'Canon R6' },
    ],
  },
  {
    url: 'https://picsum.photos/id/1035/1200/800',
    title: 'Naturaleza',
    section: 'Naturaleza',
    caption: 'Escena natural en tonos cálidos.',
    metadata: [
      { label: 'Autor/a', value: 'Ana García' },
      { label: 'Cámara', value: 'Nikon Z6' },
    ],
  },
];

@Component({
  standalone: true,
  imports: [CommonModule, ImageDetailModalComponent],
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent {
  images = SAMPLE;
  startIndex = 0;
  open = signal(false);

  openAt(index: number) {
    this.startIndex = index;
    this.open.set(true);
  }

  onClosed() {
    this.open.set(false);
  }

  onOpenChange(v: boolean) {
    this.open.set(v);
  }
}
