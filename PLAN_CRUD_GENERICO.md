# Plan: CRUD genérico acoplable a SSO/RBAC (back + front)

Fecha: 2026-11-22

## 1. Objetivo

Crear dos paquetes nuevos del monorepo, con scope `@greenborn`:

| Paquete | Carpeta | Rol |
|---------|---------|-----|
| `@greenborn/express-greenborn-crud` | `express-greenborn-crud/` | Router Express genérico (list/get/create/update/delete) para cualquier tabla Knex, protegido con permisos del SSO. |
| `@greenborn/vue-greenborn-crud` | `vue-greenborn-crud/` | Módulo Vue 3 genérico: tabla con `@greenborn/vue-table-editor` (modo lazy), formularios y confirmaciones con `@greenborn/vue-greenborn-modal-manager`, botones habilitados según permisos RBAC. |

Ambos son **agnósticos de esquema** y **no importan** el SSO: lo reciben por inyección de dependencias.

## 2. Decisiones tomadas (por defecto; cambiarlas antes de implementar si no sirven)

1. Carpetas nuevas en la raíz del monorepo, con la misma estructura que `express-greenborn-sso-back/` y `vue-greenborn-sso-front/` (`src/`, `test/`, `demo/`, `README.md`, `LICENSE`, `package.json`).
2. Versión inicial `0.1.0` en ambos.
3. **No se publican en npm en esta fase.** Publicar es una acción externa: se hace sólo con confirmación explícita del usuario. Los subagentes no ejecutan `npm publish`.
4. **No se agregan a `PROYECTOS_PAQUETES_GREENBORN.md`** hasta que el usuario lo confirme (regla del AGENTS.md: preguntar antes de tocar consumidores).
5. Demos en puerto **5175** (regla de `opencode_dev/greenborn_1/AGENTS.md`).
6. Sin TypeScript, sin Bootstrap obligatorio, sin librerías nuevas para lo que el estándar web resuelve.
7. Sin `||` como fallback de parámetros: argumentos requeridos se validan y lanzan error explícito.
8. Ningún `catch` vacío: todo error se registra con `console.log`/`console.error` (o `logger` inyectado).

## 3. Contrato compartido (lo que deben respetar ambos paquetes)

### 3.1 Permisos (RBAC)

Convención de nombres: `<recurso>.<accion>` con acciones `listar`, `ver`, `crear`, `editar`, `eliminar`.
Ejemplo: `productos.listar`, `productos.crear`.

El SSO ya provee:
- `sso.requirePermission(...permisos)` → middleware Express (403 si faltan permisos).
- `sso.resolveUserPermissions(userId)` → filas con `nombre`.
- En modo RBAC, `attachRolesPermissions` agrega `user.permisos` (array de strings) a `req.user`.

El front recibe la lista de permisos del usuario (`user.permisos`), **sin importar el paquete SSO**: se pasa como parámetro.

### 3.2 Definición de campos (`campos`)

Un único array que alimenta backend (validación, whitelist, `fields_def`) y frontend (columnas y formulario):

```js
{
  field: 'precio',            // nombre de columna en la tabla
  headerName: 'Precio',       // etiqueta
  type: 'number',             // 'text' | 'number' | 'date' | 'boolean' | 'select'
  form_type: 'number',        // tipo de input: 'text' | 'number' | 'date' | 'checkbox' | 'select' | 'textarea' | 'email'
  sortable: true,
  filterable: true,           // filtro por columna (server-side)
  searchable: true,           // entra en la búsqueda global
  writable: true,             // false = sólo lectura (no entra en create/update)
  required: true,
  options: [{ value: 1, label: 'Activo' }],   // sólo para select
  css: 'text-end',            // clase opcional de la celda
}
```

`fields_def` que devuelve el backend en `list` = `campos` normalizados, sin propiedades internas (`required`, `options` se conservan porque el front las necesita para el formulario).

### 3.3 Endpoints del paquete back (`createCrudRouter`)

Con `pk` por defecto `id`:

| Método | Ruta | Permiso | Respuesta |
|--------|------|---------|-----------|
| GET | `/list` | `<recurso>.listar` | `{ status: true, data: { rows, totalRecords, fields_def } }` |
| GET | `/:id` | `<recurso>.ver` | `{ status: true, data: row }` |
| POST | `/` | `<recurso>.crear` | `{ status: true, data: row }` (201) |
| PUT | `/:id` | `<recurso>.editar` | `{ status: true, data: row }` |
| DELETE | `/:id` | `<recurso>.eliminar` | `{ status: true, data: { id } }` |

Errores: `{ status: false, message, errors?: { campo: 'mensaje' } }` con códigos 400 (validación), 404, 403 (lo da `requirePermission`), 500.

Query de `GET /list` (compatible con lazy de TableEditor; verificar los nombres exactos en `vue-table-editor/src` antes de implementar):
- `page`, `pageSize`
- `sortField`, `sortOrder` (`asc`|`desc`)
- `search` (búsqueda global sobre campos `searchable`)
- `filters` (JSON `{ campo: valor }` sobre campos `filterable`)

Todo nombre de columna que llegue por query se **valida contra la whitelist** de `campos` antes de usarlo en SQL. Nunca concatenar input en SQL.

### 3.4 API de `createCrudRouter`

