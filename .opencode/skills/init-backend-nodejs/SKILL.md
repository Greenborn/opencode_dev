---
name: init-backend-nodejs
description: Inicializar un backend Node.js con Express, MariaDB vía Knex, CORS, migraciones automáticas y sesiones SSO (express-greenborn-sso-back)
requires: []
---

# Skill: Inicializar backend Node.js con Express + SSO

Usar cuando el usuario pida **crear un backend Node.js desde cero** con Express, conexión a MariaDB vía Knex, CORS, migraciones automáticas al inicio y **sistema de sesiones SSO** (integrado con `express-greenborn-sso-back`).

> **Sesiones**: cuando el proyecto requiere autenticación/sesiones, se usa el paquete `express-greenborn-sso-back@1.1.0`. Este paquete incluye el sistema de usuarios local (`user`, `profile`, `user_tokens`), validación de tokens SSO/locales, sincronización del usuario y mapeo de roles. **No** se escribe un sistema JWT propio ni un módulo RBAC manual.

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
npm install express cors knex mysql2 dotenv express-greenborn-sso-back@1.1.0
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
# Mapeo de roles: {"email": role_id, "*@dominio": role_id}
SSO_ROLE_MAP={"admin@greenborn.com.ar":1}
DEFAULT_ROLE_ID=3

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

Se configura `createSsoAuth` con la instancia de Knex y el mapeo de roles, se monta el router SSO (`/api/user`: `/me`, `/sso-profile`, `/register`) y se protegen rutas con `sso.authMiddleware`. Si `<ws-habilitado>` es `true`, se adjunta socket.io al mismo `http.Server`.

```javascript
import express from 'express';
import { createSsoAuth } from 'express-greenborn-sso-back';
import config from './config/env.js';
import corsMiddleware from './config/cors.js';
import db from './config/db.js';
import preferenciasRoutes from './routes/preferencias.js';
import { seedPreferencias } from './seeds/preferencias.js';

const app = express();

app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sistema de sesiones SSO (incluye usuarios locales, sincronización y roles)
const sso = createSsoAuth({
  knex: db,
  ssoBaseUrl: config.ssoBaseUrl,
  ssoRoleMap: config.ssoRoleMap,
  defaultRoleId: config.defaultRoleId,
  logger: console,
});

// Router SSO: GET /api/user/me, GET /api/user/sso-profile, POST /api/user/register
app.use('/api/user', sso.router);

// Rutas propias
app.use('/api/preferencias', preferenciasRoutes);

// Ejemplo de ruta protegida con el middleware SSO
app.get('/api/protected', sso.authMiddleware, (req, res) => {
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
    console.error('[seed] Error al crear datos iniciales:', err.message);
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

Crea las tablas del sistema de usuarios del paquete SSO (`user`, `profile`, `user_tokens`) y las tablas propias de la app (`preferencias_*`).

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
      table.integer('role_id').unsigned().defaultTo(3);
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
    .dropTableIfExists('user_tokens')
    .dropTableIfExists('user')
    .dropTableIfExists('profile');
}
```

Para generar el archivo automáticamente:

```bash
npx knex migrate:make init
```

> Los roles se asignan mediante `SSO_ROLE_MAP` / `defaultRoleId` (el paquete SSO asigna `role_id` al sincronizar). No se crea un módulo RBAC manual.

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
│   │   └── preferenciasController.js
│   ├── migrations/
│   │   └── XXXX_init.js
│   ├── routes/
│   │   └── preferencias.js
│   ├── scripts/
│   │   └── setup-db.js
│   └── seeds/
│       └── preferencias.js
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
| 1 | `node src/index.js` (dejar correr 3s, luego Ctrl+C) | En consola: `[migrate] Migraciones ejecutadas correctamente.` y `Servidor corriendo en puerto 4000` |
| 2 | `npx knex seed:run` | Seeds ejecutadas sin errores. Tabla `knex_seeds` registrada |
| 3 | `npm run lint` | `0 errors`, `0 warnings` o solo advertencias menores |
| 4 | Verificar archivo `.env.example` | Existe en raíz, contiene todas las variables con valores ejemplo |
| 5 | Verificar `.gitignore` | Contiene `node_modules/` y `.env` |
| 6 | Leer `documentacion/DOCUMENTACION.md` | Existe con todas las secciones completas |
| 7 | Verificar `src/config/env.js` | Lee solo de `.env` vía `dotenv.parse()` + `fs.readFileSync()`. No usa `process.env` |
| 8 | Verificar `src/index.js` | `db.migrate.latest()` se ejecuta dentro de `async function start()` antes de `app.listen()` |
| 9 | Verificar `createSsoAuth` | Usa `express-greenborn-sso-back@1.1.0`, monta `sso.router` en `/api/user` y protege rutas con `sso.authMiddleware` |

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

# Detener servidor
kill $SERVER_PID 2>/dev/null
```

> La autenticación real se valida con un bearer token SSO/local (flujo de `vue-greenborn-sso-front`). Ver `GET /api/user/me` con `Authorization: Bearer <token>`.

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
| `SOCKET_PATH`, `SOCKET_CORS` | WebSocket (si habilitado) |

## SCRIPTS

- `npm run dev` / `npm start`: levanta el servidor (migra automáticamente)
- `npm run setup-db`: crea BD y usuario local
- `npm run migrate` / `migrate:rollback`: migraciones manuales
- `npm run seed`: ejecuta seeds

## ENDPOINTS

### SSO (`/api/user`, del paquete express-greenborn-sso-back)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/me` | Bearer | Usuario autenticado |
| GET | `/sso-profile` | Bearer + `unique_id` | Verifica perfil local |
| POST | `/register` | Bearer | Registro SSO |

### Propios

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| GET | `/api/protected` | `authMiddleware` | Ejemplo de ruta protegida |
| GET | `/api/preferencias/definiciones` | `authMiddleware` | Lista preferencias |
| GET/POST | `/api/preferencias/mias` | `authMiddleware` | Preferencias del usuario |

## BASE DE DATOS

### Tablas

- `user` — usuarios (del paquete SSO)
- `profile` — perfiles (del paquete SSO)
- `user_tokens` — tokens locales (del paquete SSO)
- `preferencias_permitidas`, `preferencias_usuario` — preferencias propias

## ESTRUCTURA

- `src/index.js` — arranque + SSO + WebSocket
- `src/config/` — env, db, cors
- `src/controllers/`, `src/routes/` — preferencias
- `src/migrations/`, `src/seeds/` — esquema y datos iniciales

## DEPENDENCIAS

- `express`, `cors`, `knex`, `mysql2`, `dotenv`
- `express-greenborn-sso-back@1.1.0`
- `socket.io` (si `ws-habilitado`)
```

## Reglas obligatorias

- **Sesiones**: siempre usar `express-greenborn-sso-back@1.1.0`. No implementar JWT propio ni módulo RBAC manual.
- El esquema de usuarios (`user`, `profile`, `user_tokens`) lo gestiona el paquete SSO.
- Las migraciones se ejecutan automáticamente en cada inicio.
- Preguntar siempre por WebSocket en el paso 0 si no se proporciona.
- Si `ws-habilitado` es `true`, adjuntar socket.io al mismo `http.Server` y exponer funciones vía `socket.onFunction`.
