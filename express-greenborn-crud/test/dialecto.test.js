import { test } from 'node:test';
import assert from 'node:assert/strict';
import knexFactory from 'knex';
import { tipoCastTexto, aplicarFiltrosListado, parsearConsultaListado } from '../src/consultaListado.js';
import { CAMPOS, crearKnex } from './helpers/entorno.js';

const fakeKnex = (config) => ({ client: { config } });

test('tipoCastTexto: MySQL/MariaDB usan CHAR (AS TEXT no existe en MySQL)', () => {
  assert.equal(tipoCastTexto(fakeKnex({ client: 'mysql2' })), 'CHAR');
  assert.equal(tipoCastTexto(fakeKnex({ client: 'mysql' })), 'CHAR');
});

test('tipoCastTexto: SQLite y PostgreSQL usan TEXT', () => {
  assert.equal(tipoCastTexto(fakeKnex({ client: 'better-sqlite3' })), 'TEXT');
  assert.equal(tipoCastTexto(fakeKnex({ client: 'sqlite3' })), 'TEXT');
  assert.equal(tipoCastTexto(fakeKnex({ client: 'pg' })), 'TEXT');
});

test('tipoCastTexto: si config.client no es string usa driverName', () => {
  assert.equal(tipoCastTexto({ client: { config: {}, driverName: 'mysql2' } }), 'CHAR');
});

test('tipoCastTexto: lanza si no se puede determinar o el dialecto no está soportado', () => {
  assert.throws(() => tipoCastTexto({ client: { config: {} } }), /no se puede determinar el dialecto/);
  assert.throws(() => tipoCastTexto(undefined), /no se puede determinar el dialecto/);
  assert.throws(() => tipoCastTexto(fakeKnex({ client: 'oracledb' })), /dialecto de Knex no soportado/);
});

test('tipoCastTexto: funciona con una instancia real de Knex (SQLite)', () => {
  const knex = crearKnex();
  try {
    assert.equal(tipoCastTexto(knex), 'TEXT');
  } finally {
    knex.destroy();
  }
});

test('aplicarFiltrosListado usa el tipo de CAST recibido en búsqueda y filtros de texto', () => {
  const knex = knexFactory({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });
  try {
    const consulta = parsearConsultaListado({ search: 'x', filters: '{"nombre":"y"}' }, CAMPOS, { warn() {} });
    const sql = aplicarFiltrosListado(knex('productos'), consulta, CAMPOS, 'CHAR').toSQL();
    assert.match(sql.sql, /CAST\(`nombre` AS CHAR\) LIKE \? ESCAPE \?/);
    assert.doesNotMatch(sql.sql, /AS TEXT/);
  } finally {
    knex.destroy();
  }
});
