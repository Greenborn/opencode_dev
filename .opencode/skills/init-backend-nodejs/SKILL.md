---
name: init-backend-nodejs
description: Inicializar un backend Node.js con Express, MariaDB vía Knex, CORS, migraciones automáticas, sesiones SSO (express-greenborn-sso-back) con RBAC por defecto, usuario admin con todos los permisos y CRUD de usuarios, roles y permisos
requires: []
---

# Skill: Inicializar backend Node.js con Express + SSO + RBAC

Usar cuando el usuario pida **crear un backend Node.js desde cero** con Express, conexión a MariaDB vía Knex, CORS, migraciones automáticas al inicio, **sistema de sesiones SSO** (integrado con `express-greenborn-sso-back`) y **RBAC por defecto**.

Este skill inicializa un backend que incluye:
- **Sesiones SSO + login local** (`express-greenborn-sso-back@1.6.0`).
- **RBAC** (roles y permisos M2M) habilitado por defecto (`rbac: true`).
- **Usuario admin** con todos los permisos, creado por seed.
- **CRUD de usuarios, roles y permisos** con autorización por permiso (`requirePermission`).

> **Sesiones**: cuando el proyecto requiere autenticación/sesiones, se usa el paquete `express-greenborn-sso-back@1.6.0`. Este paquete incluye el sistema de usuarios local (`user`, `profile`, `user_tokens`), el esquema RBAC M2M (`roles`, `permisos`, `usuarios_roles`, `roles_permisos`), validación de tokens SSO/locales, sincronización del usuario, login local con bcrypt (`localLogin`) y middlewares `authMiddleware`/`requirePermission`/`requireRole`. **No** se escribe un sistema JWT propio ni un módulo RBAC manual.

---

## 0. Preguntar nombre del proyecto y websockets

Usar la herramienta `question` para preguntar al usuario qué nombre desea para el paquete del backend. La respuesta se usará como `<nombre-proyecto>` en todos los pasos siguientes.

Además, **siempre** preguntar si el backend debe habilitar soporte **WebSocket** (conexión complementaria sobre socket.io para mensajes genéricos con callbacks por función). El valor se usará como `<ws-habilitado>` (`true`/`false`).

Ejemplo de preguntas:

```
<question>
Pregunta: ¿Qué nombre deseas para el paquete del backend?
Header: Nombre del backend
```

```
<question>
Pregunta: ¿Quieres habilitar soporte WebSocket (socket.io) en este backend?
Header: WebSocket
Opciones:
- Sí (Recomendado): habilita una conexión complementaria autenticada para mensajes genéricos con callbacks por función.
- No: backend solo HTTP.
```

> `<nombre-proyecto>` y `<ws-habilitado>` reemplazan los marcadores en el resto de la receta.

## 1. Crear estructura del proyecto

```bash
mkdir -p src/{config,routes,controllers,scripts,migrations,seeds}
cd <nombre-proyecto>
npm init -y
```

Agregar `"type": "module"` en `package.json` para usar ESM.

Fijar la versión inicial del proyecto editando `package.json` para que quede:

```json
{
  "name": "<nombre-proyecto>",
  "version": "1.0.0",
  "type": "module",
  ...
}
```

## 2. Instalar dependencias

```bash
npm install express cors knex mysql2 dotenv express-greenborn-sso-back@1.6.0 bcryptjs
npm install -D nodemon eslint
```

Si `<ws-habilitado>` es `true`, instalar además:

```bash
npm install socket.io
```

## 3. Archivo `.env`

```
PORT=4000
CORS_ORIGIN=*

# Base de datos local
DB_HOST=localhost
DB_PORT=3306
DB_USER=mi_usuario
DB_PASSWORD=mi_password
DB_NAME=mi_app

# SSO (express-greenborn-sso-back)
URL_AUTH_SERVICE=https://auth.greenborn.com.ar
# Mapeo de roles: {"email": role_id, "*@dominio": role_id} (role_id referencia la tabla "roles")
SSO_ROLE_MAP={"admin@greenborn.com.ar":1}
DEFAULT_ROLE_ID=3

# RBAC (roles/permisos M2M) habilitado por defecto en este skill
# (también se fija rbac: true directamente en src/index.js)
SSO_RBAC=true

# Login local (POST /api/user/login) — el admin del seed se autentica por contraseña
# Credenciales admin por defecto (ver src/seeds/rbac.js):
#   ADMIN_USERNAME=admin / ADMIN_EMAIL=admin@greenborn.com.ar / ADMIN_PASSWORD=Admin123!
# (opcional: se pueden sobreescribir con estas variables de entorno si se desea)

# WebSocket (solo si ws-habilitado)
WS_ENABLED=true
SOCKET_PATH=/socket.io
SOCKET_CORS=*
```

Crear también `.env.example` con la misma estructura (valores de ejemplo, sin datos reales) y agregar `.env` al `.gitignore`.

## 4. Crear base de datos y usuario local

Agregar un script que cree la base de datos y el usuario definidos en `.env` usando el usuario root de MariaDB/MySQL.

### Variables extra en `.env`

Agregar al final del `.env` (opcional, solo para `setup-db`):

```
DB_ROOT_USER=root
DB_ROOT_PASSWORD=
```

### Script — `src/scripts/setup-db.js`

```javascript
import mysql from 'mysql2/promise';
import config from '../config/env.js';

async function setupDatabase() {
  const {
    db: { host, port, user, password, database },
    dbRoot,
  } = config;

  const connection = await mysql.createConnection({
    host,
    port,
    user: dbRoot.user,
    password: dbRoot.password,
  });

  try {
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`[setup-db] Base de datos "${database}" lista.`);

    const [rows] = await connection.execute(
      `SELECT EXISTS(SELECT 1 FROM mysql.user WHERE user = ? AND host = ?) AS existe`,
      [user, '%']
    );
    const existe = rows[0].existe === 1 || rows[0].existe === '1';

    if (!existe) {
      await connection.execute(
        `CREATE USER ?@? IDENTIFIED BY ?`,
        [user, '%', password]
      );
      console.log(`[setup-db] Usuario "${user}" creado.`);
    } else {
      await connection.execute(
        `ALTER USER ?@? IDENTIFIED BY ?`,
        [user, '%', password]
      );
      console.log(`[setup-db] Usuario "${user}" actualizado.`);
    }

    await connection.execute(`GRANT ALL PRIVILEGES ON \`${database}\`.* TO ?@?`, [user, '%']);
    await connection.execute('FLUSH PRIVILEGES');
    console.log(`[setup-db] Privilegios otorgados a "${user}" sobre "${database}".`);
  } finally {
    await connection.end();
  }
}

