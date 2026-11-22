# @greenborn/express-greenborn-crud

Router Express **CRUD genérico** para cualquier tabla de Knex, protegido con permisos del SSO (`sso.requirePermission`). Es agnóstico de esquema: la tabla, los campos y los permisos se declaran en la configuración, y el paquete construye las queries sin concatenar input en SQL.

Es la contraparte de backend de `@greenborn/vue-greenborn-crud`. No importa `@greenborn/express-greenborn-sso-back`: el SSO se recibe por inyección de dependencias (objeto `sso` devuelto por `createSsoAuth`). Ver la integración de punta a punta en [`docs/CRUD_RBAC.md`](../docs/CRUD_RBAC.md).

## Instalación

```bash
npm install @greenborn/express-greenborn-crud
```

Peer dependencies: `express` (`^4.21.0 || ^5.0.0`) y `knex` (`^3.0.0`). Node.js >= 18.

Exports nombrados del paquete (`src/index.js`): `createCrudRouter`, `normalizarCampos`, `camposPublicos`, `ErrorCrud`, `requireAnyPermission`. No tiene export por defecto.

## Uso

```js
import express from 'express';
import { createSsoAuth } from '@greenborn/express-greenborn-sso-back';
import { createCrudRouter } from '@greenborn/express-greenborn-crud';

const sso = createSsoAuth({ knex: db, rbac: true /* ... */ });

const productosCampos = [
  { field: 'nombre', headerName: 'Nombre', type: 'text', sortable: true, filterable: true, searchable: true, required: true },
  { field: 'precio', headerName: 'Precio', type: 'number', sortable: true, filterable: true, required: true, css: 'text-end' },
  { field: 'categoria', headerName: 'Categoría', type: 'select', filterable: true,
    options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
  { field: 'activo', headerName: 'Activo', type: 'boolean', filterable: true },
  { field: 'creado', headerName: 'Creado', type: 'date', sortable: true, writable: false },
];

const app = express();
app.use(express.json());

app.use('/api/productos', sso.authMiddleware, createCrudRouter({
  knex: db,                       // obligatorio: instancia de Knex
  sso,                            // obligatorio: objeto de createSsoAuth
  recurso: 'productos',           // obligatorio: base de los permisos
  tabla: 'productos',             // obligatorio: nombre de la tabla
  campos: productosCampos,        // obligatorio: definición de campos
  pk: 'id',                       // opcional, default 'id' (no escribible salvo pkEscribible: true)
  soloLectura: false,             // opcional, default false
  filtroBase: (req, qb) => qb.where('workspace_id', req.session.workspaceId),
  alcance: (req) => ({ owner_id: req.user.id }), // opcional: valores fijos del registro en POST
  softDelete: { campo: 'activo', valor: 0, extra: { estado: 'anulado' } }, // opcional: DELETE lógico
  hooks: {
    antesCrear: (req, datos) => ({ ...datos, creado_por: req.user.id }),
  },
  activityLog: async (req, { accion, recurso, id }) => { /* registrar */ },
  logger: console,                // opcional, default console
}));
```

`createCrudRouter` **no** autentica por sí mismo: `req.user` lo debe poner `sso.authMiddleware` (o `authMiddlewareOptional`) montado antes del router. Sin `req.user` el router responde 401.

## Opciones de `createCrudRouter`

