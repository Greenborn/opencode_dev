// Utilidades internas: generador pseudoaleatorio determinista y pesos acumulados.

// mulberry32: PRNG determinista, así cada semilla reproduce la misma simulación.
export function mulberry32(semilla) {
  let a = semilla >>> 0;
  return function siguiente() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Acumulado normalizado (último valor = 1) para elegir por peso con una búsqueda lineal corta.
export function acumulado(pesos) {
  const out = new Float64Array(pesos.length);
  let total = 0;
  for (const p of pesos) total += p > 0 ? p : 0;
  let run = 0;
  for (let k = 0; k < pesos.length; k++) {
    run += pesos[k] > 0 ? pesos[k] : 0;
    out[k] = total > 0 ? run / total : (k + 1) / pesos.length;
  }
  if (out.length) out[out.length - 1] = 1;
  return out;
}

// Índice elegido con un número u en [0, 1) según un acumulado de acumulado().
export function elegirPorPeso(acum, u) {
  let k = 0;
  while (k < acum.length - 1 && u > acum[k]) k++;
  return k;
}
