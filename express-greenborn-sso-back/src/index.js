import createSsoAuth from './createSsoAuth.js';

export { createSsoAuth };
export { default } from './createSsoAuth.js';
export { createSsoClient } from './ssoClient.js';
export { createSsoSocket } from './socket.js';
export {
  normalizeUniqueId,
  parseSsoRoleMap,
  resolveSsoRole,
  filterSensitive,
  getBearerToken,
} from './utils.js';
export {
  normalizeRbacConfig,
  resolveUserRoles,
  resolveUserPermissions,
  attachRolesPermissions,
  ensureUserRole,
} from './rbac.js';
