// Preferencia `dashboard_cards`, versión 2: pestañas por usuario.
//
// Módulo puro, sin Vue ni store: cada operación recibe la preferencia y devuelve una NUEVA, sin
// tocar la que recibió. Así el componente sólo decide cuándo guardar, y las reglas se leen (y se
// prueban) en un solo lugar.
//
// {
//   version: 2,
//   activa: '<id>',
//   iniciales: 2,                                 // nivel de pestañas iniciales aplicado (`conIniciales`)
//   pestanas: [                                   // en el orden en que se muestran
//     { id: 'general', nombre: 'Todas', general: true,
//       cards:   [{ clave, ancho?, color? }],     // visibles, en orden
//       ocultas: [{ clave, ancho?, color? }] },
//     { id: '<id>', nombre: 'Finanzas', cards: [...], ocultas: [...] },
//   ],
// }
//
// Invariantes:
// - "Todas" existe siempre, con id `general`; no se borra ni se renombra, pero se mueve.
// - "Todas" tiene TODAS las cards, visibles u ocultas: desde ella una card se oculta o se copia,
//   pero no se mueve ni se quita.
// - Una clave aparece a lo sumo una vez por pestaña, entre `cards` y `ocultas`.
// - Una card vive siempre en al menos una pestaña, visible u oculta.
// - El ancho y el color son de cada lugar, no de la card: una copia es independiente de la otra.
//
// El catálogo (defs de card) puede traer `tipo` (`NUMERO` o `GRAFICO`) y una o más pestañas
// iniciales (`pestanaDefault` y/o `categorias`). Las cards de números van antes que los gráficos al
// ubicar una card que el usuario no tenía, y las pestañas iniciales se arman una sola vez por
// usuario (`conIniciales`), con copias: "Todas" las sigue teniendo.

export const VERSION = 2
export const ID_GENERAL = 'general'
export const NOMBRE_GENERAL = 'Todas'
export const INICIALES = 2
export const MAX_NOMBRE = 40

const ANCHOS = [1, 2, 3, 4]

function entrada(e) {
  const clave = typeof e === 'string' ? e : e?.clave
  if (typeof clave !== 'string' || !clave) return null
  const res = { clave }
  if (ANCHOS.includes(e?.ancho)) res.ancho = e.ancho
  if (typeof e?.color === 'string' && e.color) res.color = e.color
  return res
}

function pestanaGeneral(cards = [], ocultas = []) {
  return { id: ID_GENERAL, nombre: NOMBRE_GENERAL, general: true, cards, ocultas }
}

function normalizar(nombre) {
  return String(nombre ?? '').trim().toLocaleLowerCase('es')
}

function tipoDe(filas, clave) {
  return filas.find((f) => f.clave === clave)?.tipo
}

function tipoEsNumero(filas, clave) {
  const tipo = tipoDe(filas, clave)
  return tipo == null || tipo === 'NUMERO'
}

// Nombres de pestaña inicial de una def: `pestanaDefault` (o `pestanaInicial`) y `categorias[]`.
export function pestanasInicialesDe(def) {
  const nombres = []
  const sumar = (nombre) => {
    if (typeof nombre !== 'string') return
    const limpio = nombre.trim()
    if (limpio && !nombres.some((n) => normalizar(n) === normalizar(limpio))) nombres.push(limpio)
  }
  sumar(def?.pestanaDefault)
  sumar(def?.pestanaInicial)
  for (const cat of def?.categorias ?? []) sumar(cat)
  return nombres
}

// El formato anterior era un mapa plano `{ clave: { ancho?, oculta?, categoria? } }`. Se convierte
// al leer, sin migración de datos: "Todas" sale con las cards visibles/ocultas y sus overrides.
// Si se pasa el catálogo, las entradas se ordenan como las defs (el formato viejo no guardaba orden).
function desdeV1(pref, catalogo = null) {
  const cards = []
  const ocultas = []
  const claves = Object.entries(pref ?? {})
    .filter(([, v]) => v && typeof v === 'object')
    .map(([clave, v]) => ({ clave, ...entrada(v) }))
  const orden = new Map((catalogo ?? []).map((f, i) => [f.clave, i]))
  claves.sort((a, b) => (orden.get(a.clave) ?? Number.MAX_SAFE_INTEGER) - (orden.get(b.clave) ?? Number.MAX_SAFE_INTEGER))
  for (const e of claves) {
    if (pref[e.clave]?.oculta) ocultas.push(e)
    else cards.push(e)
  }
  return {
    version: VERSION,
    activa: ID_GENERAL,
    pestanas: [pestanaGeneral(cards, ocultas)],
  }
}

