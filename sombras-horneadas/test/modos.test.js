import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modoSombraValido, terrenoProyecta, entidadesProyectan, solIncluyeEntidades, solHorneadoActivo } from '../src/modos.js';

test('modo inválido cae en baked', () => {
  assert.equal(modoSombraValido('xxx'), 'baked');
  assert.equal(modoSombraValido(undefined), 'baked');
  assert.equal(modoSombraValido('mixto'), 'mixto');
});

test('reglas por modo', () => {
  assert.equal(terrenoProyecta('realtime'), true);
  assert.equal(terrenoProyecta('mixto'), false);
  assert.equal(entidadesProyectan('baked'), false);
  assert.equal(entidadesProyectan('mixto'), true);
  assert.equal(solIncluyeEntidades('baked'), true);
  assert.equal(solIncluyeEntidades('mixto'), false);
  assert.equal(solHorneadoActivo('realtime'), false);
  assert.equal(solHorneadoActivo('baked'), true);
});
