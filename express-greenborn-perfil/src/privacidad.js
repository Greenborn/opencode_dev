// Lista blanca de salida pública. Un campo sólo sale si es publicable y su
// interruptor está encendido. Nada más de la fila se devuelve.

export function dtoPublico(fila, campos) {
  if (!fila) return null;
  const salida = { id: fila.id };
  for (const campo of campos) {
    if (!campo.publicable) continue;
    if (fila[campo.interruptor] !== true) continue;
    if (fila[campo.nombre] === undefined || fila[campo.nombre] === null) continue;
    salida[campo.nombre] = fila[campo.nombre];
  }
  return salida;
}

// Filtra el body de un PUT: sólo campos editables y sus interruptores.
// Descarta cualquier otra clave (ej. user_id, id, timestamps).
export function filtrarCambios(body, campos) {
  const permitidas = new Set();
  for (const c of campos) {
    if (c.editable) permitidas.add(c.nombre);
    if (c.interruptor) permitidas.add(c.interruptor);
  }
  const cambios = {};
  for (const [clave, valor] of Object.entries(body || {})) {
    if (!permitidas.has(clave)) continue;
    cambios[clave] = valor;
  }
  return cambios;
}
