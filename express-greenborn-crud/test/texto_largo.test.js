import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import express from 'express';
import { createCrudRouter, normalizarCampos, camposPublicos } from '../src/index.js';
import { ssoMock, crearKnex, loggerEspia } from './helpers/entorno.js';

const TODOS = 'notas.listar,notas.ver,notas.crear,notas.editar,notas.eliminar';
let knex;

const CAMPOS_NOTAS = [
  { field: 'titulo', headerName: 'Título', type: 'text', sortable: true, filterable: true, searchable: true, required: true },
  { field: 'cuerpo', headerName: 'Cuerpo', type: 'text', form_type: 'textarea', filas: 6, maxLength: 500 },
  { field: 'ficha', headerName: 'Ficha', type: 'text', form_type: 'markdown' },
];

function crearAppTexto(opciones) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    const cabecera = req.headers['x-permisos'];
    if (cabecera !== undefined) req.user = { id: 1, permisos: cabecera === '' ? [] : cabecera.split(',') };
    next();
  });
  app.use('/api/notas', createCrudRouter({ campos: CAMPOS_NOTAS, logger: loggerEspia(), ...opciones }));
  return app;
}

beforeEach(async () => {
  knex = crearKnex();
  await knex.schema.createTable('notas', (t) => {
    t.increments('id');
    t.string('titulo').notNullable();
    t.text('cuerpo');
    t.text('ficha');
    t.integer('orden');
  });
});

afterEach(async () => {
  await knex.destroy();
});

const app = () => crearAppTexto({ knex, sso: ssoMock(), recurso: 'notas', tabla: 'notas' });

test('textarea y markdown aparecen en fields_def con filas (default 4) y maxLength', async () => {
  const res = await request(app()).get('/api/notas/list').set('x-permisos', TODOS);
  assert.equal(res.status, 200);
  const cuerpo = res.body.data.fields_def.find((d) => d.field === 'cuerpo');
  assert.equal(cuerpo.form_type, 'textarea');
  assert.equal(cuerpo.filas, 6);
  assert.equal(cuerpo.maxLength, 500);
  const ficha = res.body.data.fields_def.find((d) => d.field === 'ficha');
  assert.equal(ficha.form_type, 'markdown');
  assert.equal(ficha.filas, undefined);
  assert.equal(ficha.maxLength, undefined);
});

test('textarea sin filas usa el default 4 (fields_def)', () => {
  const [n] = normalizarCampos([{ field: 'x', headerName: 'X', type: 'text', form_type: 'textarea' }]);
  assert.equal(n.filas, 4);
  assert.equal(camposPublicos([n])[0].filas, 4);
});

test('maxLength: longitud mayor da 400 con errors por campo; igual o menor se guarda', async () => {
  const largo = await request(app()).post('/api/notas').set('x-permisos', TODOS)
    .send({ titulo: 'A', cuerpo: 'x'.repeat(501) });
  assert.equal(largo.status, 400);
  assert.equal(largo.body.errors.cuerpo, 'Máximo 500 caracteres');

  const ok = await request(app()).post('/api/notas').set('x-permisos', TODOS)
    .send({ titulo: 'B', cuerpo: 'x'.repeat(500), ficha: '# Título\n\n- item' });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.data.cuerpo.length, 500);
  assert.equal(ok.body.data.ficha, '# Título\n\n- item');
});

test('textarea y markdown exigen string: un número da 400', async () => {
  const res = await request(app()).post('/api/notas').set('x-permisos', TODOS)
    .send({ titulo: 'C', ficha: 12 });
  assert.equal(res.status, 400);
  assert.equal(res.body.errors.ficha, 'Debe ser texto');
});

test('PUT valida maxLength sólo cuando el campo viene en el body', async () => {
  await knex('notas').insert({ titulo: 'D', cuerpo: 'corto' });
  const res = await request(app()).put('/api/notas/1').set('x-permisos', TODOS).send({ cuerpo: 'y'.repeat(501) });
  assert.equal(res.status, 400);
  const sinCampo = await request(app()).put('/api/notas/1').set('x-permisos', TODOS).send({ titulo: 'D2' });
  assert.equal(sinCampo.status, 200);
});

test('configuración inválida de form_type textarea/markdown y maxLength lanza al construir', () => {
  assert.throws(() => normalizarCampos([{ field: 'x', headerName: 'X', type: 'number', form_type: 'textarea' }]), /sólo es válido con type "text"/);
  assert.throws(() => normalizarCampos([{ field: 'x', headerName: 'X', type: 'text', form_type: 'markdown', filas: 3 }]), /"filas" sólo es válido con form_type "textarea"/);
  assert.throws(() => normalizarCampos([{ field: 'x', headerName: 'X', type: 'text', form_type: 'textarea', filas: 0 }]), /filas debe ser un entero/);
  assert.throws(() => normalizarCampos([{ field: 'x', headerName: 'X', type: 'text', maxLength: 0 }]), /maxLength debe ser un entero/);
  assert.throws(() => normalizarCampos([{ field: 'x', headerName: 'X', type: 'text', maxLength: '10' }]), /maxLength debe ser un entero/);
  assert.throws(() => normalizarCampos([{ field: 'x', headerName: 'X', type: 'number', maxLength: 10 }]), /"maxLength" sólo es válido con type "text"/);
  assert.throws(() => normalizarCampos([{ field: 'x', headerName: 'X', type: 'text', form_type: 'multiselect' }]), /multiselect/);
});
