import { ErrorCrud, IDENTIFICADOR } from './errores.js';
import { OPCIONES_MAX, MULTISELECT_MAX } from './normalizarCampos.js';

const esObjetoPlano = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const tieneValor = (v) => v !== null && v !== undefined;
const aTexto = (v) => (tieneValor(v) ? String(v) : '');

/**
 * Filtro del lookup para un request: `{ columna: valor }` o null (sin filtro).
 * Lanza Error si el filtro devuelve algo que no sea objeto plano o null (error de configuración del consumidor).
 */
export function filtroLookup(lookup, req, nombreCampo) {
  if (lookup.filtro === null) return null;
  const resultado = lookup.filtro(req);
  if (resultado === null) return null;
  if (!esObjetoPlano(resultado)) {
    throw new Error(`lookup de "${nombreCampo}": filtro(req) debe devolver { columna: valor } o null`);
  }
  for (const [columna, valor] of Object.entries(resultado)) {
    if (!IDENTIFICADOR.test(columna)) throw new Error(`lookup de "${nombreCampo}": columna de filtro inválida "${columna}"`);
    if (valor === undefined || (valor !== null && typeof valor === 'object')) {
      throw new Error(`lookup de "${nombreCampo}": el valor del filtro para "${columna}" debe ser primitivo`);
    }
  }
  return resultado;
}

/** Opciones `{ value, label }` del lookup para fields_def (máximo OPCIONES_MAX, ordenadas por etiqueta). */
export async function cargarOpciones({ knex, lookup, req, logger, nombreCampo }) {
  const filtro = filtroLookup(lookup, req, nombreCampo);
  let qb = knex(lookup.tabla)
    .select({ value: lookup.valor, label: lookup.etiqueta })
    .orderBy(lookup.etiqueta, 'asc')
    .limit(OPCIONES_MAX + 1);
  if (filtro !== null) qb = qb.where(filtro);
  const filas = await qb;
  if (filas.length > OPCIONES_MAX) {
    logger.warn(`[CRUD] lookup de "${nombreCampo}": hay más de ${OPCIONES_MAX} opciones; se devuelven las primeras ${OPCIONES_MAX}`);
  }
  return filas.slice(0, OPCIONES_MAX).map((f) => ({ value: f.value, label: aTexto(f.label) }));
}

/**
 * Completa cada fila con:
 * - `<campo>_etiqueta` para cada select con lookup (etiqueta del registro relacionado, o null).
 * - `<campo>` como array de ids para cada multiselect (consulta batch sobre la tabla intermedia).
 * Las lecturas no aplican el filtro del lookup: el filtro acota qué se puede elegir/escribir, no qué se muestra.
 */
export async function completarFilas({ knex, campos, pk, filas }) {
  if (filas.length === 0) return filas;

  for (const campo of campos) {
    if (campo.lookup === undefined) continue;
    const { tabla, valor, etiqueta } = campo.lookup;
    const claves = [...new Set(filas.map((f) => f[campo.field]).filter(tieneValor))];
    const etiquetas = new Map();
    if (claves.length > 0) {
      const relacionados = await knex(tabla).whereIn(valor, claves).select({ clave: valor, texto: etiqueta });
      for (const r of relacionados) etiquetas.set(String(r.clave), aTexto(r.texto));
    }
    const nombre = `${campo.field}_etiqueta`;
    for (const f of filas) {
      const v = f[campo.field];
      f[nombre] = tieneValor(v) && etiquetas.has(String(v)) ? etiquetas.get(String(v)) : null;
    }
  }

  for (const campo of campos) {
    if (campo.relacion === undefined) continue;
    const { tabla, fkOrigen, fkDestino } = campo.relacion;
    const origenes = [...new Set(filas.map((f) => f[pk]))];
    const pivote = await knex(tabla).whereIn(fkOrigen, origenes).select(fkOrigen, fkDestino).orderBy(fkDestino, 'asc');
    const grupos = new Map();
    for (const r of pivote) {
      const clave = String(r[fkOrigen]);
      if (!grupos.has(clave)) grupos.set(clave, []);
      grupos.get(clave).push(r[fkDestino]);
    }
    for (const f of filas) {
      const clave = String(f[pk]);
      f[campo.field] = grupos.has(clave) ? grupos.get(clave) : [];
    }
  }
  return filas;
}

