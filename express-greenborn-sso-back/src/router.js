import express from 'express';
import { getBearerToken, filterSensitive } from './utils.js';

export function createRouter(ctx, service, middleware) {
  const router = express.Router();
  const { sensitiveFields, rbac, localLogin, ssoClient, logger } = ctx;
  const { verifySsoToken, syncSsoUser, findLocalUserByToken, normalizeUniqueId, resolveUserRoles, resolveUserPermissions, localLoginUser, deactivateToken } = service;
  const { authMiddleware } = middleware;
  const log = logger && typeof logger.error === 'function' ? logger : console;

  // POST /login — Login local (usuario/contraseña). Solo si localLogin está activo.
  if (localLogin) {
    router.post(localLogin.endpoint, async (req, res) => {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });
      }
      try {
        const result = await localLoginUser(username, password);
        if (!result) {
          return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }
        return res.status(200).json({
          success: true,
          data: {
            token: result.token,
            user: filterSensitive(result.user, sensitiveFields),
          },
        });
      } catch (error) {
        (ctx.logger?.error || console.error)('[Login] Error:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
      }
    });
  }

  // GET /me — Devuelve el usuario autenticado (requiere authMiddleware)
  router.get('/me', authMiddleware, async (req, res) => {
    let user = req.user;
    if (rbac && user) {
      const userId = user[rbac.userPk] ?? user.id;
      const [roles, permisos] = await Promise.all([
        resolveUserRoles(userId),
        resolveUserPermissions(userId),
      ]);
      user = {
        ...user,
        roles: roles.map((r) => r[rbac.roleNameCol] ?? r.nombre),
        permisos: permisos.map((p) => p[rbac.permissionNameCol] ?? p.nombre),
      };
    }
    res.json({ success: true, user: filterSensitive(user, sensitiveFields) });
  });

  // POST /logout — Cierra sesión. Revoca tokens de Google en el SSO si la
  // sesión es SSO (se detecta por req.authSource) y desactiva el token local.
  router.post('/logout', authMiddleware, async (req, res) => {
    const token = getBearerToken(req);
    const uniqueId = req.query?.unique_id;
    const results = { local: false, sso: false };

    try {
      if (req.authSource === 'sso') {
        if (!uniqueId) {
          return res.status(400).json({ success: false, message: 'unique_id requerido en query param' });
        }
        try {
          await ssoClient.logout(token, uniqueId);
          results.sso = true;
        } catch (ssoErr) {
          const ssoStatus = ssoErr.response?.status;
          const ssoBody = ssoErr.response?.data;
          if (ssoStatus === 400 && ssoBody?.error === 'MISSING_UNIQUE_ID') {
            return res.status(400).json({ success: false, message: 'unique_id requerido' });
          }
          if (ssoStatus === 401 && ssoBody?.error === 'UNIQUE_ID_MISMATCH') {
            return res.status(401).json({ success: false, message: 'unique_id no coincide con la sesión activa' });
          }
          log.error(`[Logout] Error al revocar en SSO (${ssoStatus}): ${JSON.stringify(ssoBody)}`);
        }
      }

      const affected = await deactivateToken(token);
      results.local = affected > 0;

      return res.json({ success: true, message: 'Sesión cerrada exitosamente', data: results });
    } catch (err) {
      log.error(`[Logout] Error inesperado: ${err.message}`);
      return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
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

      let user = localUser;
      if (rbac) {
        const userId = localUser[rbac.userPk] ?? localUser.id;
        const [roles, permisos] = await Promise.all([
          resolveUserRoles(userId),
          resolveUserPermissions(userId),
        ]);
        user = {
          ...localUser,
          roles: roles.map((r) => r[rbac.roleNameCol] ?? r.nombre),
          permisos: permisos.map((p) => p[rbac.permissionNameCol] ?? p.nombre),
        };
      }

      return res.json({ success: true, exists: true, user: filterSensitive(user, sensitiveFields) });
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
