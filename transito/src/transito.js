// @greenborn/transito - simulador de tránsito sobre una red creada con crearRed().
//
// - Pool de vehículos de capacidad fija (slots reutilizables, sin allocaciones por frame).
// - Cada carril guarda sus vehículos en una lista intrusiva ordenada por posición
//   (cabeza = el más adelantado). El "vecino de adelante" es O(1); no hay búsquedas O(n^2).
// - Car-following IDM (Treiber) contra el vehículo de adelante del mismo carril.
//   Como red de seguridad, la posición se limita para no superponerse nunca.
// - Intersecciones: reserva de celdas de cruce. Un vehículo sólo entra al giro si
//   reserva TODAS sus celdas (todo o nada, así no hay interbloqueo por espera
//   parcial). Quien llega primero tiene prioridad; si llegan casi juntos, tiene prioridad
//   quien viene por la derecha.
//
// Unidades: posiciones en metros a lo largo del carril; x, z de salida en coordenadas de celda.

import { mulberry32, acumulado, elegirPorPeso } from './util.js';

// Tipos de vehículo por defecto. Las claves coinciden con VEH_TIPOS del mapa (auto, taxi,
// pickup, furgon, bus, camion, moto) para que el mapa pueda indexar sus modelos por nombre.
// largo en metros, vMax en m/s, peso relativo al elegir tipo al spawnear.
export const TIPOS_VEHICULO = Object.freeze({
  auto:   { largo: 4.4,  vMax: 11,   peso: 200 },
  taxi:   { largo: 4.4,  vMax: 11.5, peso: 100 },
  pickup: { largo: 4.8,  vMax: 10,   peso: 60 },
  furgon: { largo: 5.5,  vMax: 9.5,  peso: 60 },
  bus:    { largo: 12,   vMax: 8,    peso: 40 },
  camion: { largo: 9.8,  vMax: 8.5,  peso: 40 },
  moto:   { largo: 2.0,  vMax: 13,   peso: 160 },
});

// Parámetros IDM por defecto (aceleración máx., desaceleración cómoda, tiempo de seguridad, distancia mínima).
const IDM_POR_DEFECTO = { a: 1.5, b: 2.0, T: 1.2, s0: 2.0 };

