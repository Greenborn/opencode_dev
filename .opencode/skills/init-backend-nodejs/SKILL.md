---
name: init-backend-nodejs
description: Inicializar un backend Node.js con Express, MariaDB vía Knex, CORS y migraciones automáticas
---

# Skill: Inicializar backend Node.js con Express

Usar cuando el usuario pida **crear un backend Node.js desde cero** con Express, conexión a MariaDB vía Knex, CORS, y migraciones automáticas al inicio.

---

## 0. Preguntar nombre del proyecto

Usar la herramienta `question` para preguntar al usuario qué nombre desea para el paquete del backend. La respuesta se usará como `<nombre-proyecto>` en todos los pasos siguientes.

Ejemplo de pregunta:

```
<question>
Pregunta: ¿Qué nombre deseas para el paquete del backend?
Header: Nombre del backend
```

> El valor ingresado reemplaza `<nombre-proyecto>` en el resto de la receta (nombre del directorio, carpeta del proyecto, package.json, etc.).

## 1. Crear estructura del proyecto

```bash
mkdir -p src/{config,routes,controllers,middleware,scripts}
cd <nombre-proyecto>
npm init -y
```

Agregar `"type": "module"` en `package.json` para usar ESM.

Fijar la versión inicial del proyecto editando `package.json` para que quede:

```json
{
  "name": "<nombre-proyecto>",
  "version": "1.0.0",
  ...
}
```

## 2. Instalar dependencias

```bash
npm install express cors knex mysql2 dotenv bcryptjs jsonwebtoken
npm install -D nodemon
```

## 3. Archivo `.env`

```
PORT=3000
CORS_ORIGIN=*
JWT_SECRET=mi_secreto_jwt_cambiar_en_produccion

DB_HOST=localhost
DB_PORT=3306
DB_USER=mi_usuario
DB_PASSWORD=mi_password
DB_NAME=mi_app
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
import 'dotenv/config';
import mysql from 'mysql2/promise';

async function setupDatabase() {
  const {
    DB_ROOT_USER = 'root',
    DB_ROOT_PASSWORD = '',
    DB_HOST = 'localhost',
    DB_PORT = '3306',
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
  } = process.env;

  if (!DB_USER || !DB_NAME) {
    console.error('Faltan DB_USER y/o DB_NAME en .env');
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: parseInt(DB_PORT),
    user: DB_ROOT_USER,
    password: DB_ROOT_PASSWORD,
  });

  try {
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`[setup-db] Base de datos "${DB_NAME}" lista.`);

    const [rows] = await connection.execute(
      `SELECT EXISTS(SELECT 1 FROM mysql.user WHERE user = ? AND host = ?) AS existe`,
      [DB_USER, '%']
    );
    const existe = rows[0].existe === 1 || rows[0].existe === '1';

    if (!existe) {
      await connection.execute(
        `CREATE USER ?@? IDENTIFIED BY ?`,
        [DB_USER, '%', DB_PASSWORD]
      );
      console.log(`[setup-db] Usuario "${DB_USER}" creado.`);
    } else {
      await connection.execute(
        `ALTER USER ?@? IDENTIFIED BY ?`,
        [DB_USER, '%', DB_PASSWORD]
      );
      console.log(`[setup-db] Contraseña de "${DB_USER}" actualizada.`);
    }

    await connection.execute(
      `GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO ?@?`,
      [DB_USER, '%']
    );
    await connection.execute('FLUSH PRIVILEGES');
    console.log(`[setup-db] Privilegios otorgados a "${DB_USER}" sobre "${DB_NAME}".`);
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

El script `setup-db` se ejecuta **una sola vez** al iniciar el proyecto en entorno dev, antes de las migraciones.

## 5. Configuración de Knex — `knexfile.js`

```javascript
import 'dotenv/config';

const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
for (const key of required) {
  if (!process.env[key]) {
    console.log(`Falta ${key} en .env`);
    process.exit(1);
  }
}

