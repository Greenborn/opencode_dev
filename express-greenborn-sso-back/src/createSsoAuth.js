import MemoryCache from 'greenborn-memory-cache';
import { createSsoClient } from './ssoClient.js';
import { createService } from './service.js';
import { createMiddleware } from './middleware.js';
import { createRouter } from './router.js';
import { createSsoSocket } from './socket.js';
import { normalizeUniqueId, parseSsoRoleMap } from './utils.js';

const DEFAULT_TABLES = {
  user: 'user',
  userTokens: 'user_tokens',
  profile: 'profile',
  accessTokenField: 'access_token',
  activeTokensField: 'is_active',
  lastUsedAtField: 'last_used_at',
  tokenField: 'token',
  expiresAtField: 'expires_at',
};

const DEFAULT_SENSITIVE_FIELDS = [
  'password_hash',
  'access_token',
  'password_reset_token',
  'sign_up_verif_code',
  'sign_up_verif_token',
  'updated_at',
];

export function createSsoAuth(options = {}) {
  if (!options.knex) {
    throw new Error('createSsoAuth: la opción "knex" es obligatoria');
  }

  const ssoBaseUrl = options.ssoBaseUrl || process.env.URL_AUTH_SERVICE || 'https://auth.greenborn.com.ar';
  const ssoTimeoutMs = options.ssoTimeoutMs || 5000;
  const defaultRoleId = options.defaultRoleId || 3;
  const sendReauthHeader = options.sendReauthHeader !== false;
  const sensitiveFields = options.sensitiveFields || DEFAULT_SENSITIVE_FIELDS;
  const tables = { ...DEFAULT_TABLES, ...(options.tables || {}) };
  const logger = options.logger || console;

  let ssoRoleMap = options.ssoRoleMap;
  if (ssoRoleMap == null) {
    ssoRoleMap = parseSsoRoleMap(process.env.SSO_ROLE_MAP) || {};
  }

  const cacheTtlMs = options.cacheTtlMs || 12 * 60 * 60 * 1000;
  const cache = options.cache !== undefined
    ? options.cache
    : new MemoryCache({ ttlMs: cacheTtlMs, cleanupIntervalMs: 60 * 60 * 1000 });

  const ctx = {
    knex: options.knex,
    ssoBaseUrl,
    ssoTimeoutMs,
    ssoRoleMap,
    defaultRoleId,
    sendReauthHeader,
    sensitiveFields,
    tables,
    logger,
    cache,
    findLocalUserByToken: options.findLocalUserByToken,
    createUserFromSso: options.createUserFromSso,
  };

  const ssoClient = options.ssoClient || createSsoClient({ ssoBaseUrl, timeoutMs: ssoTimeoutMs, logger });
  ctx.ssoClient = ssoClient;

  const service = createService(ctx);
  const middleware = createMiddleware(ctx, service);
  const router = createRouter(ctx, service, middleware);

  function attachSocket(httpServer, socketOptions = {}) {
    return createSsoSocket({ sso: api, httpServer, ...socketOptions });
  }

  const api = {
    authMiddleware: middleware.authMiddleware,
    authMiddlewareOptional: middleware.authMiddlewareOptional,
    router,
    syncSsoUser: service.syncSsoUser,
    findLocalUserByToken: service.findLocalUserByToken,
    resolveSsoRole: service.resolveSsoRoleFor,
    verifySsoToken: service.verifySsoToken,
    extendSsoSession: service.extendSsoSession,
    normalizeUniqueId,
    attachSocket,
    logger,
  };

  return api;
}

export default createSsoAuth;
