export const TERMINOS_POR_DEFECTO = Object.freeze({ singular: 'negocio', plural: 'negocios' });

export function normalizarTerminos(terminos = {}) {
  return { ...TERMINOS_POR_DEFECTO, ...terminos };
}

// Campos de dirección/ubicación. El proyecto puede agregar más campos de texto
// vía `camposExtra` (nombre, etiqueta, publicable).
export function normalizarCamposLocal(camposExtra = [], publicosExtra = []) {
  const base = [
    { nombre: 'calle', publicable: true },
    { nombre: 'numero', publicable: true },
    { nombre: 'ciudad', publicable: true },
    { nombre: 'latitud', tipo: 'numero', publicable: true },
    { nombre: 'longitud', tipo: 'numero', publicable: true },
    { nombre: 'mapa_url', publicable: true },
  ];
  const todos = [...base, ...camposExtra];
  const nombres = new Set();
  for (const c of todos) {
    if (!c || !/^[a-z_][a-z0-9_]*$/.test(c.nombre)) {
      throw new Error(`express-greenborn-locales: nombre de campo inválido: ${c && c.nombre}`);
    }
    if (nombres.has(c.nombre)) throw new Error(`campo duplicado: ${c.nombre}`);
    nombres.add(c.nombre);
  }
  const publicos = new Set([...base.filter((c) => c.publicable).map((c) => c.nombre), ...publicosExtra]);
  return { campos: todos, publicos: [...publicos] };
}

export function validarUbicacion({ latitud, longitud }) {
  if (latitud != null) {
    const lat = Number(latitud);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return 'latitud inválida';
  }
  if (longitud != null) {
    const lng = Number(longitud);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) return 'longitud inválida';
  }
  return null;
}
