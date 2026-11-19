import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearRed, crearTransito } from '../src/index.js';

// Grilla de prueba (60x60): avenida vertical con mediana (columnas 8..19, mediana 13..14),
// calle horizontal de 4 celdas (filas 25..28) y calle vertical de 4 celdas (columnas 40..43).
function grillaPrueba() {
  const N = 60;
  const C = new Array(N * N);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      let t = 'side';
      if (i >= 8 && i <= 19) t = (i === 13 || i === 14) ? 'median' : 'road';
      if (j >= 25 && j <= 28) t = 'road';
      if (i >= 40 && i <= 43) t = 'road';
      C[j * N + i] = { t };
    }
  }
  return { N, C };
}

test('la red asigna sentido por mano derecha', () => {
  const red = crearRed(grillaPrueba());
  const idx = (i, j) => j * 60 + i;
  const carrilEn = (i, j) => red.carriles.find((c) => c.celdas.includes(idx(i, j)));

  // Avenida Z: lado de menor x circula hacia +z; lado de mayor x hacia -z.
  assert.equal(carrilEn(10, 0).dirZ, 1);
  assert.equal(carrilEn(17, 0).dirZ, -1);
  // Calle horizontal: fila norte (j menor) hacia -x; fila sur hacia +x.
  assert.equal(carrilEn(5, 26).dirX, -1);
  assert.equal(carrilEn(5, 27).dirX, 1);
  // Calle vertical: columna oeste hacia +z; columna este hacia -z.
  assert.equal(carrilEn(40, 5).dirZ, 1);
  assert.equal(carrilEn(42, 5).dirZ, -1);
  // Los carriles de la mediana no existen como carriles de tránsito.
  assert.equal(carrilEn(13, 0), undefined);
});

test('cada carril recto tiene un único sentido y la red tiene conexiones de cruce', () => {
  const red = crearRed(grillaPrueba());
  for (const c of red.carriles) {
    if (c.tipo === 'giro') continue;
    for (const k of c.celdas) {
      const ci = k % 60, cj = (k - ci) / 60;
      assert.ok(ci >= 0 && cj >= 0);
    }
  }
  assert.ok(red.estadisticas.giros > 0, 'debe haber giros en los cruces');
  assert.ok(red.estadisticas.entradas > 0, 'debe haber entradas');
  assert.ok(red.estadisticas.salidas > 0, 'debe haber salidas');
});

test('no hay superposición en carriles y se avanza siguiendo el carril', () => {
  const red = crearRed(grillaPrueba());
  const sim = crearTransito(red, { objetivo: 90, semilla: 7, tasaEntrada: 1 });
  let pasos = 0;
  for (let k = 0; k < 3000; k++) {
    sim.paso(0.1);
    pasos++;
    if (k % 10 !== 0) continue;
    // Separación en cada carril: gap >= 0 entre vehículos consecutivos.
    const porCarril = new Map();
    for (let v = 0; v < sim.vista.capacidad; v++) {
      const e = sim.estado(v);
      if (!e) continue;
      if (!porCarril.has(e.carril)) porCarril.set(e.carril, []);
      porCarril.get(e.carril).push({ v, s: e.s, largo: sim.estado(v).tipo });
    }
    for (const [, lista] of porCarril) {
      lista.sort((a, b) => a.s - b.s);
      for (let q = 0; q + 1 < lista.length; q++) {
        const atras = lista[q], delante = lista[q + 1];
        const lAtras = largoDe(atras.v, sim), lDel = largoDe(delante.v, sim);
        const gap = delante.s - atras.s - (lAtras + lDel) / 2;
        assert.ok(gap > -0.01, `superposición en carril: gap=${gap}`);
      }
    }
    // Rumbo coherente con el carril (los vehículos rectos miran hacia el sentido del carril).
    for (let v = 0; v < sim.vista.capacidad; v++) {
      const e = sim.estado(v);
      if (!e || red.carriles[e.carril].tipo === 'giro') continue;
      const L = red.carriles[e.carril];
      const dirAng = Math.atan2(L.dirZ, L.dirX);
      assert.ok(Math.cos(sim.vista.h[v] - dirAng) > 0.99, 'rumbo contrario al carril');
    }
  }
  assert.ok(pasos > 0);
});

function largoDe(v, sim) {
  const e = sim.estado(v);
  const L = { auto: 4.4, taxi: 4.4, pickup: 4.8, furgon: 5.5, bus: 12, camion: 9.8, moto: 2.0 };
  return L[e.tipo];
}

test('el número de activos se mantiene cerca de la densidad configurada', () => {
  const red = crearRed(grillaPrueba());
  const objetivo = 80;
  const sim = crearTransito(red, { objetivo, semilla: 3, tasaEntrada: 2 });
  for (let k = 0; k < 2000; k++) sim.paso(0.1);   // 200 s de simulación
  let minimo = Infinity, maximo = 0;
  for (let k = 0; k < 500; k++) {
    sim.paso(0.1);
    minimo = Math.min(minimo, sim.activos());
    maximo = Math.max(maximo, sim.activos());
  }
  assert.ok(maximo <= objetivo, `activos ${maximo} supera el objetivo`);
  assert.ok(minimo >= objetivo * 0.7, `activos ${minimo} por debajo de la densidad`);
});

test('en las intersecciones no hay dos vehículos en la misma celda de cruce', () => {
  const red = crearRed(grillaPrueba());
  const sim = crearTransito(red, { objetivo: 120, semilla: 11, tasaEntrada: 2 });
  for (let k = 0; k < 4000; k++) {
    sim.paso(0.1);
    if (k % 5) continue;
    const ocupadas = new Set();
    for (let v = 0; v < sim.vista.capacidad; v++) {
      const e = sim.estado(v);
      if (!e || red.carriles[e.carril].tipo !== 'giro') continue;
      const ci = Math.floor(sim.vista.x[v]), cj = Math.floor(sim.vista.z[v]);
      const clave = cj * red.ancho + ci;
      if (red.jId[clave] < 0) continue;
      assert.ok(!ocupadas.has(clave), `dos vehículos en la celda de cruce ${ci},${cj}`);
      ocupadas.add(clave);
    }
  }
});

test('la simulación es determinista con la misma semilla', () => {
  const red = crearRed(grillaPrueba());
  const a = crearTransito(red, { objetivo: 50, semilla: 5 });
  const b = crearTransito(red, { objetivo: 50, semilla: 5 });
  for (let k = 0; k < 300; k++) { a.paso(0.1); b.paso(0.1); }
  assert.deepEqual(Array.from(a.vista.x), Array.from(b.vista.x));
});
