# Estado de descripciones de paquetes @greenborn en el proyecto greenborn

**Fecha:** 2026-11-22

## Alcance y método

- Proyecto revisado: `/media/debian/Datos_EX4/Trabajo/Greenborn/greenborn` (solo lectura).
- Búsqueda por nombre completo (`@greenborn/<paquete>`) y por nombre sin scope, excluyendo `node_modules`, `dist`, `dist.zip`, `vanilla.zip` y `.git`.
- La fuente de descripciones dentro de greenborn son las fichas `src/data/demos/*.json` (campos `resumen` y `detalle.descripcion`), además de un caso puntual en `juegos_virales/libs/constructor-personaje/README.md`.
- La lista de entrada contiene **38 paquetes** (el encargo mencionaba 36); se evaluaron los 38.

## Resumen

| Estado | Cantidad |
|---|---|
| Usado, descripción actualizada | 33 |
| Usado, descripción desactualizada | 3 |
| Usado, sin descripción | 0 |
| No usado en greenborn | 2 |
| **Total** | **38** |

Observación general: todas las fichas que existen tienen texto descriptivo. Varias fichas tienen el número de versión por detrás de la versión oficial; eso se indica en la columna de observación y no cambia el estado de la descripción en sí.

## Tabla de estado

| Paquete | Versión | Estado en greenborn | Archivo(s) donde aparece en greenborn | Observación breve |
|---|---|---|---|---|
| @greenborn/express-greenborn-sso-back | 1.10.4 | Usado, descripción actualizada | `src/data/demos/express-greenborn-sso-back.json` | Coincide con la oficial (SSO, Greenborn, límite de intentos). |
| @greenborn/express-greenborn-crud | 0.3.0 | No usado en greenborn | — | Sin referencias en el proyecto. |
| @greenborn/express-greenborn-galeria-image | 1.0.1 | Usado, descripción actualizada | `src/data/demos/express-greenborn-galeria-image.json` | Coincide (subida, miniaturas, disco local, paginado). |
| @greenborn/express-greenborn-mercado-pago | 1.0.1 | Usado, descripción actualizada | `src/data/demos/express-greenborn-mercado-pago.json` | Coincide (cliente de pagos y webhooks sin duplicados). |
| @greenborn/express-greenborn-notificaciones | 0.1.1 | Usado, descripción actualizada | `src/data/demos/express-greenborn-notificaciones.json` | Coincide. No menciona la migración Knex, detalle menor. |
| @greenborn/greenborn-memory-cache | 1.0.1 | Usado, descripción actualizada | `src/data/demos/greenborn-memory-cache.json` | Coincide (TTL por entrada, eventos). |
| @greenborn/motor-multijugador | 0.1.0 | Usado, descripción actualizada | `src/data/demos/motor-multijugador.json` | Coincide (salas, colas, hooks). No menciona worker_thread ni socket.io, detalle de implementación. |
| @greenborn/mapa-voxel-back | 0.1.1 | Usado, descripción actualizada | `src/data/demos/mapa-voxel-back.json` | Coincide en contenido. No menciona plugins de datos de juego. |
| @greenborn/vue-greenborn-sso-front | 1.7.1 | Usado, descripción desactualizada | `src/data/demos/vue-greenborn-sso-front.json` | La ficha no menciona bearer token ni componente callback, y sí agrega roles y permisos que la oficial no incluye. Ver referencia abajo. |
| @greenborn/vue-greenborn-crud | 0.2.0 | No usado en greenborn | — | Sin referencias en el proyecto. |
| @greenborn/vue-table-editor | 1.4.9 | Usado, descripción actualizada | `src/data/demos/vue-table-editor.json` | Coincide (búsqueda, paginación, scroll infinito, edición inline, CSV). No nombra redimensionado ni reordenado de columnas de forma explícita. |
| @greenborn/vue-greenborn-modal-manager | 1.7.1 | Usado, descripción actualizada | `src/data/demos/vue-greenborn-modal-manager.json` | Coincide (anidados, alertas, confirmaciones, sin librerías de estado). |
| @greenborn/vue-side-menu | 1.1.3 | Usado, descripción actualizada | `src/data/demos/vue-side-menu.json` | Coincide (responsive, permisos, vue-router). |
| @greenborn/vue-greenborn-panels | 1.0.3 | Usado, descripción actualizada | `src/data/demos/vue-greenborn-panels.json` | Coincide (pestañas reordenables, colapsables, registro por zona). |
| @greenborn/vue-greenborn-dashboard-cards | 1.2.1 | Usado, descripción actualizada | `src/data/demos/vue-greenborn-dashboard-cards.json` | Coincide (grilla, pestañas por usuario, drag & drop, sparkline). |
| @greenborn/vue-greenborn-galeria-image | 1.1.1 | Usado, descripción actualizada | `src/data/demos/vue-greenborn-galeria-image.json` | Coincide (lazy load, visor con zoom, pantalla completa, navegación). |
| @greenborn/vue-greenborn-image-viewer | 1.0.3 | Usado, descripción actualizada | `src/data/demos/vue-greenborn-image-viewer.json` | Coincide (zoom, pan, rotación libre, overlays). |
| @greenborn/vue-greenborn-webcam-viewer | 1.0.3 | Usado, descripción actualizada | `src/data/demos/vue-greenborn-webcam-viewer.json` | Coincide (permisos, cámaras, captura, recuadros). |
| @greenborn/vue-greenborn-map-viewer | 1.3.1 | Usado, descripción actualizada | `src/data/demos/vue-greenborn-map-viewer.json` | Coincide (múltiples puntos, Leaflet). |
| @greenborn/vue-greenborn-map-selector | 1.1.1 | Usado, descripción actualizada | `src/data/demos/vue-greenborn-map-selector.json` | Coincide (selector en mapa, ubicación del dispositivo, apilado sobre modales). |
| @greenborn/vue-greenborn-line-chart | 1.0.1 | Usado, descripción actualizada | `src/data/demos/vue-greenborn-line-chart.json` | Coincide (SVG, series, leyenda, grilla, tooltips). |
| @greenborn/vue-greenborn-markdown-viewer | 1.0.1 | Usado, descripción actualizada | `src/data/demos/vue-greenborn-markdown-viewer.json` | Coincide (GFM, DOMPurify). |
| @greenborn/vue-greenborn-money-input | 1.0.1 | Usado, descripción actualizada | `src/data/demos/vue-greenborn-money-input.json` | Coincide (formato argentino, devuelve número). |
| @greenborn/vue-greenborn-tree-view | 1.0.1 | Usado, descripción actualizada | `src/data/demos/vue-greenborn-tree-view.json` | Coincide (carga diferida, datos provistos por el consumidor). |
| @greenborn/vue-greenborn-directory-picker | 1.0.1 | Usado, descripción actualizada | `src/data/demos/vue-greenborn-directory-picker.json` | Coincide. La ficha no menciona la dependencia sobre tree-view, detalle menor. |
| @greenborn/vue-greenborn-remote-terminal | 1.0.3 | Usado, descripción actualizada | `src/data/demos/vue-greenborn-remote-terminal.json` | Coincide (xterm.js, transport-agnostic). |
| @greenborn/vue-greenborn-notificaciones | 0.1.0 | Usado, descripción actualizada | `src/data/demos/vue-greenborn-notificaciones.json` | Coincide (VAPID, suscripción, service worker). |
| @greenborn/vue-greenborn-reporte-contextual | 0.1.10 | Usado, descripción actualizada | `src/data/demos/vue-greenborn-reporte-contextual.json` | Coincide (clic derecho, registro en seguimiento de desarrollo, equivalente a SGI). |
| @greenborn/angular-greenborn-sso-front | 1.0.2 | Usado, descripción desactualizada | `src/data/demos/angular-greenborn-sso-front.json` | La ficha cubre login con Google, sesión, logout y guard, pero omite el WebSocket complementario y el bearer token. Ver referencia abajo. |
| @greenborn/angular-greenborn-image-detail | 1.0.1 | Usado, descripción actualizada | `src/data/demos/angular-greenborn-image-detail.json` | Coincide (zoom, pantalla completa, navegación prev/next en modal). |
| @greenborn/modelos-personajes | 0.8.0 | Usado, descripción actualizada | `src/data/demos/modelos-personajes.json` | Texto coincide. Versión en ficha 0.6.0, desactualizada respecto a 0.8.0. |
| @greenborn/accesorios-personaje | 0.3.0 | Usado, descripción actualizada | `src/data/demos/accesorios-personaje.json` | Texto coincide (gorra, sombrero, lentes, canasta). Versión en ficha 0.2.0. |
| @greenborn/constructor-personaje | 0.4.0 | Usado, descripción actualizada | `src/data/demos/constructor-personaje.json` | Texto del paquete voxel coincide. Versión en ficha 0.1.0. Caveat: `juegos_virales/libs/constructor-personaje/README.md` describe otra librería homónima (sprite pixel art 2D, script clásico, sin three.js) que no corresponde al paquete oficial. |
| @greenborn/modelos-arboles | 0.2.0 | Usado, descripción actualizada | `src/data/demos/modelos-arboles.json` | Texto coincide (trece especies, three.js). Versión en ficha 0.1.0. |
| @greenborn/modelos-vehiculos | 0.2.0 | Usado, descripción actualizada | `src/data/demos/modelos-vehiculos.json` | Coincide (autos, camiones, motos, drones, Web Worker). |
| @greenborn/mapa-voxel | 0.3.1 | Usado, descripción actualizada | `src/data/demos/mapa-voxel.json` | Texto coincide (greedy meshing, pool de workers, modo estático). Versión en ficha 0.1.0. |
| @greenborn/sombras-horneadas | 0.1.0 | Usado, descripción desactualizada | `src/data/demos/sombras-horneadas.json` | La ficha describe solo el horneado único. No menciona muestreo de visibilidad por cara, ocluyentes ni los modos baked/mixto/realtime. Ver referencia abajo. |
| @greenborn/transito | 0.1.0 | Usado, descripción actualizada | `src/data/demos/transito.json` | Coincide (carriles, seguimiento IDM, reparto en intersecciones). |

## Descripción oficial de referencia (solo estados desactualizados)

**@greenborn/vue-greenborn-sso-front (1.7.1)**
> Cliente SSO para Vue 3 que se integra con el servidor de autenticación Greenborn: login con Google, bearer token, verificación de sesión, logout y componente callback.

**@greenborn/angular-greenborn-sso-front (1.0.2)**
> Cliente SSO para Angular 21: login con Google, bearer token, guard de rutas y WebSocket complementario.

**@greenborn/sombras-horneadas (0.1.0)**
> Sombra del sol horneada para mapas voxel: muestreo de visibilidad, ocluyentes y modos baked/mixto/realtime.
