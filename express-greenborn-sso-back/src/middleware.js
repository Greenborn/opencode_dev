import { getBearerToken, tokenPreview } from './utils.js';

function loadFromCache(service, cache, token) {
  if (!cache) return null;
  const cached = cache.get(token);
  if (!cached) return null;
  return cached;
}

export function createMiddleware(ctx, service) {
  const { cache, logger, sendReauthHeader, rbac } = ctx;
  const { verifySsoToken, syncSsoUser, findLocalUserByToken, extendSsoSession, normalizeUniqueId } = service;

  const log = {
    error: (a) => (logger?.error ? logger.error(a) : console.error(a)),
    warn: (a) => (logger?.warn ? logger.warn(a) : console.warn(a)),
  };

  async function handleSsoToken(req, res, token, uniqueId, optional) {
    const ruta = req.originalUrl || req.url;
    const normalizedId = normalizeUniqueId(uniqueId);

    if (cache) {
      const cached = loadFromCache(service, cache, token);
      if (cached) {
        req.user = await syncSsoUser(cached.user);
        req.authSource = 'sso';
        if (normalizedId && cached.uniqueId === normalizedId) {
          extendSsoSession(token, normalizedId).then((extendData) => {
            if (extendData?.bearer_token) {
              cache.set(extendData.bearer_token, { user: extendData.user, uniqueId: normalizedId });
            }
          }).catch(() => {});
        }
        return { ok: true };
      }
    }

    if (!normalizedId) {
      if (optional) return { ok: false, next: true };
      log.warn(`[SSO] unique_id ausente para token SSO — ${tokenPreview(token)} — ruta: ${ruta}`);
      return { ok: false, status: 400, body: { success: false, message: 'unique_id requerido en query param' } };
    }

    let response;
    try {
      response = await verifySsoToken(token, normalizedId);
    } catch (ssoErr) {
      const ssoBody = ssoErr.response?.data;
      const ssoStatus = ssoErr.response?.status;
      log.error(`[SSO] Error al consultar SSO (${ssoStatus}): ${JSON.stringify(ssoBody)} — token: ${tokenPreview(token)} — ruta: ${ruta}`);

      if (ssoBody?.require_reauth || ssoBody?.error === 'TOKEN_EXPIRED' || ssoBody?.error === 'INVALID_TOKEN' || ssoStatus === 401) {
        const extendData = await extendSsoSession(token, normalizedId);
        if (extendData) {
          if (cache) cache.set(extendData.bearer_token, { user: extendData.user, uniqueId: normalizedId });
          req.user = await syncSsoUser(extendData.user);
          req.authSource = 'sso';
          if (sendReauthHeader) res.setHeader('X-New-Token', extendData.bearer_token);
          return { ok: true };
        }
        if (cache) cache.delete(token);
        return { ok: false, status: 401, body: { success: false, message: 'Sesión expirada', require_reauth: true } };
      }
      return { ok: false, status: 500, body: { success: false, message: 'Error de autenticación', error: 'Servicio de autenticación no disponible' } };
    }

    if (response.data?.success && response.data?.data?.valid) {
      const ssoUser = response.data.data.user;
      if (cache) cache.set(token, { user: ssoUser, uniqueId: normalizedId });
      req.user = await syncSsoUser(ssoUser);
      req.authSource = 'sso';
      return { ok: true };
    }

    log.warn(`[SSO] SSO rechazó token: ${JSON.stringify(response.data)} — unique_id: ${normalizedId} — ruta: ${ruta}`);

    if (response.data?.require_reauth) {
      const extendData = await extendSsoSession(token, normalizedId);
      if (extendData) {
        if (cache) cache.set(extendData.bearer_token, { user: extendData.user, uniqueId: normalizedId });
        req.user = await syncSsoUser(extendData.user);
        req.authSource = 'sso';
        if (sendReauthHeader) res.setHeader('X-New-Token', extendData.bearer_token);
        return { ok: true };
      }
      if (cache) cache.delete(token);
      return { ok: false, status: 401, body: { success: false, message: 'Sesión expirada', require_reauth: true } };
    }

    if (cache) cache.delete(token);
    return { ok: false, status: 401, body: { success: false, message: 'Token inválido' } };
  }

  async function authMiddleware(req, res, next) {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token de autenticación requerido' });
    }

    try {
      const localUser = await findLocalUserByToken(token);
      if (localUser) {
        req.user = localUser;
        req.authSource = 'local';
        return next();
      }

      const result = await handleSsoToken(req, res, token, req.query?.unique_id, false);
      if (result.ok) return next();
      return res.status(result.status).json(result.body);
    } catch (error) {
      log.error(`[SSO] Error inesperado: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Error de autenticación', error: error.message });
    }
  }

  async function authMiddlewareOptional(req, res, next) {
    const token = getBearerToken(req);
    if (!token) return next();

    try {
      const localUser = await findLocalUserByToken(token);
      if (localUser) {
        req.user = localUser;
        req.authSource = 'local';
        return next();
      }

      const result = await handleSsoToken(req, res, token, req.query?.unique_id, true);
      if (result.ok) return next();
      if (result.next) return next();
      return next();
    } catch (error) {
      log.error(`[SSO] Error inesperado (opcional): ${error.message}`);
      return next();
    }
  }

  function requireRole(...roles) {
    return async (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Token de autenticación requerido' });
      }

      let userRoles;
      if (rbac) {
        const userId = req.user[rbac.userPk] ?? req.user.id;
        const rows = await service.resolveUserRoles(userId);
        userRoles = rows.map((r) => r[rbac.roleNameCol] ?? r.nombre);
      } else {
        userRoles = req.user?.role_id != null ? [String(req.user.role_id)] : [];
      }

      const tiene = roles.some((r) => userRoles.includes(String(r)));
      if (!tiene) {
        return res.status(403).json({ success: false, message: 'Acceso denegado: rol insuficiente' });
      }
      next();
    };
  }

  function requirePermission(...permisos) {
    return async (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Token de autenticación requerido' });
      }

      if (permisos.length === 0) return next();

      let userPermisos;
      if (rbac) {
        const userId = req.user[rbac.userPk] ?? req.user.id;
        const rows = await service.resolveUserPermissions(userId);
        userPermisos = rows.map((p) => p[rbac.permissionNameCol] ?? p.nombre);
      } else {
        userPermisos = req.user?.role_id != null ? [String(req.user.role_id)] : [];
      }

      const tiene = permisos.every((p) => userPermisos.includes(p));
      if (!tiene) {
        return res.status(403).json({ success: false, message: 'Acceso denegado: permisos insuficientes' });
      }
      next();
    };
  }

  return { authMiddleware, authMiddlewareOptional, requirePermission, requireRole };
}
