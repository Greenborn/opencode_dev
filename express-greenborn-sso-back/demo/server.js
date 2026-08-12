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

// app.listen devuelve el http.Server; socket.io se adjunta a ESE mismo server
// para exponer HTTP y WebSocket en un único puerto.
const server = app.listen(port, () => {
  console.log(`Demo express-greenborn-sso-back en http://localhost:${port}`);
  console.log(`  - GET  /api/user/me           (Bearer token local o SSO)`);
  console.log(`  - GET  /api/user/sso-profile?unique_id=...`);
  console.log(`  - POST /api/user/register     (rama SSO)`);
  console.log(`  - GET  /api/protected         (authMiddleware)`);
  console.log(`  - GET  /api/public            (authMiddlewareOptional)`);
});

// Conexión WebSocket complementaria (socket.io) sobre el mismo servidor HTTP.
// Autentica con el bearer token SSO/local y permite mensajes genéricos con
// callbacks por función (Pub/Sub + ACK).
const socket = sso.attachSocket(server, {
  path: process.env.SOCKET_PATH || '/socket.io',
  corsOrigin: process.env.SOCKET_CORS || '*',
});

// Handler de ejemplo: "echo" — invocado con sock.emit('echo', payload, ack)
socket.onFunction('echo', ({ payload, socket: sck, ack, user }) => {
  ack({ success: true, echo: payload, user: user?.id ?? null });
});

// Push de ejemplo: cada 15s a cada usuario conectado (habitación user:{id})
setInterval(() => {
  socket.broadcast('ping', { ts: Date.now() });
}, 15000);

console.log(`  - WS   ${process.env.SOCKET_PATH || '/socket.io'}  (socket.io, autenticado con Bearer SSO)`);

