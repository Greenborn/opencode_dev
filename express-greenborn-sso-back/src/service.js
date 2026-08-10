import { normalizeUniqueId, resolveSsoRole } from './utils.js';

export function createService(ctx) {
  const { knex, tables, createUserFromSso, ssoClient, defaultRoleId, logger } = ctx;

  const log = logger && typeof logger.error === 'function'
    ? logger
    : { error: (...a) => console.error(...a), warn: (...a) => console.warn(...a) };

  function resolveSsoRoleFor(email) {
    return resolveSsoRole(email, ctx.ssoRoleMap, defaultRoleId);
  }

  async function syncSsoUser(ssoUser) {
    if (typeof createUserFromSso === 'function') {
      return createUserFromSso(ssoUser, ctx);
    }
    return defaultSyncSsoUser(ssoUser);
  }

  async function defaultSyncSsoUser(ssoUser) {
    const email = ssoUser.email;
    let user = await knex(tables.user).where({ email }).first();
    if (user) return user;

    const name = ssoUser.name || ssoUser.email?.split('@')[0] || 'SSO User';
    const [profileRow] = await knex(tables.profile).insert({
      name,
      last_name: '',
      fotoclub_id: null,
    }).returning('id');
    const profileId = profileRow?.id ?? profileRow;

    const [userRow] = await knex(tables.user).insert({
      username: name,
      email: ssoUser.email,
      role_id: resolveSsoRoleFor(ssoUser.email),
      profile_id: profileId,
      status: 1,
      created_at: new Date().toISOString(),
    }).returning('id');
    const userId = userRow?.id ?? userRow;

    return knex(tables.user).where({ id: userId }).first();
  }

  async function findLocalUserByToken(token) {
    if (typeof ctx.findLocalUserByToken === 'function') {
      return ctx.findLocalUserByToken(token, ctx);
    }
    return defaultFindLocalUserByToken(token);
  }

  async function defaultFindLocalUserByToken(token) {
    try {
      const tokenRow = await knex(tables.userTokens)
        .where({ [tables.tokenField]: token, [tables.activeTokensField]: true })
        .whereRaw(`(${tables.expiresAtField} IS NULL OR ${tables.expiresAtField} > NOW())`)
        .first();
      if (tokenRow) {
        const update = {};
        update[tables.lastUsedAtField] = new Date();
        await knex(tables.userTokens).where({ id: tokenRow.id }).update(update);
        return knex(tables.user).where({ id: tokenRow.user_id }).first();
      }
    } catch (_) {
      const legacyUser = await knex(tables.user).where({ [tables.accessTokenField]: token }).first();
      if (legacyUser) return legacyUser;
    }
    return null;
  }

  async function verifySsoToken(token, uniqueId) {
    const response = await ssoClient.verifyToken(token, uniqueId);
    return response;
  }

  async function extendSsoSession(token, uniqueId) {
    const normalizedId = normalizeUniqueId(uniqueId);
    if (!normalizedId) {
      log.warn(`[SSO] extend omitido: unique_id inválido — ${JSON.stringify(uniqueId)}`);
      return null;
    }
    try {
      const response = await ssoClient.extendSession(token, normalizedId);
      if (response.data?.success && response.data?.data?.bearer_token) {
        return response.data.data;
      }
      return null;
    } catch (err) {
      const ssoBody = err.response?.data;
      const ssoStatus = err.response?.status;
      log.error(`[SSO] Error al extender sesión (${ssoStatus}): ${JSON.stringify(ssoBody)}`);
      return null;
    }
  }

  return {
    normalizeUniqueId,
    resolveSsoRoleFor,
    syncSsoUser,
    findLocalUserByToken,
    verifySsoToken,
    extendSsoSession,
  };
}
