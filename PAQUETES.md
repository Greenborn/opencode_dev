# Paquetes del monorepo Greenborn

Listado de todos los paquetes npm del monorepo (42, todos bajo el scope `@greenborn/`) con una breve descripción de para qué sirve cada uno.

> Fuente de verdad de versiones: `package.json` de cada paquete. Los proyectos que consumen estos paquetes están en `PROYECTOS_PAQUETES_GREENBORN.md` (no versionado).

## Backend (Node / Express)

| Paquete | Versión | Para qué sirve |
|---|---|---|
| `@greenborn/express-greenborn-sso-back` | 1.13.0 | Autenticación SSO para Express contra el servidor de auth Greenborn: middlewares `authMiddleware`/`authMiddlewareOptional` y router (`/me`, `/sso-profile`, `/register`), con rate limiting. |
| `@greenborn/express-greenborn-crud` | 0.4.0 | Router CRUD genérico (listar, ver, crear, editar, eliminar) para cualquier tabla Knex, protegido con permisos del SSO. Joins de lectura, filtros con operadores, búsqueda parametrizable y paginación configurable. |
| `@greenborn/express-greenborn-galeria-image` | 1.0.1 | Galería de imágenes para Express: subida (multer), thumbnails y metadatos (sharp), almacenamiento en disco y paginación. |
| `@greenborn/express-greenborn-mercado-pago` | 1.0.1 | Integración con Mercado Pago: cliente de la API y receptor de webhooks con deduplicación. |
| `@greenborn/express-greenborn-notificaciones` | 0.1.1 | Web Push (VAPID) para Express: router de suscripción, envío a uno o todos los usuarios y migración de `push_subscriptions`. |
| `@greenborn/greenborn-memory-cache` | 1.0.1 | Caché en memoria para Node.js con TTL por entrada, eventos y limpieza periódica. Sin dependencias. |
| `@greenborn/motor-multijugador` | 0.1.0 | Núcleo multijugador para Node: salas con `worker_thread`, puente socket.io ↔ worker y registro de sistemas con hooks. |
| `@greenborn/mapa-voxel-back` | 0.1.1 | Generador de mapas voxel del lado del servidor (terreno, edificios, chunks, luces, salas) con plugins de datos de juego. |
| `@greenborn/express-greenborn-perfil` | 0.1.0 | Perfil de usuario editable y perfil público: endpoints propio y público, lista blanca de salida con interruptor de privacidad por campo (apagado por defecto), migración idempotente. Término de la entidad configurable (por defecto `negocio`). Sin publicar todavía. |
| `@greenborn/express-greenborn-locales` | 0.1.0 | Locales con dirección y ubicación: CRUD propio con verificación de propietario, listado público sólo de locales publicados, coordenadas validadas. Término configurable. Sin publicar todavía. |

## Frontend Vue 3

