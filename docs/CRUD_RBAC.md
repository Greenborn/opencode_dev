# CRUD genérico + SSO RBAC: integración back y front

Este documento explica cómo se acoplan tres paquetes del monorepo:

| Paquete | Rol |
|---------|-----|
| `@greenborn/express-greenborn-sso-back` | Autenticación y RBAC (`createSsoAuth`, `authMiddleware`, `requirePermission`). |
| `@greenborn/express-greenborn-crud` | Router Express CRUD para una tabla Knex (`createCrudRouter`). |
| `@greenborn/vue-greenborn-crud` | Módulo Vue 3 (`CrudModulo`, `useCrud`) con botones según permisos. |
| `@greenborn/vue-greenborn-sso-front` | Sesión en el front; expone `permisos` del usuario (`useSsoAuth`). |

Ninguno de los paquetes CRUD importa el SSO: el back recibe `sso` por inyección y el front recibe `permisos` y `http` por props. El acoplamiento es sólo por **contrato de nombres de permisos** y por la **forma de las respuestas**.

## Flujo de permisos de punta a punta

```
Navegador                         Back (Express)
─────────                         ──────────────
1. Login (SSO)  ───────────────►  sso.router / authMiddleware
                                   · valida el token
                                   · sincroniza el usuario
                                   · con rbac: adjunta roles[] y permisos[]
2. GET /api/user/me ◄───────────── { user: { ..., roles, permisos } }
   (vue-greenborn-sso-front)
3. useSsoAuth().permisos
   = ["productos.listar", "productos.crear", ...]
4. <CrudModulo :permisos="...">
   · sin productos.listar: no hay tabla
   · sin productos.crear: no hay botón "Nuevo"
   · etc. (la UI es una ayuda; NO es seguridad)
5. GET /api/productos/list ───►  sso.authMiddleware   (req.user)
                                 sso.requirePermission('productos.listar')
                                   · consulta usuarios_roles / roles_permisos
                                   · 403 si falta el permiso
                                 createCrudRouter: lista con filtroBase
6. POST/PUT/DELETE  ──────────►  mismo esquema con productos.crear | editar | eliminar
```

Puntos clave:

- **La seguridad está en el back.** Los permisos del front sólo ocultan botones. Cada ruta de `createCrudRouter` vuelve a exigir su permiso con `sso.requirePermission`.
- **El back consulta los permisos en la base del SSO** (en modo `rbac`), no confía en un valor enviado por el cliente.
- **El front recibe los permisos del mismo `/me`** que usa el resto de la aplicación.

## Convención de nombres de permisos

Formato: `<recurso>.<accion>`, en minúsculas, con `recurso` en plural y sin espacios.

| Acción | Ruta / botón | Uso |
|--------|--------------|-----|
| `listar` | `GET /list`, tabla | Ver el listado. |
| `ver` | `GET /:id` | Leer un registro. Sólo lo exige el back; el front no tiene vista de detalle. |
| `crear` | `POST /`, botón "Nuevo" | Alta. |
| `editar` | `PUT /:id`, botones "Editar" | Edición. |
| `eliminar` | `DELETE /:id`, botones "Eliminar" | Borrado. |

Ejemplos: `productos.listar`, `productos.crear`, `pedidos.editar`. Para acciones propias se pueden usar otros verbos (por ejemplo `pedidos.aprobar`), usando el mismo formato `<recurso>.<accion>`. Con `accionesExtra[].permiso` el front puede ocultar esas acciones por el mismo nombre.

Notas de consistencia:

- `createCrudRouter` pide `<recurso>.ver` para `GET /:id`, pero `CrudModulo` no lo usa. Para que UI y back coincidan, asignar `ver` junto con `listar` a los roles que deban ver el listado.
- Los nombres se definen en la base de datos del SSO (`permisos.nombre`) y deben coincidir exactamente con los de `recurso`.

## Esquema RBAC en la base

`createSsoAuth({ rbac: true })` espera estas tablas (nombres por defecto, configurables con el objeto `rbac`):

```
usuarios        (id, ...)
roles           (id, nombre, ...)
permisos        (id, nombre, ...)
usuarios_roles  (usuario_id, rol_id)     -- M2M usuario <-> rol
roles_permisos  (rol_id, permiso_id)     -- M2M rol <-> permiso
```