setupDatabase().catch((err) => {
  console.error('[setup-db] Error:', err.message);
  process.exit(1);
});
```

### Script npm en `package.json`

```json
{
  "scripts": {
    "setup-db": "node src/scripts/setup-db.js"
  }
}
```

## 5. Configuración de Knex — `knexfile.js`

Carga `.env` con `dotenv.config({ override: true })`. La validación de variables requeridas se delega a `src/config/env.js`.

```javascript
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env'), override: true });

export default {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  migrations: {
    directory: './src/migrations',
    extension: 'js',
  },
  seeds: {
    directory: './src/seeds',
    extension: 'js',
  },
};
```

## 6. Configuración de BD — `src/config/db.js`

```javascript
import knex from 'knex';
import config from '../../knexfile.js';

const db = knex(config);
export default db;
```

## 7. Configuración centralizada — `src/config/env.js`

Lee únicamente el archivo `.env` con `dotenv.parse()` + `fs.readFileSync()`. No accede a `process.env` del sistema.

```javascript
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = resolve(__dirname, '../../.env');
let envRaw = {};
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envRaw = dotenv.parse(envContent);
} catch {
  console.error('[env] No se encuentra el archivo .env');
  console.error('[env] Copia .env.example a .env y completa las variables');
  process.exit(1);
}

const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'URL_AUTH_SERVICE'];
const missing = required.filter(key => !envRaw[key]);
if (missing.length > 0) {
  console.error(`[env] Faltan variables en .env: ${missing.join(', ')}`);
  process.exit(1);
}

const config = {
  port: parseInt(envRaw.PORT, 10) || 4000,
  corsOrigin: envRaw.CORS_ORIGIN || '*',
  ssoBaseUrl: envRaw.URL_AUTH_SERVICE,
  ssoRoleMap: envRaw.SSO_ROLE_MAP,
  defaultRoleId: parseInt(envRaw.DEFAULT_ROLE_ID, 10) || 3,
  ssoRbac: envRaw.SSO_RBAC !== 'false',
  socketPath: envRaw.SOCKET_PATH || '/socket.io',
  socketCors: envRaw.SOCKET_CORS || '*',
  ws: envRaw.WS_ENABLED === 'true',
  db: {
    host: envRaw.DB_HOST,
    port: parseInt(envRaw.DB_PORT, 10),
    user: envRaw.DB_USER,
    password: envRaw.DB_PASSWORD,
    database: envRaw.DB_NAME,
  },
  dbRoot: {
    user: envRaw.DB_ROOT_USER || 'root',
    password: envRaw.DB_ROOT_PASSWORD || '',
  },
};

export default config;
```

## 8. Configuración de CORS — `src/config/cors.js`

```javascript
import cors from 'cors';
import config from './env.js';

