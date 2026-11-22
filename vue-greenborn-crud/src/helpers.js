/**
 * Helpers puros (sin Vue ni DOM) del CRUD genérico.
 * Testeables con `node --test`.
 */

export const ACCIONES = ['listar', 'crear', 'editar', 'eliminar']

/** Filas por defecto de un textarea/markdown si el campo no trae `filas`. */
export const FILAS_POR_DEFECTO = 4

const FORM_TYPE_POR_TYPE = {
  text: 'text',
  number: 'number',
  date: 'date',
  boolean: 'checkbox',
  select: 'select',
  multiselect: 'multiselect',
}

const FORM_TYPES = [
  'text', 'number', 'date', 'checkbox', 'select', 'multiselect',
  'textarea', 'markdown', 'email',
]

/** Lanza error explícito si el valor requerido falta. */
export function requerido(valor, nombre) {
  if (valor === undefined || valor === null || valor === '') {
    throw new Error(`[crud] Parámetro requerido faltante: ${nombre}`)
  }
  return valor
}

/** Valida la configuración obligatoria del componente/composable. */
export function validarConfig({ recurso, endpoint, http, permisos }) {
  requerido(recurso, 'recurso')
  requerido(endpoint, 'endpoint')
  requerido(http, 'http')
  if (typeof http.get !== 'function' || typeof http.post !== 'function'
    || typeof http.put !== 'function' || typeof http.delete !== 'function') {
    throw new Error('[crud] "http" debe exponer get, post, put y delete')
  }
  if (!Array.isArray(permisos)) {
    throw new Error('[crud] "permisos" es requerido y debe ser un array de strings')
  }
  return true
}

/** Nombres de permiso RBAC para un recurso: { listar, crear, editar, eliminar }. */
export function permisosDeRecurso(recurso) {
  requerido(recurso, 'recurso')
  const mapa = {}
  for (const accion of ACCIONES) {
    mapa[accion] = `${recurso}.${accion}`
  }
  return mapa
}

export function tienePermiso(permisos, permiso) {
  if (!Array.isArray(permisos)) {
    throw new Error('[crud] tienePermiso: "permisos" debe ser un array')
  }
  return permisos.includes(permiso)
}

/** form_type efectivo de un campo (usa form_type, o deduce desde type). */
export function formTypeDeCampo(campo) {
  requerido(campo, 'campo')
  requerido(campo.field, 'campo.field')
  if (campo.form_type !== undefined) {
    if (!FORM_TYPES.includes(campo.form_type)) {
      throw new Error(`[crud] form_type inválido en "${campo.field}": ${campo.form_type}`)
    }
    return campo.form_type
  }
  const deducido = FORM_TYPE_POR_TYPE[campo.type]
  return deducido === undefined ? 'text' : deducido
}

/** Campos que entran en el formulario (writable !== false). */
export function camposFormulario(campos) {
  if (!Array.isArray(campos)) {
    throw new Error('[crud] camposFormulario: "campos" debe ser un array')
  }
  return campos
    .filter((c) => c.writable !== false)
    .map((c) => ({ ...c, form_type: formTypeDeCampo(c) }))
}

/**
 * Completa `options` de los campos explícitos que no las traen, tomándolas
 * de las definiciones del servidor (fields_def de GET /list) por nombre de campo.
 * Un campo con `options` propias conserva las suyas.
 */
export function combinarOpciones(campos, fieldsDef) {
  if (!Array.isArray(campos)) {
    throw new Error('[crud] combinarOpciones: "campos" debe ser un array')
  }
  if (fieldsDef === undefined || fieldsDef === null) return campos
  if (!Array.isArray(fieldsDef)) {
    throw new Error('[crud] combinarOpciones: "fieldsDef" debe ser un array o null')
  }
  return campos.map((c) => {
    if (c.options !== undefined) return c
    const delServidor = fieldsDef.find((f) => f !== null && typeof f === 'object' && f.field === c.field)
    if (delServidor === undefined || !Array.isArray(delServidor.options)) return c
    return { ...c, options: delServidor.options }
  })
}

