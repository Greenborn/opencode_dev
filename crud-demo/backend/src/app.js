import express from 'express';
import { createCrudRouter } from '@greenborn/express-greenborn-crud';
import { crearSso } from './sso.js';

export const CAMPOS_PRODUCTOS = [
  { field: 'id', headerName: 'ID', type: 'number', writable: false, sortable: true },
  { field: 'nombre', headerName: 'Nombre', type: 'text', required: true, sortable: true, filterable: true, searchable: true },
  { field: 'precio', headerName: 'Precio', type: 'number', form_type: 'number', required: true, sortable: true, filterable: true, css: 'text-end' },
  { field: 'activo', headerName: 'Activo', type: 'boolean', form_type: 'checkbox', sortable: true, filterable: true },
];

export function crearApp(knex) {
  const app = express();
  app.use(express.json());

  const sso = crearSso(knex);

  // Identidad del usuario logueado (el front la usa como login con token de prueba).
  app.get('/api/auth/me', sso.authMiddleware, (req, res) => {
    const { id, email, username } = req.user;
    res.json({ status: true, data: { id, email, username, permisos: req.user.permisos ?? [] } });
  });

  app.use(
    '/api/productos',
    sso.authMiddleware,
    createCrudRouter({
      knex,
      sso,
      recurso: 'productos',
      tabla: 'productos',
      campos: CAMPOS_PRODUCTOS,
    }),
  );

  return app;
}
