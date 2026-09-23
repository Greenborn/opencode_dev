import 'dotenv/config';
import express from 'express';
import knex from 'knex';
import { createGaleriaImage } from '../src/index.js';

const app = express();
const port = process.env.SERVICE_PORT || 5175; // AGENTS.md: todas las demos usan 5175

// Conexión a la base de datos local (se inyecta a createGaleriaImage).
// El paquete NO crea su propia conexión; usa la del host.
const db = knex({
  client: (process.env.DB_CLIENT || 'mysql2').toLowerCase(),
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
});

// Demo en modo standalone (sin RBAC): no se inyectan middlewares.
// Para el modo con RBAC ver el README: se pasan middlewares de
// express-greenborn-sso-back en options.middlewares.
const galeria = createGaleriaImage({
  knex: db,
  logger: console,
  uploadDir: process.env.GALERIA_UPLOAD_DIR || 'uploads/galeria',
  publicBaseUrl: process.env.GALERIA_PUBLIC_BASE_URL || `http://localhost:${port}`,
});

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    package: 'express-greenborn-galeria-image',
    rootPath: galeria.rootPath,
    config: galeria.config,
  });
});

// Monta el router completo de la galería:
//   GET    /api/galeria-imagenes              (listado paginado)
//   GET    /api/galeria-imagenes/:id          (detalle)
//   POST   /api/galeria-imagenes              (subida multipart campo "imagen")
//   PATCH  /api/galeria-imagenes/:id          (metadatos)
//   DELETE /api/galeria-imagenes/:id          (baja + archivos)
//   GET    /api/galeria-imagenes/archivos/:filename
//   GET    /api/galeria-imagenes/archivos/thumbnails/:filename
app.use(galeria.rootPath, galeria.galeriaRouter);

app.listen(port, () => {
  console.log(`Demo express-greenborn-galeria-image en http://localhost:${port}`);
  console.log(`  - GET    ${galeria.rootPath}?page=1&limit=24&seccion=&q=  (listado)`);
  console.log(`  - POST   ${galeria.rootPath}  (multipart/form-data, campo "imagen")`);
  console.log(`  - GET    ${galeria.rootPath}/archivos/:filename           (archivos)`);
  console.log(`  - GET    /health`);
});
