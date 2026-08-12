import { inject } from 'vue'
import { createSocketClient } from '../core/socketClient.js'
import { useSsoAuth } from './useSsoAuth.js'

const SSO_INJECT_KEY = 'vue-greenborn-sso'

/**
 * Composable para consumir la conexión WebSocket complementaria.
 * Si existe un store SSO instalado (installSso) reutiliza su socketClient y su
 * ciclo de vida (auto-conectar/desconectar con la sesión). Si no, crea un
 * cliente independiente a partir de la config dada.
 *
 * @param {object} [config] Config { wsUrl, wsPath, token, uniqueId, ... } para uso puntual.
 * @returns {object} { connected, socketError, emit, on, off, once, connect, disconnect, connectSocket, disconnectSocket }
 */
export function useSsoSocket(config = {}) {
  const injected = inject(SSO_INJECT_KEY, null)

  if (injected) {
    return {
      connected: injected.connected,
      socketError: injected.socketError,
      emit: (...args) => injected.socket.emit(...args),
      on: (...args) => injected.socket.on(...args),
      off: (...args) => injected.socket.off(...args),
      once: (...args) => injected.socket.once(...args),
      connect: (...args) => injected.connectSocket(...args),
      disconnect: (...args) => injected.disconnectSocket(...args),
      connectSocket: (...args) => injected.connectSocket(...args),
      disconnectSocket: (...args) => injected.disconnectSocket(...args),
      client: injected.socketClient,
    }
  }

  const sso = useSsoAuth(config)
  const client = sso.socketClient || createSocketClient(config)
  return {
    connected: sso.connected,
    socketError: sso.socketError,
    emit: (...args) => client.emit(...args),
    on: (...args) => client.on(...args),
    off: (...args) => client.off(...args),
    once: (...args) => client.once(...args),
    connect: (...args) => sso.connectSocket(...args),
    disconnect: (...args) => sso.disconnectSocket(...args),
    connectSocket: (...args) => sso.connectSocket(...args),
    disconnectSocket: (...args) => sso.disconnectSocket(...args),
    client,
  }
}