/** Opciones { value, label } de un campo (array vacío si no tiene). */
export function opcionesDeCampo(campo) {
  requerido(campo, 'campo')
  return Array.isArray(campo.options) ? campo.options : []
}

/** Filas de un textarea/markdown: `filas` del campo (entero >= 1) o 4 por defecto. */
export function filasDeCampo(campo) {
  requerido(campo, 'campo')
  if (campo.filas === undefined) return FILAS_POR_DEFECTO
  if (!Number.isInteger(campo.filas) || campo.filas < 1) {
    throw new Error(`[crud] "filas" inválido en "${campo.field}": debe ser un entero >= 1`)
  }
  return campo.filas
}

/** Campo sin valor: null, undefined, texto vacío o array vacío (multiselect). */
export function estaVacio(valor) {
  if (valor === undefined || valor === null) return true
  if (Array.isArray(valor)) return valor.length === 0
  return String(valor).trim() === ''
}

/** Definiciones de columna para TableEditor (fields_def) a partir de campos. */
export function fieldsDefDesdeCampos(campos) {
  if (!Array.isArray(campos)) {
    throw new Error('[crud] fieldsDefDesdeCampos: "campos" debe ser un array')
  }
  return campos.map((c) => {
    requerido(c.field, 'campo.field')
    const def = {
      field: c.field,
      headerName: c.headerName === undefined ? c.field : c.headerName,
      type: c.type,
      sortable: c.sortable,
      filterable: c.filterable,
      form_type: formTypeDeCampo(c),
    }
    if (c.css !== undefined) def.css = c.css
    return def
  })
}

/** Valores iniciales del formulario a partir de una fila (o vacío para alta). */
export function valoresIniciales(campos, fila) {
  const valores = {}
  for (const campo of camposFormulario(campos)) {
    const valorFila = fila === undefined || fila === null ? undefined : fila[campo.field]
    if (campo.form_type === 'checkbox') {
      valores[campo.field] = valorFila === true || valorFila === 1
    } else if (campo.form_type === 'multiselect') {
      valores[campo.field] = Array.isArray(valorFila) ? valorFila.slice() : []
    } else {
      valores[campo.field] = valorFila === undefined || valorFila === null ? '' : valorFila
    }
  }
  return valores
}

/** Validación cliente: devuelve { campo: mensaje } (vacío si todo ok). */
export function validarFormulario(campos, valores) {
  const errores = {}
  for (const campo of camposFormulario(campos)) {
    const valor = valores[campo.field]
    if (campo.form_type === 'checkbox') continue
    const vacio = estaVacio(valor)
    if (campo.required === true && vacio) {
      errores[campo.field] = `${campo.headerName === undefined ? campo.field : campo.headerName} es obligatorio`
      continue
    }
    if (campo.form_type === 'number' && !vacio && Number.isNaN(Number(valor))) {
      errores[campo.field] = 'Debe ser un número'
    }
  }
  return errores
}

/** Convierte valores del formulario al payload que espera el back. */
export function construirPayload(campos, valores) {
  const payload = {}
  for (const campo of camposFormulario(campos)) {
    const valor = valores[campo.field]
    if (campo.form_type === 'checkbox') {
      payload[campo.field] = valor === true || valor === 1
    } else if (campo.form_type === 'multiselect') {
      payload[campo.field] = Array.isArray(valor) ? valor.slice() : []
    } else if (estaVacio(valor)) {
      payload[campo.field] = null
    } else if (campo.form_type === 'number') {
      payload[campo.field] = Number(valor)
    } else {
      payload[campo.field] = valor
    }
  }
  return payload
}

const ESCAPES_HTML = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

/** Escapa texto para insertarlo como HTML (sin dejar pasar etiquetas). */
export function escaparHtml(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ESCAPES_HTML[c])
}

/** Etiqueta de un valor dentro de las opciones del campo (undefined si no está). */
export function etiquetaDeOpcion(campo, valor) {
  const op = opcionesDeCampo(campo).find((o) => String(o.value) === String(valor))
  return op === undefined ? undefined : op.label
}