```js
createCrudRouter({
  knex,            // obligatorio
  sso,             // obligatorio: objeto devuelto por createSsoAuth (usa sso.requirePermission)
  recurso,         // obligatorio: string, base de los permisos y del nombre
  tabla,           // obligatorio: nombre de tabla
  campos,          // obligatorio: array de definiciones (3.2)
  pk = 'id',
  soloLectura = false,      // si true, sólo expone list/ver
  filtroBase,      // opcional: (req, qb) => qb, para acotar por workspace/usuario
  hooks,           // opcional: { antesCrear, despuesCrear, antesEditar, despuesEditar, antesEliminar, despuesEliminar }
  activityLog,     // opcional: función (req, { accion, recurso, id }) => Promise
  logger = console,
})
```

Acoplamiento SSO: el paquete sólo usa `sso.requirePermission`. Si `sso` no tiene esa función, `createCrudRouter` lanza error al construirse.

### 3.5 API del paquete front

Composable + componente:

```js
// Componente
<CrudModulo
  :recurso="'productos'"
  :endpoint="'/api/productos'"       // base de las rutas del back
  :http="api"                        // { get, post, put, delete } que devuelven la data (axios wrapper)
  :permisos="user.permisos"          // array de strings del SSO
  :campos="campos"                   // opcional; si no se pasa, se toma de fields_def de /list
  :titulo="'Productos'"
  :elemento="{ singular: 'Producto', gender: 'M' }"
  :acciones-extra="[...]"            // opcional, se suman a la toolbar/rowActions
/>
```

Reglas del front:
- Botones de la toolbar y de fila sólo se muestran si el permiso correspondiente está en `permisos`.
- Alta/edición: `mostrar_modal(FormCrud, titulo, { campos, valores, modo, _modalState }, { size: 'md' })`. El body registra su función `guardar` en `_modalState` y un footer la invoca (patrón documentado en el README de modal-manager).
- Eliminación: `mostrar_confirm({ title, text, confirmar_accion, severity_confirmar: 'danger' })`.
- Errores y éxitos: `mostrar_alerta(texto)`. Nunca `alert()`.
- Errores de validación del back (`errors`) se muestran en el formulario.
- Refresco de la tabla tras crear/editar/eliminar (método `refresh` del TableEditor vía ref).
- Peer dependencies: `vue`, `@greenborn/vue-table-editor`, `@greenborn/vue-greenborn-modal-manager`. No depende del SSO front.

## 4. Fases y reparto

| Fase | Tarea | Quién | Depende de |
|------|-------|-------|------------|
| F0 | Este plan + decisiones | Claude (hecho) | — |
| F1a | Implementar `express-greenborn-crud` (src, tests, README) | Subagente Haiku A | contrato §3 |
| F1b | Implementar `vue-greenborn-crud` (src, demo, README) | Subagente Haiku B | contrato §3 |
| F2 | Verificación cruzada: revisar que los tests pasen, que el contrato de `fields_def` coincida con lo que consume TableEditor y que no haya `alert()`, `||` de fallback, `catch` vacío ni TypeScript | Claude (revisión) | F1a, F1b |
| F3 | Demo integrada (back con SSO real o mock + front) en puerto 5175 | Subagente Haiku C | F2 |
| F4 | Documentación: README de ambos, actualizar `docs/` si corresponde | Subagente Haiku C | F2 |
| F5 | Versionado, `npm pack --dry-run`, publicación npm | **Requiere confirmación del usuario** | F4 |
| F6 | Agregar a `PROYECTOS_PAQUETES_GREENBORN.md` y migrar proyectos consumidores | **Requiere confirmación del usuario** | F5 |

## 5. Criterios de aceptación

Back:
- `createCrudRouter` monta las 5 rutas (o 2 si `soloLectura`).
- Cada ruta exige su permiso; un usuario sin permiso recibe 403.
- Campos fuera de `campos` no se escriben ni se filtran (y se registra un warning).
- Paginación, orden, búsqueda y filtros funcionan contra SQLite (better-sqlite3) en tests.
- Tests con el runner que use `express-greenborn-sso-back` (revisar su `package.json`).

Front:
- Con `permisos = []` no aparece ningún botón de acción.
- Con todos los permisos, alta/edición/eliminación funcionan contra la API.
- Formulario generado desde `campos` valida `required` y muestra errores del back.
- Tests de componente o al menos un smoke test del composable.

Ambos:
- `package.json` con `name` `@greenborn/...`, `version` `0.1.0`, `type: module`, `exports` correctos.
- `README.md` con instalación, uso y API.
- Sin TypeScript, sin `alert()`, sin `catch {}` vacío.

## 6. Riesgos y puntos a verificar antes de implementar

1. Nombres exactos de parámetros de lazy loading de `vue-table-editor` (¿`page`/`pageSize` o `first`/`rows`?). Verificar en `vue-table-editor/src`.
2. Forma exacta de `user.permisos` en `vue-greenborn-sso-front` (¿existe en el store/composable?). Verificar en `vue-greenborn-sso-front/src/composables/useSsoAuth.js`.
3. El SSO no trae migraciones de RBAC (`roles`, `permisos`, `usuarios_roles`, `roles_permisos`): quedan a cargo del consumidor. Evaluar en fase posterior un paquete de migraciones/seed de RBAC.
4. Un CRUD genérico no reemplaza la lógica de negocio: los consumidores deben usar `hooks` cuando haga falta.

## 7. Fuera de alcance (fase posterior, a confirmar)

- UI de administración de roles y permisos (`@greenborn/vue-greenborn-rbac-admin`).
- Migraciones/seeds de RBAC en un paquete aparte.
- Generación de código con el skill `crear-crud` (sigue vigente para proyectos sin paquete).
