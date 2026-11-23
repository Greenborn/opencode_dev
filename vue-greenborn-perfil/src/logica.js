// Lógica pura (sin Vue) para poder probarla con node:test.

export const TERMINOS_POR_DEFECTO = Object.freeze({ singular: 'negocio', plural: 'negocios' });

export function terminosCompletos(terminos = {}) {
  return { ...TERMINOS_POR_DEFECTO, ...terminos };
}

/** Títulos listos para mostrar, según el término configurado. */
export function textosEntidad(terminos) {
  const t = terminosCompletos(terminos);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  return {
    titulo: cap(t.singular),
    tituloPlural: cap(t.plural),
    sinDatos: `Todavía no completaste tu ${t.singular}.`,
    guardado: `Cambios guardados en tu ${t.singular}.`,
  };
}

/**
 * Normaliza el esquema para el formulario. Un campo `publicable` tiene su
 * interruptor (por defecto `mostrar_<nombre>`), que arranca apagado.
 */
export function camposDeFormulario(campos = []) {
  return campos
    .filter((c) => c && c.editable !== false)
    .map((c) => ({
      nombre: c.nombre,
      etiqueta: c.etiqueta || c.nombre,
      tipo: c.tipo || 'texto',
      publicable: c.publicable === true,
      interruptor: c.publicable === true ? c.interruptor || `mostrar_${c.nombre}` : null,
    }));
}

/** Valores iniciales: campos vacíos e interruptores apagados. */
export function valoresIniciales(campos, valores = {}) {
  const out = {};
  for (const c of camposDeFormulario(campos)) {
    out[c.nombre] = valores[c.nombre] ?? (c.tipo === 'booleano' ? false : '');
    if (c.interruptor) out[c.interruptor] = valores[c.interruptor] === true;
  }
  return out;
}

/** Sólo envía al servidor lo que cambió respecto del último valor guardado. */
export function cambiosRespecto(original, actual) {
  const cambios = {};
  for (const [clave, valor] of Object.entries(actual)) {
    if (original[clave] !== valor) cambios[clave] = valor;
  }
  return cambios;
}
