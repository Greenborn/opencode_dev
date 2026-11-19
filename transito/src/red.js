// @greenborn/transito - construcción de la red de carriles a partir de la grilla.
//
// Lógica pura (sin DOM ni three.js). Todo se calcula UNA vez al crear la red:
// carriles (polilíneas), conexiones entre carriles a través de cruces y distancia
// a la salida más cercana. El simulador sólo recorre este grafo.
//
// Convenciones:
// - Celda (i, j): índice idx = j * ancho + i. Su centro en el plano es (i + 0.5, j + 0.5).
// - Ejes: +x (paso 0), +z (paso 1), -x, -z. Mano derecha: a la derecha del sentido
//   d = (dx, dz) está (-dz, dx). Ej.: hacia +x circula el lado de +z.

import { acumulado } from './util.js';

export const K_NADA = 0;      // no transitable
export const K_EJE_X = 1;     // calle horizontal (carril de tránsito en X)
export const K_EJE_Z = 2;     // calle vertical (carril de tránsito en Z)
export const K_CRUCE = 3;     // intersección (o área de calzada sin eje claro)
export const K_MEDIANA = 4;   // mediana de avenida (separa sentidos, no transitable)

const PASOS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

// Acepta { N, C } (C[j*N+i].t, formato del mapa) o { ancho, alto, tipo(i, j) }.
export function normalizarGrilla(grilla) {
  if (grilla && Array.isArray(grilla.C) && grilla.N) {
    const N = grilla.N;
    return {
      ancho: N,
      alto: N,
      tipoEn: (i, j) => {
        const c = grilla.C[j * N + i];
        return c ? c.t : null;
      },
    };
  }
  if (grilla && typeof grilla.tipo === 'function' && grilla.ancho > 0 && grilla.alto > 0) {
    return { ancho: grilla.ancho, alto: grilla.alto, tipoEn: grilla.tipo };
  }
  throw new Error('transito: grilla inválida (se espera {N, C} o {ancho, alto, tipo(i, j)})');
}

// Largo de la corrida contigua de celdas transitables que contiene cada celda, en X o en Z.
function corridas(tr, ancho, alto, horizontal) {
  const len = new Int32Array(ancho * alto);
  const nFilas = horizontal ? alto : ancho;
  const nCols = horizontal ? ancho : alto;
  const idx = (f, k) => (horizontal ? f * ancho + k : k * ancho + f);
  for (let f = 0; f < nFilas; f++) {
    let k = 0;
    while (k < nCols) {
      if (!tr[idx(f, k)]) { k++; continue; }
      let e = k;
      while (e < nCols && tr[idx(f, e)]) e++;
      for (let q = k; q < e; q++) len[idx(f, q)] = e - k;
      k = e;
    }
  }
  return len;
}

// Asigna sentido a cada celda de carril. Cada banda (fila para eje Z, columna para eje X)
// se parte por su mediana (o por su centro si no hay mediana): el lado de mayor coordenada
// circula según mano derecha. La línea central no tiene sentido y no se usa.
function asignarSentidos(kind, dx, dz, avenida, ancho, alto, horizontal) {
  const kLane = horizontal ? K_EJE_X : K_EJE_Z;
  const nBandas = horizontal ? ancho : alto;
  const largo = horizontal ? alto : ancho;
  const idx = (b, k) => (horizontal ? k * ancho + b : b * ancho + k);
  for (let b = 0; b < nBandas; b++) {
    let k = 0;
    while (k < largo) {
      const kd0 = kind[idx(b, k)];
      if (kd0 !== kLane && kd0 !== K_MEDIANA) { k++; continue; }
      let e = k, sumaMed = 0, nMed = 0;
      while (e < largo) {
        const kd = kind[idx(b, e)];
        if (kd !== kLane && kd !== K_MEDIANA) break;
        if (kd === K_MEDIANA) { sumaMed += e; nMed++; }
        e++;
      }
      const centro = nMed ? sumaMed / nMed : (k + e - 1) / 2;
      const hayMediana = nMed > 0 ? 1 : 0;
      for (let q = k; q < e; q++) {
        const c = idx(b, q);
        if (kind[c] !== kLane) continue;
        const diff = q - centro;
        if (diff === 0) continue;
        if (horizontal) dx[c] = diff > 0 ? 1 : -1;     // +z (lado mayor) circula hacia +x
        else dz[c] = diff < 0 ? 1 : -1;                 // -x (lado menor) circula hacia +z
        avenida[c] = hayMediana;
      }
      k = e;
    }
  }
}