/**
 * Texto HTML (escapado) de una celda de la tabla para un campo.
 * - Lookup con `<campo>_etiqueta` en la fila: muestra esa etiqueta.
 * - multiselect: muestra las etiquetas de las opciones separadas por coma.
 * - select sin `_etiqueta`: busca la etiqueta en `options`; si no está, el valor tal cual.
 * El resultado se usa como `valueFormatters` de TableEditor, que inserta HTML.
 */
export function textoCeldaCampo(campo, fila) {
  requerido(campo, 'campo')
  requerido(fila, 'fila')
  const valor = fila[campo.field]
  const claveEtiqueta = `${campo.field}_etiqueta`
  if (fila[claveEtiqueta] !== undefined && fila[claveEtiqueta] !== null) {
    return escaparHtml(fila[claveEtiqueta])
  }
  if (campo.form_type === 'multiselect' || campo.type === 'multiselect') {
    if (!Array.isArray(valor)) return escaparHtml(valor === undefined || valor === null ? '' : valor)
    return valor
      .map((v) => {
        const etiqueta = etiquetaDeOpcion(campo, v)
        return escaparHtml(etiqueta === undefined ? v : etiqueta)
      })
      .join(', ')
  }
  if (valor === undefined || valor === null) return ''
  const etiqueta = etiquetaDeOpcion(campo, valor)
  return escaparHtml(etiqueta === undefined ? valor : etiqueta)
}

/**
 * Mapa `valueFormatters` de TableEditor para todos los campos.
 * Cada formateador devuelve HTML escapado (ver textoCeldaCampo).
 */
export function formateadoresCeldas(campos) {
  if (campos === null || campos === undefined) return {}
  if (!Array.isArray(campos)) {
    throw new Error('[crud] formateadoresCeldas: "campos" debe ser un array o null')
  }
  const mapa = {}
  for (const campo of campos) {
    mapa[campo.field] = (fila) => textoCeldaCampo(campo, fila)
  }
  return mapa
}

/**
 * Markdown mínimo a HTML seguro. Primero escapa TODO el texto, luego sólo
 * inserta un conjunto fijo de etiquetas (h1-h3, p, br, strong, em, code).
 * No hay enlaces ni HTML crudo: el texto de entrada nunca produce etiquetas.
 */
