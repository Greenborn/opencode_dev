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
  packages: 'external',
  sourcemap: true,
};

await Promise.all([
  build({ ...shared, format: 'esm', outfile: resolve(dist, 'index.js') }),
  build({ ...shared, format: 'cjs', outfile: resolve(dist, 'index.cjs') }),
]);

await writeFile(
  resolve(dist, 'index.d.ts'),
  [
    'export interface NotificacionesVapidConfig {',
    '  publicKey?: string;',
    '  privateKey?: string;',
    '  subject?: string;',
    '}',
    'export interface NotificacionesLogger {',
    '  error?: (...args: unknown[]) => void;',
    '  warn?: (...args: unknown[]) => void;',
    '}',
    'export interface CreateNotificacionesOptions {',
    '  knex: any;',
    '  table?: string;',
    '  userColumn?: string;',
    '  vapid?: NotificacionesVapidConfig;',
    '  authMiddleware?: (req: any, res: any, next: any) => any;',
    '  userField?: string;',
    '  logger?: NotificacionesLogger;',
    '}',
    'export interface Notificaciones {',
    '  router: any;',
    '  vapidPublicKey: () => string | null;',
    '  estaConfigurado: () => boolean;',
    '  enviarPushAUsuario: (usuarioId: any, payload: Record<string, any>) => Promise<{ enviados: number; fallidos: number }>;',
    '  enviarPushATodos: (payload: Record<string, any>) => Promise<{ enviados: number; fallidos: number }>;',
    '}',
    'export interface CreatePushSubscriptionsMigrationOptions {',
    '  table?: string;',
    '  userColumn?: string;',
    '  userTable?: string;',
    '  userTablePk?: string;',
    '}',
    'export function createNotificaciones(options: CreateNotificacionesOptions): Notificaciones;',
    'export function createPushSubscriptionsMigration(options?: CreatePushSubscriptionsMigrationOptions): { up: (knex: any) => Promise<void>; down: (knex: any) => Promise<void> };',
    'export default createNotificaciones;',
    '',
  ].join('\n'),
  'utf8',
);

console.log('[build] express-greenborn-notificaciones dist generado (ESM + CJS + .d.ts)');
