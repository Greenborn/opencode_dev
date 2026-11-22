# @greenborn/vue-greenborn-crud

Módulo CRUD genérico para **Vue 3**: tabla server-side (modo lazy de `@greenborn/vue-table-editor`), formularios de alta/edición y confirmación de borrado (`@greenborn/vue-greenborn-modal-manager`), y botones que sólo aparecen si el usuario tiene el permiso RBAC correspondiente.

Es **agnóstico de esquema y de SSO**: no importa ningún paquete de autenticación. Los permisos llegan por prop (`permisos`) y el cliente HTTP llega por prop (`http`). Es la contraparte de `@greenborn/express-greenborn-crud`; la integración completa (SSO + back + front) está en [`docs/CRUD_RBAC.md`](../docs/CRUD_RBAC.md).

## Instalación

```bash
npm install @greenborn/vue-greenborn-crud @greenborn/vue-table-editor @greenborn/vue-greenborn-modal-manager
```

Peer dependencies (declaradas en `package.json`):

| Paquete | Versión |
|---------|---------|
| `vue` | `^3.3.0` |
| `@greenborn/vue-table-editor` | `^1.4.9` |
| `@greenborn/vue-greenborn-modal-manager` | `^1.7.1` |

Exports: `.` (ESM `dist/vue-greenborn-crud.js`, UMD `dist/vue-greenborn-crud.umd.cjs`) y `./style.css`. El CSS también se incluye en el bundle, así que importarlo es opcional.

## Configuración de modales

El formulario y las confirmaciones usan `mostrar_modal`, `mostrar_alerta` y `mostrar_confirm` del modal-manager. Hay que montar `ModalContainer` una vez en la raíz:

```vue
<!-- App.vue -->
<template>
  <RouterView />
  <ModalContainer />
</template>
<script setup>
import { ModalContainer } from '@greenborn/vue-greenborn-modal-manager'
import '@greenborn/vue-greenborn-modal-manager/style.css'
</script>
```

## Uso

```vue
<!-- Pantalla de productos -->
<template>
  <CrudModulo
    recurso="productos"
    endpoint="/api/productos"
    :http="api"
    :permisos="user.permisos"
    titulo="Productos"
    :elemento="{ singular: 'Producto', gender: 'M' }"
    :acciones-extra="acciones"
  />
</template>

<script setup>
import { CrudModulo } from '@greenborn/vue-greenborn-crud'
import axios from 'axios'

// Cliente HTTP: cada método devuelve el body JSON de la respuesta ({ status, data }).
const api = {
  get: (url, cfg) => axios.get(url, cfg).then((r) => r.data),
  post: (url, body) => axios.post(url, body, { withCredentials: true }).then((r) => r.data),
  put: (url, body) => axios.put(url, body, { withCredentials: true }).then((r) => r.data),
  delete: (url) => axios.delete(url, { withCredentials: true }).then((r) => r.data),
}
</script>
```

`user.permisos` viene del SSO del front (`useSsoAuth().permisos` en `@greenborn/vue-greenborn-sso-front`, o el array `permisos` del objeto de usuario). Este paquete no depende de ese paquete: sólo se le pasa un array de strings.

El `http` debe lanzar (reject) ante errores HTTP: así el formulario y el borrado muestran el `message` y los `errors` del back (se leen de `err.response.data`). En el listado y en el borrado, además, una respuesta resuelta con `status: false` se muestra como error; en alta y edición no se comprueba ese campo.

## Props de `CrudModulo`

| Prop | Tipo | Requerido | Default | Descripción |
|------|------|-----------|---------|-------------|
| `recurso` | String | sí | — | Base de los permisos: `<recurso>.listar`, `.crear`, `.editar`, `.eliminar`. Se usa también como `id` del TableEditor. |
| `endpoint` | String | sí | — | Base de las rutas del back: `GET {endpoint}/list`, `POST {endpoint}`, `PUT {endpoint}/:id`, `DELETE {endpoint}/:id`. |
| `http` | Object | sí | — | `{ get(url, { params }), post(url, body), put(url, body), delete(url) }`. Ver arriba. |
| `permisos` | Array<String> | sí | — | Permisos del usuario. Un array vacío no muestra ningún botón de acción. |
| `campos` | Array | no | `null` | Definiciones de campos (ver abajo). Si es `null`, se usan los `fields_def` que devuelve `GET /list`. |
| `titulo` | String | no | `''` | Título sobre la tabla. |
| `elemento` | Object | no | `null` | `{ singular, gender }` para los textos. Sin valor: singular `Registro`, gender `M`. |
| `accionesExtra` | Array | no | `[]` | Botones adicionales de fila (ver abajo). |
| `pk` | String | no | `'id'` | Clave primaria usada en editar, eliminar y en el mensaje de confirmación. |
| `preferencias` | Object | no | `null` | Dependencia inyectada `{ leer(clave), guardar(clave, valor) }` para orden, ancho y visibilidad de columnas. Sin valor, TableEditor usa su adaptador global (ver "Preferencias de columnas"). |
| `ayuda` | Object | no | `null` | Configuración de ayuda contextual `{ clave, botones: { listar, crear, editar, eliminar, campo } }` (ver "Ayuda contextual"). |

