import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve(import.meta.dirname, 'dist');

await mkdir(dist, { recursive: true });

const shared = {
  entryPoints: [resolve(import.meta.dirname, 'src/index.js')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  external: ['express', 'axios', 'greenborn-memory-cache'],
  sourcemap: true,
};

await Promise.all([
  build({
    ...shared,
    format: 'esm',
    outfile: resolve(dist, 'index.js'),
  }),
  build({
    ...shared,
    format: 'cjs',
    outfile: resolve(dist, 'index.cjs'),
  }),
]);

await writeFile(
  resolve(dist, 'index.d.ts'),
  [
    'export interface SsoTables {',
    '  user?: string;',
    '  userTokens?: string;',
    '  profile?: string;',
    '  accessTokenField?: string;',
    '  activeTokensField?: string;',
    '  lastUsedAtField?: string;',
    '  tokenField?: string;',
    '  expiresAtField?: string;',
    '}',
    'export interface SsoLogger {',
    '  error?: (...args: unknown[]) => void;',
    '  warn?: (...args: unknown[]) => void;',
    '  log?: (...args: unknown[]) => void;',
    '}',
    'export interface SsoRbacConfig {',
    '  rolesTable?: string;',
    '  permissionsTable?: string;',
    '  userRolesTable?: string;',
    '  rolePermissionsTable?: string;',
    '  userIdCol?: string;',
    '  roleIdCol?: string;',
    '  permissionIdCol?: string;',
    '  roleNameCol?: string;',
    '  permissionNameCol?: string;',
    '  userPk?: string;',
    '}',
    'export interface SsoLocalLoginConfig {',
    '  endpoint?: string;',
    '  passwordField?: string;',
    '  tokenTtlMs?: number;',
    '  handler?: (username: string, password: string, ctx?: any) => Promise<any | null>;',
    '  verifyPassword?: (password: string, hash: string) => Promise<boolean> | boolean;',
    '}',
    'export interface CreateSsoAuthOptions {',
    '  knex: any;',
    '  ssoBaseUrl?: string;',
    '  ssoRoleMap?: Record<string, number>;',
    '  defaultRoleId?: number;',
    '  ssoTimeoutMs?: number;',
    '  cache?: any;',
    '  cacheTtlMs?: number;',
    '  logger?: SsoLogger;',
    '  tables?: SsoTables;',
    '  rbac?: boolean | SsoRbacConfig;',
    '  localLogin?: boolean | SsoLocalLoginConfig;',
    '  findLocalUserByToken?: (token: string) => Promise<any | null>;',
    '  sensitiveFields?: string[];',
    '  createUserFromSso?: (ssoUser: any) => Promise<any>;',
    '  sendReauthHeader?: boolean;',
    '}',
    'export interface SsoAuth {',
    '  authMiddleware: (req: any, res: any, next: any) => Promise<void>;',
    '  authMiddlewareOptional: (req: any, res: any, next: any) => Promise<void>;',
    '  requirePermission: (...permisos: string[]) => (req: any, res: any, next: any) => Promise<void> | void;',
    '  requireRole: (...roles: (string | number)[]) => (req: any, res: any, next: any) => void;',
    '  router: any;',
    '  syncSsoUser: (ssoUser: any) => Promise<any>;',
    '  resolveSsoRole: (email: string) => number;',
    '  resolveUserRoles: (userId: any) => Promise<any[]>;',
    '  resolveUserPermissions: (userId: any) => Promise<any[]>;',
    '  verifySsoToken: (token: string, uniqueId: string) => Promise<any>;',
    '  extendSsoSession: (token: string, uniqueId: string) => Promise<any>;',
    '  localLoginUser: (username: string, password: string) => Promise<any | null>;',
    '  normalizeUniqueId: (value: any) => string | null;',
    '  rbac: SsoRbacConfig | null;',
    '  localLogin: SsoLocalLoginConfig | null;',
    '}',
    'export function createSsoAuth(options: CreateSsoAuthOptions): SsoAuth;',
    'export default createSsoAuth;',
    '',
  ].join('\n'),
  'utf8',
);

console.log('[build] dist generado (ESM + CJS + .d.ts)');
