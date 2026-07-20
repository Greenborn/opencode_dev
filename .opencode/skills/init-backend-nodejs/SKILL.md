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
npm install -D nodemon eslint
```

## 3. Archivo `.env`

```
PORT=3000
CORS_ORIGIN=*
JWT_SECRET=mi_secreto_jwt_cambiar_en_produccion
JWT_EXPIRES_IN=8h

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

const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
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
import { seedRbac } from './seeds/rbac.js';
import adminRoutes from './routes/admin.js';

const required = ['JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Falta ${key} en .env`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

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
    await seedRbac();
    await seedAdmin();
  } catch (err) {
    console.error('[seed] Error al crear datos iniciales:', err.message);
  }

  app.get('/health', (req, res) => {
    res.json({ status: true, data: { timestamp: new Date().toISOString() } });
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
  return knex.schema
    .createTable('usuarios', (table) => {
      table.increments('id').primary();
      table.string('username', 50).unique().notNullable();
      table.string('password', 255).notNullable();
      table.timestamps(true, true);
    })
    .createTable('roles', (table) => {
      table.increments('id').primary();
      table.string('nombre', 50).unique().notNullable();
      table.string('descripcion', 255);
      table.timestamps(true, true);
    })
    .createTable('permisos', (table) => {
      table.increments('id').primary();
      table.string('nombre', 100).unique().notNullable();
      table.string('descripcion', 255);
      table.timestamps(true, true);
    })
    .createTable('usuarios_roles', (table) => {
      table.integer('usuario_id').unsigned().references('id').inTable('usuarios').onDelete('CASCADE');
      table.integer('rol_id').unsigned().references('id').inTable('roles').onDelete('CASCADE');
      table.primary(['usuario_id', 'rol_id']);
    })
    .createTable('roles_permisos', (table) => {
      table.integer('rol_id').unsigned().references('id').inTable('roles').onDelete('CASCADE');
      table.integer('permiso_id').unsigned().references('id').inTable('permisos').onDelete('CASCADE');
      table.primary(['rol_id', 'permiso_id']);
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('roles_permisos')
    .dropTableIfExists('usuarios_roles')
    .dropTableIfExists('permisos')
    .dropTableIfExists('roles')
    .dropTableIfExists('usuarios');
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
  const [adminRol] = await db('roles').where({ nombre: 'ADMIN' });
  if (!adminRol) {
    console.log('[seed] Rol ADMIN no encontrado, ejecuta seedRbac primero.');
    return;
  }

  let [usuario] = await db('usuarios').where({ username: 'admin' });
  if (!usuario) {
    const hash = await bcrypt.hash('admin123', 10);
    const [id] = await db('usuarios').insert({
      username: 'admin',
      password: hash,
    });
    usuario = { id };
    console.log('[seed] Usuario admin creado (admin / admin123).');
  } else {
    console.log('[seed] Usuario admin ya existe.');
  }

  const [relacion] = await db('usuarios_roles').where({ usuario_id: usuario.id, rol_id: adminRol.id });
  if (!relacion) {
    await db('usuarios_roles').insert({ usuario_id: usuario.id, rol_id: adminRol.id });
    console.log('[seed] Rol ADMIN asignado a admin.');
  }

  const [usuarioRol] = await db('roles').where({ nombre: 'USUARIO' });
  if (!usuarioRol) {
    console.log('[seed] Rol USUARIO no encontrado.');
    return;
  }

  let [user] = await db('usuarios').where({ username: 'usuario' });
  if (!user) {
    const hash = await bcrypt.hash('usuario123', 10);
    const [id] = await db('usuarios').insert({
      username: 'usuario',
      password: hash,
    });
    user = { id };
    console.log('[seed] Usuario usuario creado (usuario / usuario123).');
  }

  const [relUser] = await db('usuarios_roles').where({ usuario_id: user.id, rol_id: usuarioRol.id });
  if (!relUser) {
    await db('usuarios_roles').insert({ usuario_id: user.id, rol_id: usuarioRol.id });
    console.log('[seed] Rol USUARIO asignado a usuario.');
  }
}
```

> Seed ejecutado automaticamente al iniciar el servidor (en \`src/index.js\`). Usuarios por defecto: \`admin\` / \`admin123\` (rol ADMIN) y \`usuario\` / \`usuario123\` (rol USUARIO).

## 11. Semilla de roles y permisos — `src/seeds/rbac.js`

```javascript
import db from '../config/db.js';

export async function seedRbac() {
  const roles = [
    { nombre: 'ADMIN', descripcion: 'Acceso total al sistema' },
    { nombre: 'USUARIO', descripcion: 'Acceso basico al sistema' },
  ];

  for (const rol of roles) {
    const [existente] = await db('roles').where({ nombre: rol.nombre });
    if (!existente) {
      await db('roles').insert(rol);
      console.log(`[seed] Rol ${rol.nombre} creado.`);
    }
  }

  const permisos = [
    { nombre: 'usuarios.ver', descripcion: 'Ver listado de usuarios' },
    { nombre: 'usuarios.editar', descripcion: 'Editar usuarios' },
    { nombre: 'usuarios.eliminar', descripcion: 'Eliminar usuarios' },
    { nombre: 'perfil.ver', descripcion: 'Ver propio perfil' },
    { nombre: 'perfil.editar', descripcion: 'Editar propio perfil' },
    { nombre: 'usuarios.crear', descripcion: 'Crear usuarios' },
    { nombre: 'roles.ver', descripcion: 'Ver listado de roles' },
    { nombre: 'roles.crear', descripcion: 'Crear roles' },
    { nombre: 'roles.editar', descripcion: 'Editar roles' },
    { nombre: 'roles.eliminar', descripcion: 'Eliminar roles' },
    { nombre: 'permisos.ver', descripcion: 'Ver listado de permisos' },
  ];

  for (const perm of permisos) {
    const [existente] = await db('permisos').where({ nombre: perm.nombre });
    if (!existente) {
      await db('permisos').insert(perm);
      console.log(`[seed] Permiso ${perm.nombre} creado.`);
    }
  }

  const [adminRol] = await db('roles').where({ nombre: 'ADMIN' });
  const [usuarioRol] = await db('roles').where({ nombre: 'USUARIO' });

  const todosPermisos = await db('permisos');

  for (const perm of todosPermisos) {
    const [existeAdmin] = await db('roles_permisos').where({ rol_id: adminRol.id, permiso_id: perm.id });
    if (!existeAdmin) {
      await db('roles_permisos').insert({ rol_id: adminRol.id, permiso_id: perm.id });
    }
  }

  const permisosUsuario = ['perfil.ver', 'perfil.editar'];
  for (const nombrePerm of permisosUsuario) {
    const perm = await db('permisos').where({ nombre: nombrePerm }).first();
    if (perm) {
      const [existe] = await db('roles_permisos').where({ rol_id: usuarioRol.id, permiso_id: perm.id });
      if (!existe) {
        await db('roles_permisos').insert({ rol_id: usuarioRol.id, permiso_id: perm.id });
      }
    }
  }

  console.log('[seed] Roles y permisos inicializados.');
}
```

## 12. Middleware de autenticación — `src/middleware/auth.js`

```javascript
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

export default function authMiddleware(...permisosRequeridos) {
  return async function (req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(200).json({ status: false, error: 'Token requerido' });
    }

    try {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.usuario = decoded;

      if (permisosRequeridos.length === 0) {
        return next();
      }

      const roles = await db('usuarios_roles')
        .join('roles', 'usuarios_roles.rol_id', 'roles.id')
        .where('usuarios_roles.usuario_id', decoded.id)
        .select('roles.id', 'roles.nombre');

      const rolIds = roles.map((r) => r.id);

      if (rolIds.length === 0) {
        return res.status(200).json({ status: false, error: 'Acceso denegado: sin roles asignados' });
      }

      const permisos = await db('roles_permisos')
        .join('permisos', 'roles_permisos.permiso_id', 'permisos.id')
        .whereIn('roles_permisos.rol_id', rolIds)
        .whereIn('permisos.nombre', permisosRequeridos)
        .select('permisos.nombre');

      const tienePermiso = permisosRequeridos.every((p) =>
        permisos.some((perm) => perm.nombre === p)
      );

      if (!tienePermiso) {
        return res.status(200).json({ status: false, error: 'Acceso denegado: permisos insuficientes' });
      }

      next();
    } catch (err) {
      return res.status(200).json({ status: false, error: 'Token invalido o expirado' });
    }
  };
}
```

## 13. Controlador de autenticación — `src/controllers/authController.js`

```javascript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

export async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(200).json({ status: false, error: 'Usuario y contrasena requeridos' });
  }

  const usuario = await db('usuarios').where({ username }).first();
  if (!usuario) {
    return res.status(200).json({ status: false, error: 'Credenciales invalidas' });
  }

  const valida = await bcrypt.compare(password, usuario.password);
  if (!valida) {
    return res.status(200).json({ status: false, error: 'Credenciales invalidas' });
  }

  const roles = await db('usuarios_roles')
    .join('roles', 'usuarios_roles.rol_id', 'roles.id')
    .where('usuarios_roles.usuario_id', usuario.id)
    .select('roles.nombre');

  const token = jwt.sign(
    { id: usuario.id, username: usuario.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.status(200).json({
    status: true,
    data: {
      token,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        roles: roles.map((r) => r.nombre),
      },
    },
  });
}

export async function perfil(req, res) {
  const usuario = await db('usuarios')
    .where({ id: req.usuario.id })
    .select('id', 'username', 'created_at', 'updated_at')
    .first();

  if (!usuario) {
    return res.status(200).json({ status: false, error: 'Usuario no encontrado' });
  }

  const roles = await db('usuarios_roles')
    .join('roles', 'usuarios_roles.rol_id', 'roles.id')
    .where('usuarios_roles.usuario_id', usuario.id)
    .select('roles.nombre');

  const permisos = await db('usuarios_roles')
    .join('roles_permisos', 'usuarios_roles.rol_id', 'roles_permisos.rol_id')
    .join('permisos', 'roles_permisos.permiso_id', 'permisos.id')
    .where('usuarios_roles.usuario_id', usuario.id)
    .select('permisos.nombre')
    .distinct();

  res.status(200).json({
    status: true,
    data: {
      ...usuario,
      roles: roles.map((r) => r.nombre),
      permisos: permisos.map((p) => p.nombre),
    },
  });
}

export async function actualizarPerfil(req, res) {
  const { username, passwordActual, passwordNuevo } = req.body;

  const usuario = await db('usuarios').where({ id: req.usuario.id }).first();
  if (!usuario) {
    return res.status(200).json({ status: false, error: 'Usuario no encontrado' });
  }

  if (username && username !== usuario.username) {
    const existe = await db('usuarios').where({ username }).first();
    if (existe) {
      return res.status(200).json({ status: false, error: 'El nombre de usuario ya esta en uso' });
    }
  }

  if (passwordNuevo) {
    if (!passwordActual) {
      return res.status(200).json({ status: false, error: 'Debes proporcionar la contrasena actual para cambiarla' });
    }
    const valida = await bcrypt.compare(passwordActual, usuario.password);
    if (!valida) {
      return res.status(200).json({ status: false, error: 'Contrasena actual incorrecta' });
    }
  }

  const actualizar = {};
  if (username) actualizar.username = username;
  if (passwordNuevo) actualizar.password = await bcrypt.hash(passwordNuevo, 10);

  if (Object.keys(actualizar).length === 0) {
    return res.status(200).json({ status: false, error: 'No hay datos para actualizar' });
  }

  await db('usuarios').where({ id: req.usuario.id }).update(actualizar);

  res.status(200).json({ status: true, data: { message: 'Perfil actualizado correctamente' } });
}
```

## 14. Rutas de autenticación — `src/routes/auth.js`

```javascript
import { Router } from 'express';
import { login, perfil, actualizarPerfil } from '../controllers/authController.js';
import authMiddleware from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.get('/perfil', authMiddleware('perfil.ver'), perfil);
router.put('/perfil', authMiddleware('perfil.editar'), actualizarPerfil);

export default router;
```

## 15. Controlador de administracion — `src/controllers/adminController.js`

```javascript
import bcrypt from 'bcryptjs';
import db from '../config/db.js';

export async function listarUsuarios(req, res) {
  const usuarios = await db('usuarios')
    .select('id', 'username', 'created_at', 'updated_at');

  for (const u of usuarios) {
    const roles = await db('usuarios_roles')
      .join('roles', 'usuarios_roles.rol_id', 'roles.id')
      .where('usuarios_roles.usuario_id', u.id)
      .select('roles.id', 'roles.nombre');
    u.roles = roles;
  }

  res.status(200).json({ status: true, data: usuarios });
}

export async function crearUsuario(req, res) {
  const { username, password, rolIds } = req.body;
  if (!username || !password) {
    return res.status(200).json({ status: false, error: 'Usuario y contrasena requeridos' });
  }

  const existe = await db('usuarios').where({ username }).first();
  if (existe) {
    return res.status(200).json({ status: false, error: 'El nombre de usuario ya existe' });
  }

  const hash = await bcrypt.hash(password, 10);
  const [id] = await db('usuarios').insert({ username, password: hash });

  if (rolIds && rolIds.length > 0) {
    const inserts = rolIds.map((rolId) => ({ usuario_id: id, rol_id: rolId }));
    await db('usuarios_roles').insert(inserts);
  }

  res.status(200).json({ status: true, data: { id, username } });
}

export async function actualizarUsuario(req, res) {
  const { id } = req.params;
  const { username, password, rolIds } = req.body;

  const usuario = await db('usuarios').where({ id }).first();
  if (!usuario) {
    return res.status(200).json({ status: false, error: 'Usuario no encontrado' });
  }

  if (username && username !== usuario.username) {
    const existe = await db('usuarios').where({ username }).first();
    if (existe) {
      return res.status(200).json({ status: false, error: 'El nombre de usuario ya existe' });
    }
  }

  const actualizar = {};
  if (username) actualizar.username = username;
  if (password) actualizar.password = await bcrypt.hash(password, 10);

  if (Object.keys(actualizar).length > 0) {
    await db('usuarios').where({ id }).update(actualizar);
  }

  if (rolIds !== undefined) {
    await db('usuarios_roles').where({ usuario_id: id }).del();
    if (rolIds.length > 0) {
      const inserts = rolIds.map((rolId) => ({ usuario_id: id, rol_id: rolId }));
      await db('usuarios_roles').insert(inserts);
    }
  }

  res.status(200).json({ status: true, data: { message: 'Usuario actualizado correctamente' } });
}

export async function eliminarUsuario(req, res) {
  const { id } = req.params;
  const usuario = await db('usuarios').where({ id }).first();
  if (!usuario) {
    return res.status(200).json({ status: false, error: 'Usuario no encontrado' });
  }

  await db('usuarios').where({ id }).del();
  res.status(200).json({ status: true, data: { message: 'Usuario eliminado correctamente' } });
}

export async function listarRoles(req, res) {
  const roles = await db('roles').select('*');
  for (const rol of roles) {
    const permisos = await db('roles_permisos')
      .join('permisos', 'roles_permisos.permiso_id', 'permisos.id')
      .where('roles_permisos.rol_id', rol.id)
      .select('permisos.id', 'permisos.nombre');
    rol.permisos = permisos;
  }
  res.status(200).json({ status: true, data: roles });
}

export async function crearRol(req, res) {
  const { nombre, descripcion, permisoIds } = req.body;
  if (!nombre) {
    return res.status(200).json({ status: false, error: 'Nombre del rol requerido' });
  }

  const existe = await db('roles').where({ nombre }).first();
  if (existe) {
    return res.status(200).json({ status: false, error: 'El rol ya existe' });
  }

  const [id] = await db('roles').insert({ nombre, descripcion });

  if (permisoIds && permisoIds.length > 0) {
    const inserts = permisoIds.map((permisoId) => ({ rol_id: id, permiso_id: permisoId }));
    await db('roles_permisos').insert(inserts);
  }

  res.status(200).json({ status: true, data: { id, nombre } });
}

export async function actualizarRol(req, res) {
  const { id } = req.params;
  const { nombre, descripcion, permisoIds } = req.body;

  const rol = await db('roles').where({ id }).first();
  if (!rol) {
    return res.status(200).json({ status: false, error: 'Rol no encontrado' });
  }

  const actualizar = {};
  if (nombre) actualizar.nombre = nombre;
  if (descripcion !== undefined) actualizar.descripcion = descripcion;

  if (Object.keys(actualizar).length > 0) {
    await db('roles').where({ id }).update(actualizar);
  }

  if (permisoIds !== undefined) {
    await db('roles_permisos').where({ rol_id: id }).del();
    if (permisoIds.length > 0) {
      const inserts = permisoIds.map((permisoId) => ({ rol_id: id, permiso_id: permisoId }));
      await db('roles_permisos').insert(inserts);
    }
  }

  res.status(200).json({ status: true, data: { message: 'Rol actualizado correctamente' } });
}

export async function eliminarRol(req, res) {
  const { id } = req.params;
  const rol = await db('roles').where({ id }).first();
  if (!rol) {
    return res.status(200).json({ status: false, error: 'Rol no encontrado' });
  }

  await db('roles').where({ id }).del();
  res.status(200).json({ status: true, data: { message: 'Rol eliminado correctamente' } });
}

export async function listarPermisos(req, res) {
  const permisos = await db('permisos').select('*');
  res.status(200).json({ status: true, data: permisos });
}
```

## 16. Rutas de administracion — `src/routes/admin.js`

```javascript
import { Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  listarUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario,
  listarRoles, crearRol, actualizarRol, eliminarRol,
  listarPermisos,
} from '../controllers/adminController.js';

const router = Router();

router.get('/usuarios', authMiddleware('usuarios.ver'), listarUsuarios);
router.post('/usuarios', authMiddleware('usuarios.crear'), crearUsuario);
router.put('/usuarios/:id', authMiddleware('usuarios.editar'), actualizarUsuario);
router.delete('/usuarios/:id', authMiddleware('usuarios.eliminar'), eliminarUsuario);

router.get('/roles', authMiddleware('roles.ver'), listarRoles);
router.post('/roles', authMiddleware('roles.crear'), crearRol);
router.put('/roles/:id', authMiddleware('roles.editar'), actualizarRol);
router.delete('/roles/:id', authMiddleware('roles.eliminar'), eliminarRol);

router.get('/permisos', authMiddleware('permisos.ver'), listarPermisos);

export default router;
```

## 17. Scripts en `package.json`

```json
{
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "setup-db": "node src/scripts/setup-db.js",
    "setup-dev": "node src/scripts/setup-db.js && npx knex migrate:latest && node src/index.js",
    "migrate": "knex migrate:latest",
    "migrate:rollback": "knex migrate:rollback",
    "seed": "knex seed:run",
    "lint": "eslint src/"
  }
}
```

## 18. `.gitignore`

```
node_modules/
.env
```

## 19. ESLint — `eslint.config.js`

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

## 20. Estructura final

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
│   │   └── db.js
│   ├── controllers/
│   │   ├── adminController.js
│   │   └── authController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── migrations/
│   │   └── XXXX_init.js
│   ├── routes/
│   │   ├── admin.js
│   │   └── auth.js
│   ├── scripts/
│   │   └── setup-db.js
│   └── seeds/
│       ├── admin.js
│       └── rbac.js
└── node_modules/
```

