import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avanzarFase, estadoDe, poseMuerte, muertoOculto, poseCadaver, suavizar, ANIMACION, VIDA_CADAVER_S } from '../src/animacion/poses.js';

test('avanzarFase: fuerza y avance como en el juego', () => {
  const r = avanzarFase(0, 8, 0.1);
  assert.equal(r.fuerza, 1);
  assert.ok(Math.abs(r.fase - 1) < 1e-12);          // 0.1 * (4 + 6)
  assert.deepEqual(avanzarFase(0, 0.01, 1).fase, 0); // por debajo del umbral, quieto
  assert.equal(avanzarFase(0, 100, 0.1).fuerza, 1); // acotado
});

test('estadoDe respeta la prioridad muerto > agachado > correr > caminar > quieto', () => {
  assert.equal(estadoDe({ muerto: true, agachado: true, corriendo: true, velocidad: 9 }), 'muerto');
  assert.equal(estadoDe({ agachado: true, corriendo: true }), 'agachado');
  assert.equal(estadoDe({ corriendo: true, velocidad: 9 }), 'correr');
  assert.equal(estadoDe({ velocidad: 2 }), 'caminar');
  assert.equal(estadoDe({}), 'quieto');
});

test('poseMuerte: cae y gira en 0.5 s, luego se queda', () => {
  const a = poseMuerte(0, 4), b = poseMuerte(0.5, 4), c = poseMuerte(3, 4);
  assert.equal(a.giro, 0); assert.equal(a.caida, 0);
  assert.ok(Math.abs(b.giro - Math.PI * 0.35) < 1e-12);
  assert.ok(Math.abs(b.caida - 4 * 0.4) < 1e-12);
  assert.deepEqual(c, b);
  assert.equal(muertoOculto(9.9), false);
  assert.equal(muertoOculto(10), true);
});

test('poseCadaver: caída ease-out, tendido, hundimiento y fin de vida', () => {
  assert.equal(poseCadaver(0).angulo, 0);
  assert.ok(Math.abs(poseCadaver(0.5).angulo - Math.PI / 2) < 1e-12);
  assert.equal(poseCadaver(5).hundimiento, 0);
  assert.equal(poseCadaver(14).hundimiento, 1);
  assert.equal(poseCadaver(13.9).terminado, false);
  assert.equal(poseCadaver(VIDA_CADAVER_S).terminado, true);
});

test('suavizar converge hacia el objetivo', () => {
  let v = 0;
  for (let i = 0; i < 100; i++) v = suavizar(v, 1, 0.1, ANIMACION.TASA_AGACHAR);
  assert.ok(Math.abs(v - 1) < 1e-6);
});