const corsOptions = {
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

export default cors(corsOptions);
```

## 9. Servidor con migraciones automáticas y SSO — `src/index.js`

Se configura `createSsoAuth` con la instancia de Knex, el mapeo de roles, **RBAC por defecto**, **login local** (bcrypt) y registro de actividad; se monta el router SSO (`/api/user`: `/me`, `/sso-profile`, `/register`, `/login`, `/logout`) y las rutas CRUD de usuarios, roles y permisos. Se protegen rutas con `sso.authMiddleware`, `sso.requirePermission` y `sso.requireRole`. Si `<ws-habilitado>` es `true`, se adjunta socket.io al mismo `http.Server`.

```javascript
import express from 'express';
import bcrypt from 'bcryptjs';
import { createSsoAuth } from 'express-greenborn-sso-back';
import config from './config/env.js';
import corsMiddleware from './config/cors.js';
import db from './config/db.js';
import preferenciasRoutes from './routes/preferencias.js';
import usuariosRoutes from './routes/usuarios.js';
import rolesRoutes from './routes/roles.js';
import permisosRoutes from './routes/permisos.js';
import { seedPreferencias } from './seeds/preferencias.js';
import { seedRbac } from './seeds/rbac.js';

const app = express();

app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sistema de sesiones SSO + RBAC + login local (incluye usuarios locales, sincronización, roles y permisos)
const sso = createSsoAuth({
  knex: db,
  ssoBaseUrl: config.ssoBaseUrl,
  ssoRoleMap: config.ssoRoleMap,
  defaultRoleId: config.defaultRoleId,
  rbac: config.ssoRbac,                       // RBAC M2M habilitado por defecto
  localLogin: {                               // login local (POST /api/user/login)
    endpoint: '/login',
    passwordField: 'password_hash',
    verifyPassword: (password, hash) => bcrypt.compare(password, hash),
  },
  activityLog: true,                          // registra actividad de rutas autenticadas
  logger: console,
});

// Router SSO: GET /api/user/me, GET /api/user/sso-profile, POST /api/user/register,
// POST /api/user/login (local), POST /api/user/logout
app.use('/api/user', sso.router);

// Rutas propias
app.use('/api/preferencias', preferenciasRoutes);

// CRUD RBAC: usuarios, roles y permisos (reciben sso para usar requirePermission)
app.use('/api/usuarios', usuariosRoutes(sso));
app.use('/api/roles', rolesRoutes(sso));
app.use('/api/permisos', permisosRoutes(sso));

// Ejemplo de ruta protegida con el middleware SSO
app.get('/api/protected', sso.authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Ejemplos de autorización por permiso y por rol (modo RBAC)
app.get('/api/projects', sso.authMiddleware, sso.requirePermission('proyectos.ver'), (req, res) => {
  res.json({ success: true, user: req.user });
});
app.get('/api/admin', sso.authMiddleware, sso.requireRole('ADMIN'), (req, res) => {
  res.json({ success: true, user: req.user });
});

async function start() {
  try {
    console.log('[migrate] Ejecutando migraciones pendientes...');
    await db.migrate.latest();
    console.log('[migrate] Migraciones ejecutadas correctamente.');
  } catch (err) {
    console.error('[migrate] Error:', err.message);
    process.exit(1);
  }
  // Las migraciones se ejecutan SIEMPRE automaticamente en cada inicio del servidor.

  try {
    await seedPreferencias();
  } catch (err) {
    console.error('[seed] Error al crear datos iniciales de preferencias:', err.message);
  }

  try {
    await seedRbac();
  } catch (err) {
    console.error('[seed] Error al crear datos iniciales RBAC:', err.message);
  }

  app.get('/health', (req, res) => {
    res.json({ status: true, data: { timestamp: new Date().toISOString() } });
  });

  const server = app.listen(config.port, () => {
    console.log(`Servidor corriendo en puerto ${config.port}`);
  });

  if (config.ws) {
    const socket = sso.attachSocket(server, {
      path: config.socketPath,
      corsOrigin: config.socketCors,
    });

    // Ejemplo: función invocable desde el front con socket.emit('echo', payload, ack)
    socket.onFunction('echo', ({ payload, ack, user }) => {
      ack({ success: true, echo: payload, user: user?.id ?? null });
    });

    console.log(`WebSocket listo en ${config.socketPath}`);
  }
}

start();
```

## 10. Migración de ejemplo — `src/migrations/XXXXXXXXXXXXXX_init.js`

Crea las tablas del sistema de usuarios del paquete SSO (`user`, `profile`, `user_tokens`), las tablas RBAC M2M (`roles`, `permisos`, `usuarios_roles`, `roles_permisos`) y las tablas propias de la app (`preferencias_*`).

```javascript
export function up(knex) {
  return knex.schema
    .createTable('profile', (table) => {
      table.increments('id').primary();
      table.string('name', 100);
      table.string('last_name', 100);
      table.integer('fotoclub_id').unsigned();
      table.timestamps(true, true);
    })
    .createTable('user', (table) => {
      table.increments('id').primary();
      table.string('username', 100).unique().notNullable();
      table.string('email', 190).unique().notNullable();
      table.string('password_hash', 255); // para login local (bcrypt)
      table.integer('role_id').unsigned().defaultTo(3); // legacy, sin uso en RBAC
      table.integer('profile_id').unsigned().references('id').inTable('profile').onDelete('SET NULL');
      table.integer('status').defaultTo(1);
      table.timestamps(true, true);
    })
    .createTable('user_tokens', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('user').onDelete('CASCADE');
      table.string('token', 255).notNullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('last_used_at');
      table.timestamp('expires_at');
      table.timestamps(true, true);
    })
    .createTable('roles', (table) => {
      table.increments('id').primary();
      table.string('nombre', 100).unique().notNullable();
      table.string('descripcion', 255);
      table.timestamps(true, true);
    })
    .createTable('permisos', (table) => {
      table.increments('id').primary();
      table.string('nombre', 150).unique().notNullable();
      table.string('descripcion', 255);
      table.timestamps(true, true);
    })
    .createTable('usuarios_roles', (table) => {
      table.increments('id').primary();
      table.integer('usuario_id').unsigned().references('id').inTable('user').onDelete('CASCADE');
      table.integer('rol_id').unsigned().references('id').inTable('roles').onDelete('CASCADE');
      table.unique(['usuario_id', 'rol_id']);
    })
    .createTable('roles_permisos', (table) => {
      table.increments('id').primary();
      table.integer('rol_id').unsigned().references('id').inTable('roles').onDelete('CASCADE');
      table.integer('permiso_id').unsigned().references('id').inTable('permisos').onDelete('CASCADE');
      table.unique(['rol_id', 'permiso_id']);
    })
    .createTable('preferencias_permitidas', (table) => {
      table.increments('id').primary();
      table.string('clave', 100).unique().notNullable();
      table.string('nombre', 200).notNullable();
      table.text('descripcion');
      table.string('tipo', 50).notNullable();
      table.json('opciones');
      table.text('valor_defecto');
      table.timestamps(true, true);
    })
    .createTable('preferencias_usuario', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('user').onDelete('CASCADE');
      table.integer('preferencia_id').unsigned().references('id').inTable('preferencias_permitidas').onDelete('CASCADE');
      table.text('valor');
      table.timestamps(true, true);
      table.unique(['user_id', 'preferencia_id']);
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('preferencias_usuario')
    .dropTableIfExists('preferencias_permitidas')
    .dropTableIfExists('roles_permisos')
    .dropTableIfExists('usuarios_roles')
    .dropTableIfExists('permisos')
    .dropTableIfExists('roles')
    .dropTableIfExists('user_tokens')
    .dropTableIfExists('user')
    .dropTableIfExists('profile');
}
```

Para generar el archivo automáticamente:

```bash
npx knex migrate:make init
```

> Los roles se asignan mediante `SSO_ROLE_MAP` / `defaultRoleId` (el paquete SSO enlaza `usuarios_roles` con el `role_id` resuelto al sincronizar). El esquema RBAC M2M (`roles`, `permisos`, `usuarios_roles`, `roles_permisos`) lo gestiona el paquete SSO cuando `rbac: true`.

## 11. Semilla de preferencias por defecto — `src/seeds/preferencias.js`

```javascript
import db from '../config/db.js';

export async function seedPreferencias() {
  const preferencias = [
    { clave: 'theme', nombre: 'Tema visual', tipo: 'select', opciones: JSON.stringify(['light', 'dark']), valor_defecto: 'light' },
    { clave: 'language', nombre: 'Idioma', tipo: 'select', opciones: JSON.stringify(['es', 'en']), valor_defecto: 'es' },
    { clave: 'notifications_enabled', nombre: 'Notificaciones', tipo: 'boolean', valor_defecto: 'true' },
    { clave: 'items_per_page', nombre: 'Items por pagina', tipo: 'number', valor_defecto: '25' },
  ];

  for (const pref of preferencias) {
    const [existente] = await db('preferencias_permitidas').where({ clave: pref.clave });
    if (!existente) {
      await db('preferencias_permitidas').insert(pref);
      console.log(`[seed] Preferencia "${pref.clave}" creada.`);
    }
  }
  console.log('[seed] Preferencias por defecto inicializadas.');
}
```

> Seed ejecutado automaticamente al iniciar el servidor (en `src/index.js`).

## 11b. Seed RBAC + usuario admin — `src/seeds/rbac.js`

Crea los **roles**, los **permisos** (usuarios/roles/permisos/preferencias), asigna **todos los permisos al rol ADMIN** y crea el **usuario admin** (con login local por bcrypt) enlazado al rol ADMIN. Ejecutado automaticamente al iniciar el servidor.

```javascript
import bcrypt from 'bcryptjs';
import db from '../config/db.js';

const ROLES = [
  { id: 1, nombre: 'ADMIN', descripcion: 'Acceso total al sistema' },
  { id: 2, nombre: 'DELEGADO', descripcion: 'Delegado con permisos parciales' },
  { id: 3, nombre: 'CONCURSANTE', descripcion: 'Concursante con permisos basicos' },
];

const PERMISOS = [
  { nombre: 'usuarios.ver', descripcion: 'Ver usuarios' },
  { nombre: 'usuarios.crear', descripcion: 'Crear usuarios' },
  { nombre: 'usuarios.editar', descripcion: 'Editar usuarios' },
  { nombre: 'usuarios.eliminar', descripcion: 'Eliminar usuarios' },
  { nombre: 'roles.ver', descripcion: 'Ver roles' },
  { nombre: 'roles.crear', descripcion: 'Crear roles' },
  { nombre: 'roles.editar', descripcion: 'Editar roles' },
  { nombre: 'roles.eliminar', descripcion: 'Eliminar roles' },
  { nombre: 'permisos.ver', descripcion: 'Ver permisos' },
  { nombre: 'permisos.crear', descripcion: 'Crear permisos' },
  { nombre: 'permisos.editar', descripcion: 'Editar permisos' },
  { nombre: 'permisos.eliminar', descripcion: 'Eliminar permisos' },
  { nombre: 'preferencias.ver', descripcion: 'Ver preferencias' },
  { nombre: 'preferencias.editar', descripcion: 'Editar preferencias' },
];

// Credenciales admin por defecto (fijas en el seed).
// Se pueden sobreescribir con variables de entorno (ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD).
const ADMIN = {
  username: process.env.ADMIN_USERNAME || 'admin',
  email: process.env.ADMIN_EMAIL || 'admin@greenborn.com.ar',
  password: process.env.ADMIN_PASSWORD || 'Admin123!',
};

export async function seedRbac() {
  // Roles
  for (const rol of ROLES) {
    const existente = await db('roles').where({ nombre: rol.nombre }).first();
    if (!existente) {
      await db('roles').insert(rol);
      console.log(`[seed] Rol "${rol.nombre}" creado.`);
    }
  }

  // Permisos
  for (const permiso of PERMISOS) {
    const existente = await db('permisos').where({ nombre: permiso.nombre }).first();
    if (!existente) {
      await db('permisos').insert(permiso);
      console.log(`[seed] Permiso "${permiso.nombre}" creado.`);
    }
  }

  // ADMIN tiene todos los permisos (roles_permisos)
  const rolAdmin = await db('roles').where({ nombre: 'ADMIN' }).first();
  if (rolAdmin) {
    const permisos = await db('permisos').select('id');
    for (const permiso of permisos) {
      const existe = await db('roles_permisos')
        .where({ rol_id: rolAdmin.id, permiso_id: permiso.id })
        .first();
      if (!existe) {
        await db('roles_permisos').insert({ rol_id: rolAdmin.id, permiso_id: permiso.id });
      }
    }
  }

  // Usuario admin (login local con bcrypt + rol ADMIN)
  let admin = await db('user').where({ email: ADMIN.email }).first();
  if (!admin) {
    const hash = await bcrypt.hash(ADMIN.password, 10);
    const [profileRow] = await db('profile').insert({
      name: 'Administrador',
      last_name: '',
      fotoclub_id: null,
    }).returning('id');
    const profileId = profileRow?.id ?? profileRow;

    const [userId] = await db('user').insert({
      username: ADMIN.username,
      email: ADMIN.email,
      password_hash: hash,
      profile_id: profileId,
      status: 1,
      created_at: new Date().toISOString(),
    });
    admin = { id: userId };

    if (rolAdmin) {
      await db('usuarios_roles').insert({ usuario_id: userId, rol_id: rolAdmin.id });
    }
    console.log(`[seed] Usuario admin "${ADMIN.username}" creado con todos los permisos.`);
  }

  console.log('[seed] RBAC inicializado (roles, permisos y admin).');
}
```

> El usuario admin se autentica con `POST /api/user/login` (`{ username, password }`) y obtiene un token local que incluye `roles: ['ADMIN']` y todos los `permisos`.

## 12. Rutas protegidas con SSO

Para proteger cualquier ruta propia, usar `sso.authMiddleware` (obliga a autenticarse) o `sso.authMiddlewareOptional` (no falla si falta el token):

```javascript
// src/routes/ejemplo.js
import { Router } from 'express';

export default function crearRutas(sso) {
  const router = Router();

  router.get('/privado', sso.authMiddleware, (req, res) => {
    res.json({ success: true, user: req.user });
  });

  router.get('/publico', sso.authMiddlewareOptional, (req, res) => {
    res.json({ success: true, user: req.user || null });
  });

  return router;
}
```

Y en `src/index.js`:

```javascript
app.use('/api/ejemplo', crearRutas(sso));
```

## 13. Controlador de preferencias — `src/controllers/preferenciasController.js`

```javascript
import db from '../config/db.js';

export async function listarDefiniciones(req, res) {
  const page = parseInt(req.query.page);
  if (!page) {
    const definiciones = await db('preferencias_permitidas').select('*');
    return res.status(200).json({ status: true, data: definiciones });
  }
  const pageSize = parseInt(req.query.pageSize) || 25;
  const search = req.query.search || '';
  let query = db('preferencias_permitidas');
  let countQuery = db('preferencias_permitidas');
  if (search) {
    query = query.where(function () {
      this.where('nombre', 'like', `%${search}%`).orWhere('clave', 'like', `%${search}%`);
    });
    countQuery = countQuery.where(function () {
      this.where('nombre', 'like', `%${search}%`).orWhere('clave', 'like', `%${search}%`);
    });
  }
  const [{ count }] = await countQuery.count('* as count');
  const total = parseInt(count);
  const offset = (page - 1) * pageSize;
  const rows = await query.orderBy('clave', 'asc').offset(offset).limit(pageSize);
  return res.status(200).json({ status: true, data: { rows, total, page, pageSize } });
}

export async function obtenerPreferencias(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ status: false, error: 'No autenticado' });
  const prefs = await db('preferencias_usuario').where({ user_id: userId }).select('*');
  return res.status(200).json({ status: true, data: prefs });
}