## 21. Documentación básica — `DOCUMENTACION.md`

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
| `JWT_EXPIRES_IN` | Tiempo de expiracion del token JWT | `8h` |
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
| `npm run setup-dev` | Crea BD, ejecuta migraciones e inicia servidor |
| `npm run migrate` | Ejecuta migraciones pendientes |
| `npm run migrate:rollback` | Revierte ultima migracion |
| `npm run seed` | Ejecuta seeders |
| `npm run lint` | Analiza el codigo con ESLint |

## ENDPOINTS

### Sistema

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| GET | `/health` | Health check del servidor | No |

### Auth

| Metodo | Ruta | Descripcion | Auth | Permisos |
|--------|------|-------------|------|----------|
| POST | `/api/auth/login` | Iniciar sesion | No | - |
| GET | `/api/auth/perfil` | Obtener perfil del usuario autenticado (incluye roles y permisos) | Si | `perfil.ver` |
| PUT | `/api/auth/perfil` | Actualizar username y/o password | Si | `perfil.editar` |

### Admin

| Metodo | Ruta | Descripcion | Auth | Permisos |
|--------|------|-------------|------|----------|
| GET | `/api/admin/usuarios` | Listar todos los usuarios | Si | `usuarios.ver` |
| POST | `/api/admin/usuarios` | Crear un nuevo usuario | Si | `usuarios.crear` |
| PUT | `/api/admin/usuarios/:id` | Actualizar usuario (username, password, roles) | Si | `usuarios.editar` |
| DELETE | `/api/admin/usuarios/:id` | Eliminar un usuario | Si | `usuarios.eliminar` |
| GET | `/api/admin/roles` | Listar todos los roles con sus permisos | Si | `roles.ver` |
| POST | `/api/admin/roles` | Crear un nuevo rol | Si | `roles.crear` |
| PUT | `/api/admin/roles/:id` | Actualizar rol (nombre, descripcion, permisos) | Si | `roles.editar` |
| DELETE | `/api/admin/roles/:id` | Eliminar un rol | Si | `roles.eliminar` |
| GET | `/api/admin/permisos` | Listar todos los permisos | Si | `permisos.ver` |

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
├── eslint.config.js
├── knexfile.js
├── package.json
├── src/
│   ├── index.js
│   ├── config/
│   │   ├── cors.js
│   │   └── db.js
│   ├── controllers/
│   │   ├── adminController.js
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
│       ├── admin.js
│       └── rbac.js
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
| eslint | - (dev) | Analisis de codigo |
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
