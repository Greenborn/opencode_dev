import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveConfig, sanitizeFilename, buildFileUrl, DEFAULTS } from '../src/config.js';
import { normalizeLogger } from '../src/logger.js';

test('resolveConfig usa defaults y env vars', () => {
  const cfg = resolveConfig({}, {});
  assert.equal(cfg.uploadDir, DEFAULTS.uploadDir);
  assert.equal(cfg.maxFileSize, DEFAULTS.maxFileSize);
  assert.deepEqual(cfg.allowedMimeTypes, DEFAULTS.allowedMimeTypes);

  const cfgEnv = resolveConfig({}, { GALERIA_UPLOAD_DIR: '/tmp/gal', GALERIA_THUMBNAIL_WIDTH: '800' });
  assert.equal(cfgEnv.uploadDir, '/tmp/gal');
  assert.equal(cfgEnv.thumbnailWidth, 800);

  const cfgOpt = resolveConfig({ thumbnailWidth: 200 }, {});
  assert.equal(cfgOpt.thumbnailWidth, 200);
  assert.equal(cfgOpt.rootPath, DEFAULTS.rootPath);
});

test('resolveConfig normaliza publicBaseUrl sin slash final', () => {
  const cfg = resolveConfig({ publicBaseUrl: 'https://midominio.com/' }, {});
  assert.equal(cfg.publicBaseUrl, 'https://midominio.com');
});

test('sanitizeFilename limpia rutas y caracteres peligrosos', () => {
  assert.equal(sanitizeFilename('../../etc/passwd'), 'passwd');
  assert.equal(sanitizeFilename('Foto Vacaciones!!.PNG'), 'foto-vacaciones.png');
  assert.equal(sanitizeFilename(''), 'imagen');
  assert.equal(sanitizeFilename(null), 'imagen');
});

test('buildFileUrl construye url original y thumbnail', () => {
  const cfg = resolveConfig({ publicBaseUrl: 'https://midominio.com' }, {});
  assert.equal(
    buildFileUrl(cfg, '1234-abc.jpg', false),
    'https://midominio.com/api/galeria-imagenes/archivos/1234-abc.jpg',
  );
  assert.equal(
    buildFileUrl(cfg, '1234-abc.jpg', true),
    'https://midominio.com/api/galeria-imagenes/archivos/thumbnails/1234-abc.jpg',
  );
});

test('normalizeLogger acepta console, función, objeto o nada', () => {
  const noopLogger = normalizeLogger(undefined);
  assert.equal(typeof noopLogger.info, 'function');

  const fnLogger = normalizeLogger(() => {});
  assert.equal(typeof fnLogger.error, 'function');

  const objLogger = normalizeLogger({ info: () => {}, error: () => {} });
  assert.equal(typeof objLogger.warn, 'function');
});