| Opción | Obligatoria | Descripción |
|--------|-------------|-------------|
| `knex` | sí | Instancia de Knex (debe ser una función, como la que devuelve `knex(config)`). |
| `sso` | sí | Objeto con la función `requirePermission` (el que devuelve `createSsoAuth`). |
| `recurso` | sí | String `[A-Za-z0-9_-]+`. Base de los permisos `<recurso>.<accion>`. |
| `tabla` | sí | Nombre de tabla (`[A-Za-z_][A-Za-z0-9_]*`). |
| `campos` | sí | Array no vacío de definiciones (ver "Definición de campos"). |
| `pk` | no | Columna clave. Default `'id'`. Mismo formato de nombre que `tabla`. |
| `pkEscribible` | no | Booleano. Default `false`. Si `false`, la clave nunca se escribe desde el body (ver "Clave primaria"). |
| `soloLectura` | no | Booleano. Default `false`. Si `true` sólo se montan `GET /list` y `GET /:id`. |
| `filtroBase` | no | `(req, qb) => qb`, **síncrona**, debe devolver el query builder. Acota la lectura de `list`, `ver`, la búsqueda previa de `editar` y la de `eliminar` (ver "Alcance de `filtroBase`"). |
| `alcance` | no | `(req) => ({ campo: valor, ... })` o `null`, **síncrona**. Valores que el router fija en cada alta y que el cliente no puede cambiar (ver "Alcance"). Debe ser función, `null` o no estar presente; cualquier otro tipo lanza al construir. |
| `softDelete` | no | `{ campo, valor, extra? }`. Si está, `DELETE` hace un `UPDATE` en lugar de borrar (ver "Borrado lógico"). |
| `hooks` | no | Objeto con cualquiera de: `antesCrear(req, datos)`, `despuesCrear(req, row)`, `antesEditar(req, datos, registro)`, `despuesEditar(req, row)`, `antesEliminar(req, registro)`, `despuesEliminar(req, registro)`. Cualquier otra clave lanza error al construir. |
| `activityLog` | no | `async (req, { accion, recurso, id }) => {}`. Función; se invoca tras cada escritura. |
| `joins` | no | Array de `{ tabla, alias, on: [origen, destino], tipo? }` para unir tablas en la **lectura** (ver "Joins"). Default `[]`. |
| `paginacion` | no | `{ tamanoDefecto?, tamanoMaximo?, tamanosPermitidos? }` (ver "Paginación"). Defaults: 25, 500 y sin lista. |
| `busqueda` | no | `{ modo }` con `modo` en `contiene` (default), `empieza`, `termina` o `igual` (ver "Búsqueda"). |
| `ayuda` | no | `{ clave?, botones?, campos? }` sólo con claves (strings). Se expone en `data.ayuda` del listado (ver "Ayuda"). |
| `logger` | no | Objeto con `error` y `warn`. Default `console`. |

Si falta una opción obligatoria o alguna es inválida, `createCrudRouter` lanza un `Error` al construirse (no en runtime). Esto incluye `alcance` no funcional, `softDelete` mal formado, `pkEscribible` no booleano y un dialecto de Knex que no se pueda determinar o no esté soportado.

## Permisos

Convención `<recurso>.<accion>`, con acciones `listar`, `ver`, `crear`, `editar`, `eliminar`. Con `recurso: 'productos'` las rutas exigen `productos.listar`, `productos.ver`, `productos.crear`, `productos.editar` y `productos.eliminar`.

La verificación la hace `sso.requirePermission(permiso)` del SSO. Éste consulta los permisos en la base del SSO (modo `rbac`) o, sin RBAC, compara contra `role_id`. Respuestas del SSO ante falta de permiso (son de su formato, no el de este paquete):

- `401 { success: false, message: 'Token de autenticación requerido' }` si no hay `req.user`.
- `403 { success: false, message: 'Acceso denegado: permisos insuficientes' }` si faltan permisos.

### OR de permisos: `requireAnyPermission`

`sso.requirePermission` es AND (exige todos los permisos pasados). Para aceptar cualquiera de varios, el paquete exporta `requireAnyPermission(sso, ...permisos)`, que se usa como cualquier middleware de Express, por ejemplo en una ruta propia del consumidor:

```js
import { requireAnyPermission } from '@greenborn/express-greenborn-crud';

app.get('/api/reportes', sso.authMiddleware, requireAnyPermission(sso, 'reportes.ver', 'reportes.admin'), handler);
```

Comportamiento: prueba cada permiso en orden con `sso.requirePermission(p)` y deja pasar al primero que se cumpla. Si ninguno se cumple responde `403 { success: false, message: 'Acceso denegado: permisos insuficientes' }`. Si el SSO responde con otro código (p. ej. `401` sin usuario) esa respuesta se reenvía tal cual sin probar más permisos.

**Limitación:** el OR sólo distingue el `403` de "sin permiso". Cualquier otro código de error del SSO corta la evaluación. No está conectado a `opciones` del router: los permisos de cada acción siguen siendo `<recurso>.<accion>`.

## Endpoints

| Método | Ruta | Permiso | Respuesta |
|--------|------|---------|-----------|
| GET | `/list` | `<recurso>.listar` | `200 { status: true, data: { rows, totalRecords, fields_def } }` |
| GET | `/:id` | `<recurso>.ver` | `200 { status: true, data: row, fields_def }` |
| POST | `/` | `<recurso>.crear` | `201 { status: true, data: row }` |
| PUT | `/:id` | `<recurso>.editar` | `200 { status: true, data: row }` |
| DELETE | `/:id` | `<recurso>.eliminar` | `200 { status: true, data: { id } }` |

Con `soloLectura: true` sólo existen `GET /list` y `GET /:id`; las demás rutas no se montan (responden 404 de Express).

