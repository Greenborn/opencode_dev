// Lista blanca pública. Un local sólo sale si está publicado.

export function dtoPublicoLocal(fila, publicos) {
  if (!fila || fila.publicado !== true) return null;
  const salida = { id: fila.id };
  for (const nombre of publicos) {
    if (fila[nombre] === undefined || fila[nombre] === null) continue;
    salida[nombre] = fila[nombre];
  }
  return salida;
}

// Sólo estos campos y el interruptor de publicación pueden venir del cliente.
export function filtrarCambiosLocal(body, campos) {
  const permitidas = new Set([...campos.map((c) => c.nombre), 'publicado']);
  const cambios = {};
  for (const [clave, valor] of Object.entries(body || {})) {
    if (!permitidas.has(clave)) continue;
    cambios[clave] = valor;
  }
  if ('publicado' in cambios) cambios.publicado = cambios.publicado === true;
  return cambios;
}
