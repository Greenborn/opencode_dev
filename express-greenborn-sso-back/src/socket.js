import { Server } from 'socket.io';
import { normalizeUniqueId, tokenPreview } from './utils.js';

/**
 * Crea una conexión WebSocket complementaria (socket.io) sobre el mismo
 * http.Server de la app Express. Autentica cada conexión con el bearer token
 * SSO (o token local) y permite transmitir mensajes genéricos con callbacks
 * por función (Pub/Sub + ACK).
 *
 * @param {object} options
 * @param {object} options.sso            Instancia de createSsoAuth()
 * @param {object} options.httpServer     http.Server de Express (app.listen(...))
 * @param {string} [options.path]         Ruta del socket, default '/socket.io'
 * @param {string|string[]} [options.corsOrigin] Origen(es) CORS permitidos
 * @param {number} [options.maxPayload]   Tamaño máx. de payload en bytes
 * @returns {object} Manager de socket con io, onFunction, onConnection, emitToUser, etc.
 */
export function createSsoSocket({
  sso,
  httpServer,
  path = '/socket.io',
  corsOrigin = '*',
  maxPayload,
} = {}) {
  if (!sso) throw new Error('createSsoSocket: la opción "sso" es obligatoria');
  if (!httpServer) throw new Error('createSsoSocket: la opción "httpServer" es obligatoria');

  const { findLocalUserByToken, verifySsoToken, syncSsoUser, normalizeUniqueId } = sso;
  const log = sso.logger || console;

  const serverOpts = {
    path,
    cors: { origin: corsOrigin },
  };
  if (maxPayload) serverOpts.maxHttpBufferSize = maxPayload;

  const io = new Server(httpServer, serverOpts);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake?.auth?.token;
      if (!token) {
        return next(new Error('unauthorized: token requerido'));
      }

      const localUser = await findLocalUserByToken(token);
      if (localUser) {
        socket.data.user = localUser;
        socket.data.token = token;
        socket.data.uniqueId = normalizeUniqueId(socket.handshake?.auth?.unique_id);
        return next();
      }

      const uniqueId = normalizeUniqueId(socket.handshake?.auth?.unique_id);
      if (!uniqueId) {
        return next(new Error('unauthorized: unique_id requerido para token SSO'));
      }

      const response = await verifySsoToken(token, uniqueId);
      if (!response?.data?.success || !response?.data?.data?.valid) {
        log.error(`[Socket] SSO rechazó token: ${JSON.stringify(response?.data)}`);
        return next(new Error('unauthorized: token SSO inválido'));
      }

      const ssoUser = response.data.data.user;
      const user = await syncSsoUser(ssoUser);
      socket.data.user = user;
      socket.data.token = token;
      socket.data.uniqueId = uniqueId;
      return next();
    } catch (error) {
      const ssoBody = error.response?.data;
      log.error(`[Socket] Error de autenticación: ${JSON.stringify(ssoBody) || error.message}`);
      return next(new Error('unauthorized: error de autenticación'));
    }
  });

  const functionHandlers = new Map();
  const connectionHandlers = new Set();

  function joinUserRooms(socket) {
    const user = socket.data?.user;
    if (user?.id != null) socket.join(`user:${user.id}`);
    if (user?.email) socket.join(`user:${user.email}`);
  }

  function registerFunctionHandlers(socket) {
    for (const [name, handler] of functionHandlers.entries()) {
      socket.on(name, (payload, ack) => {
        try {
          handler({ payload, socket, ack, user: socket.data?.user });
        } catch (err) {
          log.error(`[Socket] Error en función "${name}": ${err.message}`);
          if (typeof ack === 'function') ack({ success: false, error: err.message });
        }
      });
    }
  }

  io.on('connection', (socket) => {
    const user = socket.data?.user;
    const ruta = socket.handshake?.url || 'socket';
    log.log(`[Socket] Conexión ${socket.id} — user: ${user?.id ?? 'anon'} — ${tokenPreview(socket.data?.token)} — ${ruta}`);

    joinUserRooms(socket);
    registerFunctionHandlers(socket);

    for (const cb of connectionHandlers) {
      try {
        cb(socket);
      } catch (err) {
        log.error(`[Socket] Error en onConnection: ${err.message}`);
      }
    }

    socket.on('disconnect', (reason) => {
      log.log(`[Socket] Desconexión ${socket.id} — ${reason}`);
    });
  });

  function onFunction(name, handler) {
    if (typeof name !== 'string' || typeof handler !== 'function') {
      throw new TypeError('onFunction: se requiere un nombre y un handler');
    }
    functionHandlers.set(name, handler);
    return api;
  }

  function onConnection(cb) {
    connectionHandlers.add(cb);
    return api;
  }

  function emitToUser(userId, name, payload, options = {}) {
    io.to(`user:${userId}`).emit(name, payload);
    return api;
  }

  function emitToRoom(room, name, payload) {
    io.to(room).emit(name, payload);
    return api;
  }

  function broadcast(name, payload) {
    io.emit(name, payload);
    return api;
  }

  function close() {
    io.close();
    return api;
  }

  const api = {
    io,
    onFunction,
    onConnection,
    emitToUser,
    emitToRoom,
    broadcast,
    close,
  };

  return api;
}