/**
 * Lee la preferencia tal como vino del adaptador (v1 plana, v2, vacía o rota) y devuelve una v2
 * válida. El backend/adaptador guarda el JSON tal cual: toda la validación vive acá.
 * `catalogo` es opcional y sólo se usa para ordenar la migración del formato viejo.
 */
export function leer(crudo, catalogo = null) {
  const pref = crudo && typeof crudo === 'object' ? crudo : {}
  const base = Array.isArray(pref.pestanas) ? pref : desdeV1(pref, catalogo)

  const ids = new Set()
  const pestanas = []
  for (const p of base.pestanas) {
    if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !p.id || ids.has(p.id)) continue
    const esGeneral = p.id === ID_GENERAL
    const nombre = esGeneral ? NOMBRE_GENERAL : (typeof p.nombre === 'string' ? p.nombre.trim().slice(0, MAX_NOMBRE) : '')
    if (!nombre) continue
    const vistas = new Set()
    const depurar = (lista) => (Array.isArray(lista) ? lista : []).map(entrada).filter((e) => {
      if (!e || vistas.has(e.clave)) return false
      vistas.add(e.clave)
      return true
    })
    const cards = depurar(p.cards)
    const ocultas = depurar(p.ocultas)
    ids.add(p.id)
    pestanas.push(esGeneral ? pestanaGeneral(cards, ocultas) : { id: p.id, nombre, cards, ocultas })
  }
  const nombres = new Set()
  const unicas = pestanas.filter((p) => {
    const k = normalizar(p.nombre)
    if (nombres.has(k)) return false
    nombres.add(k)
    return true
  })
  if (!unicas.some((p) => p.id === ID_GENERAL)) unicas.unshift(pestanaGeneral())

  const activa = unicas.some((p) => p.id === base.activa) ? base.activa : ID_GENERAL
  const iniciales = nivelIniciales(pref)
  return { version: VERSION, activa, ...(iniciales ? { iniciales } : {}), pestanas: unicas }
}

// ── Consultas ─────────────────────────────────────────────────────────────────

export function pestana(pref, id) {
  return pref.pestanas.find((p) => p.id === id) ?? null
}

export function activa(pref) {
  return pestana(pref, pref.activa) ?? pestana(pref, ID_GENERAL)
}

function contiene(p, clave) {
  return p.cards.some((e) => e.clave === clave) || p.ocultas.some((e) => e.clave === clave)
}

/** Las pestañas donde está la card, visible u oculta. */
export function pestanasCon(pref, clave) {
  return pref.pestanas.filter((p) => contiene(p, clave))
}

/** A dónde se puede mover o copiar una card: las pestañas donde no está (ni visible ni oculta). */
export function destinos(pref, clave) {
  return pref.pestanas.filter((p) => !contiene(p, clave)).map((p) => ({ id: p.id, nombre: p.nombre }))
}

function insertar(p, entradas, filas) {
  const numeros = entradas.filter((e) => tipoEsNumero(filas, e.clave))
  const graficos = entradas.filter((e) => !tipoEsNumero(filas, e.clave))
  let corte = 0
  p.cards.forEach((e, i) => { if (tipoEsNumero(filas, e.clave)) corte = i + 1 })
  return { ...p, cards: [...numeros, ...p.cards.slice(0, corte), ...graficos, ...p.cards.slice(corte)] }
}

function idInicial(pref, nombre) {
  const base = 'i_' + normalizar(nombre).normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '_')
  let id = base
  for (let n = 2; pref.pestanas.some((p) => p.id === id); n++) id = `${base}_${n}`
  return id
}

function porNombre(pref, nombre) {
  const k = normalizar(nombre)
  return pref.pestanas.find((p) => normalizar(p.nombre) === k) ?? null
}

function nivelIniciales(pref) {
  if (pref?.iniciales === true) return 1
  return Number.isInteger(pref?.iniciales) && pref.iniciales > 0 ? pref.iniciales : 0
}

