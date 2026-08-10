import 'dotenv/config';
import express from 'express';
import knex from 'knex';
import { createSsoAuth } from '../src/index.js';

const app = express();
const port = process.env.SERVICE_PORT || 5175;

// Conexión a la base de datos local (usa Knex, el mismo estilo que GFC-Back).
// NOTA: en este paquete la instancia de knex se inyecta (no depende de global.knex).
const db = knex({
  client: (process.env.DB_CLIENT || 'postgresql').toLowerCase().includes('mysql') ? 'mysql2' : 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || (process.env.DB_CLIENT?.toLowerCase().includes('mysql') ? 3306 : 5432)),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
});

// Configuración SSO reutilizable
const sso = createSsoAuth({
  knex: db,
  ssoBaseUrl: process.env.URL_AUTH_SERVICE || 'https://auth.greenborn.com.ar',
  ssoRoleMap: process.env.SSO_ROLE_MAP,
  defaultRoleId: 3,
  logger: console,
});

app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'healthy', sso: 'express-greenborn-sso-back' }));

// Router SSO completo: /me, /sso-profile, /register
app.use('/api/user', sso.router);

// Ejemplo de ruta protegida con el middleware
app.get('/api/protected', sso.authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Ejemplo de ruta con auth opcional
app.get('/api/public', sso.authMiddlewareOptional, (req, res) => {
  res.json({ success: true, user: req.user || null });
});

app.listen(port, () => {
  console.log(`Demo express-greenborn-sso-back en http://localhost:${port}`);
  console.log(`  - GET  /api/user/me           (Bearer token local o SSO)`);
  console.log(`  - GET  /api/user/sso-profile?unique_id=...`);
  console.log(`  - POST /api/user/register     (rama SSO)`);
  console.log(`  - GET  /api/protected         (authMiddleware)`);
  console.log(`  - GET  /api/public            (authMiddlewareOptional)`);
});
