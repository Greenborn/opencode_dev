import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { createSsoAuth } from '../src/index.js';
import { normalizeLoginAlertsConfig, createLoginAlerter } from '../src/loginAlerts.js';
import { createFakeKnex } from './helpers/fakeKnex.js';

const CONFIG_VALIDA = {
  enabled: true,
  url: 'https://sgi.local/',
  projectSlug: 'mi-proyecto',
  apiKey: 'clave-secreta',
};

function silentLogger() {
  const errors = [];
  return {
    errors,
    error: (...args) => errors.push(args.join(' ')),
    warn: () => {},
    log: () => {},
  };
}

function fakeHttpClient({ fail = false } = {}) {
  const calls = [];
  return {
    calls,
    post(url, body, options) {
      calls.push({ url, body, options });
      if (fail) {
        const err = new Error('connect ECONNREFUSED');
        return Promise.reject(err);
      }
      return Promise.resolve({ status: 201 });
    },
  };
}

function buildApp({ loginAlerts, logger = silentLogger(), httpClient } = {}) {
  const store = {
    user: [{ id: 1, username: 'lucho', email: 'lucho@x.com', password_hash: 'hash', status: 1 }],
    user_tokens: [],
    profile: [],
  };
  const sso = createSsoAuth({
    knex: createFakeKnex(store),
    localLogin: {
      endpoint: '/login',
      handler: async (username, password) => (username === 'lucho' && password === 'correcta' ? store.user[0] : null),
    },
    loginAlerts,
    logger,
    ...(httpClient ? { loginAlertsHttpClient: httpClient } : {}),
  });
  const app = express();
  app.use(express.json());
  app.use('/api/user', sso.router);
  return { app, sso, logger };
}

test('normalizeLoginAlertsConfig: desactivado por defecto y sin validar datos', () => {
  const cfg = normalizeLoginAlertsConfig(undefined, {});
  assert.equal(cfg.enabled, false);
});

test('normalizeLoginAlertsConfig: activar por env sin url/slug/key lanza error claro', () => {
  assert.throws(
    () => normalizeLoginAlertsConfig(undefined, { SSO_LOGIN_ALERTS_ENABLED: 'true' }),
    /faltan: url \(SGI_ALERTS_URL\), projectSlug \(SGI_ALERTS_PROJECT_SLUG\), apiKey \(SGI_ALERTS_API_KEY\)/,
  );
});

test('normalizeLoginAlertsConfig: toma datos de env y quita barra final de la URL', () => {
  const cfg = normalizeLoginAlertsConfig(undefined, {
    SSO_LOGIN_ALERTS_ENABLED: 'true',
    SGI_ALERTS_URL: 'https://sgi.local//',
    SGI_ALERTS_PROJECT_SLUG: 'slug',
    SGI_ALERTS_API_KEY: 'key',
  });
  assert.equal(cfg.enabled, true);
  assert.equal(cfg.url, 'https://sgi.local');
  assert.equal(cfg.projectSlug, 'slug');
  assert.equal(cfg.apiKey, 'key');
});

test('createSsoAuth: alertas activadas con configuración incompleta lanza error', () => {
  assert.throws(
    () => createSsoAuth({ knex: createFakeKnex({}), loginAlerts: { enabled: true }, logger: silentLogger() }),
    /loginAlerts: alertas activadas pero faltan/,
  );
});

test('login inválido con alertas desactivadas no envía nada', async () => {
  const http = fakeHttpClient();
  const { app } = buildApp({ loginAlerts: false, httpClient: http });
  const res = await request(app).post('/api/user/login').send({ username: 'lucho', password: 'mala' });
  assert.equal(res.status, 401);
  assert.equal(http.calls.length, 0);
});

test('login inválido con alertas activas envía el reporte con headers y sin contraseña', async () => {
  const http = fakeHttpClient();
  const cfg = normalizeLoginAlertsConfig(CONFIG_VALIDA, {});
  const alerter = createLoginAlerter(cfg, { logger: silentLogger(), httpClient: http });
  alerter.notify({
    usuario_intentado: 'lucho',
    ip: '10.0.0.5',
    user_agent: 'agente-test',
    motivo: 'CREDENCIALES_INVALIDAS',
    endpoint: '/api/user/login',
    ocurrido_en: '2026-11-23T10:00:00.000Z',
  });

  assert.equal(http.calls.length, 1);
  const [call] = http.calls;
  assert.equal(call.url, 'https://sgi.local/api/public/alertas-login');
  assert.equal(call.options.headers['x-project-slug'], 'mi-proyecto');
  assert.equal(call.options.headers['x-api-key'], 'clave-secreta');
  assert.equal(call.body.usuario_intentado, 'lucho');
  assert.equal(call.body.motivo, 'CREDENCIALES_INVALIDAS');
  assert.equal(call.body.password, undefined);
  assert.equal(JSON.stringify(call.body).includes('mala'), false);
});

test('login inválido end-to-end: el 401 se responde y se dispara la alerta', async () => {
  const http = fakeHttpClient();
  const { app } = buildApp({ loginAlerts: CONFIG_VALIDA, httpClient: http });
  const res = await request(app)
    .post('/api/user/login')
    .set('User-Agent', 'supertest-ua')
    .send({ username: 'lucho', password: 'mala' });
  assert.equal(res.status, 401);
  assert.equal(res.body.message, 'Credenciales inválidas');
  assert.equal(http.calls.length, 1);
  assert.equal(http.calls[0].body.endpoint, '/api/user/login');
  assert.equal(http.calls[0].body.user_agent, 'supertest-ua');
});

test('login exitoso no dispara alerta', async () => {
  const http = fakeHttpClient();
  const { app } = buildApp({ loginAlerts: CONFIG_VALIDA, httpClient: http });
  const res = await request(app).post('/api/user/login').send({ username: 'lucho', password: 'correcta' });
  assert.equal(res.status, 200);
  assert.equal(http.calls.length, 0);
});

test('si SGI falla, el 401 no cambia y el error queda registrado', async () => {
  const http = fakeHttpClient({ fail: true });
  const logger = silentLogger();
  const { app } = buildApp({ loginAlerts: CONFIG_VALIDA, httpClient: http, logger });
  const res = await request(app).post('/api/user/login').send({ username: 'lucho', password: 'mala' });
  assert.equal(res.status, 401);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(logger.errors.length, 1);
  assert.match(logger.errors[0], /No se pudo enviar la alerta a SGI \(connect ECONNREFUSED\)/);
});

test('token SSO rechazado por el SSO dispara alerta TOKEN_SSO_INVALIDO y responde 401', async () => {
  const http = fakeHttpClient();
  const sso = createSsoAuth({
    knex: createFakeKnex({ user: [], user_tokens: [], profile: [] }),
    ssoClient: {
      verifyToken: async () => ({ data: { success: true, data: { valid: false } } }),
      extendSession: async () => { throw new Error('sin sesión'); },
      logout: async () => ({}),
    },
    loginAlerts: CONFIG_VALIDA,
    loginAlertsHttpClient: http,
    logger: silentLogger(),
    rateLimit: false,
  });
  const app = express();
  app.get('/protegido', sso.authMiddleware, (_req, res) => res.json({ ok: true }));

  const res = await request(app)
    .get('/protegido?unique_id=1234567890')
    .set('Authorization', 'Bearer token-invalido')
    .set('User-Agent', 'ua-sso');
  assert.equal(res.status, 401);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(http.calls.length, 1);
  assert.equal(http.calls[0].body.motivo, 'TOKEN_SSO_INVALIDO');
  assert.equal(http.calls[0].body.user_agent, 'ua-sso');
});