Eventos: `CrudModulo` no emite eventos propios. Internamente escucha el `rowSelected` del TableEditor para habilitar los botones de la toolbar. Las notificaciones de éxito y error van por `mostrar_alerta`.

## Filtros, búsqueda y paginación

- **Búsqueda global**: el campo de búsqueda de la tabla (TableEditor) envía `search`; el back lo aplica a los campos `searchable`.
- **Filtros avanzados**: botón "Filtros avanzados" sobre la tabla. Un control de operador por cada campo `filterable` del back (`fields_def.operadores`): igual, distinto, contiene, en la lista, entre (rango) o es nulo. Los valores se tipan según el campo (número, fecha, sí/no, opción de select). "Aplicar" vuelve a pedir `GET /list` con `filters`; "Limpiar" quita los filtros. Un error de valor se muestra en el panel, sin `alert()`.
- **Filtros del filtro de columnas de TableEditor**: si el usuario usa el filtro de columna de TableEditor, se combina con los avanzados. Si un mismo campo está en los dos, gana el avanzado.
- **Paginación**: el tamaño por defecto y las opciones del paginador salen de `data.paginacion` del back (`tamanoDefecto`, `tamanoMaximo`, `tamanosPermitidos`). Antes de la primera respuesta se omite `pageSize`; si el tamaño que pide el paginador no es válido para el back, se usa `tamanoDefecto`.

Todo el estado (búsqueda, filtros, página, orden) viaja en la query de `GET {endpoint}/list`.

## Preferencias de columnas

TableEditor permite redimensionar, reordenar y ocultar/mostrar columnas, y guarda esa configuración con clave `te_cfg_<recurso>`. `CrudModulo` no lee ni escribe preferencias por su cuenta: usa la dependencia inyectada:

```js
// Con SSO (vue-greenborn-sso-front >= 1.8.0): useSsoAuth() ya expone el adaptador `preferencias`.
// Alternativa: un store propio del host con la misma forma:
const preferencias = {
  leer: async (clave) => (await api.get('/preferencias')).data.data[clave] ?? null,   // ejemplo
  guardar: async (clave, valor) => api.put('/preferencias', { [clave]: valor }),     // ejemplo
}
```

```vue
<CrudModulo recurso="productos" endpoint="/api/productos" :http="api" :permisos="permisos" :preferencias="preferencias" />
```

- Al montar, `useCrud` llama a `leer` con la clave del recurso y deja el valor en caché para la lectura síncrona de TableEditor. Cada cambio de columnas llama a `guardar(clave, valor)` (el valor es el JSON que genera TableEditor).
- **Sin inyección** (`preferencias` no pasado): no hay cambio de código; TableEditor usa su adaptador global (`setGlobalPreferencesAdapter` de `@greenborn/vue-table-editor`) y, si no hay ninguno, **localStorage** (estado local, sin SSO).
- Para forzar estado local explícito: `crearPreferenciasLocales(window.localStorage)` (exportado) devuelve `{ leer, guardar }` listo para inyectar.
- Los errores de `leer`/`guardar` se registran con `console.error` y no rompen la tabla; `guardarValores` devuelve `{ status: false }` si falla.
- El paquete no importa el SSO ni el store de la aplicación.

## Ayuda contextual

`ayuda` se traduce a atributos `data-help`, que es el mecanismo de la ayuda de la aplicación (en SGI: `useAyuda().registrarAyuda(diccionario)` y `AyudaOverlay`, que leen `data-help`). **No hay un paquete de ayuda en el monorepo**, así que el CRUD sólo genera las claves y no depende de ninguna librería de ayuda.

