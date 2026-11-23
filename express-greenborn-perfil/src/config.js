// Configuración genérica. Ningún texto de dominio está fijo: el término de la
// entidad se recibe por parámetro y por defecto es "negocio".

export const TERMINOS_POR_DEFECTO = Object.freeze({ singular: 'negocio', plural: 'negocios' });

export function normalizarTerminos(terminos = {}) {
  return { ...TERMINOS_POR_DEFECTO, ...terminos };
}

const TIPOS = new Set(['texto', 'texto_largo', 'numero', 'booleano']);

/**
 * Valida el esquema de campos del perfil.
 * Cada campo: { nombre, tipo, publicable?, interruptor?, editable? }
 *  - publicable: el campo puede salir en el perfil público.
 *  - interruptor: columna booleana que habilita la salida pública (default `mostrar_<nombre>`).
 *    Siempre arranca apagado (false).
 *  - editable: el titular puede modificarlo (default true).
 */
export function normalizarCampos(campos = []) {
  if (!Array.isArray(campos) || campos.length === 0) {
    throw new Error('express-greenborn-perfil: se requiere al menos un campo');
  }
  const nombres = new Set();
  return campos.map((c) => {
    if (!c || typeof c.nombre !== 'string' || !/^[a-z_][a-z0-9_]*$/.test(c.nombre)) {
      throw new Error(`express-greenborn-perfil: nombre de campo inválido: ${c && c.nombre}`);
    }
    if (nombres.has(c.nombre)) throw new Error(`campo duplicado: ${c.nombre}`);
    nombres.add(c.nombre);
    const tipo = c.tipo || 'texto';
    if (!TIPOS.has(tipo)) throw new Error(`tipo no soportado en ${c.nombre}: ${tipo}`);
    const publicable = c.publicable === true;
    return {
      nombre: c.nombre,
      tipo,
      publicable,
      interruptor: publicable ? c.interruptor || `mostrar_${c.nombre}` : null,
      editable: c.editable !== false,
      etiqueta: c.etiqueta || c.nombre,
    };
  });
}