export async function guardarPreferencia(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ status: false, error: 'No autenticado' });
  const { preferencia_id, valor } = req.body;
  const existe = await db('preferencias_usuario').where({ user_id: userId, preferencia_id }).first();
  if (existe) {
    await db('preferencias_usuario').where({ user_id: userId, preferencia_id }).update({ valor });
  } else {
    await db('preferencias_usuario').insert({ user_id: userId, preferencia_id, valor });
  }
  return res.status(200).json({ status: true, data: { message: 'Preferencia guardada' } });
}
```

## 14. Rutas de preferencias — `src/routes/preferencias.js`

```javascript
import { Router } from 'express';
import { listarDefiniciones, obtenerPreferencias, guardarPreferencia } from '../controllers/preferenciasController.js';

export default function crearRutas(sso) {
  const router = Router();

  router.get('/definiciones', sso.authMiddleware, listarDefiniciones);
  router.get('/mias', sso.authMiddleware, obtenerPreferencias);
  router.post('/mias', sso.authMiddleware, guardarPreferencia);

  return router;
}
```

> El router de preferencias recibe `sso` para usar `sso.authMiddleware`. Montarlo en `src/index.js` con `app.use('/api/preferencias', crearRutas(sso))`.

## 14b. CRUD de usuarios, roles y permisos

Los CRUD RBAC se protegen con `sso.requirePermission('<prefijo>.ver')` (autentica + verifica permiso). Montar cada router en `src/index.js` pasando `sso`.

### 14b.1. Controlador de usuarios — `src/controllers/usuariosController.js`

Gestiona la tabla `user`, la relación `usuarios_roles` (roles asignados) y el hash de contraseña (bcrypt) para el login local.

```javascript
import bcrypt from 'bcryptjs';
import db from '../config/db.js';