### Códigos de respuesta y errores

Los errores controlados tienen la forma `{ status: false, message, errors? }`:

| Código | Cuándo |
|--------|--------|
| 400 | Query de listado inválida, cuerpo que no es objeto JSON, validación de campos (`errors` por campo, incluida `maxLength`), valor de lookup o id de multiselect que no existe en la tabla externa con su filtro (`Opción no válida`), multiselect que no es array (`Debe ser una lista de ids`), body con una clave de alcance distinta del valor del alcance (`errors` por campo), `PUT` sin campos escribibles (`No hay campos para actualizar`). |
| 401 / 403 | Los da `sso.requirePermission` (formato del SSO, ver arriba). |
| 404 | `Registro no encontrado` (no existe, o no pasa `filtroBase`; en `softDelete` también si el alcance no coincide). |
| 409 | Error de base de datos de unicidad o de clave foránea (ver "Errores de base de datos"). |
| 500 | Cualquier otro error no controlado: se registra con `logger.error` y responde `{ status: false, message: 'Error interno' }`. |

Un error genérico (incluso uno con propiedad `status`) responde 500. Un error de base de datos sólo responde 409 si su código está en la tabla de abajo.

### Errores de base de datos

Los errores del driver se traducen por su código. Siempre se registra el error original con `logger.error`, también cuando la respuesta es 409.

| Código del driver | Respuesta |
|-------------------|-----------|
| `ER_DUP_ENTRY` (MySQL/MariaDB), `SQLITE_CONSTRAINT_UNIQUE`, `SQLITE_CONSTRAINT_PRIMARYKEY` | 409 `Ya existe un registro con ese valor` |
| `ER_ROW_IS_REFERENCED`, `ER_ROW_IS_REFERENCED_2`, `ER_NO_REFERENCED_ROW_2` (MySQL/MariaDB), `SQLITE_CONSTRAINT_FOREIGNKEY` | 409 `La operación viola una referencia: el registro está en uso o referencia un registro inexistente` |

Cualquier otro código (incluidos los de PostgreSQL y `SQLITE_CONSTRAINT_NOTNULL`) responde 500 `Error interno`. En SQLite las claves foráneas vienen desactivadas por defecto: para que se apliquen hay que ejecutar `PRAGMA foreign_keys = ON` en la conexión.

Para responder un 4xx desde un hook o desde código propio, lanzar `ErrorCrud` (exportado por el paquete). Un `ErrorCrud` no se registra con `logger.error`; es una respuesta controlada:

```js
import { ErrorCrud } from '@greenborn/express-greenborn-crud';

hooks: {
  antesEliminar: (req, registro) => {
    if (registro.bloqueado) throw new ErrorCrud(409, 'El registro está bloqueado');
    return registro;
  },
}
```

## Query de `GET /list`

Compatible con los parámetros que envía `@greenborn/vue-table-editor` en modo lazy (protocolo `standard`):

| Parámetro | Descripción |
|-----------|-------------|
| `page` | Entero >= 1. Default `1`. Valor inválido: 400. |
| `pageSize` | Entero entre 1 y `paginacion.tamanoMaximo` (default 500). Default `paginacion.tamanoDefecto` (default 25). Si hay `paginacion.tamanosPermitidos`, sólo esos valores: otro valor da 400 con `errors.pageSize`. |
| `sortField` | Debe ser un campo `sortable`. Vacío (`''`, como lo envía TableEditor) = sin orden. Si no es sortable: 400. |
| `sortOrder` | `asc` (default) o `desc`. Sólo se valida si hay `sortField`. |
| `search` | Texto de hasta 200 caracteres. Búsqueda en los campos `searchable` (también de joins), combinados con OR, según `busqueda.modo` (ver "Búsqueda"). Si la tabla no tiene campos `searchable`: 400. |
| `filters` | JSON de objeto. Forma simple `{ campo: valor }` (texto => contiene; resto => igual) o con operador `{ campo: { op, valor } }`, `{ campo: { op: 'rango', desde, hasta } }`. Sólo campos `filterable` y operadores declarados en el campo (ver "Filtros"). Error: 400 con `errors['filters.<campo>']`. |

Respuesta: `data` incluye `rows`, `totalRecords`, `fields_def` (ahora con `operadores` en los filtrables), `paginacion` (`{ tamanoDefecto, tamanoMaximo, tamanosPermitidos }`) y, sólo si se configuró, `ayuda`. Los campos anteriores no cambian de forma.