function filaDe(catalogo) {
  return (catalogo ?? []).map((f) => (typeof f === 'string' ? { clave: f, tipo: 'NUMERO' } : f))
}

/**
 * Las cards del catálogo que el usuario ve y no figuran en ninguna pestaña —recién creadas, o con
 * el permiso recién otorgado— se suman a "Todas" y, si el usuario las tiene, a sus pestañas
 * iniciales. En cada una, una de números va al principio y un gráfico detrás de los números.
 */
export function conNuevas(pref, catalogo) {
  const filas = filaDe(catalogo)
  const nuevas = filas.filter((f) => !pref.pestanas.some((p) => contiene(p, f.clave)))
  if (!nuevas.length) return pref

  const destino = new Map()
  const sumar = (id, clave) => destino.set(id, [...(destino.get(id) ?? []), { clave }])
  for (const f of nuevas) {
    sumar(ID_GENERAL, f.clave)
    for (const nombre of pestanasInicialesDe(f)) {
      const propia = porNombre(pref, nombre)
      if (propia && propia.id !== ID_GENERAL) sumar(propia.id, f.clave)
    }
  }
  let res = pref
  for (const [id, entradas] of destino) res = cambiar(res, id, (p) => insertar(p, entradas, filas))
  return res
}

/**
 * Las pestañas iniciales, una sola vez por usuario y por nivel (`INICIALES`):
 * - **Nivel 1**: crea una pestaña por cada nombre inicial del catálogo que el usuario ve, en el
 *   orden en que aparecen, con una copia de cada una de sus cards (visible u oculta, con su ancho y
 *   color). Sus números primero y sus gráficos después.
 * - **Nivel 2**: "Todas" tiene todas las cards. Las que falten se le suman como copia.
 * Después marca el nivel, así que borrar una pestaña inicial es definitivo.
 */
export function conIniciales(pref, catalogo) {
  const nivel = nivelIniciales(pref)
  if (nivel >= INICIALES) return pref
  const filas = filaDe(catalogo)
  const ordenar = (lista) => [...lista.filter((e) => tipoEsNumero(filas, e.clave)), ...lista.filter((e) => !tipoEsNumero(filas, e.clave))]
  const deAlguna = (res, clave) => {
    for (const p of [pestana(res, ID_GENERAL), ...res.pestanas]) {
      if (p.cards.some((e) => e.clave === clave)) return { e: p.cards.find((e) => e.clave === clave), oculta: false }
      if (p.ocultas.some((e) => e.clave === clave)) return { e: p.ocultas.find((e) => e.clave === clave), oculta: true }
    }
    return { e: null, oculta: false }
  }
  let res = { ...pref, iniciales: INICIALES }

  if (nivel < 1) {
    const nombres = []
    for (const f of filas) {
      for (const nombre of pestanasInicialesDe(f)) {
        if (!nombres.some((n) => normalizar(n) === normalizar(nombre))) nombres.push(nombre)
      }
    }

    for (const nombre of nombres) {
      if (errorDeNombre(res, nombre)) continue
      const cards = []
      const ocultas = []
      for (const f of filas.filter((x) => pestanasInicialesDe(x).some((n) => normalizar(n) === normalizar(nombre)))) {
        const { e, oculta } = deAlguna(res, f.clave)
        ;(oculta ? ocultas : cards).push(copiaDe(e, f.clave))
      }
      if (!cards.length && !ocultas.length) continue
      res = { ...res, pestanas: [...res.pestanas, { id: idInicial(res, nombre), nombre, cards: ordenar(cards), ocultas }] }
    }
  }

  const general = pestana(res, ID_GENERAL)
  const faltan = filas.filter((f) => !contiene(general, f.clave)).map((f) => copiaDe(deAlguna(res, f.clave).e, f.clave))
  return cambiar(res, ID_GENERAL, (g) => ({ ...g, cards: ordenar([...g.cards, ...faltan]) }))
}

/**
 * El motivo por el que un nombre no sirve, o null. Obligatorio, hasta 40 caracteres y único sin
 * importar mayúsculas; "Todas" queda reservado.
 */
