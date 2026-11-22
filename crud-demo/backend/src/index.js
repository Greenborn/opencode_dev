import knexLib from 'knex';
import { DB_FILE, PORT } from './config.js';
import { crearApp } from './app.js';

const knex = knexLib({
  client: 'better-sqlite3',
  connection: { filename: DB_FILE },
  useNullAsDefault: true,
});

// Activa claves foráneas (SQLite las desactiva por defecto).
await knex.raw('PRAGMA foreign_keys = ON');

const app = crearApp(knex);
const servidor = app.listen(PORT, () => {
  console.log(`[crud-demo backend] escuchando en http://localhost:${PORT}`);
});

servidor.on('error', (err) => {
  console.error('[crud-demo backend] error del servidor:', err);
});