```js
const ayuda = {
  clave: ({ recurso }) => recurso,           // o un string: 'productos'
  botones: {
    listar: true,                            // -> 'productos-listar'
    crear: 'productos-nuevo',                // string propio
    editar: true,
    eliminar: false,                         // sin data-help
    campo: { precio: true, nombre: 'productos-campo-nombre' },   // -> 'productos-campo-precio'
  },
}
```

- `clave` (string o función `({ recurso }) => string`) es la base. `true` en un botón o campo toma `${base}-<boton>` o `${base}-campo-<campo>`; un string se usa tal cual; `false` o ausencia no pone atributo.
- Botones: `data-help` en los botones de la toolbar (`crear`, `editar`, `eliminar`) y de fila (`editar`, `eliminar`), vía `BtnConfig.helpKey`. Campos: `data-help` en cada campo del formulario (`FormCrud`) y en la cabecera de cada columna (`helpKey` de la definición de columna que consume TableEditor; no verificado en navegador).
- La función `resolverAyuda(ayuda, { recurso })` devuelve las claves resueltas y `atributosAyuda(clave)` el objeto para `v-bind`.
- El back puede exponer las mismas claves en `data.ayuda` (sólo claves, sin textos); este componente no las lee automáticamente.

### `accionesExtra`

```js
{
  key: 'activar',           // obligatorio, único en la fila
  label: 'Activar',
  icon: 'check',            // nombre de icono del TableEditor
  severity: 'outline-success',
  permiso: 'productos.activar', // opcional: si se declara, sólo se muestra si el usuario lo tiene
  onClick: (fila) => { /* ... */ },
}
```

Se agregan a las acciones de fila después de "Editar" y "Eliminar".

## Permisos

Los nombres se construyen como `<recurso>.<accion>` (ver `permisosDeRecurso`).

| Acción | Permiso requerido | Efecto en la UI |
|--------|-------------------|-----------------|
| Listar | `<recurso>.listar` | Sin él, no se monta la tabla: se muestra el mensaje "No tenés permiso para ver este listado". |
| Crear | `<recurso>.crear` | Botón "Nuevo" en la toolbar. |
| Editar | `<recurso>.editar` | Botón "Editar" en la toolbar (habilitado con una fila seleccionada) y en cada fila. |
| Eliminar | `<recurso>.eliminar` | Botón "Eliminar" en la toolbar (habilitado con una fila seleccionada) y en cada fila. |

Con `permisos = []` no aparece ningún botón de acción.

**Nota:** el back exige además `<recurso>.ver` para `GET /:id`, pero este paquete no tiene vista de detalle y no pide `ver` en la UI.

## Definición de campos (`campos`)

```js
{
  field: 'precio',        // columna (obligatorio)
  headerName: 'Precio',   // etiqueta (si falta, se usa field)
  type: 'number',         // text | number | date | boolean | select | multiselect
  form_type: 'number',    // text | number | date | checkbox | select | multiselect | textarea | markdown | email (si falta, se deduce de type)
  required: true,         // validación cliente y marca "*"
  sortable: true,         // pasa a la columna
  filterable: true,       // pasa a la columna
  writable: true,         // false = no entra en el formulario (default true)
  options: [{ value: 1, label: 'Activo' }],   // select y multiselect (ver abajo)
  filas: 6,               // sólo textarea y markdown: filas del <textarea> (default 4)
  css: 'text-end',        // clase de la columna
}
```

Reglas:

- `form_type` por defecto: `boolean` -> `checkbox`; `select` -> `select`; `multiselect` -> `multiselect`; `text`, `number`, `date` -> igual que `type`. Un `form_type` fuera de la lista (`text`, `number`, `date`, `checkbox`, `select`, `multiselect`, `textarea`, `markdown`, `email`) lanza error al abrir el formulario.
- Sólo los campos con `writable !== false` aparecen en el formulario.
- Si se pasa `campos`, tiene prioridad sobre `fields_def` del back para las columnas y el formulario. Si no se pasa, la primera respuesta de `GET /list` define los campos.
- Los `required` se validan en el cliente (campo vacío, sólo espacios o lista vacía en multiselect) y se marcan con `*`. Los campos `number` deben ser numéricos.

### Select y lookups