export function errorDeNombre(pref, nombre, idPropio = null) {
  const limpio = String(nombre ?? '').trim()
  if (!limpio) return 'El nombre es obligatorio.'
  if (limpio.length > MAX_NOMBRE) return `El nombre no puede pasar de ${MAX_NOMBRE} caracteres.`
  if (normalizar(limpio) === normalizar(NOMBRE_GENERAL)) return `"${NOMBRE_GENERAL}" es el nombre de la pestaña fija.`
  if (pref.pestanas.some((p) => p.id !== idPropio && normalizar(p.nombre) === normalizar(limpio)))
    return 'Ya hay una pestaña con ese nombre.'
  return null
}

// ── Operaciones ───────────────────────────────────────────────────────────────

function cambiar(pref, id, fn) {
  return { ...pref, pestanas: pref.pestanas.map((p) => (p.id === id ? fn(p) : p)) }
}

function omitir(objeto, campo) {
  const copia = { ...objeto }
  delete copia[campo]
  return copia
}

function entradaEn(p, clave) {
  return p.cards.find((e) => e.clave === clave) ?? p.ocultas.find((e) => e.clave === clave) ?? null
}

function sin(p, clave) {
  return { ...p, cards: p.cards.filter((e) => e.clave !== clave), ocultas: p.ocultas.filter((e) => e.clave !== clave) }
}

function copiaDe(e, clave) {
  return e ? { ...e } : { clave }
}

export function nuevoId(pref, azar = Math.random) {
  let id
  do id = 'p' + Math.floor(azar() * 36 ** 6).toString(36).padStart(6, '0')
  while (pref.pestanas.some((p) => p.id === id))
  return id
}

export function activar(pref, id) {
  return pestana(pref, id) ? { ...pref, activa: id } : pref
}

/** Reordena las visibles de una pestaña; las que no se ven conservan su posición relativa. */
export function reordenarCards(pref, id, claves) {
  return cambiar(pref, id, (p) => {
    const enPantalla = new Set(claves)
    const porClave = new Map(p.cards.map((e) => [e.clave, e]))
    let i = 0
    const cards = p.cards.map((e) => (enPantalla.has(e.clave) ? porClave.get(claves[i++]) ?? e : e))
    return { ...p, cards }
  })
}

export function cambiarAncho(pref, id, clave, ancho) {
  return cambiar(pref, id, (p) => ({
    ...p,
    cards: p.cards.map((e) => {
      if (e.clave !== clave) return e
      const resto = omitir(e, 'ancho')
      return ANCHOS.includes(ancho) ? { ...resto, ancho } : resto
    }),
  }))
}

export function cambiarColor(pref, id, clave, color) {
  return cambiar(pref, id, (p) => ({
    ...p,
    cards: p.cards.map((e) => {
      if (e.clave !== clave) return e
      const resto = omitir(e, 'color')
      return typeof color === 'string' && color ? { ...resto, color } : resto
    }),
  }))
}

export function ocultar(pref, id, clave) {
  return cambiar(pref, id, (p) => {
    const e = p.cards.find((x) => x.clave === clave)
    if (!e) return p
    return { ...p, cards: p.cards.filter((x) => x !== e), ocultas: [...p.ocultas, e] }
  })
}

/** Las vuelve a mostrar al final de las visibles, en el orden en que llegan. */
export function mostrar(pref, id, claves) {
  return cambiar(pref, id, (p) => {
    const vuelven = claves.map((k) => p.ocultas.find((e) => e.clave === k)).filter(Boolean)
    return { ...p, cards: [...p.cards, ...vuelven], ocultas: p.ocultas.filter((e) => !vuelven.includes(e)) }
  })
}

/**
 * Crea una pestaña al final y la deja activa. `elecciones` es `[{ clave, accion }]` con `accion`
 * `'mover'` o `'copiar'`:
 * - **mover** saca la card sólo de la pestaña activa y la lleva visible a la nueva.
 * - **copiar** la deja donde está y suma una copia a la nueva.
 * Las cards van en el orden de `elecciones`. Se puede crear vacía.
 */