const TABLE = 'user';

export async function listarUsuarios(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 25;
    const search = req.query.search || '';

    let query = db(TABLE);
    let countQuery = db(TABLE);
    if (search) {
      query = query.where(function () {
        this.where('username', 'like', `%${search}%`).orWhere('email', 'like', `%${search}%`);
      });
      countQuery = countQuery.where(function () {
        this.where('username', 'like', `%${search}%`).orWhere('email', 'like', `%${search}%`);
      });
    }
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count);
    const offset = (page - 1) * pageSize;
    const rows = await query.orderBy('id', 'asc').offset(offset).limit(pageSize).select('*');

    // Adjuntar roles de cada usuario (RBAC M2M)
    const withRoles = await Promise.all(rows.map(async (u) => {
      const roles = await db('usuarios_roles')
        .join('roles', 'usuarios_roles.rol_id', 'roles.id')
        .where({ 'usuarios_roles.usuario_id': u.id })
        .select('roles.id', 'roles.nombre');
      return { ...u, password_hash: undefined, roles };
    }));

    return res.status(200).json({ status: true, data: { rows: withRoles, total, page, pageSize } });
  } catch (err) {
    console.log('Error al listar usuarios:', err);
    return res.status(200).json({ status: false, error: 'Error al listar usuarios' });
  }
}

export async function obtenerUsuario(req, res) {
  try {
    const { id } = req.params;
    const user = await db(TABLE).where({ id }).first();
    if (!user) return res.status(200).json({ status: false, error: 'Usuario no encontrado' });
    const roles = await db('usuarios_roles')
      .join('roles', 'usuarios_roles.rol_id', 'roles.id')
      .where({ 'usuarios_roles.usuario_id': id })
      .select('roles.id', 'roles.nombre');
    return res.status(200).json({ status: true, data: { ...user, password_hash: undefined, roles } });
  } catch (err) {
    console.log('Error al obtener usuario:', err);
    return res.status(200).json({ status: false, error: 'Error al obtener usuario' });
  }
}

export async function crearUsuario(req, res) {
  try {
    const { username, email, password, role_ids = [], profile_id = null } = req.body;
    if (!username || !email || !password) {
      return res.status(200).json({ status: false, error: 'username, email y password son requeridos' });
    }
    const existe = await db(TABLE).where({ email }).first();
    if (existe) return res.status(200).json({ status: false, error: 'El email ya está registrado' });

    const hash = await bcrypt.hash(password, 10);
    const [id] = await db(TABLE).insert({
      username,
      email,
      password_hash: hash,
      profile_id,
      status: 1,
      created_at: new Date().toISOString(),
    });

    if (Array.isArray(role_ids) && role_ids.length > 0) {
      for (const rol_id of role_ids) {
        await db('usuarios_roles').insert({ usuario_id: id, rol_id });
      }
    }

    return res.status(200).json({ status: true, data: { id, message: 'Usuario creado correctamente' } });
  } catch (err) {
    console.log('Error al crear usuario:', err);
    return res.status(200).json({ status: false, error: 'Error al crear usuario' });
  }
}

export async function actualizarUsuario(req, res) {
  try {
    const { id } = req.params;
    const existente = await db(TABLE).where({ id }).first();
    if (!existente) return res.status(200).json({ status: false, error: 'Usuario no encontrado' });

    const { username, email, password, role_ids, status } = req.body;
    const payload = {};
    if (username !== undefined) payload.username = username;
    if (email !== undefined) payload.email = email;
    if (status !== undefined) payload.status = status;
    if (password) payload.password_hash = await bcrypt.hash(password, 10);

    if (email !== undefined && email !== existente.email) {
      const dup = await db(TABLE).where({ email }).whereNot({ id }).first();
      if (dup) return res.status(200).json({ status: false, error: 'El email ya está registrado' });
    }

    await db(TABLE).where({ id }).update(payload);

    if (Array.isArray(role_ids)) {
      await db('usuarios_roles').where({ usuario_id: id }).del();
      for (const rol_id of role_ids) {
        await db('usuarios_roles').insert({ usuario_id: id, rol_id });
      }
    }

    return res.status(200).json({ status: true, data: { message: 'Usuario actualizado correctamente' } });
  } catch (err) {
    console.log('Error al actualizar usuario:', err);
    return res.status(200).json({ status: false, error: 'Error al actualizar usuario' });
  }
}

export async function eliminarUsuario(req, res) {
  try {
    const { id } = req.params;
    const existente = await db(TABLE).where({ id }).first();
    if (!existente) return res.status(200).json({ status: false, error: 'Usuario no encontrado' });
    await db(TABLE).where({ id }).del();
    return res.status(200).json({ status: true, data: { message: 'Usuario eliminado correctamente' } });
  } catch (err) {
    console.log('Error al eliminar usuario:', err);
    return res.status(200).json({ status: false, error: 'Error al eliminar usuario' });
  }
}
```

### 14b.2. Controlador de roles — `src/controllers/rolesController.js`

Gestiona la tabla `roles` y la relación `roles_permisos` (permisos asignados).

```javascript
import db from '../config/db.js';

const TABLE = 'roles';

export async function listarRoles(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 25;
    const search = req.query.search || '';

    let query = db(TABLE);
    let countQuery = db(TABLE);
    if (search) {
      query = query.where('nombre', 'like', `%${search}%`);
      countQuery = countQuery.where('nombre', 'like', `%${search}%`);
    }
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count);
    const offset = (page - 1) * pageSize;
    const rows = await query.orderBy('id', 'asc').offset(offset).limit(pageSize).select('*');

    const withPermisos = await Promise.all(rows.map(async (r) => {
      const permisos = await db('roles_permisos')
        .join('permisos', 'roles_permisos.permiso_id', 'permisos.id')
        .where({ 'roles_permisos.rol_id': r.id })
        .select('permisos.id', 'permisos.nombre');
      return { ...r, permisos };
    }));

    return res.status(200).json({ status: true, data: { rows: withPermisos, total, page, pageSize } });
  } catch (err) {
    console.log('Error al listar roles:', err);
    return res.status(200).json({ status: false, error: 'Error al listar roles' });
  }
}

