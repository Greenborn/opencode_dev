import express from 'express';
import knexFactory from 'knex';
import { createCrudRouter } from '../../src/index.js';

export const CAMPOS = [
  { field: 'nombre', headerName: 'Nombre', type: 'text', sortable: true, filterable: true, searchable: true, required: true },
  { field: 'precio', headerName: 'Precio', type: 'number', form_type: 'number', sortable: true, filterable: true, required: true, css: 'text-end' },
  { field: 'activo', headerName: 'Activo', type: 'boolean', filterable: true },
  {
    field: 'categoria',
    headerName: 'Categoría',
    type: 'select',
    sortable: true,
    filterable: true,
    options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
  },
  { field: 'creado', headerName: 'Creado', type: 'date', sortable: true },
  { field: 'calculado', headerName: 'Calculado', type: 'text', writable: false },
];

/** SSO mock: requirePermission real (403 si faltan permisos). Los permisos llegan por header x-permisos. */
export function ssoMock() {
  return {
    requirePermission: (...permisos) => (req, res, next) => {
      if (!req.user) return res.status(401).json({ status: false, message: 'Token de autenticación requerido' });
      const tiene = permisos.every((p) => req.user.permisos.includes(p));
      if (!tiene) return res.status(403).json({ status: false, message: 'Acceso denegado: permisos insuficientes' });
      return next();
    },
  };
}

export function crearKnex() {
  return knexFactory({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });
}

export async function crearTablaProductos(knex) {
  await knex.schema.createTable('productos', (t) => {
    t.increments('id');
    t.string('nombre').notNullable();
    t.integer('precio').notNullable();
    t.integer('activo').defaultTo(1);
    t.string('categoria');
    t.string('creado');
    t.string('calculado').defaultTo('auto');
    t.integer('owner_id').defaultTo(1);
  });
  await knex('productos').insert([
    { nombre: 'Alfa', precio: 10, activo: 1, categoria: 'a', creado: '2026-01-01', owner_id: 1 },
    { nombre: 'Beta', precio: 30, activo: 0, categoria: 'b', creado: '2026-01-02', owner_id: 1 },
    { nombre: 'Gamma', precio: 20, activo: 1, categoria: 'a', creado: '2026-01-03', owner_id: 2 },
    { nombre: 'Delta 50%', precio: 40, activo: 1, categoria: 'b', creado: '2026-01-04', owner_id: 1 },
    { nombre: 'Epsilon_x', precio: 50, activo: 0, categoria: 'a', creado: '2026-01-05', owner_id: 1 },
  ]);
}

/** Logger que guarda los mensajes para afirmar warnings/errores. */
export function loggerEspia() {
  const registro = { error: [], warn: [] };
  return {
    registro,
    error: (...args) => registro.error.push(args.map(String).join(' ')),
    warn: (...args) => registro.warn.push(args.map(String).join(' ')),
  };
}

/** App Express con el router montado en /api/productos e inyección de usuario por header. */
export function crearApp(opciones) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    const cabecera = req.headers['x-permisos'];
    if (cabecera !== undefined) {
      req.user = { id: 1, permisos: cabecera === '' ? [] : cabecera.split(',') };
    }
    next();
  });
  app.use('/api/productos', createCrudRouter(opciones));
  return app;
}
