import express from 'express';
import knex from 'knex';
import { createNotificaciones, createPushSubscriptionsMigration } from '../src/index.js';

const app = express();
app.use(express.json());
const port = process.env.PORT || 5175;

// Demo con SQLite en memoria (no requiere Postgres/MySQL corriendo).
const db = knex({
  client: 'sqlite3',
  connection: { filename: ':memory:' },
  useNullAsDefault: true,
});

// Tabla mínima de usuarios (FK de push_subscriptions) y la migración del paquete.
async function init() {
  await db.schema.createTable('usuarios', (t) => {
    t.increments('id').primary();
    t.string('username');
  });
  await db('usuarios').insert({ id: 1, username: 'demo' });

  const { up } = createPushSubscriptionsMigration();
  await up(db);
}

// Auth de ejemplo: en un proyecto real este middleware vendría de
// express-greenborn-sso-back (sso.authMiddleware) u otro sistema de sesiones,
// y debería validar un token real. Aquí se simula un usuario fijo logueado.
function fakeAuthMiddleware(req, _res, next) {
  req.usuario = { id: 1 };
  next();
}

await init();

const notificaciones = createNotificaciones({
  knex: db,
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT,
  },
  authMiddleware: fakeAuthMiddleware,
  userField: 'usuario',
  logger: console,
});

app.use('/api/notificaciones/push', notificaciones.router);

app.listen(port, () => {
  console.log(`Demo express-greenborn-notificaciones en http://localhost:${port}`);
  console.log('  - GET    /api/notificaciones/push/vapid-public-key');
  console.log('  - POST   /api/notificaciones/push/suscripcion');
  console.log('  - DELETE /api/notificaciones/push/suscripcion');
  console.log('  - POST   /api/notificaciones/push/prueba');
});
