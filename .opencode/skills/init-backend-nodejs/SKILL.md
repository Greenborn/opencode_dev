---
name: init-backend-nodejs
description: Inicializar un backend Node.js con Express, MariaDB vía Knex, CORS y migraciones automáticas
---

# Skill: Inicializar backend Node.js con Express

Usar cuando el usuario pida **crear un backend Node.js desde cero** con Express, conexión a MariaDB vía Knex, CORS, y migraciones automáticas al inicio.

---

## 1. Crear estructura del proyecto

```bash
mkdir -p src/{config,routes,controllers,middleware}
cd <nombre-proyecto>
npm init -y
```

Agregar `"type": "module"` en `package.json` para usar ESM.

## 2. Instalar dependencias

```bash
npm install express cors knex mysql2 dotenv
npm install -D nodemon
```

## 3. Archivo `.env`

```
PORT=3000
CORS_ORIGIN=*

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=mi_app
```

Crear también `.env.example` con la misma estructura (sin valores sensibles) y agregar `.env` al `.gitignore`.

## 4. Configuración de Knex — `knexfile.js`

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

## 5. Configuración de BD — `src/config/db.js`

```javascript
import knex from 'knex';
import config from '../../knexfile.js';

const db = knex(config);
export default db;
```

## 6. Configuración de CORS — `src/config/cors.js`

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

## 7. Servidor con migraciones automáticas — `src/index.js`

```javascript
import 'dotenv/config';
import express from 'express';
import corsMiddleware from './config/cors.js';
import db from './config/db.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function start() {
  try {
    console.log('[migrate] Ejecutando migraciones pendientes...');
    await db.migrate.latest();
    console.log('[migrate] Migraciones ejecutadas correctamente.');
  } catch (err) {
    console.error('[migrate] Error:', err.message);
    process.exit(1);
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

## 8. Migración de ejemplo — `src/migrations/XXXXXXXXXXXXXX_init.js`

```javascript
export function up(knex) {
  return knex.schema.createTable('usuarios', (table) => {
    table.increments('id').primary();
    table.string('nombre', 100).notNullable();
    table.string('email', 150).unique().notNullable();
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

## 9. Scripts en `package.json`

```json
{
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "migrate": "knex migrate:latest",
    "migrate:rollback": "knex migrate:rollback",
    "seed": "knex seed:run"
  }
}
```

## 10. `.gitignore`

```
node_modules/
.env
```

## 11. Estructura final

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
│   ├── middleware/
│   ├── migrations/
│   │   └── XXXX_init.js
│   └── routes/
└── node_modules/
```

## 12. Documentación básica — `DOCUMENTACION.md`

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
| 4 | `npm run migrate` |
| 5 | `npm run seed` (opcional) |
| 6 | `npm run dev` |

## VARIABLES DE ENTORNO

| Variable | Descripcion | Valor ejemplo |
|----------|-------------|---------------|
| `PORT` | Puerto del servidor | `3000` |
| `CORS_ORIGIN` | Origenes permitidos CORS | `*` |
| `DB_HOST` | Host de base de datos | `localhost` |
| `DB_PORT` | Puerto de base de datos | `3306` |
| `DB_USER` | Usuario de base de datos | `root` |
| `DB_PASSWORD` | Contrasena de base de datos | |
| `DB_NAME` | Nombre de base de datos | `mi_app` |

Ver archivo `.env.example` para referencia.

## SCRIPTS

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Inicia servidor con recarga automatica |
| `npm start` | Inicia servidor en produccion |
| `npm run migrate` | Ejecuta migraciones pendientes |
| `npm run migrate:rollback` | Revierte ultima migracion |
| `npm run seed` | Ejecuta seeders |

## ENDPOINTS

### Sistema

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| GET | `/health` | Health check del servidor | No |

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
│   ├── middleware/
│   ├── migrations/
│   │   └── <timestamp>_init.js
│   └── routes/
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