export async function obtenerRol(req, res) {
  try {
    const { id } = req.params;
    const rol = await db(TABLE).where({ id }).first();
    if (!rol) return res.status(200).json({ status: false, error: 'Rol no encontrado' });
    const permisos = await db('roles_permisos')
      .join('permisos', 'roles_permisos.permiso_id', 'permisos.id')
      .where({ 'roles_permisos.rol_id': id })
      .select('permisos.id', 'permisos.nombre');
    return res.status(200).json({ status: true, data: { ...rol, permisos } });
  } catch (err) {
    console.log('Error al obtener rol:', err);
    return res.status(200).json({ status: false, error: 'Error al obtener rol' });
  }
}

export async function crearRol(req, res) {
  try {
    const { nombre, descripcion, permiso_ids = [] } = req.body;
    if (!nombre) return res.status(200).json({ status: false, error: 'nombre es requerido' });

    const existe = await db(TABLE).where({ nombre }).first();
    if (existe) return res.status(200).json({ status: false, error: 'El rol ya existe' });

    const [id] = await db(TABLE).insert({ nombre, descripcion });
    for (const permiso_id of permiso_ids) {
      await db('roles_permisos').insert({ rol_id: id, permiso_id });
    }
    return res.status(200).json({ status: true, data: { id, message: 'Rol creado correctamente' } });
  } catch (err) {
    console.log('Error al crear rol:', err);
    return res.status(200).json({ status: false, error: 'Error al crear rol' });
  }
}

export async function actualizarRol(req, res) {
  try {
    const { id } = req.params;
    const existente = await db(TABLE).where({ id }).first();
    if (!existente) return res.status(200).json({ status: false, error: 'Rol no encontrado' });

    const { nombre, descripcion, permiso_ids } = req.body;
    const payload = {};
    if (nombre !== undefined) payload.nombre = nombre;
    if (descripcion !== undefined) payload.descripcion = descripcion;
    await db(TABLE).where({ id }).update(payload);

    if (Array.isArray(permiso_ids)) {
      await db('roles_permisos').where({ rol_id: id }).del();
      for (const permiso_id of permiso_ids) {
        await db('roles_permisos').insert({ rol_id: id, permiso_id });
      }
    }

    return res.status(200).json({ status: true, data: { message: 'Rol actualizado correctamente' } });
  } catch (err) {
    console.log('Error al actualizar rol:', err);
    return res.status(200).json({ status: false, error: 'Error al actualizar rol' });
  }
}

export async function eliminarRol(req, res) {
  try {
    const { id } = req.params;
    const existente = await db(TABLE).where({ id }).first();
    if (!existente) return res.status(200).json({ status: false, error: 'Rol no encontrado' });
    await db(TABLE).where({ id }).del();
    return res.status(200).json({ status: true, data: { message: 'Rol eliminado correctamente' } });
  } catch (err) {
    console.log('Error al eliminar rol:', err);
    return res.status(200).json({ status: false, error: 'Error al eliminar rol' });
  }
}
```

### 14b.3. Controlador de permisos — `src/controllers/permisosController.js`

Gestiona la tabla `permisos`.

```javascript
import db from '../config/db.js';

const TABLE = 'permisos';

export async function listarPermisos(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 25;
    const search = req.query.search || '';

    let query = db(TABLE);
    let countQuery = db(TABLE);
    if (search) {
      query = query.where('nombre', 'like', `%${search}%`);
      countQuery = countQuery.where('nombre', 'like', `%${search}%`);
    }
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count);
    const offset = (page - 1) * pageSize;
    const rows = await query.orderBy('nombre', 'asc').offset(offset).limit(pageSize).select('*');
    return res.status(200).json({ status: true, data: { rows, total, page, pageSize } });
  } catch (err) {
    console.log('Error al listar permisos:', err);
    return res.status(200).json({ status: false, error: 'Error al listar permisos' });
  }
}

export async function obtenerPermiso(req, res) {
  try {
    const { id } = req.params;
    const permiso = await db(TABLE).where({ id }).first();
    if (!permiso) return res.status(200).json({ status: false, error: 'Permiso no encontrado' });
    return res.status(200).json({ status: true, data: permiso });
  } catch (err) {
    console.log('Error al obtener permiso:', err);
    return res.status(200).json({ status: false, error: 'Error al obtener permiso' });
  }
}

export async function crearPermiso(req, res) {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre) return res.status(200).json({ status: false, error: 'nombre es requerido' });
    const existe = await db(TABLE).where({ nombre }).first();
    if (existe) return res.status(200).json({ status: false, error: 'El permiso ya existe' });
    const [id] = await db(TABLE).insert({ nombre, descripcion });
    return res.status(200).json({ status: true, data: { id, message: 'Permiso creado correctamente' } });
  } catch (err) {
    console.log('Error al crear permiso:', err);
    return res.status(200).json({ status: false, error: 'Error al crear permiso' });
  }
}

export async function actualizarPermiso(req, res) {
  try {
    const { id } = req.params;
    const existente = await db(TABLE).where({ id }).first();
    if (!existente) return res.status(200).json({ status: false, error: 'Permiso no encontrado' });
    const { nombre, descripcion } = req.body;
    const payload = {};
    if (nombre !== undefined) payload.nombre = nombre;
    if (descripcion !== undefined) payload.descripcion = descripcion;
    await db(TABLE).where({ id }).update(payload);
    return res.status(200).json({ status: true, data: { message: 'Permiso actualizado correctamente' } });
  } catch (err) {
    console.log('Error al actualizar permiso:', err);
    return res.status(200).json({ status: false, error: 'Error al actualizar permiso' });
  }
}

export async function eliminarPermiso(req, res) {
  try {
    const { id } = req.params;
    const existente = await db(TABLE).where({ id }).first();
    if (!existente) return res.status(200).json({ status: false, error: 'Permiso no encontrado' });
    await db(TABLE).where({ id }).del();
    return res.status(200).json({ status: true, data: { message: 'Permiso eliminado correctamente' } });
  } catch (err) {
    console.log('Error al eliminar permiso:', err);
    return res.status(200).json({ status: false, error: 'Error al eliminar permiso' });
  }
}
```

### 14b.4. Rutas RBAC

Cada router recibe `sso` para usar `sso.requirePermission`. Montarlos en `src/index.js`.

`src/routes/usuarios.js`:

```javascript
import { Router } from 'express';
import {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
} from '../controllers/usuariosController.js';

export default function crearRutas(sso) {
  const router = Router();
  router.get('/list', sso.requirePermission('usuarios.ver'), listarUsuarios);
  router.get('/:id', sso.requirePermission('usuarios.ver'), obtenerUsuario);
  router.post('/', sso.requirePermission('usuarios.crear'), crearUsuario);
  router.put('/:id', sso.requirePermission('usuarios.editar'), actualizarUsuario);
  router.delete('/:id', sso.requirePermission('usuarios.eliminar'), eliminarUsuario);
  return router;
}
```

`src/routes/roles.js`:

```javascript
import { Router } from 'express';
import {
  listarRoles,
  obtenerRol,
  crearRol,
  actualizarRol,
  eliminarRol,
} from '../controllers/rolesController.js';

