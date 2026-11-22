import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCrudRouter, normalizarCampos } from '../src/index.js';
import { crearKnex, ssoMock, CAMPOS } from './helpers/entorno.js';

const base = () => ({ knex: crearKnex(), sso: ssoMock(), recurso: 'productos', tabla: 'productos', campos: CAMPOS });

test('falla si falta knex', () => {
  const { knex, ...resto } = base();
  assert.throws(() => createCrudRouter(resto), /"knex" es obligatoria/);
});

test('falla si falta sso o no expone requirePermission', () => {
  const { sso, ...resto } = base();
  assert.throws(() => createCrudRouter(resto), /"sso" es obligatoria/);
  assert.throws(() => createCrudRouter({ ...base(), sso: {} }), /"sso" es obligatoria/);
});

test('falla si falta recurso o tiene caracteres inválidos', () => {
  const { recurso, ...resto } = base();
  assert.throws(() => createCrudRouter(resto), /"recurso" es obligatoria/);
  assert.throws(() => createCrudRouter({ ...base(), recurso: 'pro ductos' }), /"recurso" es obligatoria/);
});

test('falla si falta tabla o es un nombre inválido', () => {
  const { tabla, ...resto } = base();
  assert.throws(() => createCrudRouter(resto), /"tabla" es obligatoria/);
  assert.throws(() => createCrudRouter({ ...base(), tabla: 'productos; drop' }), /"tabla" es obligatoria/);
});

test('falla si falta campos o está vacío', () => {
  const { campos, ...resto } = base();
  assert.throws(() => createCrudRouter(resto), /"campos" debe ser un array/);
  assert.throws(() => createCrudRouter({ ...base(), campos: [] }), /"campos" debe ser un array/);
});

test('valida definiciones de campos', () => {
  assert.throws(() => normalizarCampos([{ field: 'a-b', headerName: 'x', type: 'text' }]), /field inválido/);
  assert.throws(() => normalizarCampos([{ field: 'a', type: 'text' }]), /headerName es obligatorio/);
  assert.throws(() => normalizarCampos([{ field: 'a', headerName: 'A', type: 'foo' }]), /type debe ser/);
  assert.throws(() => normalizarCampos([{ field: 'a', headerName: 'A', type: 'select' }]), /requiere "options"/);
  assert.throws(() => normalizarCampos([
    { field: 'a', headerName: 'A', type: 'text' },
    { field: 'a', headerName: 'B', type: 'text' },
  ]), /campo duplicado/);
});

test('normaliza defaults de form_type y flags', () => {
  const [n] = normalizarCampos([{ field: 'precio', headerName: 'Precio', type: 'number' }]);
  assert.equal(n.form_type, 'number');
  assert.equal(n.writable, true);
  assert.equal(n.required, false);
  assert.equal(n.sortable, false);
});

test('falla si soloLectura, pk, hooks o logger son inválidos', () => {
  assert.throws(() => createCrudRouter({ ...base(), soloLectura: 'si' }), /soloLectura/);
  assert.throws(() => createCrudRouter({ ...base(), pk: 'id; x' }), /"pk"/);
  assert.throws(() => createCrudRouter({ ...base(), hooks: { antesFoo: () => {} } }), /hook desconocido/);
  assert.throws(() => createCrudRouter({ ...base(), logger: {} }), /logger/);
});