Las tablas `roles`, `permisos`, `usuarios_roles` y `roles_permisos` **no las crea el SSO**: deben existir en el consumidor (migraciones propias). Requisito de los nombres de columna: el `id` de `roles` y de `permisos` debe llamarse igual que `rbac.userPk` (por defecto `id`), porque las consultas de permisos y roles hacen JOIN contra esa columna.

Los permisos se cargan asignándolos a roles en `roles_permisos` y a los roles en `usuarios_roles`.

## Ejemplo de servidor

```js
// server/index.js
import express from 'express';
import knexFactory from 'knex';
import { createSsoAuth } from '@greenborn/express-greenborn-sso-back';
import { createCrudRouter, ErrorCrud } from '@greenborn/express-greenborn-crud';

const db = knexFactory({ client: 'better-sqlite3', connection: { filename: './data/app.db' }, useNullAsDefault: true });

// 1. SSO con RBAC: los permisos se leen de usuarios_roles / roles_permisos / permisos.
const sso = createSsoAuth({
  knex: db,
  rbac: true,
  logger: console,
});

const app = express();
app.use(express.json());

// Rutas de sesión del SSO (GET /me, GET /sso-profile, POST /register)
app.use('/api/user', sso.router);

// 2. CRUD de productos. Cada ruta exige productos.<accion>.
const productosCampos = [
  { field: 'nombre', headerName: 'Nombre', type: 'text', sortable: true, filterable: true, searchable: true, required: true },
  { field: 'precio', headerName: 'Precio', type: 'number', sortable: true, filterable: true, required: true, css: 'text-end' },
  { field: 'activo', headerName: 'Activo', type: 'boolean', filterable: true },
  { field: 'creado', headerName: 'Creado', type: 'date', sortable: true, writable: false },
];

app.use('/api/productos', sso.authMiddleware, createCrudRouter({
  knex: db,
  sso,
  recurso: 'productos',          // => productos.listar, .ver, .crear, .editar, .eliminar
  tabla: 'productos',
  campos: productosCampos,
  pk: 'id',
  // Acota lectura y búsqueda previa de editar/eliminar por el usuario autenticado.
  // Síncrona: devuelve el query builder.
  filtroBase: (req, qb) => qb.where('propietario_id', req.user.id),
  hooks: {
    antesCrear: (req, datos) => ({ ...datos, propietario_id: req.user.id }),
    antesEliminar: (req, registro) => {
      if (registro.activo) throw new ErrorCrud(409, 'No se puede eliminar un producto activo');
      return registro;
    },
  },
  activityLog: async (req, { accion, recurso, id }) => {
    await db('actividad').insert({ usuario_id: req.user.id, recurso, accion, registro_id: id });
  },
}));

// Protección adicional a nivel ruta (opcional): exigir sólo un permiso de acceso general.
app.get('/api/admin/panel', sso.authMiddleware, sso.requirePermission('panel.ver'), (req, res) => {
  res.json({ status: true, data: { ok: true } });
});

app.listen(3000);
```

Notas del ejemplo:

- `sso.authMiddleware` debe ir **antes** de `createCrudRouter`: el router sólo comprueba permisos y necesita `req.user`.
- `filtroBase` acota la lectura, pero el `INSERT` no lo aplica: por eso `antesCrear` fija `propietario_id`. Ver "Alcance de `filtroBase`" en el README del paquete.
- El ejemplo usa SQLite, donde el `id` autoincremental funciona sin declararlo en `campos`. Con PostgreSQL hay que declarar `pk` en `campos` como `writable: true` y enviarlo en el body (ver "Limitaciones" del README del paquete).
- Los errores `403` y `401` de la autorización los responde el SSO con `{ success: false, message }`; los del CRUD usan `{ status: false, message, errors? }`. El front maneja ambas formas, porque lee `message`.

## Ejemplo de front