export default function crearRutas(sso) {
  const router = Router();
  router.get('/list', sso.requirePermission('roles.ver'), listarRoles);
  router.get('/:id', sso.requirePermission('roles.ver'), obtenerRol);
  router.post('/', sso.requirePermission('roles.crear'), crearRol);
  router.put('/:id', sso.requirePermission('roles.editar'), actualizarRol);
  router.delete('/:id', sso.requirePermission('roles.eliminar'), eliminarRol);
  return router;
}
```

`src/routes/permisos.js`:

```javascript
import { Router } from 'express';
import {
  listarPermisos,
  obtenerPermiso,
  crearPermiso,
  actualizarPermiso,
  eliminarPermiso,
} from '../controllers/permisosController.js';

export default function crearRutas(sso) {
  const router = Router();
  router.get('/list', sso.requirePermission('permisos.ver'), listarPermisos);
  router.get('/:id', sso.requirePermission('permisos.ver'), obtenerPermiso);
  router.post('/', sso.requirePermission('permisos.crear'), crearPermiso);
  router.put('/:id', sso.requirePermission('permisos.editar'), actualizarPermiso);
  router.delete('/:id', sso.requirePermission('permisos.eliminar'), eliminarPermiso);
  return router;
}
```

Montaje en `src/index.js` (los routers reciben `sso`):

```javascript
app.use('/api/usuarios', crearRutas(sso));
app.use('/api/roles', crearRutas(sso));
app.use('/api/permisos', crearRutas(sso));
```

## 15. Scripts en `package.json`

> Las migraciones se ejecutan **automáticamente** al iniciar el servidor (`npm run dev` / `npm start`) vía `db.migrate.latest()` en `src/index.js`.  
> Los scripts `migrate` y `migrate:rollback` son solo para uso manual de emergencia.

```json
{
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "setup-db": "node src/scripts/setup-db.js",
    "setup-dev": "node src/scripts/setup-db.js && node src/index.js",
    "migrate": "knex migrate:latest",
    "migrate:rollback": "knex migrate:rollback",
    "seed": "knex seed:run",
    "lint": "eslint src/"
  }
}
```

## 16. `.gitignore`

```
node_modules/
.env
```

## 17. ESLint — `eslint.config.js`

```javascript
import globals from 'globals';
import js from '@eslint/js';

export default [
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  js.configs.recommended,
];
```

Instalar dependencias adicionales de ESLint:

```bash
npm install -D globals @eslint/js
```

## 18. Estructura final

```
<proyecto>/
├── .env
├── .env.example
├── .gitignore
├── eslint.config.js
├── knexfile.js
├── package.json
├── src/
│   ├── index.js
│   ├── config/
│   │   ├── cors.js
│   │   ├── db.js
│   │   └── env.js
│   ├── controllers/
│   │   ├── preferenciasController.js
│   │   ├── usuariosController.js
│   │   ├── rolesController.js
│   │   └── permisosController.js
│   ├── migrations/
│   │   └── XXXX_init.js
│   ├── routes/
│   │   ├── preferencias.js
│   │   ├── usuarios.js
│   │   ├── roles.js
│   │   └── permisos.js
│   ├── scripts/
│   │   └── setup-db.js
│   └── seeds/
│       ├── preferencias.js
│       └── rbac.js
└── node_modules/
documentacion/
    └── DOCUMENTACION.md
```

## 19. Verificación obligatoria

Ejecutar los siguientes comandos en orden y **confirmar que cada uno devuelva el resultado esperado**. Si algún comando falla, abortar y notificar el error.

```bash
cd <nombre-proyecto>
```

| # | Comando | Resultado esperado |
|---|---------|-------------------|
| 1 | `node src/index.js` (dejar correr 3s, luego Ctrl+C) | En consola: `[migrate] Migraciones ejecutadas correctamente.`, `[seed] ... RBAC ...` y `Servidor corriendo en puerto 4000` |
| 2 | `npx knex seed:run` | Seeds ejecutadas sin errores. Tabla `knex_seeds` registrada |
| 3 | `npm run lint` | `0 errors`, `0 warnings` o solo advertencias menores |
| 4 | Verificar archivo `.env.example` | Existe en raíz, contiene todas las variables con valores ejemplo |
| 5 | Verificar `.gitignore` | Contiene `node_modules/` y `.env` |
| 6 | Leer `documentacion/DOCUMENTACION.md` | Existe con todas las secciones completas |
| 7 | Verificar `src/config/env.js` | Lee solo de `.env` vía `dotenv.parse()` + `fs.readFileSync()`. No usa `process.env` |
| 8 | Verificar `src/index.js` | `db.migrate.latest()` se ejecuta dentro de `async function start()` antes de `app.listen()` |
| 9 | Verificar `createSsoAuth` | Usa `express-greenborn-sso-back@1.6.0`, `rbac: true`, `localLogin` con bcrypt y monta `sso.router` en `/api/user` |
| 10 | Verificar seed RBAC | `src/seeds/rbac.js` crea roles, permisos, enlaza todos los permisos a ADMIN y crea el usuario admin |
| 11 | Verificar CRUD | Existen `usuariosController.js`, `rolesController.js`, `permisosController.js` y rutas con `sso.requirePermission` |

**Validación de endpoints (servidor corriendo):**

```bash
# Iniciar servidor en segundo plano
node src/index.js &
SERVER_PID=$!
sleep 2

# Health check
curl -s http://localhost:4000/health
# → {"status":true,"data":{"timestamp":"..."}}

# Ruta protegida sin token → 401
curl -s http://localhost:4000/api/user/me
# → {"success":false,"message":"Token de autenticación requerido"}

