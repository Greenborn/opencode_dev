import { io } from 'socket.io-client'

/**
 * Cliente WebSocket complementario (socket.io) para el frontend Vue.
 * Se autentica con el bearer token SSO/local y permite transmitir mensajes
 * genéricos con callbacks por función (Pub/Sub + ACK).
 *
 * @param {object} config
 * @param {string} config.url            Base del servidor, ej. "http://localhost:5175"
 * @param {string} [config.path]         Ruta del socket, default '/socket.io'
 * @param {string} [config.token]        Bearer token (se envía en el handshake)
 * @param {string} [config.uniqueId]     unique_id SSO
 * @param {object} [config.socketOptions] Opciones extra de socket.io (reconnection, etc.)
 * @returns {object} Cliente con emit, on, off, connect, disconnect y helpers.
 */
export function createSocketClient({
  url = '',
  path = '/socket.io',
  token = '',
  uniqueId = '',
  socketOptions = {},
} = {}) {
  const baseUrl = String(url || '').replace(/\/+$/, '')
  let socket = null
  let listeners = new Set()
  let errorListeners = new Set()

  function build() {
    return io(baseUrl, {
      path,
      auth: { token, unique_id: uniqueId },
      reconnection: true,
      ...socketOptions,
    })
  }

  function setToken(newToken, newUniqueId) {
    if (socket) {
      socket.auth = {
        token: newToken ?? token,
        unique_id: newUniqueId ?? uniqueId,
      }
    }
    token = newToken ?? token
    uniqueId = newUniqueId ?? uniqueId
  }

  function connect() {
    if (socket?.connected) return socket
    if (!socket) {
      socket = build()
      socket.on('connect', () => notify({ type: 'connect' }))
      socket.on('disconnect', (reason) => notify({ type: 'disconnect', reason }))
      socket.on('connect_error', (err) => {
        notify({ type: 'error', error: err })
        errorListeners.forEach((cb) => {
          try {
            cb(err)
          } catch { /* noop */ }
        })
      })
    }
    socket.connect()
    return socket
  }

  function disconnect() {
    if (!socket) return
    socket.disconnect()
  }

  function emit(name, payload, callback) {
    if (!socket?.connected) {
      const err = new Error('Socket no conectado')
      if (typeof callback === 'function') return callback({ success: false, error: err.message })
      return Promise.reject(err)
    }
    if (typeof callback === 'function') {
      socket.emit(name, payload, callback)
      return undefined
    }
    return new Promise((resolve, reject) => {
      socket.emit(name, payload, (res) => {
        if (res && res.success === false && res.error) {
          reject(new Error(res.error))
        } else {
          resolve(res)
        }
      })
    })
  }

  function on(name, handler) {
    if (!socket) socket = connect()
    socket.on(name, handler)
  }

  function off(name, handler) {
    if (socket) socket.off(name, handler)
  }

  function once(name, handler) {
    if (!socket) socket = connect()
    socket.once(name, handler)
  }

  function notify(event) {
    listeners.forEach((cb) => {
      try {
        cb(event)
      } catch { /* noop */ }
    })
  }

  function subscribe(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  }

  function onError(cb) {
    errorListeners.add(cb)
    return () => errorListeners.delete(cb)
  }

  return {
    connect,
    disconnect,
    emit,
    on,
    off,
    once,
    setToken,
    subscribe,
    onError,
    get isConnected() {
      return Boolean(socket?.connected)
    },
    get raw() {
      return socket
    },
  }
}
