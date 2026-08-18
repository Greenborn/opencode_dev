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
  // Externaliza TODAS las dependencias de node_modules (incluida axios).
  // Cada dependencia se resuelve en runtime.
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
    'export interface MercadoPagoLogger {',
    '  info?: (...args: unknown[]) => void;',
    '  warn?: (...args: unknown[]) => void;',
    '  error?: (...args: unknown[]) => void;',
    '  debug?: (...args: unknown[]) => void;',
    '  log?: (...args: unknown[]) => void;',
    '}',
    'export interface MercadoPagoConfig {',
    '  baseUrl?: string;',
    '  accessToken?: string;',
    '  userId?: number;',
    '  apiTimeoutMs?: number;',
    '  webhookUrl?: string;',
    '  backUrls?: Record<string, string>;',
    '  store?: Record<string, unknown>;',
    '  pos?: Record<string, unknown>;',
    '  preferencia?: Record<string, unknown>;',
    '  qr?: Record<string, unknown>;',
    '}',
    'export interface CreateMercadoPagoOptions {',
    '  knex: any;',
    '  accessToken?: string;',
    '  userId?: number | string;',
    '  logger?: MercadoPagoLogger | ((...args: unknown[]) => void);',
    '  baseUrl?: string;',
    '  apiTimeoutMs?: number;',
    '  httpsAgent?: any;',
    '  onNewWebhook?: (payload: any, info?: { payment_id?: string; payment_status?: string }) => void | Promise<void>;',
    '  [key: string]: unknown;',
    '}',
    'export interface MercadoPagoClient {',
    '  getPayment(paymentId: string | number, options?: any): Promise<any>;',
    '  getMerchantOrder(merchantOrderId: string | number, options?: any): Promise<any>;',
    '  getOrder(orderId: string | number, options?: any): Promise<any>;',
    '  createStore(userId: number | string, storeData: any, options?: any): Promise<any>;',
    '  updateStore(userId: number | string, storeId: number | string, storeData: any, options?: any): Promise<any>;',
    '  deleteStore(userId: number | string, storeId: number | string, options?: any): Promise<any>;',
    '  createPos(posData: any, idempotencyKey?: string, options?: any): Promise<any>;',
    '  getPosByExternalId(externalId: string, options?: any): Promise<any>;',
    '  deletePos(posId: string | number, options?: any): Promise<any>;',
    '  createQrOrder(args: { userId: number | string; externalStoreId: string | number; externalPosId: string | number; orderPayload: any }, options?: any): Promise<any>;',
    '}',
    'export interface MercadoPago {',
    '  client: MercadoPagoClient;',
    '  webhookRouter: any;',
    '  webhookHandler: (req: any, res: any) => Promise<void>;',
    '  config: MercadoPagoConfig;',
    '  rootPath: string;',
    '}',
    'export interface PaymentInfo { payment_id: string; payment_status: string; }',
    'export function extractPaymentInfo(obj: any): PaymentInfo;',
    'export function extractStatuses(obj: any): string[];',
    'export function safeParse(raw: any): any;',
    'export function resolveConfig(options?: Record<string, any>, env?: Record<string, string | undefined>): MercadoPagoConfig;',
    'export function createMercadoPago(options: CreateMercadoPagoOptions): MercadoPago;',
    'export { MercadoPagoClient } from "./client/MercadoPagoClient.js";',
    'export const ENDPOINTS: Record<string, (...args: any[]) => string>;',
    'export default createMercadoPago;',
    '',
  ].join('\n'),
  'utf8',
);

console.log('[build] dist generado (ESM + CJS + .d.ts)');