import { resolveUserRoles as resolveUserRolesPure } from './rbac.js';

function userError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

async function resolveIsAdmin(ctx, actorId) {
  const { knex, rbac, adminRoles, isUserAdmin } = ctx;

  if (typeof isUserAdmin === 'function') {
    return Boolean(await isUserAdmin(actorId, ctx));
  }

  if (Array.isArray(adminRoles) && adminRoles.length > 0) {
    if (!rbac) {
      throw userError(
        'createUserManagement: "adminRoles" requiere que "rbac" esté configurado en createSsoAuth()',
        'RBAC_NOT_CONFIGURED',
      );
    }
    const roles = await resolveUserRolesPure(knex, rbac, actorId);
    const roleNames = roles.map((r) => r[rbac.roleNameCol] ?? r.nombre);
    return adminRoles.some((r) => roleNames.includes(r));
  }

  throw userError(
    'createUserManagement: se requiere "adminRoles" o "isUserAdmin" en createSsoAuth() para usar deleteUser/updateUser',
    'ADMIN_CHECK_NOT_CONFIGURED',
  );
}

async function assertActorIsAdmin(ctx, actorId) {
  if (actorId == null) {
    throw userError('deleteUser/updateUser: "actorId" es obligatorio', 'MISSING_ACTOR_ID');
  }
  const isAdmin = await resolveIsAdmin(ctx, actorId);
  if (!isAdmin) {
    throw userError(`El usuario ${actorId} no tiene permisos de administrador`, 'FORBIDDEN_NOT_ADMIN');
  }
}

export function createUserManagement(ctx) {
  const { knex, tables, rbac } = ctx;

  async function findUserOrThrow(userId) {
    const row = await knex(tables.user).where({ [tables.userPkField]: userId }).first();
    if (!row) {
      throw userError(`Usuario ${userId} no encontrado`, 'USER_NOT_FOUND');
    }
    return row;
  }

  async function deleteUser(userId, opts = {}) {
    const { actorId, allowSelfDelete = false } = opts;
    await assertActorIsAdmin(ctx, actorId);
    await findUserOrThrow(userId);

    if (!allowSelfDelete && String(actorId) === String(userId)) {
      throw userError('No se puede eliminar la propia cuenta', 'SELF_DELETE_NOT_ALLOWED');
    }

    if (rbac) {
      await knex(rbac.userRolesTable).where({ [rbac.userIdCol]: userId }).del();
    }
    await knex(tables.user).where({ [tables.userPkField]: userId }).del();

    return { success: true, id: userId };
  }

  async function updateUser(userId, data = {}, opts = {}) {
    const { actorId } = opts;
    await assertActorIsAdmin(ctx, actorId);
    await findUserOrThrow(userId);

    const { roles, ...fields } = data || {};

    if (Object.keys(fields).length > 0) {
      await knex(tables.user).where({ [tables.userPkField]: userId }).update(fields);
    }

    if (roles !== undefined) {
      if (!Array.isArray(roles)) {
        throw userError('updateUser: "roles" debe ser un array', 'INVALID_ROLES');
      }
      if (!rbac) {
        throw userError('updateUser: no se puede actualizar "roles" sin "rbac" configurado', 'RBAC_NOT_CONFIGURED');
      }
      await knex(rbac.userRolesTable).where({ [rbac.userIdCol]: userId }).del();
      if (roles.length > 0) {
        const inserts = roles.map((roleId) => ({ [rbac.userIdCol]: userId, [rbac.roleIdCol]: roleId }));
        await knex(rbac.userRolesTable).insert(inserts);
      }
    }

    return knex(tables.user).where({ [tables.userPkField]: userId }).first();
  }

  function suspensionField() {
    if (!ctx.suspension) {
      throw userError('suspendUser/reactivateUser: falta la opción "suspension" en createSsoAuth()', 'SUSPENSION_NOT_CONFIGURED');
    }
    return ctx.suspension.field;
  }

  async function suspendUser(userId, opts = {}) {
    const { actorId, allowSelf = false } = opts;
    const field = suspensionField();
    await assertActorIsAdmin(ctx, actorId);
    await findUserOrThrow(userId);
    if (!allowSelf && String(actorId) === String(userId)) {
      throw userError('No se puede suspender la propia cuenta', 'SELF_SUSPEND_NOT_ALLOWED');
    }
    await knex(tables.user).where({ [tables.userPkField]: userId }).update({ [field]: new Date() });
    // Cierra las sesiones locales abiertas
    await knex(tables.userTokens).where({ user_id: userId }).update({ [tables.activeTokensField]: false });
    return { success: true, id: userId };
  }

  async function reactivateUser(userId, opts = {}) {
    const { actorId } = opts;
    const field = suspensionField();
    await assertActorIsAdmin(ctx, actorId);
    await findUserOrThrow(userId);
    await knex(tables.user).where({ [tables.userPkField]: userId }).update({ [field]: null });
    return { success: true, id: userId };
  }

  return { deleteUser, updateUser, suspendUser, reactivateUser };
}