```vue
<!-- src/views/ProductosView.vue -->
<template>
  <CrudModulo
    recurso="productos"
    endpoint="/api/productos"
    :http="api"
    :permisos="permisos"
    titulo="Productos"
    :elemento="{ singular: 'Producto', gender: 'M' }"
    :acciones-extra="acciones"
  />
</template>

<script setup>
import { computed } from 'vue'
import axios from 'axios'
import { CrudModulo } from '@greenborn/vue-greenborn-crud'
import { useSsoAuth } from '@greenborn/vue-greenborn-sso-front'

// Permisos del usuario, cargados desde /api/user/me por el SSO front.
const { permisos: permisosSso } = useSsoAuth()
const permisos = computed(() => permisosSso.value)

// Cliente HTTP: devuelve el body JSON ({ status, data }) y lanza ante errores HTTP.
const api = {
  get: (url, cfg) => axios.get(url, cfg).then((r) => r.data),
  post: (url, body) => axios.post(url, body, { withCredentials: true }).then((r) => r.data),
  put: (url, body) => axios.put(url, body, { withCredentials: true }).then((r) => r.data),
  delete: (url) => axios.delete(url, { withCredentials: true }).then((r) => r.data),
}

const acciones = [
  {
    key: 'duplicar',
    label: 'Duplicar',
    icon: 'copy',
    severity: 'outline-secondary',
    permiso: 'productos.crear',       // sólo aparece si el usuario puede crear
    onClick: (fila) => console.log('duplicar', fila.id),
  },
]
</script>
```

Notas del ejemplo:

- `permisos` debe ser un array de strings. Si la sesión aún no cargó, `useSsoAuth().permisos` vale `[]` y no se muestra ningún botón.
- `CrudModulo` pide `campos` opcionalmente; sin él, usa los `fields_def` de `GET /api/productos/list`, que son la misma definición que `productosCampos` en el servidor. Pasar `:campos` sólo si se necesita otra presentación.
- Para una vista sin el componente de tabla se puede usar `useCrud` con los mismos parámetros (ver README de `@greenborn/vue-greenborn-crud`).
- Requisitos de montaje (una vez en `App.vue`): `<ModalContainer />` de `@greenborn/vue-greenborn-modal-manager`.

## Contrato de respuestas

| Caso | Forma | Quién lo produce |
|------|-------|------------------|
| Éxito de listado | `{ status: true, data: { rows, totalRecords, fields_def } }` | `createCrudRouter` |
| Lectura de un registro | `{ status: true, data: row, fields_def }` | `createCrudRouter` (desde 0.3.0 incluye `fields_def`) |
| Éxito de escritura | `{ status: true, data: row }` (201 en alta) / `{ status: true, data: { id } }` (borrado) | `createCrudRouter` |
| Error de validación | `{ status: false, message, errors: { campo: mensaje } }` (400) | `createCrudRouter` |
| Error de permiso | `{ success: false, message }` (401/403) | `sso.requirePermission` |
| Error interno | `{ status: false, message: 'Error interno' }` (500) | `createCrudRouter` |

El front de CRUD lee `message`, `errors` y `data.fields_def`/`rows`/`totalRecords`. Desde la 0.3.0, los campos `select` con `lookup` y los `multiselect` llevan `options` cargadas desde la BD en `fields_def`, los listados incluyen `<campo>_etiqueta` y los multiselect se devuelven como array de ids (ver README del paquete).

## Checklist de integración para un recurso nuevo

1. Crear las tablas del recurso y registrar los permisos `recurso.listar|ver|crear|editar|eliminar` en `permisos` (y asignarlos a roles en `roles_permisos`).
2. Definir `campos` una sola vez en el servidor y pasarlos a `createCrudRouter`.
3. Montar `app.use('/api/<recurso>', sso.authMiddleware, createCrudRouter({...}))`.
4. En el front, `<CrudModulo recurso="<recurso>" endpoint="/api/<recurso>" :http="api" :permisos="permisos" />`.
5. Probar con un usuario sin permisos (no debe haber botones ni tabla) y con uno con permisos parciales (por ejemplo sólo `listar`).

## Fuera de alcance de esta versión

- Migraciones y seeds de RBAC (roles, permisos, asignaciones): quedan a cargo del consumidor.
- UI de administración de roles y permisos.
- Transacciones entre `hooks` y la escritura.