| Paquete | Versión | Para qué sirve |
|---|---|---|
| `@greenborn/vue-greenborn-sso-front` | 1.8.0 | Cliente SSO para Vue 3: login con Google, intercambio de token, verificación de sesión, logout y componente callback para vue-router. |
| `@greenborn/vue-greenborn-crud` | 0.4.0 | Módulo CRUD genérico para Vue 3 que combina tabla lazy, filtros avanzados, formularios y confirmaciones, con botones según permisos RBAC, operaciones habilitables (`acciones`), formulario personalizado (`formulario`), preferencias de columnas inyectadas y ayuda contextual (data-help). |
| `@greenborn/vue-table-editor` | 1.4.9 | Tabla genérica: redimensionable, reordenable, edición inline, paginación, lazy loading, CSV export e infinite scroll. |
| `@greenborn/vue-greenborn-modal-manager` | 1.7.1 | Gestor de modales (formularios, alertas y confirmaciones) con soporte de modales anidados, sin Pinia. |
| `@greenborn/vue-side-menu` | 1.1.3 | Menú lateral configurable, responsive, con filtrado opcional por permisos y soporte de vue-router. |
| `@greenborn/vue-greenborn-panels` | 1.0.3 | Sistema de paneles y tabs reordenables (registry de tabs, TabBar con drag & drop, panel lateral colapsable). |
| `@greenborn/vue-greenborn-dashboard-cards` | 1.2.1 | Infraestructura de dashboard por cards: grid, pestañas personalizables por usuario, drag & drop y sparkline SVG. |
| `@greenborn/vue-greenborn-galeria-image` | 1.1.1 | Galería de imágenes con lazy load y lightbox (zoom, pan, fullscreen, navegación y metadatos). |
| `@greenborn/vue-greenborn-image-viewer` | 1.0.3 | Visor de imagen con zoom, pan y rotación, y slot para overlays (anotaciones/detecciones). |
| `@greenborn/vue-greenborn-webcam-viewer` | 1.0.3 | Visor de webcam: permisos, selección de cámara, captura de frames y bounding boxes. |
| `@greenborn/vue-greenborn-map-viewer` | 1.3.1 | Visor de mapa Leaflet con múltiples puntos (ubicaciones de profesionales, servicios o recursos). |
| `@greenborn/vue-greenborn-map-selector` | 1.1.1 | Selector de ubicación en mapa Leaflet dentro de un modal, con opción de usar la ubicación GPS. |
| `@greenborn/vue-greenborn-perfil` | 0.1.0 | Perfil editable y vista pública para Vue 3: formulario generado desde el esquema de campos, interruptor de privacidad por dato, composable de carga y guardado. Término configurable. Sin publicar todavía. |
| `@greenborn/vue-greenborn-locales-mapa` | 0.1.0 | Listado de locales con mapa (envuelve `vue-greenborn-map-viewer`), enlace "Cómo llegar" con coordenadas válidas, composable de CRUD. Término configurable. Sin publicar todavía. |
| `@greenborn/vue-greenborn-line-chart` | 1.0.1 | Gráfico de líneas en SVG puro (series, leyenda, grilla y tooltips) para métricas simples. |
| `@greenborn/vue-greenborn-markdown-viewer` | 1.0.1 | Convierte Markdown (GFM) en HTML sanitizado con DOMPurify y estilos tipográficos propios. |
| `@greenborn/vue-greenborn-money-input` | 1.0.1 | Campo de moneda con formato argentino que emite siempre un `Number` apto para columnas monetarias. |
| `@greenborn/vue-greenborn-tree-view` | 1.0.1 | Vista de árbol con carga diferida (`cargarNodos` provisto por el consumidor) y slots personalizables. |
| `@greenborn/vue-greenborn-directory-picker` | 1.0.1 | Selector de directorios sobre tree-view; el consumidor provee cómo cargar las carpetas (API, IPC, etc.). |
| `@greenborn/vue-greenborn-remote-terminal` | 1.0.3 | Terminal remota xterm.js agnóstica del transporte (colores ANSI, scrollback, redimensionado). |
| `@greenborn/vue-greenborn-notificaciones` | 0.1.0 | Cliente Web Push (VAPID) para Vue 3 / PWA: suscripción desde el front y listeners para el service worker. |
| `@greenborn/vue-greenborn-reporte-contextual` | 0.1.10 | Menú contextual (clic derecho) para reportar cualquier elemento de la interfaz con su contexto, enviado al SGI. |

## Frontend Angular

| Paquete | Versión | Para qué sirve |
|---|---|---|
| `@greenborn/angular-greenborn-sso-front` | 1.0.2 | Cliente SSO para Angular 21: login con Google, bearer token, guard de rutas y WebSocket complementario. |
| `@greenborn/angular-greenborn-image-detail` | 1.0.1 | Visor de detalle de imagen (zoom, pan, fullscreen, descarga) y modal con navegación prev/next. |

## Modelos 3D y mapas voxel (three.js)

| Paquete | Versión | Para qué sirve |
|---|---|---|
| `@greenborn/modelos-personajes` | 0.8.0 | Muñeco voxel articulado (rig, caminata, animaciones y pool instanciado) para three.js. Geometría en Web Worker. |
| `@greenborn/accesorios-personaje` | 0.3.0 | Accesorios del personaje voxel (gorra, sombrero, lentes y canasta) que se integran con `modelos-personajes`. |
| `@greenborn/constructor-personaje` | 0.4.0 | Constructor del personaje voxel: configuración de cuerpo y accesorios, panel DOM de chips y vista previa three.js. |
| `@greenborn/modelos-arboles` | 0.2.0 | Modelos procedurales de trece especies de árbol para three.js (núcleo puro apto para Web Worker). |
| `@greenborn/modelos-vehiculos` | 0.2.0 | Modelos procedurales de vehículos (autos, camiones, motos, drones, etc.) para three.js. |
| `@greenborn/mapa-voxel` | 0.3.1 | Visualización cliente de mapas voxel: greedy meshing, culling entre chunks, Web Workers y modo estático. Adaptador opcional a three.js. |
| `@greenborn/sombras-horneadas` | 0.1.0 | Sombra del sol horneada para mapas voxel (muestreo de visibilidad, ocluyentes y modos baked/mixto/realtime). |
| `@greenborn/transito` | 0.1.0 | Red vial y simulación de tránsito en grilla (carriles, car-following IDM, reserva de intersecciones). Módulo puro. |

## Notas

- Todos los paquetes usan el scope `@greenborn/` (regla de `AGENTS.md` para paquetes nuevos).
- Ante cualquier cambio o bump de versión de un paquete, revisar `PROYECTOS_PAQUETES_GREENBORN.md` y consultar al usuario antes de actualizar los proyectos consumidores (regla de `AGENTS.md`).