// Polilínea de un carril en coordenadas de celda, con longitud acumulada en metros.
function geometria(celdas, ancho, metrosPorCelda, offsetCeldas, dirX, dirZ) {
  const n = celdas.length;
  const m = Math.max(2, n);
  const xs = new Float64Array(m), zs = new Float64Array(m), cum = new Float64Array(m);
  for (let k = 0; k < m; k++) {
    const c = celdas[Math.min(k, n - 1)];
    const i = c % ancho, j = (c - i) / ancho;
    // Desplazamiento a la derecha del sentido de marcha (sólo carriles rectos).
    xs[k] = i + 0.5 - dirZ * offsetCeldas;
    zs[k] = j + 0.5 + dirX * offsetCeldas;
  }
  for (let k = 0; k + 1 < m; k++) {
    cum[k + 1] = cum[k] + Math.hypot(xs[k + 1] - xs[k], zs[k + 1] - zs[k]) * metrosPorCelda;
  }
  return { xs, zs, cum };
}

// Polilínea de un giro: centros de celda, sin desplazamiento lateral.
function geometriaCentros(celdas, ancho, metrosPorCelda) {
  return geometria(celdas, ancho, metrosPorCelda, 0, 0, 0);
}

export function crearRed(grilla, opciones = {}) {
  const o = {
    tipoCalzada: ['road', 'median'],     // tipos transitables por autos
    tipoMediana: 'median',               // mediana: separa sentidos y no se transita
    anchoMaximoCalle: 40,                // celdas: una banda más larga en X y Z es un cruce
    metrosPorCelda: 5,
    offsetLateralM: 0,                   // desplazamiento del carril hacia la derecha del sentido
    pesoRecto: 3,                        // peso de elegir seguir recto en un cruce
    pesoGiro: 1,                         // peso de doblar (no se usa la vuelta en U)
    limitesMS: { avenida: 16.7, calle: 8.3, giro: 4.2 },
    ...opciones,
  };
  const { ancho, alto, tipoEn } = normalizarGrilla(grilla);
  const N = ancho * alto;

  // 1) Transitabilidad: 0 no, 1 calzada, 2 mediana.
  const tr = new Uint8Array(N);
  for (let j = 0; j < alto; j++) {
    for (let i = 0; i < ancho; i++) {
      const t = tipoEn(i, j), idx = j * ancho + i;
      if (t === o.tipoMediana) tr[idx] = 2;
      else if (o.tipoCalzada.includes(t)) tr[idx] = 1;
    }
  }

  // 2) Clasificación: una celda es cruce si su corrida en X y en Z son largas
  //    (más que el ancho de una avenida); si sólo una es larga, es un carril de ese eje.
  const lenX = corridas(tr, ancho, alto, true);
  const lenZ = corridas(tr, ancho, alto, false);
  const kind = new Uint8Array(N);
  const dx = new Int8Array(N), dz = new Int8Array(N), avenida = new Uint8Array(N);
  for (let idx = 0; idx < N; idx++) {
    if (!tr[idx]) continue;
    const xLarga = lenX[idx] > o.anchoMaximoCalle, zLarga = lenZ[idx] > o.anchoMaximoCalle;
    if (xLarga && zLarga) kind[idx] = K_CRUCE;
    else if (tr[idx] === 2) kind[idx] = K_MEDIANA;
    else if (xLarga) kind[idx] = K_EJE_X;
    else if (zLarga) kind[idx] = K_EJE_Z;
    else kind[idx] = K_CRUCE;
  }

  // 3) Sentidos por mano derecha.
  asignarSentidos(kind, dx, dz, avenida, ancho, alto, false);
  asignarSentidos(kind, dx, dz, avenida, ancho, alto, true);

  // 4) Carriles rectos: cadenas de celdas contiguas con el mismo sentido.
  const esCarril = (c) => (kind[c] === K_EJE_X || kind[c] === K_EJE_Z) && (dx[c] !== 0 || dz[c] !== 0);
  const carriles = [];
  const carrilDeCelda = new Int32Array(N).fill(-1);
  for (let idx = 0; idx < N; idx++) {
    if (!esCarril(idx)) continue;
    const ddx = dx[idx], ddz = dz[idx];
    const i = idx % ancho, j = (idx - i) / ancho;
    const pi = i - ddx, pj = j - ddz;
    if (pi >= 0 && pi < ancho && pj >= 0 && pj < alto) {
      const p = pj * ancho + pi;
      if (esCarril(p) && dx[p] === ddx && dz[p] === ddz) continue;   // no es el inicio de la cadena
    }
    const celdas = [];
    let c = idx, ci = i, cj = j;
    for (;;) {
      celdas.push(c);
      carrilDeCelda[c] = carriles.length;
      const ni = ci + ddx, nj = cj + ddz;
      if (ni < 0 || ni >= ancho || nj < 0 || nj >= alto) break;
      const nc = nj * ancho + ni;
      if (!esCarril(nc) || dx[nc] !== ddx || dz[nc] !== ddz) break;
      c = nc; ci = ni; cj = nj;
    }
    const offCeldas = o.offsetLateralM / o.metrosPorCelda;
    const g = geometria(celdas, ancho, o.metrosPorCelda, offCeldas, ddx, ddz);
    carriles.push({
      id: carriles.length,
      tipo: avenida[idx] ? 'avenida' : 'calle',
      eje: ddx !== 0 ? 0 : 1,
      dirX: ddx,
      dirZ: ddz,
      celdas: Int32Array.from(celdas),
      celdasCruce: new Int32Array(0),
      jId: -1,
      xs: g.xs, zs: g.zs, cum: g.cum,
      largo: g.cum[g.cum.length - 1],
      limite: avenida[idx] ? o.limitesMS.avenida : o.limitesMS.calle,
      sucesores: [], pesos: [],
      predecesores: [],
    });
  }

  // 5) Componentes de cruce (4-conexas) para asignar un id de intersección.
  const jId = new Int32Array(N).fill(-1);
  let numCruces = 0;
  const pila = new Int32Array(N);
  for (let idx = 0; idx < N; idx++) {
    if (kind[idx] !== K_CRUCE || jId[idx] !== -1) continue;
    let top = 0;
    pila[top++] = idx; jId[idx] = numCruces;
    while (top > 0) {
      const c = pila[--top];
      const ci = c % ancho, cj = (c - ci) / ancho;
      for (const [sx, sz] of PASOS) {
        const ni = ci + sx, nj = cj + sz;
        if (ni < 0 || ni >= ancho || nj < 0 || nj >= alto) continue;
        const nc = nj * ancho + ni;
        if (kind[nc] === K_CRUCE && jId[nc] === -1) { jId[nc] = numCruces; pila[top++] = nc; }
      }
    }
    numCruces++;
  }

  // 6) Conexiones: desde el final de cada carril recto, BFS por celdas de cruce (sin vuelta en U)
  //    hasta el inicio de otro carril recto. Cada par (entrada, salida) es un carril de giro.
  const visto = new Int32Array(N * 4);
  const padre = new Int32Array(N * 4);
  const cola = new Int32Array(N * 4);
  let sello = 0;
  const giros = [];
  const numCarrilesRectos = carriles.length;
  for (let L = 0; L < numCarrilesRectos; L++) {
    const cL = carriles[L];
    const ult = cL.celdas[cL.celdas.length - 1];
    const ui = ult % ancho, uj = (ult - ui) / ancho;
    const ddx = cL.dirX, ddz = cL.dirZ;
    const ni = ui + ddx, nj = uj + ddz;
    if (ni < 0 || ni >= ancho || nj < 0 || nj >= alto) continue;
    const primera = nj * ancho + ni;
    if (kind[primera] !== K_CRUCE) continue;
    const dIn = PASOS.findIndex(([px, pz]) => px === ddx && pz === ddz);
    sello++;
    let h = 0, t = 0;
    const s0 = primera * 4 + dIn;
    visto[s0] = sello; padre[s0] = -1; cola[t++] = s0;
    const salidas = new Map();   // carril de salida -> estado del último cruce
    while (h < t) {
      const s = cola[h++];
      const c = s >> 2, tin = s & 3;
      const ci = c % ancho, cj = (c - ci) / ancho;
      for (let tt = 0; tt < 4; tt++) {
        if (tt === (tin + 2) % 4) continue;   // sin vuelta en U
        const [sx, sz] = PASOS[tt];
        const xi = ci + sx, xj = cj + sz;
        if (xi < 0 || xi >= ancho || xj < 0 || xj >= alto) continue;
        const nc = xj * ancho + xi;
        if (kind[nc] === K_CRUCE) {
          const ns = nc * 4 + tt;
          if (visto[ns] !== sello) { visto[ns] = sello; padre[ns] = s; cola[t++] = ns; }
        } else if (esCarril(nc) && dx[nc] === sx && dz[nc] === sz) {
          const S = carrilDeCelda[nc];
          if (!salidas.has(S)) salidas.set(S, s);
        }
      }
    }
    for (const [S, sEnd] of salidas) {
      const cS = carriles[S];
      if (cS.dirX * ddx + cS.dirZ * ddz < 0) continue;   // entra en sentido contrario
      const camino = [];
      for (let q = sEnd; q !== -1; q = padre[q]) camino.push(q >> 2);
      camino.reverse();
      const celdas = [ult, ...camino, cS.celdas[0]];
      const g = geometriaCentros(celdas, ancho, o.metrosPorCelda);
      const recto = cS.dirX === ddx && cS.dirZ === ddz;
      const giro = {
        id: numCarrilesRectos + giros.length,
        tipo: 'giro',
        eje: -1,
        dirX: 0,
        dirZ: 0,
        celdas: Int32Array.from(celdas),
        celdasCruce: Int32Array.from(camino),
        jId: jId[camino[0]],
        xs: g.xs, zs: g.zs, cum: g.cum,
        largo: g.cum[g.cum.length - 1],
        limite: o.limitesMS.giro,
        sucesores: [S], pesos: [recto ? o.pesoRecto : o.pesoGiro],
        predecesores: [L],
      };
      giros.push(giro);
      cL.sucesores.push(giro.id);
      cL.pesos.push(recto ? o.pesoRecto : o.pesoGiro);
      cS.predecesores.push(giro.id);
    }
  }
  const carrilesTodos = carriles.concat(giros);

  // 7) Pesos normalizados de elección y distancia a la salida más cercana (BFS inverso).
  for (const c of carrilesTodos) {
    c.sucesores = Int32Array.from(c.sucesores);
    c.pesosAcum = acumulado(c.pesos);
    c.predecesores = Int32Array.from(c.predecesores);
    delete c.pesos;
  }
  const distSalida = new Float64Array(carrilesTodos.length).fill(Infinity);
  const cola2 = [];
  for (const c of carrilesTodos) if (c.sucesores.length === 0) { distSalida[c.id] = 0; cola2.push(c.id); }
  for (let q = 0; q < cola2.length; q++) {
    const u = cola2[q];
    for (const p of carrilesTodos[u].predecesores) {
      if (distSalida[p] > distSalida[u] + 1) { distSalida[p] = distSalida[u] + 1; cola2.push(p); }
    }
  }
  for (const c of carrilesTodos) c.distSalida = distSalida[c.id];

  const entradas = carrilesTodos.filter((c) => c.predecesores.length === 0 && c.tipo !== 'giro').map((c) => c.id);
  const salidas = carrilesTodos.filter((c) => c.sucesores.length === 0).length;

  return {
    ancho,
    alto,
    metrosPorCelda: o.metrosPorCelda,
    carriles: carrilesTodos,
    entradas: Int32Array.from(entradas),
    numCruces,
    jId,
    kind,
    estadisticas: {
      carriles: carriles.length,
      giros: giros.length,
      entradas: entradas.length,
      salidas,
      cruces: numCruces,
    },
  };
}