El orden siempre incluye `pk asc` como desempate, después de `sortField` si existe. `totalRecords` cuenta con los mismos filtros, búsqueda, joins y `filtroBase` aplicados.

### Joins (tablas unidas)

Los joins son de **lectura**: permiten mostrar, filtrar, buscar y ordenar por columnas de otra tabla. La escritura sigue siendo sólo sobre la tabla principal.

```js
createCrudRouter({
  knex, sso, recurso: 'productos', tabla: 'productos',
  joins: [
    { tabla: 'usuarios', alias: 'u', on: ['owner_id', 'id'], tipo: 'left' },
    // un join puede partir de un join anterior: on: ['u.empresa_id', 'id']
  ],
  campos: [
    { field: 'nombre', headerName: 'Nombre', type: 'text', sortable: true, filterable: true, searchable: true },
    { field: 'usuario_nombre', headerName: 'Usuario', type: 'text', columna: 'u.nombre', sortable: true, filterable: true, searchable: true },
  ],
});
```

- `on[0]` (origen): columna de la tabla principal, o `alias.columna` de un join anterior. `on[1]` (destino): columna de la tabla unida.
- `tipo`: `'left'` (default) o `'inner'`.
- Un campo con `columna: 'alias.columna'` es de sólo lectura, no entra en alta ni edición (su valor del body se ignora con warning) y no admite `required`, `relacion` ni `lookup`.
- Alias, tabla y columnas pasan por la misma whitelist de identificadores; nada se concatena en SQL.
- Sin `joins` el SQL y la respuesta son los de 0.3.0 (los nombres no se qualifican).

### Filtros (operadores)

Un campo `filterable: true` acepta los operadores de `operadores`. Si no lo declara, se usan los del tipo:

| Tipo | Operadores por defecto |
|------|------------------------|
| `text` | `contiene`, `igual`, `distinto`, `en`, `nulo` |
| `number`, `date` | `igual`, `distinto`, `en`, `rango`, `nulo` |
| `boolean`, `select` | `igual`, `distinto`, `en`, `nulo` |

| Operador | Forma en `filters` | Significado |
|----------|--------------------|-------------|
| `igual` | `{ op: 'igual', valor }` | `= valor` (null: `IS NULL`) |
| `distinto` | `{ op: 'distinto', valor }` | `<> valor` (null: `IS NOT NULL`). Las filas con NULL no entran en `<>`. |
| `contiene` | `{ op: 'contiene', valor }` | Texto con `LIKE %valor%` escapado. Sólo `type: 'text'`. |
| `en` | `{ op: 'en', valor: [..] }` | `IN` de 1 a 100 valores. |
| `rango` | `{ op: 'rango', desde?, hasta? }` | `>= desde` y/o `<= hasta`. Sólo `number` y `date`. |
| `nulo` | `{ op: 'nulo', valor: true/false }` | `IS NULL` / `IS NOT NULL`. |

```js
campos: [{ field: 'precio', headerName: 'Precio', type: 'number', filterable: true, operadores: ['igual', 'rango', 'en'] }]
// GET /list?filters={"precio":{"op":"rango","desde":10,"hasta":50}}
```

Un operador fuera de `operadores` del campo devuelve 400 (`errors['filters.<campo>']`). Los valores se validan según el tipo del campo. Los filtros de columnas de join funcionan igual que los de la tabla principal.

### Búsqueda

`busqueda: { modo }` define cómo se compara el texto de `search` con los campos `searchable`:

| Modo | Coincidencia |
|------|--------------|
| `contiene` (default) | `%texto%` |
| `empieza` | `texto%` |
| `termina` | `%texto` |
| `igual` | igualdad exacta sobre el texto del campo |

