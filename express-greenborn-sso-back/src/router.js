import express from 'express';
import { getBearerToken, filterSensitive } from './utils.js';

export function createRouter(ctx, service, middleware) {
  const router = express.Router();
  const { sensitiveFields } = ctx;
  const { verifySsoToken, syncSsoUser, findLocalUserByToken, normalizeUniqueId } = service;
  const { authMiddleware } = middleware;

  // GET /me — Devuelve el usuario autenticado (requiere authMiddleware)
  router.get('/me', authMiddleware, (req, res) => {
    res.json({ success: true, user: filterSensitive(req.user, sensitiveFields) });
  });

  // GET /sso-profile — Busca usuario local por email del SSO sin crearlo
  router.get('/sso-profile', async (req, res) => {
    const token = getBearerToken(req);
    const uniqueId = req.query?.unique_id;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Token requerido' });
    }
    if (!uniqueId) {
      return res.status(400).json({ success: false, message: 'unique_id requerido' });
    }

    try {
      const response = await verifySsoToken(token, uniqueId);

      if (!response.data?.success || !response.data?.data?.valid) {
        return res.status(401).json({ success: false, message: 'Token SSO inválido' });
      }

      const ssoUser = response.data.data.user;
      const localUser = await ctx.knex(ctx.tables.user).where({ email: ssoUser.email }).first();

      if (!localUser) {
        return res.json({ success: true, exists: false, user: null });
      }

      return res.json({ success: true, exists: true, user: filterSensitive(localUser, sensitiveFields) });
    } catch (error) {
      const ssoBody = error.response?.data;
      (ctx.logger?.error || console.error)(`[SSO-Profile] Error: ${JSON.stringify(ssoBody) || error.message}`);
      return res.status(500).json({ success: false, message: 'Error al verificar SSO', error: ssoBody || error.message });
    }
  });

  // POST /register — Registro SSO (rama SSO del register de GFC-Back)
  router.post('/register', async (req, res) => {
    const { email, username, name, sso, unique_id } = req.body || {};

    if (!email || !username) {
      return res.status(400).json({ success: false, message: 'Email y username son requeridos' });
    }

    try {
      const existing = await ctx.knex(ctx.tables.user).where({ email }).first();
      if (existing) {
        return res.status(409).json({ success: false, message: 'El email ya está registrado' });
      }

      if (sso) {
        const token = getBearerToken(req);
        if (!token) {
          return res.status(401).json({ success: false, message: 'Token SSO requerido' });
        }
        if (!unique_id) {
          return res.status(400).json({ success: false, message: 'unique_id requerido para registro SSO' });
        }

        try {
          const verifyRes = await verifySsoToken(token, unique_id);
          if (!verifyRes.data?.success || !verifyRes.data?.data?.valid) {
            return res.status(401).json({ success: false, message: 'Token SSO inválido' });
          }
        } catch (ssoErr) {
          const ssoBody = ssoErr.response?.data;
          (ctx.logger?.error || console.error)(`[Register] Error SSO: ${JSON.stringify(ssoBody) || ssoErr.message}`);
          return res.status(401).json({ success: false, message: 'Token SSO inválido' });
        }
      }

      const user = await syncSsoUser({ email, name: name || username });

      (ctx.logger?.log || console.log)(`[Register] registro SSO — ${email}`);
      return res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        user: filterSensitive(user, sensitiveFields),
      });
    } catch (error) {
      (ctx.logger?.error || console.error)('[Register] Error:', error);
      return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  });

  return router;
}
