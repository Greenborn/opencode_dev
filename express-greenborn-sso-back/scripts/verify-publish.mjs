#!/usr/bin/env node
// Verifica que la versión de package.json esté publicada en el registry,
// forzando recarga (evita el caché de metadatos de npm/registry) con
// cache-busting y reintentos. Sale con código != 0 si no aparece.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const pkgPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));

const registry = (process.env.REGISTRY_URL || 'https://registry.npmjs.org').replace(/\/+$/, '');
const attempts = Number(process.env.VERIFY_ATTEMPTS || 30);
const delayMs = Number(process.env.VERIFY_DELAY_MS || 5000);
const expected = pkg.version;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchMetadata() {
  const url = `${registry}/${encodeURIComponent(pkg.name)}?_cb=${Date.now()}`;
  const res = await fetch(url, {
    headers: {
      accept: 'application/json',
      'cache-control': 'no-cache, no-store, must-revalidate',
      pragma: 'no-cache',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

function check(meta) {
  const published = Boolean(meta.versions?.[expected]);
  const latest = meta['dist-tags']?.latest;
  return { published, latest, latestOk: latest === expected };
}

console.log(`[verify-publish] ${pkg.name}@${expected} → ${registry}`);

for (let i = 1; i <= attempts; i += 1) {
  try {
    const meta = await fetchMetadata();
    const { published, latest, latestOk } = check(meta);

    if (published && latestOk) {
      console.log(`[verify-publish] OK: ${pkg.name}@${expected} publicado y marcado como "latest".`);
      process.exit(0);
    }

    console.log(
      `[verify-publish] intento ${i}/${attempts}: ${published ? 'publicado' : 'aún no visible'}`
      + ` — latest=${latest ?? '(sin dato)'}`,
    );
  } catch (err) {
    console.log(`[verify-publish] intento ${i}/${attempts}: error de registry — ${err.message}`);
  }

  if (i < attempts) await sleep(delayMs);
}

console.error(
  `[verify-publish] FALLO: ${pkg.name}@${expected} no quedó disponible como "latest" tras ${attempts} intentos. `
  + 'Revisá el resultado de "npm publish" o intentá con: npm view ' + pkg.name + '@' + expected + ' version --prefer-online',
);
process.exit(1);