En los modos con `LIKE`, `%`, `_` y `\` se escapan y se buscan literalmente. Los campos de joins son buscables igual que los de la tabla principal. Todo va como binding.

### Paginación

```js
paginacion: { tamanoDefecto: 10, tamanoMaximo: 100, tamanosPermitidos: [10, 25, 50, 100] }
```

- `tamanoDefecto` debe ser `<= tamanoMaximo` y, si hay `tamanosPermitidos`, estar en esa lista.
- `tamanosPermitidos` no puede superar `tamanoMaximo`.
- `page` debe ser entero >= 1. `pageSize` fuera de los límites o de la lista devuelve 400 con `errors.pageSize`.
- `totalRecords` es el número de filas con los mismos filtros, búsqueda y joins, sin paginar.

### Ayuda

El back no guarda textos de ayuda: `ayuda` sólo declara **claves** (`clave` string, `botones` y `campos` con strings) y las devuelve en `data.ayuda` del listado. Los textos viven en la aplicación. Las funciones y el resto de la traducción a `data-help` están en `@greenborn/vue-greenborn-crud`.

Nunca se concatena input en SQL: los nombres de columna pasan por la whitelist de `campos` y los valores van como bindings; los comodines de `LIKE` (`%`, `_`, `\`) se escapan.

### Dialectos (MySQL/MariaDB)

El tipo del `CAST` para búsqueda y filtros de texto se elige según el cliente de Knex (`knex.client.config.client`, o `knex.client.driverName` si no es string):

| Cliente | Expresión |
|---------|-----------|
| `mysql`, `mysql2` (MySQL/MariaDB) | `CAST(campo AS CHAR)` |
| `better-sqlite3`, `sqlite3` | `CAST(campo AS TEXT)` |
| `pg`, `postgres`, `postgresql` | `CAST(campo AS TEXT)` |

Cualquier otro cliente, o uno que no se pueda determinar, lanza error al construir el router. Nota: la conversión a MySQL (`CHAR`) sólo está verificada con un test de integración opcional (`test/mysql.test.js`, se activa con `CRUD_TEST_MYSQL_URL`); ver "Tests".

## Definición de campos (`campos`)

```js
{
  field: 'precio',          // nombre de la columna: [A-Za-z_][A-Za-z0-9_]*, único en el array
  headerName: 'Precio',     // etiqueta, obligatoria (string no vacío)
  type: 'number',           // 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' (obligatorio)
  form_type: 'number',      // opcional: ver "Texto largo" y "Tipos de formulario"
  sortable: true,           // default false. Permite sortField
  filterable: true,         // default false. Permite filters
  searchable: true,         // default false. Entra en search
  writable: true,           // default true. false = sólo lectura (no entra en create/update)
  required: true,           // default false. Obligatorio en create; en update sólo si el campo viene en el body
  options: [{ value: 1, label: 'Activo' }],  // type 'select' sin lookup: obligatorio (no vacío)
  lookup: { tabla, valor, etiqueta, filtro },  // type 'select' con datos de otra tabla (ver "Lookups")
  relacion: { tabla, fkOrigen, fkDestino, lookup },  // type 'multiselect' (ver "Multiselect (N:M)")
  maxLength: 500,           // opcional, sólo type 'text': longitud máxima del texto
  filas: 6,                 // opcional, sólo form_type 'textarea'. Default 4
  css: 'text-end',          // opcional: clase de la celda (sólo se valida que sea string)
}
```

- `form_type` por defecto: `boolean` -> `checkbox`; `text`, `number`, `date`, `select` -> igual que `type`; `multiselect` -> `multiselect`.
- `type: 'text'` acepta `string` o `number` y los guarda como texto (salvo `textarea`/`markdown`, que exigen `string`).
- `fields_def` (que devuelve `GET /list` y `GET /:id`) es la proyección pública de la definición normalizada: `field`, `headerName`, `type`, `form_type`, `sortable`, `filterable`, `searchable`, `writable`, `required`, y además `options` (si es select o multiselect), `maxLength` (si se declaró), `filas` (si es `textarea`), y `css` (si se declaró). No expone `lookup` ni `relacion` (nombres de tablas y columnas internas). Las `options` de un lookup se cargan en cada request (ver "Lookups").
- Validación de escritura: `number` acepta números finitos o cadenas numéricas (`"-1.5"`); `date` acepta cadenas parseables por `Date.parse`; `boolean` acepta `true/false`, `1/0`, `'1'/'0'`, `'true'/'false'` y se guarda como `1/0`; `select` debe coincidir (como string) con un `value` de `options` y se guarda el `value` original; `null` o `''` se guardan como `null`. Un valor vacío en un campo `required` devuelve 400.

### Lookups (select con datos de otra tabla)

Un campo `type: 'select'` puede obtener sus opciones de otra tabla en lugar de declararlas en `options` (ambas son excluyentes):

```js
{
  field: 'categoria_id', headerName: 'Categoría', type: 'select', sortable: true, filterable: true,
  lookup: {
    tabla: 'categorias',   // tabla externa
    valor: 'id',           // columna clave en la tabla externa (lo que se guarda en `categoria_id`)
    etiqueta: 'nombre',    // columna que se muestra
    filtro: (req) => ({ workspace_id: req.session.workspaceId }), // opcional; null o ausente = sin filtro
  },
}
```

- **Opciones:** `GET /list` y `GET /:id` cargan `fields_def[].options = [{ value, label }]` desde la tabla externa en cada request, aplicando `filtro(req)`, ordenadas por `etiqueta`. Se devuelven como máximo **1000** opciones (`OPCIONES_MAX`); si hay más se registra un `warn` y se truncan.
- **Etiqueta en el listado:** cada fila trae `<campo>_etiqueta` con la etiqueta del registro relacionado (o `null` si el valor es `null` o no existe en la tabla externa). Se resuelve con una consulta batch por página (`whereIn`), no con un join. `GET /:id` y las respuestas de `POST`/`PUT` también lo incluyen. Las lecturas **no** aplican `filtro`: el filtro acota qué se puede elegir o escribir, no qué se muestra.
- **Escritura:** en `POST` y en `PUT` (si el campo viene en el body), el valor debe existir en la tabla externa **con el mismo filtro**; si no, `400` con `errors[campo] = 'Opción no válida'`. Un `null` o `''` se acepta si el campo no es `required`. En `PUT` sin el campo en el body no se revalida.
- **Filtros de listado:** la columna local sigue siendo la que se filtra y ordena (`filters` y `sortField`); la etiqueta no es filtrable ni ordenable.
- **Validación al construir:** `tabla`, `valor` y `etiqueta` deben cumplir `[A-Za-z_][A-Za-z0-9_]*`; sólo se admiten las claves `tabla`, `valor`, `etiqueta`, `filtro`; `filtro` debe ser función o null. `lookup` sólo es válido con `type: 'select'` y no se combina con `options`.
- `filtro(req)` debe devolver `{ columna: valor }` (columnas válidas, valores primitivos) o `null`. Cualquier otro valor es un error del consumidor: 500 registrado.

### Multiselect (N:M)

`type: 'multiselect'` modela una relación muchos a muchos a través de una tabla intermedia:

```js
{
  field: 'etiquetas', headerName: 'Etiquetas', type: 'multiselect', writable: true,
  relacion: {
    tabla: 'articulo_etiquetas', // tabla intermedia
    fkOrigen: 'articulo_id',     // columna de la intermedia que apunta al registro principal (su pk)
    fkDestino: 'etiqueta_id',    // columna de la intermedia que apunta al lookup
    lookup: { tabla: 'etiquetas', valor: 'id', etiqueta: 'nombre', filtro: (req) => ({ workspace_id: req.session.workspaceId }) },
  },
}
```

- No es una columna de la tabla principal: no admite `sortable`, `filterable`, `searchable` ni `options`. Dos campos multiselect no pueden usar la misma tabla intermedia.
- **Lectura:** `GET /:id`, `GET /list`, `POST` y `PUT` devuelven el campo como **array de ids** (sin duplicados, ordenados por `fkDestino`). En `GET /list` se hace una consulta batch sobre la intermedia por página.
- **Opciones:** `fields_def[].options` como en los lookups (misma regla de filtro y límite de 1000).
- **Escritura:** el body debe traer un **array** de ids (si no, `400 'Debe ser una lista de ids'`); cada id debe existir en el lookup con el filtro (si no, `400` con `errors[campo] = 'Opción no válida'`); máximo 1000 elementos. Se deduplican. `[]` vacía la relación (si el campo es `required`, `400 'Campo requerido'`).
- **Transaccionalidad:** en `POST` el registro y sus filas de la intermedia se insertan en una `knex.transaction`; en `PUT` el `UPDATE` y el **reemplazo del conjunto** (borrar las filas del registro y reinsertar) van en la misma transacción. Si algo falla, no queda nada a medias. Las validaciones de referencias se hacen **antes** de abrir la transacción. En `DELETE` físico se borran también las filas de la intermedia del registro (en transacción).
- El alcance (`alcance`) y `filtroBase` del registro principal se aplican igual que antes: la intermedia sólo se toca para un registro que ya pasó esas restricciones.
- `hooks.antesCrear`/`antesEditar` reciben los datos de columnas, **sin** el array de ids de los multiselect.

### Texto largo (`textarea` y `markdown`)

```js
{ field: 'descripcion', headerName: 'Descripción', type: 'text', form_type: 'textarea', filas: 6, maxLength: 2000 },
{ field: 'ficha', headerName: 'Ficha', type: 'text', form_type: 'markdown' },
```

- `form_type: 'textarea'` y `'markdown'` sólo son válidos con `type: 'text'`. En el backend son texto normal; `markdown` no se interpreta ni se sanea aquí (el render es responsabilidad del front).
- Exigen `string` en el valor (un número da `400 'Debe ser texto'`).
- `maxLength` (entero >= 1, sólo `type: 'text'`, aplica a cualquier form_type de texto): si el texto es más largo, `400` con `errors[campo] = 'Máximo N caracteres'`. Se valida en `POST` y en `PUT` cuando el campo viene en el body.
- `filas` (entero >= 1, sólo `form_type: 'textarea'`): default `4`; se devuelve siempre resuelto en `fields_def` para el textarea. `markdown` no tiene `filas`.

## Escritura: alta, edición y borrado

- Sólo se escriben los campos `writable` declarados en `campos`. Las claves del body que no correspondan se ignoran y se registran con `logger.warn`. Nunca se devuelven columnas fuera de `campos` (salvo `pk`).
- `POST`: valida los `required` y los tipos, fusiona el `alcance` (si hay), aplica `antesCrear`, inserta, y responde 201 con la fila. Luego `activityLog` (accion `crear`) y `despuesCrear`.
- `PUT /:id`: el registro debe existir (y pasar `filtroBase`); valida sólo los campos presentes; si no queda ningún campo escribible responde 400. Luego `antesEditar`, `UPDATE`, `activityLog` (accion `editar`) y `despuesEditar`.
- `DELETE /:id`: el registro debe existir (y pasar `filtroBase`). Luego `antesEliminar`, `DELETE` (o el `UPDATE` de `softDelete`), `activityLog` (accion `eliminar`) y `despuesEliminar`.

### Clave primaria

Por defecto la clave (`pk`) **no es escribible**: `POST` ignora el `pk` del body (con `logger.warn`) y deja que la base lo genere; `PUT` también lo ignora. Si `campos` incluye el `pk`, se fuerza `writable: false` y `fields_def` lo reporta así. Con `pkEscribible: true` el `pk` se acepta desde el body (si está en `campos` y no se declara `writable: false`). Si el `pk` no está en `campos` el router igual lo conoce para leer, pero el body nunca lo escribe.

### Alcance (`alcance`)

`alcance(req)` devuelve los pares que el router fija en cada alta:

- En `POST`, después de validar el body y **antes de `antesCrear`**, sus pares se fusionan en el objeto insertado. El cliente no puede sobreescribirlos: si el body trae una clave de alcance con otro valor, responde `400` con `errors[campo]` y no inserta. Si la trae con el mismo valor, se acepta (la comparación es como texto: `1` y `"1"` son iguales). Si no la trae, se fija igual.
- Una clave de alcance **no tiene por qué estar en `campos`**: el valor se escribe igual (es lo que permite ocultar columnas como `owner_id` al cliente).
- En `PUT`, las claves de alcance que aparecen en el body no se pueden cambiar: con el mismo valor se descartan silenciosamente; con otro valor responden `400` con `errors[campo]`, sin escribir nada. Como las claves se derivan de `alcance(req)` en cada request, si `alcance(req)` devuelve `null` no hay claves protegidas (es el caso "sin alcance").
- `alcance(req)` no restringe la lectura ni el `PUT`/`DELETE` físico: para acotar qué registros se ven o se modifican usar `filtroBase`. La única excepción es el `softDelete` (ver abajo), cuyo `UPDATE` sí lleva el alcance como filtro.
- Un valor devuelto que no sea objeto plano, o con nombres de columna inválidos, produce un error (500, registrado).

Los campos de alcance no tienen un flag propio: un campo de alcance declarado en `campos` con `writable: true` **no** lanza error de configuración (las claves sólo se conocen por request), pero en `PUT` queda protegido igual. Si necesitás que el campo sea sólo lectura para el cliente en todos los casos, declararlo con `writable: false`.

### Borrado lógico (`softDelete`)

`softDelete: { campo, valor, extra? }` cambia `DELETE /:id`: en lugar de `DELETE` hace un `UPDATE` que escribe `campo = valor` y las columnas de `extra`. Ejemplo: `{ campo: 'activa', valor: 0, extra: { estado: 'anulado' } }`.

- Validación al construir: `softDelete` debe ser objeto con sólo las claves `campo`, `valor`, `extra`; `campo` es un nombre de columna válido y no puede ser el `pk`; `valor` es obligatorio y primitivo; `extra` es objeto de columnas válidas con valores primitivos.
- El `UPDATE` lleva además el alcance (`alcance(req)`) como filtro. Si no coincide ninguna fila, responde 404 y no modifica nada.
- Se ejecutan `antesEliminar`, `activityLog` (accion `eliminar`) y `despuesEliminar` como en el borrado físico. La respuesta es la misma (`{ id }`).
- **Las filas borradas lógicamente siguen en `GET /list` y `GET /:id`**. Para ocultarlas, incluir la condición en `filtroBase` (por ejemplo `qb.where('activa', 1)`).
- Sin `softDelete` el `DELETE` es físico, como antes.

### Hooks

- Los `antes*` reciben el objeto de datos (o el `registro` existente en `antesEditar`/`antesEliminar`) y **deben devolver un objeto** (puede ser el mismo). Si no lo devuelven, la operación responde 500. En `antesEliminar` el valor devuelto no se usa, pero debe ser un objeto.
- Los `antesCrear` y `antesEditar` pueden devolver un objeto con campos adicionales (por ejemplo `owner_id`); esos campos se escriben aunque no estén en `campos` (el hook es código de confianza del consumidor), así que filtrar ahí es responsabilidad del hook.
- Los `despues*` no devuelven nada y no cambian la respuesta.
- No hay transacción: si un `despues*` falla, la escritura ya se realizó y la respuesta es 500.

### `activityLog`

Se invoca como `activityLog(req, { accion, recurso, id })` con `accion` en `'crear' | 'editar' | 'eliminar'`, después de la escritura y antes de `despues*`. Si la función lanza, el error se registra con `logger.error` y la operación **no** se revierte ni cambia la respuesta.

### Alcance de `filtroBase`

`filtroBase(req, qb)` se aplica a:

- `GET /list` (lectura del listado y del `totalRecords`).
- `GET /:id` (lectura).
- `PUT /:id` y `DELETE /:id`, **sólo en la búsqueda previa** que decide si el registro existe (404 si no pasa el filtro).

No se aplica al `INSERT` de `POST`, y el `UPDATE`/`DELETE` final filtra únicamente por `pk` (salvo el `UPDATE` de `softDelete`, que además lleva el alcance). Para fijar valores en el alta usar `alcance`; para restringir escrituras por workspace o usuario, usar también `hooks.antesEditar`/`antesEliminar` o restricciones en la base. Es síncrona: no usar `await` dentro.

## Tests

```bash
npm test     # node --test, SQLite en memoria (better-sqlite3); usa un SSO mock con requirePermission real.
             # Incluye joins, operadores de filtro, búsqueda (escape y modos), paginación y regresión sin joins
