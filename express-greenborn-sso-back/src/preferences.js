// Preferencias de usuario del SSO: almacén clave/valor por usuario.
// Tabla por defecto `gb_sso_preferencias` (ver migración 20260822000000).

export const DEFAULT_PREFERENCES_TABLE = 'gb_sso_preferencias';
const MAX_CLAVE = 191;

function validarUserId(userId) {
  if (userId === undefined || userId === null || String(userId).trim() === '') {
    throw new Error('preferencias: "userId" es obligatorio');
  }
  return String(userId);
}

function validarClave(clave) {
  if (typeof clave !== 'string' || clave.trim() === '') {
    throw new Error('preferencias: "clave" debe ser un texto no vacío');
  }
  if (clave.length > MAX_CLAVE) {
    throw new Error(`preferencias: "clave" supera ${MAX_CLAVE} caracteres`);
  }
  return clave;
}

export function createPreferencesService(ctx) {
  const { knex } = ctx;
  const tabla = ctx.preferencesTable === undefined ? DEFAULT_PREFERENCES_TABLE : ctx.preferencesTable;

  if (!knex) {
    throw new Error('preferencias: "knex" es obligatorio');
  }

  // Devuelve { clave: valor, ... } de todas las preferencias del usuario.
  async function obtenerTodas(userId) {
    const uid = validarUserId(userId);
    const filas = await knex(tabla).where({ user_id: uid }).select('clave', 'valor');
    const resultado = {};
    for (const fila of filas) {
      resultado[fila.clave] = JSON.parse(fila.valor);
    }
    return resultado;
  }

  // Devuelve el valor de una clave, o undefined si no existe.
  async function leer(userId, clave) {
    const uid = validarUserId(userId);
    const cl = validarClave(clave);
    const fila = await knex(tabla).where({ user_id: uid, clave: cl }).first('valor');
    if (!fila) return undefined;
    return JSON.parse(fila.valor);
  }

  // Inserta o actualiza la preferencia. `valor` debe ser serializable a JSON.
  async function guardar(userId, clave, valor) {
    const uid = validarUserId(userId);
    const cl = validarClave(clave);
    if (valor === undefined) {
      throw new Error('preferencias: "valor" es obligatorio');
    }
    const texto = JSON.stringify(valor);
    const ahora = new Date();
    const existente = await knex(tabla).where({ user_id: uid, clave: cl }).first('id');
    if (existente) {
      await knex(tabla).where({ id: existente.id }).update({ valor: texto, updated_at: ahora });
    } else {
      await knex(tabla).insert({ user_id: uid, clave: cl, valor: texto, updated_at: ahora });
    }
    return valor;
  }

  // Borra una preferencia. Devuelve true si existía.
  async function eliminar(userId, clave) {
    const uid = validarUserId(userId);
    const cl = validarClave(clave);
    const borradas = await knex(tabla).where({ user_id: uid, clave: cl }).del();
    return borradas > 0;
  }

  return { obtenerTodas, leer, guardar, eliminar };
}
