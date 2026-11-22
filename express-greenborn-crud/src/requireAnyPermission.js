const IDENTIFICADOR_PERMISO = /^[A-Za-z0-9_.-]+$/;
const MENSAJE_403 = 'Acceso denegado: permisos insuficientes';

/**
 * Ejecuta un middleware `sso.requirePermission(p)` con un `res` sustituto que captura la respuesta
 * en lugar de enviarla. Devuelve una decisión: 'ok' (llamó a next), 'error' (next(err)),
 * 'respuesta' (respondió con estado/cuerpo) o 'sinRespuesta' (terminó sin responder ni llamar a next).
 * El middleware del SSO es async (espera la consulta de permisos), por eso se espera la decisión.
 */
function evaluarPermiso(middleware, req, res) {
  return new Promise((resolver) => {
    let estado = null;
    const sustituto = Object.create(res);
    sustituto.status = (codigo) => { estado = codigo; return sustituto; };
    sustituto.sendStatus = (codigo) => { resolver({ tipo: 'respuesta', estado: codigo, cuerpo: undefined }); return sustituto; };
    sustituto.json = (cuerpo) => { resolver({ tipo: 'respuesta', estado, cuerpo }); return sustituto; };
    sustituto.send = (cuerpo) => { resolver({ tipo: 'respuesta', estado, cuerpo }); return sustituto; };
    sustituto.end = () => { resolver({ tipo: 'respuesta', estado, cuerpo: undefined }); return sustituto; };

    const pasoNext = (err) => {
      resolver(err ? { tipo: 'error', err } : { tipo: 'ok' });
    };

    Promise.resolve()
      .then(() => middleware(req, sustituto, pasoNext))
      .then(
        () => resolver({ tipo: 'sinRespuesta' }),
        (err) => resolver({ tipo: 'error', err }),
      );
  });
}

/**
 * Middleware OR sobre permisos del SSO: deja pasar si el usuario tiene AL MENOS uno de los permisos.
 *
 * El SSO sólo expone `requirePermission` (AND) y ese middleware responde por sí mismo cuando falla.
 * Para cada permiso, en orden, se ejecuta `sso.requirePermission(p)` con un `res` sustituto:
 *   - si llama a `next()`, el acceso se concede;
 *   - si responde 403 (sin permiso), se prueba el siguiente permiso;
 *   - si responde otro código (p. ej. 401 sin usuario), esa respuesta se reenvía tal cual y no se prueban más;
 *   - si ninguno pasa, responde `403 { success: false, message: 'Acceso denegado: permisos insuficientes' }`.
 *
 * Limitación: sólo distingue el 403 de "sin permiso"; cualquier otro código de error del SSO corta el OR.
 */
export function requireAnyPermission(sso, ...permisos) {
  if (sso === null || typeof sso !== 'object' || typeof sso.requirePermission !== 'function') {
    throw new Error('requireAnyPermission: el primer argumento debe ser el objeto sso (requirePermission)');
  }
  if (permisos.length === 0) {
    throw new Error('requireAnyPermission: se requiere al menos un permiso');
  }
  for (const permiso of permisos) {
    if (typeof permiso !== 'string' || !IDENTIFICADOR_PERMISO.test(permiso)) {
      throw new Error(`requireAnyPermission: permiso inválido "${permiso}"`);
    }
  }
  const middlewares = permisos.map((permiso) => sso.requirePermission(permiso));

  return async (req, res, next) => {
    try {
      for (const middleware of middlewares) {
        const decision = await evaluarPermiso(middleware, req, res);
        if (decision.tipo === 'ok') return next();
        if (decision.tipo === 'error') return next(decision.err);
        if (decision.tipo === 'sinRespuesta') {
          return next(new Error('requireAnyPermission: el middleware de permiso terminó sin responder ni llamar a next'));
        }
        if (decision.estado === 403) continue;
        if (decision.estado === null) {
          return next(new Error('requireAnyPermission: el middleware de permiso respondió sin código de estado'));
        }
        return res.status(decision.estado).json(decision.cuerpo);
      }
      return res.status(403).json({ success: false, message: MENSAJE_403 });
    } catch (err) {
      return next(err);
    }
  };
}