- `select` muestra un `<select>` con `options` (`{ value, label }`). Sin `required`, la primera opción es "— Seleccionar —" con valor vacío (se envía `null`). Con `required`, esa opción es deshabilitada y el cliente exige elegir una.
- Si `campos` (explícito) no trae `options` para un campo, se completan con las `options` del `fields_def` que devuelve `GET /list`, por nombre de campo. Las `options` propias del campo tienen prioridad.
- El valor enviado al back es el `value` de la opción tal cual.
- **Lookup en la tabla:** si la fila trae `<campo>_etiqueta`, la celda del campo muestra esa etiqueta. Si no viene, muestra el valor (o la etiqueta de `options` si la encuentra).

### Multiselect (relación N:M)

- `type: 'multiselect'` (o `form_type: 'multiselect'`) muestra una lista de checkboxes nativos con `options`. Sin opciones, muestra "Sin opciones disponibles.".
- El valor del registro y del formulario es un array de `value` (ids). Al guardar se envía el array completo (`[]` si no hay selección).
- En la tabla se muestran las etiquetas de `options` separadas por coma (no los ids).

### Textarea y markdown

- `form_type: 'textarea'`: `<textarea>` con `rows` tomado de `filas` (default 4). Texto plano, se envía tal cual.
- `form_type: 'markdown'`: igual, con la nota "Acepta markdown." y un botón "Vista previa". La vista previa usa `markdownAHtmlSeguro`: escapa todo el texto antes de aplicar un subconjunto fijo (encabezados `#` a `###`, `**negrita**`, `*cursiva*`, `` `código` `` y saltos de línea). No hay enlaces ni HTML crudo: el texto nunca produce etiquetas que no sean esas.
- En la tabla, las celdas de los campos definidos en `campos`/`fields_def` pasan por `valueFormatters` (TableEditor los inserta como HTML), así que el texto y las etiquetas se escapan. Los tipos `date`, `boolean`, `color` y `json` los formatea TableEditor antes de llegar a ese punto.

## Comportamiento

- **Listado** (`api.list`): envía a `GET {endpoint}/list` los parámetros del protocolo `standard` de TableEditor: `page`, `pageSize`, `sortField`, `sortOrder`, `search` y `filters` (JSON `{ campo: valor }`). Espera `{ status, data: { rows, totalRecords, fields_def } }`. Si la respuesta tiene `status: false`, muestra el `message` con `mostrar_alerta`.
- **Alta / edición**: abre `mostrar_modal` con `FormCrud` y su footer (`FormCrudFooter`). El payload se arma con `construirPayload` (checkbox a booleano, vacío a `null`, number a `Number`). Alta: `POST {endpoint}`. Edición: `PUT {endpoint}/:id`.
- **Errores de validación del back**: `errors: { campo: mensaje }` se muestran junto al campo correspondiente. Si hay errores de campos que no están en el formulario, o si no hay errores por campo, el `message` (y esos errores) se muestran en el encabezado del formulario. El modal no se cierra si falla.
- **Eliminar**: `mostrar_confirm` (severidad `danger`), luego `DELETE {endpoint}/:id`. Éxito y error con `mostrar_alerta`.
- Tras crear, editar o eliminar con éxito, la tabla se refresca.
- Los errores se registran con `console.error` (prefijo `[crud]`) y se informan con `mostrar_alerta`.

## Composable `useCrud`

Para usar la lógica con una tabla propia o con otra disposición:

```js
import { useCrud } from '@greenborn/vue-greenborn-crud'

const crud = useCrud({
  recurso: 'productos',
  endpoint: '/api/productos',
  http: api,
  permisos: computed(() => user.value.permisos),  // o un array plano
  campos: undefined,                               // opcional, valor o ref/computed
  pk: 'id',                                        // opcional
  elemento: { singular: 'Producto', gender: 'M' }, // opcional, valor o ref/computed
  accionesExtra: [],                               // opcional, valor o ref/computed
})
```

Opciones obligatorias: `recurso`, `endpoint`, `http` (debe exponer `get`, `post`, `put`, `delete`) y `permisos` (array). Faltar alguna lanza un error explícito.

Devuelve:

