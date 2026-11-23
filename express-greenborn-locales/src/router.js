import express from 'express';
import { normalizarCamposLocal, normalizarTerminos, validarUbicacion } from './config.js';
import { dtoPublicoLocal, filtrarCambiosLocal } from './privacidad.js';

/**
 * Router de locales:
 *   GET    {mount}/mis-locales        -> locales del usuario autenticado
 *   POST   {mount}/mis-locales        -> crea un local (publicado=false por defecto)
 *   PUT    {mount}/mis-locales/:id    -> edita un local propio
 *   DELETE {mount}/mis-locales/:id    -> elimina un local propio
 *   GET    {mount}/publicos           -> listado público (sólo publicados)
 *   GET    {mount}/publico/:id        -> detalle público (sólo publicados)
 *
 * opciones: { repo, auth, camposExtra?, publicosExtra?, terminos?, propietarioColumn?, logger? }
 * Montar en la ruta que elija el proyecto: app.use('/api', router).
 */
export function createLocalesRouter({
  repo,
  auth,
  camposExtra,
  publicosExtra,
  terminos,
  propietarioColumn = 'propietario_id',
  logger = console,
} = {}) {
  if (!repo) throw new Error('createLocalesRouter: falta repo');
  if (typeof auth !== 'function') throw new Error('createLocalesRouter: falta auth (middleware)');
  const { campos, publicos } = normalizarCamposLocal(camposExtra, publicosExtra);
  const term = normalizarTerminos(terminos);
  const router = express.Router();

  const esPropio = (fila, userId) => fila && String(fila[propietarioColumn]) === String(userId);

  router.get('/mis-locales', auth, async (req, res) => {
    try {
      res.json(await repo.listarPorPropietario(req.user.id));
    } catch (err) {
      logger.error('[locales] GET mis-locales', err);
      res.status(500).json({ error: `No se pudieron obtener los ${term.plural}` });
    }
  });

  router.post('/mis-locales', auth, async (req, res) => {
    try {
      const error = validarUbicacion(req.body || {});
      if (error) return res.status(400).json({ error });
      const datos = { ...filtrarCambiosLocal(req.body, campos), [propietarioColumn]: req.user.id, publicado: false };
      res.status(201).json(await repo.crear(datos));
    } catch (err) {
      logger.error('[locales] POST mis-locales', err);
      res.status(500).json({ error: `No se pudo crear el ${term.singular}` });
    }
  });

  router.put('/mis-locales/:id', auth, async (req, res) => {
    try {
      const fila = await repo.obtener(req.params.id);
      if (!fila) return res.status(404).json({ error: `${term.singular} no encontrado` });
      if (!esPropio(fila, req.user.id)) return res.status(403).json({ error: 'Sin permiso' });
      const error = validarUbicacion({ ...fila, ...(req.body || {}) });
      if (error) return res.status(400).json({ error });
      const cambios = filtrarCambiosLocal(req.body, campos);
      res.json(await repo.actualizar(req.params.id, cambios));
    } catch (err) {
      logger.error('[locales] PUT mis-locales', err);
      res.status(500).json({ error: `No se pudo guardar el ${term.singular}` });
    }
  });

  router.delete('/mis-locales/:id', auth, async (req, res) => {
    try {
      const fila = await repo.obtener(req.params.id);
      if (!fila) return res.status(404).json({ error: `${term.singular} no encontrado` });
      if (!esPropio(fila, req.user.id)) return res.status(403).json({ error: 'Sin permiso' });
      await repo.eliminar(req.params.id);
      res.status(204).end();
    } catch (err) {
      logger.error('[locales] DELETE mis-locales', err);
      res.status(500).json({ error: `No se pudo eliminar el ${term.singular}` });
    }
  });

  router.get('/publicos', async (req, res) => {
    try {
      const filas = await repo.listarPublicados({ ciudad: req.query.ciudad });
      res.json(filas.map((f) => dtoPublicoLocal(f, publicos)).filter(Boolean));
    } catch (err) {
      logger.error('[locales] GET publicos', err);
      res.status(500).json({ error: 'Error interno' });
    }
  });

  router.get('/publico/:id', async (req, res) => {
    try {
      const dto = dtoPublicoLocal(await repo.obtener(req.params.id), publicos);
      if (!dto) return res.status(404).json({ error: `${term.singular} no encontrado` });
      res.json(dto);
    } catch (err) {
      logger.error('[locales] GET publico', err);
      res.status(500).json({ error: 'Error interno' });
    }
  });

  return router;
}
