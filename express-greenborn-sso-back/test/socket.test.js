import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { io as createClient } from 'socket.io-client';
import { createSsoAuth } from '../src/index.js';
import { createFakeKnex } from './helpers/fakeKnex.js';

function validSsoClient() {
  return {
    verifyToken: async () => ({
      data: { success: true, data: { valid: true, user: { email: 'sso@greenborn.com.ar', name: 'SSO User' } } },
    }),
    extendSession: async (token) => ({
      data: { success: true, data: { bearer_token: `extended-${token}`, user: { email: 'sso@greenborn.com.ar', name: 'SSO User' } } },
    }),
  };
}

const DEFAULT_STORE = {
  user: [{ id: 1, username: 'lucho', email: 'lucho@x.com', role_id: 3, profile_id: 1, status: 1 }],
  user_tokens: [{ id: 1, user_id: 1, token: 'local-token', is_active: true, expires_at: null, last_used_at: null }],
  profile: [{ id: 1, name: 'Lucho', last_name: '', fotoclub_id: null }],
};

function buildSocket(overrides = {}) {
  const knex = createFakeKnex(structuredClone(overrides.store || DEFAULT_STORE));
  const sso = createSsoAuth({
    knex,
    ssoClient: overrides.ssoClient || validSsoClient(),
    ssoBaseUrl: 'https://auth.greenborn.com.ar',
    defaultRoleId: 3,
    logger: { error: () => {}, warn: () => {}, log: () => {} },
    ...overrides.options,
  });

  const httpServer = http.createServer();
  const socket = sso.attachSocket(httpServer, { path: '/socket.io', corsOrigin: '*' });
  return new Promise((resolve) => {
    httpServer.listen(0, () => {
      const port = httpServer.address().port;
      resolve({ httpServer, socket, sso, knex, url: `http://localhost:${port}` });
    });
  });
}

function connect(url, auth) {
  return new Promise((resolve, reject) => {
    const client = createClient(url, { auth, reconnection: false, transports: ['websocket'] });
    client.on('connect', () => resolve(client));
    client.on('connect_error', (err) => reject(err));
  });
}

test('socket: conexión sin token es rechazada', async () => {
  const { httpServer, url } = await buildSocket();
  try {
    await connect(url, {});
    assert.fail('no debería conectar');
  } catch (err) {
    assert.match(err.message, /unauthorized/);
  } finally {
    httpServer.close();
  }
});

test('socket: conexión con token local y llamada con ack', async () => {
  const { httpServer, socket, url } = await buildSocket();
  socket.onFunction('echo', ({ payload, ack, user }) => {
    ack({ success: true, echo: payload, user: user?.id });
  });

  try {
    const client = await connect(url, { token: 'local-token', unique_id: 'req_1' });
    const res = await new Promise((resolve) => client.emit('echo', { hola: 1 }, resolve));
    assert.equal(res.success, true);
    assert.deepEqual(res.echo, { hola: 1 });
    assert.equal(res.user, 1);
    client.close();
  } finally {
    httpServer.close();
  }
});

test('socket: broadcast llega al cliente autenticado', async () => {
  const { httpServer, socket, url } = await buildSocket();
  try {
    const client = await connect(url, { token: 'local-token', unique_id: 'req_1' });
    const received = new Promise((resolve) => client.on('ping', resolve));
    socket.broadcast('ping', { ts: 123 });
    const data = await received;
    assert.equal(data.ts, 123);
    client.close();
  } finally {
    httpServer.close();
  }
});