/** Devuelve el conjunto (como strings) de los valores de `valores` que existen en el lookup con su filtro. */
async function existentesEnLookup({ knex, lookup, valores, req, nombreCampo }) {
  const filtro = filtroLookup(lookup, req, nombreCampo);
  let qb = knex(lookup.tabla).whereIn(lookup.valor, valores).select({ clave: lookup.valor });
  if (filtro !== null) qb = qb.where(filtro);
  const filas = await qb;
  return new Set(filas.map((f) => String(f.clave)));
}

/**
 * Valida contra su tabla externa los lookups y multiselect presentes en la escritura.
 * - `valores`: valores ya validados por prepararEscritura (campos de columna).
 * - `datos`: body original; en PUT sólo se validan los campos que vienen en él.
 * Devuelve Map(campo -> { relacion, ids }) con los conjuntos de N:M a escribir.
 * Lanza ErrorCrud(400) con `errors` por campo.
 */
export async function validarReferencias({ knex, campos, datos, valores, modo, req }) {
  const errors = {};

  for (const campo of campos) {
    if (campo.lookup === undefined || !campo.writable) continue;
    const valor = valores[campo.field];
    if (!tieneValor(valor)) continue;
    const existentes = await existentesEnLookup({ knex, lookup: campo.lookup, valores: [valor], req, nombreCampo: campo.field });
    if (!existentes.has(String(valor))) errors[campo.field] = 'Opción no válida';
  }

  const relaciones = new Map();
  for (const campo of campos) {
    if (campo.relacion === undefined || !campo.writable) continue;
    const presente = Object.prototype.hasOwnProperty.call(datos, campo.field);
    if (!presente) {
      if (modo === 'crear' && campo.required) errors[campo.field] = 'Campo requerido';
      continue;
    }
    const lista = datos[campo.field];
    if (!Array.isArray(lista)) {
      errors[campo.field] = 'Debe ser una lista de ids';
      continue;
    }
    if (lista.length > MULTISELECT_MAX) {
      errors[campo.field] = `Máximo ${MULTISELECT_MAX} elementos`;
      continue;
    }
    const validos = lista.every((v) => (typeof v === 'string' && v !== '') || (typeof v === 'number' && Number.isFinite(v)));
    if (!validos) {
      errors[campo.field] = 'Lista de ids inválida';
      continue;
    }
    const ids = [...new Map(lista.map((v) => [String(v), v])).values()];
    if (ids.length === 0) {
      if (campo.required) errors[campo.field] = 'Campo requerido';
      else relaciones.set(campo.field, { relacion: campo.relacion, ids });
      continue;
    }
    const existentes = await existentesEnLookup({ knex, lookup: campo.relacion.lookup, valores: ids, req, nombreCampo: campo.field });
    if (ids.some((v) => !existentes.has(String(v)))) {
      errors[campo.field] = 'Opción no válida';
      continue;
    }
    relaciones.set(campo.field, { relacion: campo.relacion, ids });
  }

  if (Object.keys(errors).length > 0) throw new ErrorCrud(400, 'Datos inválidos', errors);
  return relaciones;
}

/** Escribe las filas de N:M dentro de la transacción `trx`. `reemplazar` borra antes el conjunto actual del registro. */
export async function escribirRelaciones({ trx, relaciones, origenId }) {
  for (const { relacion, ids } of relaciones.values()) {
    const { tabla, fkOrigen, fkDestino } = relacion;
    await trx(tabla).where(fkOrigen, origenId).delete();
    if (ids.length > 0) {
      await trx(tabla).insert(ids.map((id) => ({ [fkOrigen]: origenId, [fkDestino]: id })));
    }
  }
}

/** Borra las filas de N:M de un registro (dentro de `trx`) antes de borrar el registro. */
export async function borrarRelaciones({ trx, campos, origenId }) {
  for (const campo of campos) {
    if (campo.relacion === undefined) continue;
    await trx(campo.relacion.tabla).where(campo.relacion.fkOrigen, origenId).delete();
  }
}