export default {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
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

## 7. Configuración de CORS — `src/config/cors.js`

```javascript
import cors from 'cors';

const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

export default cors(corsOptions);
```

## 8. Servidor con migraciones automáticas — `src/index.js`

```javascript
import 'dotenv/config';
import express from 'express';
import corsMiddleware from './config/cors.js';
import db from './config/db.js';
import authRoutes from './routes/auth.js';
import { seedAdmin } from './seeds/admin.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);

async function start() {
  try {
    console.log('[migrate] Ejecutando migraciones pendientes...');
    await db.migrate.latest();
    console.log('[migrate] Migraciones ejecutadas correctamente.');
  } catch (err) {
    console.error('[migrate] Error:', err.message);
    process.exit(1);
  }

  try {
    await seedAdmin();
  } catch (err) {
    console.error('[seed] Error al crear admin:', err.message);
  }

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
}

start();
```

## 9. Migración de ejemplo — `src/migrations/XXXXXXXXXXXXXX_init.js`

```javascript
export function up(knex) {
  return knex.schema.createTable('usuarios', (table) => {
    table.increments('id').primary();
    table.string('username', 50).unique().notNullable();
    table.string('password', 255).notNullable();
    table.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('usuarios');
}
```

Para generar el archivo automáticamente:

```bash
npx knex migrate:make init
```

## 10. Semilla de usuario admin — `src/seeds/admin.js`

```javascript
import bcrypt from 'bcryptjs';
import db from '../config/db.js';

export async function seedAdmin() {
  const [existentes] = await db('usuarios').where({ username: 'admin' });
  if (existentes) {
    console.log('[seed] Usuario admin ya existe.');
    return;
  }

  const hash = await bcrypt.hash('admin123', 10);
  await db('usuarios').insert({
    username: 'admin',
    password: hash,
  });
  console.log('[seed] Usuario admin creado (admin / admin123).');
}
```

> Seed ejecutado automáticamente al iniciar el servidor (en `src/index.js`). Usuario por defecto: `admin` / `admin123`.

## 11. Middleware de autenticación — `src/middleware/auth.js`

```javascript
import jwt from 'jsonwebtoken';

export default function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
```

## 12. Controlador de autenticación — `src/controllers/authController.js`

```javascript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

export async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  const usuario = await db('usuarios').where({ username }).first();
  if (!usuario) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const valida = await bcrypt.compare(password, usuario.password);
  if (!valida) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign(
    { id: usuario.id, username: usuario.username },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, usuario: { id: usuario.id, username: usuario.username } });
}

export async function perfil(req, res) {
  const usuario = await db('usuarios')
    .where({ id: req.usuario.id })
    .select('id', 'username', 'created_at', 'updated_at')
    .first();

  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  res.json(usuario);
}

export async function actualizarPerfil(req, res) {
  const { username, passwordActual, passwordNuevo } = req.body;

  const usuario = await db('usuarios').where({ id: req.usuario.id }).first();
  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  if (username && username !== usuario.username) {
    const existe = await db('usuarios').where({ username }).first();
    if (existe) {
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
    }
  }

  if (passwordNuevo) {
    if (!passwordActual) {
      return res.status(400).json({ error: 'Debes proporcionar la contraseña actual para cambiarla' });
    }
    const valida = await bcrypt.compare(passwordActual, usuario.password);
    if (!valida) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }
  }

  const actualizar = {};
  if (username) actualizar.username = username;
  if (passwordNuevo) actualizar.password = await bcrypt.hash(passwordNuevo, 10);

  if (Object.keys(actualizar).length === 0) {
    return res.status(400).json({ error: 'No hay datos para actualizar' });
  }

  await db('usuarios').where({ id: req.usuario.id }).update(actualizar);

  res.json({ message: 'Perfil actualizado correctamente' });
}
```

## 13. Rutas de autenticación — `src/routes/auth.js`

```javascript
import { Router } from 'express';
import { login, perfil, actualizarPerfil } from '../controllers/authController.js';
import authMiddleware from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.get('/perfil', authMiddleware, perfil);
router.put('/perfil', authMiddleware, actualizarPerfil);

export default router;
```

## 14. Scripts en `package.json`

```json
{
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "setup-db": "node src/scripts/setup-db.js",
    "migrate": "knex migrate:latest",
    "migrate:rollback": "knex migrate:rollback",
    "seed": "knex seed:run"
  }
}
```

## 15. `.gitignore`

```
node_modules/
.env
```

## 16. Estructura final

```
<proyecto>/
├── .env
├── .env.example
├── .gitignore
├── knexfile.js
├── package.json
├── src/
│   ├── index.js
│   ├── config/
│   │   ├── cors.js
│   │   └── db.js
│   ├── controllers/
│   │   └── authController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── migrations/
│   │   └── XXXX_init.js
│   ├── routes/
│   │   └── auth.js
│   ├── scripts/
│   │   └── setup-db.js
│   └── seeds/
│       └── admin.js
└── node_modules/
```

## 17. Documentación básica — `DOCUMENTACION.md`

Generar o actualizar el archivo `DOCUMENTACION.md` en la raíz del proyecto con la siguiente estructura. Este documento debe ser legible por humanos y fácilmente parseable por IA, usando secciones claras, metadatos estructurados y tablas consistentes.

```markdown
---
title: <nombre-proyecto>
type: backend
framework: Express + Knex + MariaDB
language: Node.js (ESM)
created: <fecha-actual>
---

# <nombre-proyecto>

Backend Node.js con Express, Knex y MariaDB.

---

## REQUISITOS

- Node.js >= 18
- MariaDB >= 10.6 / MySQL >= 8.0
- npm >= 9

## CONFIGURACION

| Paso | Accion |
|------|--------|
| 1 | `git clone <repo>` |
| 2 | `npm install` |
| 3 | Copiar `.env.example` a `.env` y completar variables |
| 4 | `npm run setup-db` (entorno dev, crea BD y usuario) |
| 5 | `npm run migrate` |
| 6 | `npm run seed` (opcional) |
| 7 | `npm run dev` |

## VARIABLES DE ENTORNO

| Variable | Descripcion | Valor ejemplo |
|----------|-------------|---------------|
| `PORT` | Puerto del servidor | `3000` |
| `CORS_ORIGIN` | Origenes permitidos CORS | `*` |
| `DB_HOST` | Host de base de datos | `localhost` |
| `DB_PORT` | Puerto de base de datos | `3306` |
| `DB_USER` | Usuario de base de datos | `root` |
| `DB_PASSWORD` | Contrasena de base de datos | |
| `JWT_SECRET` | Secreto para firmar tokens JWT | `mi_secreto_jwt` |
| `DB_NAME` | Nombre de base de datos | `mi_app` |
| `DB_ROOT_USER` | Usuario root de BD (solo setup-db) | `root` |
| `DB_ROOT_PASSWORD` | Contrasena root de BD (solo setup-db) | |

Ver archivo `.env.example` para referencia.

## SCRIPTS

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Inicia servidor con recarga automatica |
| `npm start` | Inicia servidor en produccion |
| `npm run setup-db` | Crea base de datos y usuario en entorno dev |
| `npm run migrate` | Ejecuta migraciones pendientes |
| `npm run migrate:rollback` | Revierte ultima migracion |
| `npm run seed` | Ejecuta seeders |

## ENDPOINTS

### Sistema

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| GET | `/health` | Health check del servidor | No |

### Auth

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/login` | Iniciar sesion (username + password) | No |
| GET | `/api/auth/perfil` | Obtener datos del usuario autenticado | Si |
| PUT | `/api/auth/perfil` | Actualizar username y/o password (requiere passwordActual para cambiar password) | Si |

### API

<!-- Listar aqui los endpoints de la API a medida que se agreguen rutas en src/routes/ -->

> Formato para agregar nuevos endpoints:
> | Metodo | Ruta | Descripcion | Auth |
> | GET | `/api/recurso` | Descripcion del recurso | Si/No |

## ESTRUCTURA

```
<proyecto>/
├── .env
├── .env.example
├── .gitignore
├── DOCUMENTACION.md
├── knexfile.js
├── package.json
├── src/
│   ├── index.js
│   ├── config/
│   │   ├── cors.js
│   │   └── db.js
│   ├── controllers/
│   │   └── authController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── migrations/
│   │   └── <timestamp>_init.js
│   ├── routes/
│   │   └── auth.js
│   ├── scripts/
│   │   └── setup-db.js
│   └── seeds/
│       └── admin.js
└── node_modules/
```

## DEPENDENCIAS

| Paquete | Version | Uso |
|---------|---------|-----|
| express | - | Framework web |
| cors | - | Middleware CORS |
| knex | - | Query builder / migraciones |
| mysql2 | - | Driver MariaDB/MySQL |
| dotenv | - | Variables de entorno |
| bcryptjs | - | Hashing de contrasenas |
| jsonwebtoken | - | Tokens JWT |
| nodemon | - (dev) | Recarga automatica |
```

Reglas para la documentación:
- El archivo `DOCUMENTACION.md` debe crearse **siempre** al generar el proyecto desde cero.
- Al agregar nuevas rutas/controladores, **insertar** los nuevos endpoints en la tabla `### API` manteniendo el formato uniforme.
- Mantener la sección `ESTRUCTURA` sincronizada con los directorios reales del proyecto.
- No eliminar secciones ni contenido agregado manualmente por el usuario.
- No usar acentos ni caracteres especiales en los titulos de seccion para facilitar el parseo automatico.

## Reglas obligatorias

- **Usar ESM** (`import`/`export`) con `"type": "module"` en package.json.
- **Validar variables de entorno** requeridas al arrancar — fallar con mensaje claro si falta alguna.
- **Migraciones automáticas:** ejecutar `db.migrate.latest()` dentro de un `async function start()` antes de levantar el servidor.
- **CORS configurable** por variable de entorno `CORS_ORIGIN`.
- **Driver MariaDB:** usar `mysql2` como cliente de Knex.
- **No hardcodear configuraciones:** todo debe ir en `.env`.
- **Separar responsabilidades:** rutas en `routes/`, lógica en `controllers/`, middlewares en `middleware/`, config en `config/`.
