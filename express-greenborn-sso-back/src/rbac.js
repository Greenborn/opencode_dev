const DEFAULT_RBAC = {
  rolesTable: 'roles',
  permissionsTable: 'permisos',
  userRolesTable: 'usuarios_roles',
  rolePermissionsTable: 'roles_permisos',
  userIdCol: 'usuario_id',
  roleIdCol: 'rol_id',
  permissionIdCol: 'permiso_id',
  roleNameCol: 'nombre',
  permissionNameCol: 'nombre',
  userPk: 'id',
};

export function normalizeRbacConfig(rbac) {
  if (!rbac) return null;
  if (rbac === true) return { ...DEFAULT_RBAC };
  if (typeof rbac === 'object') return { ...DEFAULT_RBAC, ...rbac };
  return null;
}

export async function resolveUserRoles(knex, rbac, userId) {
  const rows = await knex(rbac.userRolesTable)
    .join(rbac.rolesTable, `${rbac.userRolesTable}.${rbac.roleIdCol}`, `${rbac.rolesTable}.${rbac.userPk}`)
    .where({ [rbac.userIdCol]: userId })
    .select(`${rbac.rolesTable}.${rbac.userPk}`, `${rbac.rolesTable}.${rbac.roleNameCol}`);
  return rows;
}

export async function resolveUserPermissions(knex, rbac, userId) {
  const rows = await knex(rbac.userRolesTable)
    .join(rbac.rolePermissionsTable, `${rbac.userRolesTable}.${rbac.roleIdCol}`, `${rbac.rolePermissionsTable}.${rbac.roleIdCol}`)
    .join(rbac.permissionsTable, `${rbac.rolePermissionsTable}.${rbac.permissionIdCol}`, `${rbac.permissionsTable}.${rbac.userPk}`)
    .where({ [rbac.userIdCol]: userId })
    .select(`${rbac.permissionsTable}.${rbac.permissionNameCol}`)
    .distinct();
  return rows;
}

export async function attachRolesPermissions(knex, rbac, user) {
  if (!user) return user;
  const userId = user[rbac.userPk] ?? user.id;
  if (userId == null) return user;
  const [roles, permisos] = await Promise.all([
    resolveUserRoles(knex, rbac, userId),
    resolveUserPermissions(knex, rbac, userId),
  ]);
  return {
    ...user,
    roles: roles.map((r) => r[rbac.roleNameCol] ?? r.nombre),
    permisos: permisos.map((p) => p[rbac.permissionNameCol] ?? p.nombre),
  };
}

export async function ensureUserRole(knex, rbac, userId, roleId) {
  if (userId == null || roleId == null) return;
  const existing = await knex(rbac.userRolesTable)
    .where({ [rbac.userIdCol]: userId, [rbac.roleIdCol]: roleId })
    .first();
  if (!existing) {
    await knex(rbac.userRolesTable).insert({ [rbac.userIdCol]: userId, [rbac.roleIdCol]: roleId });
  }
}
