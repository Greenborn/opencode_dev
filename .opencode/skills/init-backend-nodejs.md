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

## Reglas obligatorias

- **Usar ESM** (`import`/`export`) con `"type": "module"` en package.json.
- **Validar variables de entorno** requeridas al arrancar — fallar con mensaje claro si falta alguna.
- **Migraciones automáticas:** ejecutar `db.migrate.latest()` dentro de un `async function start()` antes de levantar el servidor.
- **CORS configurable** por variable de entorno `CORS_ORIGIN`.
- **Driver MariaDB:** usar `mysql2` como cliente de Knex.
- **No hardcodear configuraciones:** todo debe ir en `.env`.
- **Separar responsabilidades:** rutas en `routes/`, lógica en `controllers/`, middlewares en `middleware/`, config en `config/`.
