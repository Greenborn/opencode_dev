import express from 'express';

const noop = (_req, _res, next) => next();

/**
 * Crea el router Express con las rutas de Web Push.
 * IMPORTANTE (seguridad): si no se inyecta `authMiddleware`, las rutas quedan
 * SIN PROTECCIÓN (modo noop, solo para desarrollo/demo). En producción siempre
 * pasar un authMiddleware real — ver README, sección "Seguridad".
 */
export function createRouter(ctx, service) {
  const { authMiddleware, userField = 'usuario', logger } = ctx;
  const { vapidPublicKey, estaConfigurado, suscribir, desuscribir, enviarPushATodos } = service;

  const log = logger && typeof logger.error === 'function' ? logger : console;

  if (!authMiddleware) {
    log.warn?.(
      '[notificaciones] authMiddleware no fue provisto: el router de push quedará SIN autenticación. No usar así en producción.'
    );
  }

  const auth = authMiddleware || noop;
  const router = express.Router();

  function getUsuarioId(req) {
    return req[userField]?.id;
  }

  router.get('/vapid-public-key', auth, (_req, res) => {
    res.status(200).json({
      status: true,
      data: { publicKey: vapidPublicKey(), configurado: estaConfigurado() },
    });
  });

  router.post('/suscripcion', auth, async (req, res) => {
    const usuarioId = getUsuarioId(req);
    const { endpoint, keys } = req.body || {};

    if (!usuarioId) {
      return res.status(200).json({ status: false, error: `req.${userField}.id no está presente (revisar authMiddleware/userField)` });
    }
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(200).json({ status: false, error: 'endpoint, keys.p256dh y keys.auth son requeridos' });
    }

    await suscribir({
      usuarioId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({ status: true, data: { message: 'Suscripción registrada' } });
  });

  router.delete('/suscripcion', auth, async (req, res) => {
    const usuarioId = getUsuarioId(req);
    const { endpoint } = req.body || {};

    if (!endpoint) {
      return res.status(200).json({ status: false, error: 'endpoint es requerido' });
    }

    await desuscribir({ usuarioId, endpoint });
    res.status(200).json({ status: true, data: { message: 'Suscripción eliminada' } });
  });

  router.post('/prueba', auth, async (req, res) => {
    if (!estaConfigurado()) {
      return res.status(200).json({ status: false, error: 'Push no configurado en el servidor (faltan claves VAPID)' });
    }
    const resultado = await enviarPushATodos({
      titulo: req.body?.titulo || 'Notificación de prueba',
      mensaje: req.body?.mensaje || 'Esta es una notificación de prueba.',
    });
    res.status(200).json({ status: true, data: resultado });
  });

  return router;
}
