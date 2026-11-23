import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textosEntidad, camposDeFormulario, valoresIniciales, cambiosRespecto } from '../src/logica.js';

const campos = [
  { nombre: 'nombre', publicable: true },
  { nombre: 'telefono', publicable: true, interruptor: 'mostrar_telefono' },
  { nombre: 'nota_interna', editable: false },
];

test('textos por defecto usan negocio', () => {
  assert.equal(textosEntidad().titulo, 'Negocio');
  assert.equal(textosEntidad({ singular: 'tienda', plural: 'tiendas' }).sinDatos, 'Todavía no completaste tu tienda.');
});

test('camposDeFormulario excluye no editables y asigna interruptor por defecto', () => {
  const f = camposDeFormulario(campos);
  assert.deepEqual(f.map((c) => c.nombre), ['nombre', 'telefono']);
  assert.equal(f[0].interruptor, 'mostrar_nombre');
  assert.equal(f[1].interruptor, 'mostrar_telefono');
});

test('valoresIniciales arranca interruptores apagados', () => {
  const v = valoresIniciales(campos);
  assert.equal(v.mostrar_nombre, false);
  assert.equal(v.mostrar_telefono, false);
  assert.equal(v.nombre, '');
});

test('cambiosRespecto envía sólo lo modificado', () => {
  const original = { nombre: 'Ana', mostrar_nombre: false };
  assert.deepEqual(cambiosRespecto(original, { nombre: 'Ana', mostrar_nombre: true }), { mostrar_nombre: true });
  assert.deepEqual(cambiosRespecto(original, { ...original }), {});
});
