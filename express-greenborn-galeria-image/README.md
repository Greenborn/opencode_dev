# express-greenborn-galeria-image

Galería de imágenes para backends Express/Node.js: CRUD de imágenes con subida (`multer`), generación automática de thumbnails y extracción de dimensiones (`sharp`), storage en disco local y listado paginado. Con inyección de dependencias (`knex`, `logger`, middlewares) y agnóstico del esquema de base de datos.

**Compatible con el RBAC de `express-greenborn-sso-back`** mediante middlewares inyectables, pero **utilizable sin él** (modo standalone con rutas abiertas).

## Install

```bash
npm install express-greenborn-galeria-image
# peer opcional (ya lo tenés si usás Express):
npm install express
```

Requisitos: Node >= 18, Express ^4.21 || ^5, una instancia de `knex` (mysql2, pg, sqlite3, etc.).

## Uso rápido (standalone, sin RBAC)

```js
import express from 'express';
import knex from 'knex';
import { createGaleriaImage } from 'express-greenborn-galeria-image';

const app = express();
const db = knex({ client: 'mysql2', connection: { /* ... */ } });

const galeria = createGaleriaImage({
  knex: db,
  logger: console,                    // opcional
  uploadDir: 'uploads/galeria',       // opcional (default)
  publicBaseUrl: 'https://midominio.com', // para construir URLs absolutas (opcional)
});

app.use(express.json());
app.use(galeria.rootPath, galeria.galeriaRouter); // monta /api/galeria-imagenes

app.listen(3000);
```

## Uso con RBAC (express-greenborn-sso-back)

El paquete **no depende** de sso-back: el host inyecta los middlewares que quiera por operación. Con el RBAC de greenborn:

```js
import { createSsoAuth } from 'express-greenborn-sso-back';

const sso = createSsoAuth({ knex: db, rbac: true });

const galeria = createGaleriaImage({
  knex: db,
  middlewares: {
    list:   [sso.authMiddleware, sso.requirePermission('galeria.ver')],
    read:   [sso.authMiddleware, sso.requirePermission('galeria.ver')],
    create: [sso.authMiddleware, sso.requirePermission('galeria.crear')],
    update: [sso.authMiddleware, sso.requirePermission('galeria.editar')],
    delete: [sso.authMiddleware, sso.requirePermission('galeria.eliminar')],
  },
});
```

Sin `middlewares`, las rutas quedan abiertas (uso por defecto / público). Los endpoints de archivos (`/archivos/...`) son siempre públicos para poder usarse en etiquetas `<img>`.

## Endpoints

Montados bajo `rootPath` (default `/api/galeria-imagenes`):

| Método | Ruta | Descripción | Middlewares |
|---|---|---|---|
| GET | `/` | Listado paginado. Query: `page`, `limit`, `seccion`, `q` (busca en título/descripción) | `list` |
| GET | `/:id` | Detalle de una imagen | `read` |
| POST | `/` | Subida. `multipart/form-data`, campo **`imagen`** + campos opcionales `titulo`, `descripcion`, `seccion`, `orden` | `create` |
| PATCH | `/:id` | Actualiza metadatos (`titulo`, `descripcion`, `seccion`, `orden`) | `update` |
| DELETE | `/:id` | Elimina registro + archivos en disco | `delete` |
| GET | `/archivos/:filename` | Sirve la imagen original | público |
| GET | `/archivos/thumbnails/:filename` | Sirve el thumbnail | público |

Respuestas JSON con el formato `{ success, message }` en errores (401/403/404/400) y `{ success: true, data }` en éxito. El listado agrega `total`, `page`, `limit`, `pages`.

Cada imagen devuelve:

```json
{
  "id": 1,
  "titulo": "...",
  "descripcion": "...",
  "seccion": "...",
  "filename": "1710000000-uuid.jpg",
  "thumbnail_filename": "1710000000-uuid.jpg.jpg",
  "original_name": "foto.jpg",
  "mime_type": "image/jpeg",
  "size": 204800,
  "width": 1920,
  "height": 1080,
  "orden": 0,
  "url": "https://midominio.com/api/galeria-imagenes/archivos/1710000000-uuid.jpg",
  "thumbnail_url": "https://midominio.com/api/galeria-imagenes/archivos/thumbnails/1710000000-uuid.jpg.jpg",
  "created_at": "...",
  "updated_at": "..."
}
```

## Migraciones

Carpeta `migrations/` con migración knex idempotente (tabla `galeria_imagenes`). Apuntá knex a la carpeta o copiá la migración a las del host:

```bash
knex --knexfile ./knexfile.js migrate:latest
```

## Opciones de `createGaleriaImage(options)`

| Opción | Tipo | Default | Descripción |
|---|---|---|---|
| `knex` | `Knex` | (requerido) | Instancia de Knex del host |
| `logger` | `object \| fn` | noop | Logger (`console` sirve) |
| `uploadDir` | `string` | `uploads/galeria` (o `GALERIA_UPLOAD_DIR`) | Directorio base en disco (los thumbnails van a `uploadDir/thumbnails/`) |
| `publicBaseUrl` | `string` | `''` (o `GALERIA_PUBLIC_BASE_URL`) | Prefijo para URLs absolutas; sin él las URLs son relativas |
| `archivosPath` | `string` | `/api/galeria-imagenes/archivos` | Path público de archivos |
| `rootPath` | `string` | `/api/galeria-imagenes` | Donde montar el router |
| `maxFileSize` | `number` | 10 MB (o `GALERIA_MAX_FILE_SIZE`) | Límite de subida (multer) |
| `allowedMimeTypes` | `string[]` | jpeg, png, webp, gif, avif, svg | Tipos permitidos |
| `thumbnailWidth` | `number` | 400 (o `GALERIA_THUMBNAIL_WIDTH`) | Ancho del thumbnail JPEG |
| `defaultLimit` / `maxLimit` | `number` | 24 / 100 | Paginación del listado |
| `middlewares` | `object` | `{}` | `{ list, read, create, update, delete }`: arrays de middlewares por operación (ej. RBAC) |
| `tabla` | `string` | `galeria_imagenes` | Nombre de tabla (para esquemas custom) |

Además del router, la factory devuelve métodos de servicio reutilizables: `list(query)`, `getById(id)`, `createFromFile(file, meta)`, `update(id, changes)`, `remove(id)`.

## Demo

```bash
cp .env.example .env   # configurar DB
npm run demo           # levanta el server demo en el puerto 5175
```

## Scripts

| Comando | Descripción |
|---|---|
| `npm run build` | Genera `dist/` (ESM + CJS + `.d.ts`) con esbuild |
| `npm test` | Tests con `node --test` |
| `npm run demo` | Server demo (puerto 5175) |

## Licencia

MIT
