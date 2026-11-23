import express from 'express';
import { normalizarCampos, normalizarTerminos } from './config.js';
import { dtoPublico, filtrarCambios } from './privacidad.js';

/**
 * Router de perfil:
 *   GET  {base}/mi-perfil        -> perfil del usuario autenticado (lo crea si no existe)
 *   PUT  {base}/mi-perfil        -> actualiza sólo campos editables e interruptores
 *   GET  {base}/publico/:id      -> salida pública filtrada por la lista blanca
 *
 * Se monta en la ruta que elija el proyecto, p. ej. app.use('/api/perfil', router).
 * opciones: { repo, auth, campos, terminos?, logger? }
 * `auth` es un middleware Express que deja `req.user.id`.
 */
export function createPerfilRouter({ repo, auth, campos, terminos, logger = console } = {}) {
  if (!repo) throw new Error('createPerfilRouter: falta repo');
  if (typeof auth !== 'function') throw new Error('createPerfilRouter: falta auth (middleware)');
  const lista = normalizarCampos(campos);
  const term = normalizarTerminos(terminos);
  const router = express.Router();

  router.get('/mi-perfil', auth, async (req, res) => {
    try {
      const userId = req.user.id;
      const fila = (await repo.obtenerPorUsuario(userId)) || (await repo.crear(userId));
      res.json(fila);
    } catch (err) {
      logger.error('[perfil] GET mi-perfil', err);
      res.status(500).json({ error: `No se pudo obtener el ${term.singular}` });
    }
  });

  router.put('/mi-perfil', auth, async (req, res) => {
    try {
      const cambios = filtrarCambios(req.body, lista);
      const fila = await repo.actualizar(req.user.id, cambios);
      if (!fila) return res.status(404).json({ error: `No hay ${term.singular} para actualizar` });
      res.json(fila);
    } catch (err) {
      logger.error('[perfil] PUT mi-perfil', err);
      res.status(500).json({ error: `No se pudo guardar el ${term.singular}` });
    }
  });

  router.get('/publico/:id', async (req, res) => {
    try {
      const fila = await repo.obtenerPorId(req.params.id);
      if (!fila) return res.status(404).json({ error: `${term.singular} no encontrado` });
      res.json(dtoPublico(fila, lista));
    } catch (err) {
      logger.error('[perfil] GET publico', err);
      res.status(500).json({ error: 'Error interno' });
    }
  });

  return router;
}