CRUD_TEST_MYSQL_URL=mysql://usuario:clave@127.0.0.1:3306/base npm test   # además, prueba contra MySQL real (requiere mysql2 instalado)
```

Sin `CRUD_TEST_MYSQL_URL`, los tests de MySQL se saltan (se reportan como `skipped`). La expresión `CAST(... AS CHAR)` también se prueba sin servidor con un cliente simulado (`test/dialecto.test.js`).

## Limitaciones

- **Inserción en PostgreSQL**: el id se toma de `insert` (`insertado[0]`), que sólo sirve en SQLite y MySQL. En PostgreSQL, `insert` sin `returning` no devuelve el id y la lectura posterior falla (500; con `pkEscribible: false` el valor de `insertado[0]` es `undefined` y Knex falla con un error de binding indefinido). Para usarlo con PostgreSQL hoy hace falta `pkEscribible: true`, el `pk` declarado en `campos` y enviarse en el body: el router usa `datos[pk]` sólo si ese valor pasó la validación. Sin soporte de `returning` no hay una solución limpia; queda para una versión futura.
- **MySQL/MariaDB**: la búsqueda usa `CAST(... AS CHAR)`. No se ejecutó contra un servidor MySQL real en la versión 0.2.0 (ver "Tests").
- Los hooks `antes*` no tienen transacción con la escritura: si un `despues*` falla, la escritura ya se realizó.
- Los booleanos se guardan como `1/0`.
- Las escrituras de N:M son transaccionales con el registro principal, pero los hooks `antes*`/`despues*` siguen fuera de esa transacción (ver "Multiselect").
- Las opciones de lookup se cargan en cada request (una consulta por campo lookup/multiselect en `GET /list` y `GET /:id`); no hay caché.
- No incluye migraciones, ni RBAC, ni lógica de negocio: usar `hooks` y `filtroBase` para eso.
- Sin optimistic locking.
- La clave `pk` es una sola columna.
- Joins: sólo de lectura. Un join con claves no únicas duplica filas, y `totalRecords` cuenta esas filas duplicadas. Sin índice en la columna de unión, las consultas pueden ser lentas.

## Licencia

MIT