export function markdownAHtmlSeguro(texto) {
  if (typeof texto !== 'string') {
    throw new Error('[crud] markdownAHtmlSeguro: "texto" debe ser string')
  }
  const inline = (t) => t
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
  const bloques = []
  let parrafo = []
  const cerrarParrafo = () => {
    if (parrafo.length > 0) {
      bloques.push(`<p>${parrafo.join('<br>')}</p>`)
      parrafo = []
    }
  }
  for (const linea of escaparHtml(texto).split(/\r?\n/)) {
    const encabezado = /^(#{1,3})\s+(.*)$/.exec(linea)
    if (encabezado !== null) {
      cerrarParrafo()
      const nivel = encabezado[1].length
      bloques.push(`<h${nivel}>${inline(encabezado[2])}</h${nivel}>`)
    } else if (linea.trim() === '') {
      cerrarParrafo()
    } else {
      parrafo.push(inline(linea))
    }
  }
  cerrarParrafo()
  return bloques.join('\n')
}

/**
 * Normaliza un error de respuesta HTTP/back a { message, errors }.
 * Acepta la forma { status:false, message, errors } o un error de axios-like
 * ({ response: { data } }) o un Error común.
 */
export function extraerError(err) {
  let cuerpo = null
  if (err !== null && typeof err === 'object' && err.response && typeof err.response === 'object') {
    cuerpo = err.response.data === undefined ? null : err.response.data
  } else if (err !== null && typeof err === 'object' && err.status === false) {
    cuerpo = err
  }
  const message = cuerpo && typeof cuerpo.message === 'string'
    ? cuerpo.message
    : (err instanceof Error ? err.message : 'Error desconocido')
  const errors = cuerpo && cuerpo.errors && typeof cuerpo.errors === 'object' ? cuerpo.errors : {}
  return { message, errors }
}

/** true si la respuesta del back indica error (status false). */
export function esRespuestaFallida(res) {
  return res !== null && typeof res === 'object' && res.status === false
}

// ── Filtros avanzados (operadores del back) ──────────────────────────

/** Etiquetas de los operadores de filtro (vienen del back en fields_def.operadores). */
export const ETIQUETAS_OPERADOR = {
  igual: 'Igual a',
  distinto: 'Distinto de',
  contiene: 'Contiene',
  en: 'En la lista',
  rango: 'Entre',
  nulo: 'Es nulo',
}

/** Operadores que un campo filtrable admite (fields_def.operadores); [] si no es filtrable. */
export function operadoresDeFiltro(campo) {
  requerido(campo, 'campo')
  if (campo.filterable !== true) return []
  if (!Array.isArray(campo.operadores)) return []
  return campo.operadores.filter((op) => ETIQUETAS_OPERADOR[op] !== undefined)
}

/** Convierte el texto de un input a valor tipado según el tipo del campo ('' => ausente). */
function valorTipado(campo, texto) {
  if (texto === undefined || texto === null) return undefined
  const t = String(texto).trim()
  if (t === '') return undefined
  if (campo.type === 'number') {
    const n = Number(t)
    if (Number.isNaN(n)) throw new Error(`[crud] "${campo.field}": debe ser un número`)
    return n
  }
  if (campo.type === 'boolean') {
    if (t === 'si') return true
    if (t === 'no') return false
    throw new Error(`[crud] "${campo.field}": debe ser si o no`)
  }
  return t
}

/**
 * Traduce el estado de los controles de filtro a `filters` del back.
 * estado: { [field]: { op, valor, desde, hasta } } (valor/desde/hasta en texto de input).
 * - en: `valor` es una lista separada por comas.
 * - nulo: `valor` es 'si' | 'no'.
 * Devuelve un objeto `{ campo: { op, ... } }` sólo con los filtros completos. Lanza error si un valor no sirve.
 */
export function construirFiltrosAvanzados(campos, estado) {
  if (!Array.isArray(campos)) throw new Error('[crud] construirFiltrosAvanzados: "campos" debe ser un array')
  const salida = {}
  for (const campo of campos) {
    const entrada = estado[campo.field]
    if (entrada === undefined || entrada === null) continue
    const op = entrada.op
    if (op === undefined || op === '' || op === null) continue
    if (!operadoresDeFiltro(campo).includes(op)) {
      throw new Error(`[crud] operador "${op}" no permitido en "${campo.field}"`)
    }
    if (op === 'rango') {
      const desde = valorTipado(campo, entrada.desde)
      const hasta = valorTipado(campo, entrada.hasta)
      if (desde === undefined && hasta === undefined) continue
      const filtro = { op }
      if (desde !== undefined) filtro.desde = desde
      if (hasta !== undefined) filtro.hasta = hasta
      salida[campo.field] = filtro
    } else if (op === 'en') {
      const lista = String(entrada.valor === undefined || entrada.valor === null ? '' : entrada.valor)
        .split(',').map((s) => s.trim()).filter((s) => s !== '')
        .map((s) => (campo.type === 'number' ? Number(s) : s))
      if (lista.length === 0) continue
      salida[campo.field] = { op, valor: lista }
    } else if (op === 'nulo') {
      if (entrada.valor === 'si' || entrada.valor === 'no') {
        salida[campo.field] = { op, valor: entrada.valor === 'si' }
      }
    } else {
      const valor = valorTipado(campo, entrada.valor)
      if (valor === undefined) continue
      salida[campo.field] = { op, valor }
    }
  }
  return salida
}

/**
 * Combina el `filters` que pone TableEditor (JSON string o undefined) con los filtros avanzados.
 * Los avanzados ganan si coinciden campo. Devuelve string JSON o undefined si no hay ninguno.
 */
export function combinarFiltros(filtersTabla, avanzados) {
  let base = {}
  if (filtersTabla !== undefined && filtersTabla !== null && filtersTabla !== '') {
    if (typeof filtersTabla !== 'string') throw new Error('[crud] combinarFiltros: "filters" debe ser string JSON')
    const parseado = JSON.parse(filtersTabla)
    if (parseado === null || typeof parseado !== 'object' || Array.isArray(parseado)) {
      throw new Error('[crud] combinarFiltros: "filters" debe ser un objeto JSON')
    }
    base = parseado
  }
  const unido = { ...base, ...(avanzados === undefined || avanzados === null ? {} : avanzados) }
  return Object.keys(unido).length === 0 ? undefined : JSON.stringify(unido)
}

// ── Paginación ──────────────────────────────────────────────────────

/**
 * Tamaños de página a ofrecer en el paginador: los permitidos por el back (o una lista
 * estándar), limitados a tamanoMaximo, siempre con el tamanoDefecto incluido.
 */
export function opcionesTamanoPagina(paginacion) {
  requerido(paginacion, 'paginacion')
  const base = Array.isArray(paginacion.tamanosPermitidos) ? paginacion.tamanosPermitidos : [10, 25, 50, 100, 200]
  const dentro = base.filter((t) => t <= paginacion.tamanoMaximo)
  if (!dentro.includes(paginacion.tamanoDefecto)) dentro.push(paginacion.tamanoDefecto)
  return [...new Set(dentro)].sort((a, b) => a - b)
}

/**
 * Ajusta el pageSize que pide el paginador a un valor que el back acepte.
 * Sin paginacion conocida (antes de la primera respuesta) devuelve undefined: se omite el parámetro.
 */
export function pageSizeAceptado(pageSize, paginacion) {
  if (paginacion === undefined || paginacion === null) return undefined
  const permitidos = opcionesTamanoPagina(paginacion)
  if (pageSize !== undefined && permitidos.includes(Number(pageSize))) return Number(pageSize)
  return paginacion.tamanoDefecto
}

// ── Ayuda contextual (data-help) ────────────────────────────────────

const BOTONES_AYUDA = ['listar', 'crear', 'editar', 'eliminar']

/**
 * Traduce la configuración `ayuda` a las claves `data-help`.
 * ayuda: { clave?: string | (ctx) => string, botones?: { listar|crear|editar|eliminar: string | true, campo?: { [field]: string | true } } }
 * - `clave` es la base; un botón con `true` toma `${base}-${boton}`; un string se usa tal cual.
 * - Sin `clave` ni texto propio, el botón no lleva data-help.
 * Devuelve { botones: { accion: string|null }, campos: { field: string } } listo para
 * BtnConfig.helpKey, fields_def.helpKey y el atributo data-help del formulario.
 * Esto sólo genera claves: el texto de la ayuda vive en el diccionario de la aplicación.
 */
export function resolverAyuda(ayuda, { recurso }) {
  requerido(recurso, 'recurso')
  const resultado = { botones: {}, campos: {} }
  for (const accion of BOTONES_AYUDA) resultado.botones[accion] = null
  if (ayuda === undefined || ayuda === null) return resultado
  if (typeof ayuda !== 'object') throw new Error('[crud] "ayuda" debe ser un objeto')
  let base = null
  if (typeof ayuda.clave === 'function') {
    base = ayuda.clave({ recurso })
    if (typeof base !== 'string' || base === '') throw new Error('[crud] ayuda.clave(ctx) debe devolver un string no vacío')
  } else if (ayuda.clave !== undefined) {
    if (typeof ayuda.clave !== 'string' || ayuda.clave === '') throw new Error('[crud] ayuda.clave debe ser string o función')
    base = ayuda.clave
  }
  const botones = ayuda.botones === undefined ? {} : ayuda.botones
  for (const accion of BOTONES_AYUDA) {
    const valor = botones[accion]
    if (valor === undefined || valor === false) continue
    if (valor === true) {
      if (base === null) throw new Error(`[crud] ayuda.botones.${accion}: true requiere ayuda.clave`)
      resultado.botones[accion] = `${base}-${accion}`
    } else if (typeof valor === 'string' && valor !== '') {
      resultado.botones[accion] = valor
    } else {
      throw new Error(`[crud] ayuda.botones.${accion} debe ser string, true o false`)
    }
  }
  const campos = botones.campo === undefined ? {} : botones.campo
  if (campos === null || typeof campos !== 'object') throw new Error('[crud] ayuda.botones.campo debe ser un objeto')
  for (const [field, valor] of Object.entries(campos)) {
    if (valor === true) {
      if (base === null) throw new Error(`[crud] ayuda.botones.campo.${field}: true requiere ayuda.clave`)
      resultado.campos[field] = `${base}-campo-${field}`
    } else if (typeof valor === 'string' && valor !== '') {
      resultado.campos[field] = valor
    } else if (valor !== false && valor !== undefined) {
      throw new Error(`[crud] ayuda.botones.campo.${field} debe ser string, true o false`)
    }
  }
  return resultado
}

/** Atributos `data-help` para `v-bind` (vacío si no hay clave). */
export function atributosAyuda(clave) {
  if (clave === undefined || clave === null) return {}
  return { 'data-help': clave }
}

// ── Preferencias de columnas (inyectadas) ──────────────────────────

/** Clave con la que TableEditor guarda la configuración de columnas de un recurso. */
export function clavePreferenciasTabla(recurso) {
  requerido(recurso, 'recurso')
  return `te_cfg_${recurso}`
}

/**
 * Preferencias en localStorage (estado local, sin SSO). Cada operación va en try/catch y se registra.
 * Interfaz: { leer(clave) -> valor|null, guardar(clave, valor) -> void }.
 * `storage` se inyecta para poder probarlo (por defecto window.localStorage si existe).
 */
export function crearPreferenciasLocales(storage, prefijo = 'crud_prefs:') {
  requerido(storage, 'storage')
  return {
    leer(clave) {
      try {
        return storage.getItem(`${prefijo}${clave}`)
      } catch (err) {
        console.error('[crud] preferencias locales: error al leer', err)
        return null
      }
    },
    guardar(clave, valor) {
      try {
        storage.setItem(`${prefijo}${clave}`, typeof valor === 'string' ? valor : JSON.stringify(valor))
      } catch (err) {
        console.error('[crud] preferencias locales: error al guardar', err)
      }
    },
  }
}

/**
 * Adaptador de preferencias de TableEditor (`config.preferencesStore`) a partir de la
 * dependencia inyectada `preferencias: { leer(clave), guardar(clave, valor) }`.
 * - fetchMisPreferencias(): carga la clave de columnas del recurso en la caché (lectura inicial).
 * - valor(clave): lectura síncrona de la caché (TableEditor la necesita así).
 * - guardarValores(data): actualiza la caché y persiste cada clave; los errores se registran y
 *   se devuelven como { status:false }.
 * Devuelve null si no se inyectó nada: TableEditor usa entonces su adaptador global / localStorage.
 */
export function crearAdaptadorPreferencias(preferencias, recurso) {
  if (preferencias === undefined || preferencias === null) return null
  if (typeof preferencias.leer !== 'function' || typeof preferencias.guardar !== 'function') {
    throw new Error('[crud] "preferencias" debe exponer leer(clave) y guardar(clave, valor)')
  }
  const clave = clavePreferenciasTabla(recurso)
  const cache = {}
  return {
    get misValores() {
      return cache
    },
    valor(key) {
      const v = cache[key]
      return v === undefined || v === null || v === '' ? null : v
    },
    async fetchMisPreferencias() {
      try {
        const v = await preferencias.leer(clave)
        if (v !== undefined && v !== null) cache[clave] = v
      } catch (err) {
        console.error('[crud] error al leer preferencias de columnas:', err)
      }
    },
    async guardarValores(data) {
      let estado = { status: true }
      for (const [key, value] of Object.entries(data)) {
        cache[key] = value
        try {
          await preferencias.guardar(key, value)
        } catch (err) {
          console.error('[crud] error al guardar preferencias de columnas:', err)
          estado = { status: false, error: String(err && err.message ? err.message : err) }
        }
      }
      return estado
    },
  }
}
