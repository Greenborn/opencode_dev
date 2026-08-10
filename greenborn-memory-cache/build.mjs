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
    footer: { js: 'module.exports = module.exports.default;' },
  }),
]);

await writeFile(
  resolve(dist, 'index.d.ts'),
  [
    'export interface MemoryCacheOptions {',
    '  ttlMs?: number;',
    '  cleanupIntervalMs?: number;',
    '  maxSize?: number;',
    '}',
    'export interface SetEvent { key: string; value: unknown; ttlMs: number; exists: boolean; }',
    'export interface KeyEvent { key: string; }',
    'export interface ClearEvent { count: number; }',
    'export class MemoryCache {',
    '  constructor(options?: MemoryCacheOptions);',
    '  ttlMs: number;',
    '  maxSize: number;',
    '  readonly size: number;',
    '  set(key: string, value: unknown, ttlMs?: number): this;',
    '  get<T = unknown>(key: string): T | undefined;',
    '  has(key: string): boolean;',
    '  delete(key: string): boolean;',
    '  clear(): number;',
    '  cleanup(): number;',
    '  keys(): string[];',
    '  destroy(): void;',
    '  on(event: "set", listener: (e: SetEvent) => void): this;',
    '  on(event: "get" | "delete" | "expired" | "evicted", listener: (e: KeyEvent) => void): this;',
    '  on(event: "clear", listener: (e: ClearEvent) => void): this;',
    '}',
    'export default MemoryCache;',
    '',
  ].join('\n'),
  'utf8',
);

console.log('[build] dist generado (ESM + CJS + .d.ts)');