# Login local del admin (creado por seed) → token con roles/permisos
TOKEN=$(curl -s -X POST http://localhost:4000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.token))")

# /me con token admin → roles: ["ADMIN"] y permisos con todos
curl -s http://localhost:4000/api/user/me -H "Authorization: Bearer $TOKEN"

# CRUD RBAC con token admin → status true
curl -s "http://localhost:4000/api/usuarios/list?page=1&pageSize=10" -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:4000/api/roles/list?page=1&pageSize=10" -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:4000/api/permisos/list?page=1&pageSize=10" -H "Authorization: Bearer $TOKEN"

# Ruta por rol con token admin → 200
curl -s http://localhost:4000/api/admin -H "Authorization: Bearer $TOKEN"

# Sin token en ruta de permiso → 401
curl -s http://localhost:4000/api/usuarios/list
# → {"success":false,"message":"Token de autenticación requerido"}

# Detener servidor
kill $SERVER_PID 2>/dev/null
```

> La autenticación también se valida con un bearer token SSO (flujo de `vue-greenborn-sso-front`). El usuario admin se autentica localmente con `POST /api/user/login`.

## 20. Documentación básica — `documentacion/DOCUMENTACION.md`

```markdown
# <nombre-proyecto>

Backend Express + SSO (express-greenborn-sso-back) con MariaDB/Knex.

## REQUISITOS

- Node.js ≥ 18
- MariaDB/MySQL
- Cuenta SSO Greenborn (para autenticación)

## CONFIGURACION

1. Copiar `.env.example` a `.env` y completar variables.
2. `npm install`
3. `npm run setup-db`
4. `npm run dev`

## VARIABLES DE ENTORNO

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto del servidor |
| `CORS_ORIGIN` | Origen permitido para CORS |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión a MariaDB |
| `URL_AUTH_SERVICE` | Servidor SSO Greenborn |
| `SSO_ROLE_MAP` | Mapeo de roles `{email: role_id, "*@dominio": role_id}` |
| `DEFAULT_ROLE_ID` | Rol por defecto (3 = Concursante) |
| `SSO_RBAC` | Habilita RBAC (`true` por defecto en este skill) |
| `SOCKET_PATH`, `SOCKET_CORS` | WebSocket (si habilitado) |

> Credenciales admin por defecto (fijas en `src/seeds/rbac.js`): `admin` / `Admin123!`. Opcionalmente se sobreescriben con `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

## SCRIPTS

- `npm run dev` / `npm start`: levanta el servidor (migra automáticamente)
- `npm run setup-db`: crea BD y usuario local
- `npm run migrate` / `migrate:rollback`: migraciones manuales
- `npm run seed`: ejecuta seeds

## ENDPOINTS

### SSO (`/api/user`, del paquete express-greenborn-sso-back)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/me` | Bearer | Usuario autenticado (con `roles[]` y `permisos[]`) |
| GET | `/sso-profile` | Bearer + `unique_id` | Verifica perfil local |
| POST | `/register` | Bearer | Registro SSO |
| POST | `/login` | No | Login local (usuario/contraseña) → token |
| POST | `/logout` | Bearer + `unique_id` | Cierra sesión |

### Propios

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| GET | `/api/protected` | `authMiddleware` | Ejemplo de ruta protegida |
| GET | `/api/projects` | `authMiddleware` + `requirePermission('proyectos.ver')` | Ejemplo de autorización por permiso |
| GET | `/api/admin` | `authMiddleware` + `requireRole('ADMIN')` | Ejemplo de autorización por rol |
| GET | `/api/preferencias/definiciones` | `authMiddleware` | Lista preferencias |
| GET/POST | `/api/preferencias/mias` | `authMiddleware` | Preferencias del usuario |
| GET | `/api/usuarios/list` | `requirePermission('usuarios.ver')` | Usuarios paginados |
| GET | `/api/usuarios/:id` | `requirePermission('usuarios.ver')` | Usuario por id |
| POST | `/api/usuarios` | `requirePermission('usuarios.crear')` | Crear usuario |
| PUT | `/api/usuarios/:id` | `requirePermission('usuarios.editar')` | Actualizar usuario |
| DELETE | `/api/usuarios/:id` | `requirePermission('usuarios.eliminar')` | Eliminar usuario |
| GET | `/api/roles/list` | `requirePermission('roles.ver')` | Roles paginados |
| GET | `/api/roles/:id` | `requirePermission('roles.ver')` | Rol por id |
| POST | `/api/roles` | `requirePermission('roles.crear')` | Crear rol |
| PUT | `/api/roles/:id` | `requirePermission('roles.editar')` | Actualizar rol |
| DELETE | `/api/roles/:id` | `requirePermission('roles.eliminar')` | Eliminar rol |
| GET | `/api/permisos/list` | `requirePermission('permisos.ver')` | Permisos paginados |
| GET | `/api/permisos/:id` | `requirePermission('permisos.ver')` | Permiso por id |
| POST | `/api/permisos` | `requirePermission('permisos.crear')` | Crear permiso |
| PUT | `/api/permisos/:id` | `requirePermission('permisos.editar')` | Actualizar permiso |
| DELETE | `/api/permisos/:id` | `requirePermission('permisos.eliminar')` | Eliminar permiso |

## BASE DE DATOS

### Tablas

- `user` — usuarios (del paquete SSO, incluye `password_hash` para login local)
- `profile` — perfiles (del paquete SSO)
- `user_tokens` — tokens locales (del paquete SSO)
- `roles`, `permisos` — roles y permisos (RBAC M2M)
- `usuarios_roles`, `roles_permisos` — relaciones M2M (RBAC)
- `gb_sso_log_actividad` — registro de actividad (si `activityLog` activo)
- `preferencias_permitidas`, `preferencias_usuario` — preferencias propias

## ESTRUCTURA

- `src/index.js` — arranque + SSO + RBAC + login local + WebSocket
- `src/config/` — env, db, cors
- `src/controllers/`, `src/routes/` — preferencias y CRUD usuarios/roles/permisos
- `src/seeds/` — preferencias + rbac (roles, permisos y admin)
- `src/migrations/`, — esquema y datos iniciales

## DEPENDENCIAS

- `express`, `cors`, `knex`, `mysql2`, `dotenv`
- `express-greenborn-sso-back@1.6.0`
- `bcryptjs` (hash de contraseñas del login local)
- `socket.io` (si `ws-habilitado`)
```

## Reglas obligatorias

- **Sesiones**: siempre usar `express-greenborn-sso-back@1.6.0`. No implementar JWT propio ni módulo RBAC manual.
- **RBAC por defecto**: habilitar `rbac: true` en `createSsoAuth`; el esquema M2M (`roles`, `permisos`, `usuarios_roles`, `roles_permisos`) lo gestiona el paquete SSO.
- **Login local**: habilitar `localLogin` con bcrypt para que el admin (y demás usuarios) se autentiquen por contraseña.
- **Admin con todos los permisos**: el seed `rbac.js` debe crear el rol ADMIN y asignarle todos los permisos, y crear el usuario admin enlazado a ese rol.
- **CRUD usuarios/roles/permisos**: se protegen con `sso.requirePermission('<x>.ver/crear/editar/eliminar')`.
- El esquema de usuarios (`user`, `profile`, `user_tokens`) lo gestiona el paquete SSO.
- Las migraciones se ejecutan automáticamente en cada inicio.
- Preguntar siempre por WebSocket en el paso 0 si no se proporciona.
- Si `ws-habilitado` es `true`, adjuntar socket.io al mismo `http.Server` y exponer funciones vía `socket.onFunction`.
