# angular-greenborn-image-detail

Visor de detalle de imagen (zoom, pan, pantalla completa, descarga) y modal de detalle con navegación prev/next, para aplicaciones **Angular 21**. Componentes standalone extraídos del frontend de **GFC-Front** (Grupo Fotográfico Centro).

## Instalación

```bash
npm install angular-greenborn-image-detail
```

### Estilos requeridos

Los componentes usan clases de [Bootstrap Icons](https://icons.getbootstrap.com/) (`bi bi-*`) y el spinner de Bootstrap (`.spinner-border`). Asegúrate de que tu aplicación incluya estos estilos globalmente:

```jsonc
// angular.json (styles)
"styles": [
  "node_modules/bootstrap/dist/css/bootstrap.min.css",
  "node_modules/bootstrap-icons/font/bootstrap-icons.css"
]
```

## Uso

### `gb-image-detail-modal` (recomendado)

Modal de detalle autocontenido con navegación prev/next, teclado (←/→/Esc) y panel de metadatos opcional.

```ts
import { Component, signal } from '@angular/core';
import { ImageDetailModalComponent, ImageDetailItem } from 'angular-greenborn-image-detail';

@Component({
  standalone: true,
  imports: [ImageDetailModalComponent],
  template: `
    <button (click)="open()">Ver foto</button>
    <gb-image-detail-modal
      [images]="images"
      [startIndex]="0"
      [(open)]="modalOpen"
      [showDownload]="true"
      [showFullscreen]="true"
      [showMetadata]="true"
    ></gb-image-detail-modal>
  `,
})
export class AppComponent {
  images: ImageDetailItem[] = [
    { url: 'https://.../foto.jpg', title: 'Título', section: 'Paisaje', metadata: [{ label: 'Autor', value: 'María' }] },
  ];
  modalOpen = signal(false);
  open() { this.modalOpen.set(true); }
}
```

**Inputs**

| Input            | Tipo             | Default  | Descripción                                   |
|------------------|------------------|----------|-----------------------------------------------|
| `images`         | `ImageDetailItem[]` | `[]`   | Lista de imágenes a mostrar.                  |
| `startIndex`     | `number`         | `0`      | Índice inicial al abrir.                      |
| `open`           | `boolean`        | `false`  | Controla la visibilidad (two-way).            |
| `showDownload`   | `boolean`        | `false`  | Muestra el botón de descarga.                 |
| `showFullscreen` | `boolean`        | `true`   | Muestra el botón de pantalla completa.        |
| `showMetadata`   | `boolean`        | `true`   | Muestra el panel lateral de metadatos.        |

**Outputs**

| Output            | Tipo                 | Descripción                          |
|-------------------|----------------------|--------------------------------------|
| `openChange`      | `boolean`            | Emitido al abrir/cerrar (two-way).   |
| `indexChange`     | `number`             | Emitido al cambiar de índice.        |
| `closed`          | `void`               | Emitido al cerrar el modal.          |
| `previous` / `next` | `void`             | Emitidos al navegar.                 |
| `fullscreenChange`| `boolean`            | Emitido al entrar/salir de pantalla completa. |

### `gb-zoomable-image` (solo visor)

Componente de bajo nivel: visor con zoom/pan, fullscreen, descarga y atajos de teclado (+, -, 0, F, D).

```html
<gb-zoomable-image
  [src]="src"
  [title]="title"
  [resetKey]="index"
  [showDownload]="true"
  [showFullscreen]="true"
  (fullscreenChange)="isFullscreen = $event"
></gb-zoomable-image>
```

**Inputs**: `src`, `title`, `resetKey`, `showDownload`, `showFullscreen`.
**Outputs**: `fullscreenChange`.

## Demo

```bash
npm install
npm run demo   # sirve la demo en http://localhost:5175
```

## Build

```bash
npm run build  # genera dist/ con ng-packagr
```

## Interfaces

```ts
interface ImageDetailItem {
  url: string;
  title?: string;
  caption?: string;
  section?: string;
  metadata?: { label: string; value: string }[];
}
```

## Licencia

MIT