export function crearTransito(red, opciones = {}) {
  const o = {
    capacidad: 800,              // slots del pool (máximo de vehículos simultáneos)
    objetivo: 150,               // vehículos activos que se intenta mantener
    tasaEntrada: 0.5,            // entradas por segundo como máximo
    semilla: 1,
    tipos: TIPOS_VEHICULO,
    vidaMax: 240,                // s: después, al elegir cruce se prefiere la salida más corta
    subpasoMax: 0.05,            // s: paso interno máximo (estabilidad de IDM)
    umbralFrenadoM: 40,          // m antes del cruce desde los que se pide reserva
    separacionEntradaM: 1,       // m mínimos al entrar a un carril junto al último vehículo
    pesoEntrada: (carril) => (carril.tipo === 'avenida' ? 2 : 1),
    ...opciones,
  };
  const C = o.capacidad;
  const carriles = red.carriles;
  const NL = carriles.length;
  const nombres = Object.keys(o.tipos);
  const PARAM = nombres.map((k) => ({ ...IDM_POR_DEFECTO, ...o.tipos[k] }));
  const acumTipo = acumulado(nombres.map((k) => o.tipos[k].peso ?? 1));
  const rnd = mulberry32(o.semilla);

  const entradas = red.entradas.length
    ? Array.from(red.entradas)
    : carriles.filter((c) => c.tipo !== 'giro').map((c) => c.id);
  const acumEntrada = acumulado(entradas.map((id) => o.pesoEntrada(carriles[id])));

  // Estado por vehículo (índice = slot).
  const activo = new Uint8Array(C);
  const tipo = new Uint8Array(C);
  const carril = new Int32Array(C).fill(-1);
  const detras = new Int32Array(C).fill(-1);   // vecino más atrás en el mismo carril
  const delante = new Int32Array(C).fill(-1);  // vecino más adelante en el mismo carril
  const siguiente = new Int32Array(C).fill(-1); // carril al que pasa al terminar el actual
  const reserva = new Uint8Array(C);           // 1 = tiene reservadas las celdas de su giro
  const enCola = new Uint8Array(C);            // 1 = espera reserva en un cruce
  const seg = new Int32Array(C);               // segmento de polilínea (puntero monótono)
  const visto = new Int32Array(C);             // sello de "ya procesado en este subpaso"
  const s = new Float64Array(C), vel = new Float64Array(C), acc = new Float64Array(C);
  const largo = new Float64Array(C), edad = new Float64Array(C);
  const llegada = new Float64Array(C);
  const ex = new Float64Array(C), ez = new Float64Array(C);     // punto de llegada a la cola
  const edx = new Float64Array(C), edz = new Float64Array(C);   // sentido de llegada
  const cabeza = new Int32Array(NL).fill(-1);  // vehículo más adelantado del carril
  const cola = new Int32Array(NL).fill(-1);    // vehículo más atrasado del carril
  const libres = new Int32Array(C);
  for (let k = 0; k < C; k++) libres[k] = C - 1 - k;
  let nLibres = C;
  const owner = new Int32Array(red.ancho * red.alto).fill(-1);  // celda de cruce -> vehículo
  const bloqueo = new Int32Array(red.ancho * red.alto);
  let sello = 0;
  const colas = Array.from({ length: red.numCruces }, () => []);

  // Vista para el mapa: posiciones y rumbo por slot (se actualiza en paso()).
  const vista = {
    capacidad: C,
    nombres,
    x: new Float64Array(C),
    z: new Float64Array(C),
    h: new Float64Array(C),
    tipo: new Uint8Array(C),
    activo: new Uint8Array(C),
  };

  let activos = 0, tiempo = 0, fichas = 0, ciclo = 0;
  const rec = { id: 0, tipo: '', x: 0, z: 0, h: 0, activo: false };

  // ---- Lista intrusiva por carril ----
  function insertar(v, L) {
    const t = cola[L];
    detras[v] = -1;
    delante[v] = t;
    if (t >= 0) detras[t] = v; else cabeza[L] = v;
    cola[L] = v;
    carril[v] = L;
  }
  function quitar(v) {
    const L = carril[v];
    const d = detras[v], a = delante[v];
    if (a >= 0) detras[a] = d; else cabeza[L] = d;
    if (d >= 0) delante[d] = a; else cola[L] = a;
    detras[v] = delante[v] = -1;
    carril[v] = -1;
  }

  // ---- Elección de carril siguiente ----
  function elegirSucesor(L, v) {
    const sc = carriles[L].sucesores;
    if (sc.length === 0) return -1;
    if (sc.length === 1) return sc[0];
    if (edad[v] > o.vidaMax) {
      let mejor = sc[0];
      for (const c of sc) if (carriles[c].distSalida < carriles[mejor].distSalida) mejor = c;
      return mejor;
    }
    return sc[elegirPorPeso(carriles[L].pesosAcum, rnd())];
  }

  // ---- Reserva de cruces ----
  function celdasReservadas(v) {
    const L = carriles[carril[v]];
    return L.tipo === 'giro' ? L.celdasCruce : carriles[siguiente[v]].celdasCruce;
  }
  function liberarCeldas(v, celdas) {
    for (let k = 0; k < celdas.length; k++) if (owner[celdas[k]] === v) owner[celdas[k]] = -1;
  }
  function antes(a, b) {
    const dt = llegada[a] - llegada[b];
    if (Math.abs(dt) > 0.5) return dt < 0;
    if (deLaDerecha(b, a)) return false;   // b viene por la derecha de a: b va primero
    if (deLaDerecha(a, b)) return true;
    return dt <= 0;
  }
  // true si b está a la derecha del sentido de llegada de a (mano derecha: b tiene prioridad).
  function deLaDerecha(a, b) {
    const rx = -edz[a], rz = edx[a];
    return (ex[b] - ex[a]) * rx + (ez[b] - ez[a]) * rz > 0;
  }
  function encolar(v, jid) {
    const L = carriles[carril[v]];
    const last = L.xs.length - 1;
    ex[v] = L.xs[last]; ez[v] = L.zs[last];
    edx[v] = L.dirX; edz[v] = L.dirZ;
    llegada[v] = tiempo;
    enCola[v] = 1;
    const q = colas[jid];
    q.push(v);
    let k = q.length - 1;
    while (k > 0 && antes(v, q[k - 1])) { q[k] = q[k - 1]; k--; }
    q[k] = v;
  }
  function quitarDeCola(v) {
    if (!enCola[v]) return;
    enCola[v] = 0;
    const q = colas[carriles[siguiente[v]].jId];
    const k = q.indexOf(v);
    if (k >= 0) q.splice(k, 1);
  }
  // Otorga reservas por cola: en orden de llegada; un vehículo bloqueado impide a los que
  // comparten celdas (FIFO también para los conflictos). Todo o nada.
  function otorgar() {
    for (const q of colas) {
      if (q.length === 0) continue;
      sello++;
      let w = 0;
      for (let r = 0; r < q.length; r++) {
        const v = q[r];
        const celdas = carriles[siguiente[v]].celdasCruce;
        let libre = true;
        for (let k = 0; k < celdas.length; k++) {
          const c = celdas[k];
          if (owner[c] !== -1 || bloqueo[c] === sello) { libre = false; break; }
        }
        if (libre) {
          for (let k = 0; k < celdas.length; k++) owner[celdas[k]] = v;
          reserva[v] = 1;
          enCola[v] = 0;
        } else {
          for (let k = 0; k < celdas.length; k++) bloqueo[celdas[k]] = sello;
          q[w++] = v;
        }
      }
      q.length = w;
    }
  }

  // ---- Car-following ----
  function idm(v, vDeseada, gap, vLider, P) {
    const dv = v - vLider;
    const sStar = P.s0 + Math.max(0, v * P.T + (v * dv) / (2 * Math.sqrt(P.a * P.b)));
    const g = gap > 0.01 ? gap : 0.01;
    return P.a * (1 - Math.pow(v / vDeseada, 4) - (sStar / g) * (sStar / g));
  }
  function calcularAceleracion(v) {
    const L = carriles[carril[v]];
    const P = PARAM[tipo[v]];
    const vDeseada = Math.min(P.vMax, L.limite);
    let a = P.a * (1 - Math.pow(vel[v] / vDeseada, 4));   // carretera libre
    const lider = delante[v];
    if (lider >= 0) {
      const gap = s[lider] - s[v] - (largo[lider] + largo[v]) / 2;
      a = Math.min(a, idm(vel[v], vDeseada, gap, vel[lider], P));
    }
    // Línea de frenado virtual si no tiene reserva para el giro siguiente.
    const sg = siguiente[v];
    if (!reserva[v] && sg >= 0 && carriles[sg].tipo === 'giro') {
      const dEnd = L.largo - s[v];
      if (dEnd <= o.umbralFrenadoM) a = Math.min(a, idm(vel[v], vDeseada, dEnd, 0, P));
    }
    return a;
  }

  // Avanza un vehículo (ya se procesó su líder en este subpaso). Devuelve nada.
  function avanzar(v, h) {
    visto[v] = ciclo;
    const L = carril[v];
    const Lo = carriles[L];
    const lider = delante[v];
    let vn = vel[v] + acc[v] * h;
    if (vn < 0) vn = 0;
    let sn = s[v] + 0.5 * (vel[v] + vn) * h;
    if (lider >= 0) {
      const tope = s[lider] - (largo[lider] + largo[v]) / 2;
      if (sn > tope) { sn = tope; if (vn > vel[lider]) vn = vel[lider]; }
      if (sn < s[v]) sn = s[v];
    }
    s[v] = sn;
    vel[v] = vn;
    if (sn < Lo.largo) return;

    const nx = siguiente[v];
    if (nx < 0) {                                  // salida de la red
      quitarDeCola(v);
      quitar(v);
      liberar(v);
      return;
    }
    const Ln = carriles[nx];
    if (Ln.tipo === 'giro' && !reserva[v]) { s[v] = Lo.largo; vel[v] = 0; return; }
    const exceso = sn - Lo.largo;
    const tn = cola[nx];
    if (tn >= 0 && s[tn] - exceso - (largo[tn] + largo[v]) / 2 < o.separacionEntradaM) {
      s[v] = Lo.largo; vel[v] = 0; return;     // espera a que se libere el inicio del carril siguiente
    }
    if (Lo.tipo === 'giro') {                      // al salir de un giro se liberan sus celdas
      liberarCeldas(v, Lo.celdasCruce);
      reserva[v] = 0;
    }
    quitar(v);
    insertar(v, nx);
    s[v] = exceso;
    seg[v] = 0;
    siguiente[v] = elegirSucesor(nx, v);
    visto[v] = ciclo;                              // no volver a procesarlo en este subpaso
  }

  function liberar(v) {
    activo[v] = 0;
    activos--;
    libres[nLibres++] = v;
    reserva[v] = 0;
    enCola[v] = 0;
    carril[v] = -1;
  }

  function elegirTipo() {
    return elegirPorPeso(acumTipo, rnd());
  }
  function elegirEntrada() {
    if (entradas.length === 0) return -1;
    return entradas[elegirPorPeso(acumEntrada, rnd())];
  }

  function crearVehiculo(tipoNombre) {
    if (nLibres === 0) return -1;
    const L = elegirEntrada();
    if (L < 0) return -1;
    const k = tipoNombre !== undefined ? nombres.indexOf(tipoNombre) : elegirTipo();
    if (k < 0) return -1;
    const P = PARAM[k];
    const t = cola[L];
    if (t >= 0 && s[t] - (largo[t] + P.largo) / 2 < o.separacionEntradaM) return -1;
    const v = libres[--nLibres];
    activo[v] = 1;
    tipo[v] = k;
    largo[v] = P.largo;
    s[v] = 0;
    vel[v] = 0.7 * Math.min(P.vMax, carriles[L].limite);
    seg[v] = 0;
    edad[v] = 0;
    reserva[v] = 0;
    enCola[v] = 0;
    insertar(v, L);
    siguiente[v] = elegirSucesor(L, v);
    activos++;
    return v;
  }

  // ---- Paso de simulación ----
  function subpaso(h) {
    tiempo += h;
    ciclo++;

    // 1) Entradas hasta el objetivo, a la tasa configurada.
    fichas = Math.min(fichas + o.tasaEntrada * h, 2);
    while (fichas >= 1 && activos < o.objetivo) {
      if (crearVehiculo() < 0) break;
      fichas -= 1;
    }

    // 2) Quienes se acercan a un cruce sin reserva se encolan.
    for (let v = 0; v < C; v++) {
      if (!activo[v] || reserva[v] || enCola[v]) continue;
      const sg = siguiente[v];
      if (sg < 0 || carriles[sg].tipo !== 'giro') continue;
      const dEnd = carriles[carril[v]].largo - s[v];
      if (dEnd <= o.umbralFrenadoM) encolar(v, carriles[sg].jId);
    }
    otorgar();

    // 3) Aceleraciones con el estado del inicio del subpaso.
    for (let v = 0; v < C; v++) if (activo[v]) acc[v] = calcularAceleracion(v);

    // 4) Integración: por carril, de la cabeza a la cola (el líder se mueve antes).
    for (let L = 0; L < NL; L++) {
      let v = cabeza[L];
      while (v >= 0) {
        const siguienteEnLinea = detras[v];
        if (visto[v] !== ciclo) avanzar(v, h);
        v = siguienteEnLinea;
      }
    }

    // 5) Edad.
    for (let v = 0; v < C; v++) if (activo[v]) edad[v] += h;
  }

  function actualizarVista() {
    for (let v = 0; v < C; v++) {
      vista.activo[v] = activo[v];
      if (!activo[v]) continue;
      vista.tipo[v] = tipo[v];
      const Lo = carriles[carril[v]];
      const xs = Lo.xs, zs = Lo.zs, cum = Lo.cum;
      const ult = xs.length - 1;
      let k = seg[v];
      while (k < ult - 1 && cum[k + 1] <= s[v]) k++;
      seg[v] = k;
      const len = cum[k + 1] - cum[k];
      const f = len > 0 ? Math.min(1, Math.max(0, (s[v] - cum[k]) / len)) : 0;
      vista.x[v] = xs[k] + (xs[k + 1] - xs[k]) * f;
      vista.z[v] = zs[k] + (zs[k + 1] - zs[k]) * f;
      const sx = xs[k + 1] - xs[k], sz = zs[k + 1] - zs[k];
      if (sx !== 0 || sz !== 0) vista.h[v] = Math.atan2(sz, sx);
      else if (Lo.dirX !== 0 || Lo.dirZ !== 0) vista.h[v] = Math.atan2(Lo.dirZ, Lo.dirX);
    }
  }

  return {
    // Avanza la simulación dt segundos (se subdivide en pasos cortos).
    paso(dt) {
      if (!(dt > 0)) return;
      const n = Math.max(1, Math.ceil(dt / o.subpasoMax));
      const h = dt / n;
      for (let k = 0; k < n; k++) subpaso(h);
      actualizarVista();
    },
    // Crea un vehículo en una entrada de la red. Devuelve su id (slot) o -1 si no hay lugar.
    crearVehiculo(tipoNombre) {
      const v = crearVehiculo(tipoNombre);
      if (v >= 0) { actualizarVista(); }
      return v;
    },
    // Quita un vehículo activo.
    eliminar(v) {
      if (!activo[v]) return false;
      if (enCola[v]) quitarDeCola(v);
      if (reserva[v]) liberarCeldas(v, celdasReservadas(v));
      quitar(v);
      liberar(v);
      vista.activo[v] = 0;
      return true;
    },
    // Itera vehículos con {id, tipo, x, z, h, activo}. El objeto se reutiliza entre iteraciones.
    // Por defecto recorre todos los slots (los inactivos llegan con activo=false).
    *vehiculos({ soloActivos = false } = {}) {
      for (let v = 0; v < C; v++) {
        if (soloActivos && !activo[v]) continue;
        rec.id = v;
        rec.activo = activo[v] === 1;
        rec.tipo = activo[v] ? nombres[tipo[v]] : '';
        rec.x = vista.x[v];
        rec.z = vista.z[v];
        rec.h = vista.h[v];
        yield rec;
      }
    },
    // Arrays por slot: x, z (celdas), h (radianes), tipo (índice en vista.nombres), activo.
    vista,
    activos: () => activos,
    tiempo: () => tiempo,
    get objetivo() { return o.objetivo; },
    set objetivo(n) { o.objetivo = n; },
    // Información de depuración y pruebas.
    estado(v) {
      if (!activo[v]) return null;
      return { tipo: nombres[tipo[v]], carril: carril[v], s: s[v], v: vel[v], siguiente: siguiente[v], reserva: reserva[v] === 1 };
    },
    carrilDe: (v) => (activo[v] ? carril[v] : -1),
    vecinoDeAdelante: (v) => (activo[v] ? delante[v] : -1),
  };
}