| Clave | Descripción |
|-------|-------------|
| `api` | Objeto `{ list(params) }` para `<TableEditor :api>`. |
| `tableConfig` | `computed` con la configuración para `<TableEditor :config>` (modo lazy, selección simple, botones según permisos). |
| `puede(accion)` | `true` si el usuario tiene `<recurso>.<accion>`. `accion`: `listar`, `crear`, `editar`, `eliminar`. |
| `permisosActuales` | `computed` con los permisos. |
| `camposEfectivos` | `computed` con los campos en uso (`campos` o los de `fields_def`; con `campos` fijos, las `options` faltantes se toman de `fields_def`; `null` si no hay `campos` y todavía no llegó ninguna respuesta de `GET /list`). |
| `puedeListar` | `computed` booleano. |
| `onRowSelected(valor)` | Handler para el evento `rowSelected` del TableEditor. |
| `setTabla(instancia)` | Guarda la instancia del TableEditor (para `refresh`). |
| `refresh()` | Recarga la tabla. |
| `abrirCrear()`, `abrirEditar(fila)`, `confirmarEliminar(fila)` | Acciones con las comprobaciones de permiso. |
| `ejecutar(modo, id, payload)` | Ejecuta `http.post` o `http.put` según `modo` (`'crear'`/`'editar'`). |

Con `useCrud` el TableEditor se monta a mano: `<TableEditor :id="..." :api="crud.api" :config="crud.tableConfig" @rowSelected="crud.onRowSelected" ref="tabla" />` y, en un `watch` sobre la ref, `crud.setTabla(valor)`.

## Helpers exportados

Son funciones puras (sin Vue ni DOM) de `src/helpers.js`, testeadas con `node --test`. Las siguientes se exportan desde `src/index.js`:

| Helper | Uso |
|--------|-----|
| `ACCIONES` | `['listar', 'crear', 'editar', 'eliminar']`. |
| `permisosDeRecurso(recurso)` | `{ listar: 'x.listar', crear: 'x.crear', ... }`. |
| `tienePermiso(permisos, permiso)` | `permisos.includes(permiso)`. Lanza si `permisos` no es array. |
| `formTypeDeCampo(campo)` | `form_type` efectivo de un campo. |
| `camposFormulario(campos)` | Campos con `writable !== false`, con `form_type` resuelto. |
| `fieldsDefDesdeCampos(campos)` | Definiciones de columna para TableEditor. |
| `valoresIniciales(campos, fila)` | Valores iniciales del formulario (alta si `fila` es `undefined`). |
| `validarFormulario(campos, valores)` | `{ campo: mensaje }` (vacío si todo está bien). |
| `construirPayload(campos, valores)` | Payload para el back. |
| `extraerError(err)` | `{ message, errors }` desde un error HTTP (`err.response.data`), un `{ status: false, ... }` o un `Error`. |

Internos del paquete (en `src/helpers.js`, sin exportar desde `index.js`): `combinarOpciones`, `opcionesDeCampo`, `filasDeCampo`, `estaVacio`, `escaparHtml`, `etiquetaDeOpcion`, `textoCeldaCampo` (celda de tabla para lookups/multiselect), `formateadoresCeldas` (mapa `valueFormatters`) y `markdownAHtmlSeguro` (vista previa markdown).

## Demo

```bash
cd vue-greenborn-crud
npm install
npm run dev     # http://localhost:5175
```

La demo usa `demo/mockHttp.js` (http en memoria que responde con la forma del contrato) y permite alternar los permisos del usuario con checkboxes. Incluye un lookup `categoria` (select con `categoria_etiqueta` en cada fila), un multiselect `etiquetas` (N:M, valor = array de ids), un `descripcion` textarea (`filas: 3`) y un `notas` markdown.

## Tests y build

```bash
npm test        # node --test: helpers puros (filtros, paginación, ayuda, preferencias)
npm run build   # dist/ (ESM + UMD + CSS)
```

## Limitaciones

- Sin `GET /:id` ni vista de detalle: la edición usa la fila ya cargada.
- Sin tests de componente (Vue Test Utils no está en el monorepo); la cobertura automatizada es de los helpers.
- Sin soporte de `accionesExtra` en la toolbar (sólo de fila).
- Los controles de filtros avanzados se probaron sólo con la lógica pura (`helpers`); no hay tests de componente ni se verificó en navegador.
- Los filtros de `en` para campos `boolean` no se ofrecen en la UI (el back sí los acepta).
- El cambio de `pageSize` al recibir `paginacion` (primera respuesta) puede requerir una recarga del paginador; no se verificó en navegador.
- Sin pruebas con la demo: `demo/mockHttp.js` no devuelve `paginacion` ni operadores; el componente lo tolera (sin paginación conocida, sin filtros avanzados).

## Licencia

MIT