export function agregarPestana(pref, nombre, elecciones = [], id = nuevoId(pref)) {
  const origen = activa(pref)
  const cards = []
  const movidas = new Set()
  for (const { clave, accion } of elecciones) {
    if (cards.some((e) => e.clave === clave)) continue
    const enActiva = entradaEn(origen, clave)
    if (accion === 'mover' && enActiva) {
      cards.push({ ...enActiva })
      movidas.add(clave)
    } else if (accion === 'mover' || accion === 'copiar') {
      const enAlguna = enActiva ?? pref.pestanas.map((p) => entradaEn(p, clave)).find(Boolean)
      cards.push(copiaDe(enAlguna, clave))
    }
  }
  let res = origen.id === ID_GENERAL ? pref : cambiar(pref, origen.id, (p) => [...movidas].reduce(sin, p))
  res = { ...res, pestanas: [...res.pestanas, { id, nombre: String(nombre).trim(), cards, ocultas: [] }] }
  return activar(res, id)
}

export function renombrar(pref, id, nombre) {
  if (id === ID_GENERAL) return pref
  return cambiar(pref, id, (p) => ({ ...p, nombre: String(nombre).trim() }))
}

/** Reordena las pestañas: `ids` es el orden nuevo. Un id desconocido se ignora y uno que falta va al final. */
export function reordenarPestanas(pref, ids) {
  const porId = new Map(pref.pestanas.map((p) => [p.id, p]))
  const ordenadas = ids.map((i) => porId.get(i)).filter(Boolean)
  const resto = pref.pestanas.filter((p) => !ordenadas.includes(p))
  return { ...pref, pestanas: [...ordenadas, ...resto] }
}

export function moverPestana(pref, id, paso) {
  const ids = pref.pestanas.map((p) => p.id)
  const desde = ids.indexOf(id)
  const hasta = desde + paso
  if (desde === -1 || hasta < 0 || hasta >= ids.length) return pref
  ids.splice(desde, 1)
  ids.splice(hasta, 0, id)
  return reordenarPestanas(pref, ids)
}

/**
 * Elimina una pestaña (nunca "Todas"). Sus cards pasan al final de "Todas" en el orden que tenían.
 * Una que ya está en "Todas" —porque era una copia— no se duplica.
 */
export function eliminarPestana(pref, id) {
  const p = pestana(pref, id)
  if (!p || id === ID_GENERAL) return pref
  const general = pestana(pref, ID_GENERAL)
  const nuevasVisibles = p.cards.filter((e) => !contiene(general, e.clave))
  const nuevasOcultas = p.ocultas.filter((e) => !contiene(general, e.clave))
  const res = cambiar(pref, ID_GENERAL, (g) => ({
    ...g, cards: [...g.cards, ...nuevasVisibles], ocultas: [...g.ocultas, ...nuevasOcultas],
  }))
  return {
    ...res,
    activa: res.activa === id ? ID_GENERAL : res.activa,
    pestanas: res.pestanas.filter((x) => x.id !== id),
  }
}

/** Mueve una card de una pestaña a otra donde no está; llega visible, al final. */
export function moverCard(pref, desde, hacia, clave) {
  if (desde === ID_GENERAL) return pref
  const origen = pestana(pref, desde)
  const destino = pestana(pref, hacia)
  const e = origen && entradaEn(origen, clave)
  if (!e || !destino || contiene(destino, clave)) return pref
  const res = cambiar(pref, desde, (p) => sin(p, clave))
  return cambiar(res, hacia, (p) => ({ ...p, cards: [...p.cards, { ...e }] }))
}

/** Copia una card a una pestaña donde no está; arranca con el ancho y color de la original. */
export function copiarCard(pref, desde, hacia, clave) {
  const origen = pestana(pref, desde)
  const destino = pestana(pref, hacia)
  if (!origen || !destino || contiene(destino, clave)) return pref
  const e = entradaEn(origen, clave)
  if (!e) return pref
  return cambiar(pref, hacia, (p) => ({ ...p, cards: [...p.cards, copiaDe(e, clave)] }))
}

/**
 * Quita la card de una pestaña, sólo si sigue estando en otra: una card nunca queda fuera de todas.
 */
export function quitarCard(pref, id, clave) {
  if (id === ID_GENERAL) return pref
  if (pestanasCon(pref, clave).filter((p) => p.id !== id).length === 0) return pref
  return cambiar(pref, id, (p) => sin(p, clave))
}

// Alias en camelCase para consumidores que prefieran esa convención.
export {
  pestanasCon as tabsWithCard,
  destinos as moveTargets,
  conNuevas as addNewCards,
  conIniciales as ensureInitialTabs,
}
