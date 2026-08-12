import { randomBytes } from 'node:crypto';
import { normalizeUniqueId, resolveSsoRole } from './utils.js';
import {
  attachRolesPermissions,
  ensureUserRole,
  resolveUserRoles,
  resolveUserPermissions,
} from './rbac.js';

export function createService(ctx) {
  const { knex, tables, rbac, createUserFromSso, ssoClient, defaultRoleId, logger, localLogin } = ctx;

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

  async function attachRbac(user) {
    if (!rbac || !user) return user;
    return attachRolesPermissions(knex, rbac, user);
  }

  async function defaultSyncSsoUser(ssoUser) {
    const email = ssoUser.email;
    let user = await knex(tables.user).where({ email }).first();

    if (user) {
      if (rbac) {
        const roleId = resolveSsoRoleFor(ssoUser.email);
        await ensureUserRole(knex, rbac, user[rbac.userPk] ?? user.id, roleId);
        return attachRolesPermissions(knex, rbac, user);
      }
      return user;
    }

    const name = ssoUser.name || ssoUser.email?.split('@')[0] || 'SSO User';
    const [profileRow] = await knex(tables.profile).insert({
      name,
      last_name: '',
      fotoclub_id: null,
    }).returning('id');
    const profileId = profileRow?.id ?? profileRow;

    const roleId = resolveSsoRoleFor(ssoUser.email);

    const insertData = rbac
      ? {
          username: name,
          email: ssoUser.email,
          profile_id: profileId,
          status: 1,
          created_at: new Date().toISOString(),
        }
      : {
          username: name,
          email: ssoUser.email,
          role_id: roleId,
          profile_id: profileId,
          status: 1,
          created_at: new Date().toISOString(),
        };

    const [userRow] = await knex(tables.user).insert(insertData).returning('id');
    const userId = userRow?.id ?? userRow;

    if (rbac) {
      await ensureUserRole(knex, rbac, userId, roleId);
    }

    const created = await knex(tables.user).where({ id: userId }).first();
    return rbac ? attachRolesPermissions(knex, rbac, created) : created;
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

  function generateToken() {
    return randomBytes(32).toString('hex');
  }

  async function issueLocalToken(user) {
    const token = generateToken();
    const expiresAt = localLogin.tokenTtlMs
      ? new Date(Date.now() + localLogin.tokenTtlMs)
      : null;
    const now = new Date();
    await knex(tables.userTokens).insert({
      [tables.tokenField]: token,
      user_id: user[tables.userPkField] ?? user.id,
      [tables.activeTokensField]: true,
      [tables.expiresAtField]: expiresAt,
      [tables.lastUsedAtField]: now,
    });
    return token;
  }

  async function defaultLocalLoginHandler(username, password) {
    if (!localLogin.verifyPassword) return null;
    const row = await knex(tables.user)
      .where({ [tables.usernameField]: username })
      .first();
    if (!row) return null;
    const ok = await localLogin.verifyPassword(password, row[localLogin.passwordField]);
    return ok ? row : null;
  }

  async function localLoginUser(username, password) {
    const handler = localLogin.handler || defaultLocalLoginHandler;
    const user = await handler(username, password, ctx);
    if (!user) return null;

    let resultUser = user;
    if (rbac) {
      resultUser = await attachRolesPermissions(knex, rbac, user);
    }

    const token = await issueLocalToken(user);
    return { user: resultUser, token };
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
    localLoginUser,
    resolveUserRoles: (userId) => rbac ? resolveUserRoles(knex, rbac, userId) : Promise.resolve([]),
    resolveUserPermissions: (userId) => rbac ? resolveUserPermissions(knex, rbac, userId) : Promise.resolve([]),
  };
}
