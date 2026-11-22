import { createSsoAuth, attachRolesPermissions } from '@greenborn/express-greenborn-sso-back';

// Tokens de prueba: NO son reales. Sólo para la demo local.
export const TOKENS_PRUEBA = {
  'token-admin-demo': { email: 'admin@demo.test', name: 'Admin' },
  'token-sin-permisos-demo': { email: 'sinpermisos@demo.test', name: 'Sin permisos' },
};

// ssoClient stub: imita la forma de respuesta de GET /auth/verify del servicio SSO
// (ver express-greenborn-sso-back/src/ssoClient.js y middleware.js).
export const ssoClientStub = {
  base: 'stub://sso',
  async verifyToken(token) {
    const usuario = TOKENS_PRUEBA[token];
    if (!usuario) {
      return { data: { success: false, data: { valid: false } } };
    }
    return {
      data: {
        success: true,
        data: { valid: true, user: { email: usuario.email, name: usuario.name } },
      },
    };
  },
  async extendSession() {
    throw new Error('ssoClient stub: extendSession no implementado');
  },
  async logout() {
    return { data: { success: true } };
  },
  isTokenValid(response) {
    return Boolean(response?.data?.success && response?.data?.data?.valid);
  },
};

export function crearSso(knex) {
  return createSsoAuth({
    knex,
    rbac: true,
    ssoClient: ssoClientStub,
    // Sin tabla de tokens locales en la demo: la autenticación es sólo SSO (stub).
    findLocalUserByToken: async () => null,
    // Usuario local = fila de `usuarios` cuyo email coincide con la identidad SSO.
    createUserFromSso: async (ssoUser, ctx) => {
      const usuario = await ctx.knex('usuarios').where({ email: ssoUser.email }).first();
      if (!usuario) return null;
      return attachRolesPermissions(ctx.knex, ctx.rbac, usuario);
    },
    // Sin caché en memoria para que cada petición valide contra el stub.
    cache: null,
    logger: console,
  });
}

