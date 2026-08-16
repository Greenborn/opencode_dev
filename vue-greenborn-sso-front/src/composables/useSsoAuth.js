import { ref, computed, watch, provide, inject } from 'vue'
import { createSsoClient } from '../core/ssoClient.js'
import { createSocketClient } from '../core/socketClient.js'

const SSO_INJECT_KEY = 'vue-greenborn-sso'

let sharedSingleton = null

function makeStore(config) {
  const client = createSsoClient(config)

  const wsUrl = config.wsUrl || ''
  const wsPath = config.wsPath || '/socket.io'

  const socketClient = createSocketClient({
    url: wsUrl,
    path: wsPath,
    token: client.getToken(),
    uniqueId: client.getUniqueId(),
  })
  const connected = ref(false)
  const socketError = ref(null)

  function applySocketAuth() {
    socketClient.setToken(client.getToken(), client.getUniqueId())
  }

  function connectSocket() {
    if (!wsUrl) return
    applySocketAuth()
    socketClient.connect()
  }

  function disconnectSocket() {
    socketClient.disconnect()
    connected.value = false
  }

  socketClient.subscribe((event) => {
    if (event.type === 'connect') connected.value = true
    if (event.type === 'disconnect') connected.value = false
    if (event.type === 'error') socketError.value = event.error
  })

  const token = ref(client.getToken())
  const user = ref(client.getUser())
  const authenticated = ref(client.isSSOSession())

  const isAuthenticated = computed(() => authenticated.value)
  const currentUser = computed(() => user.value)
  const accessToken = computed(() => token.value)

  const roles = computed(() => (user.value?.roles) || [])
  const permisos = computed(() => (user.value?.permisos) || [])
  const esAdmin = computed(() => roles.value.includes('ADMIN'))
  const tienePermiso = (permiso) => permisos.value.includes(permiso)

  watch(
    authenticated,
    (value) => {
      if (value) connectSocket()
      else disconnectSocket()
    },
    { immediate: true },
  )

  function refreshState() {
    token.value = client.getToken()
    user.value = client.getUser()
    authenticated.value = client.isSSOSession()
  }

  async function login() {
    return client.login()
  }

  async function loginLocal(username, password) {
    const result = await client.loginLocal(username, password)
    refreshState()
    return result
  }

  async function handleCallback(temporalToken, uniqueId) {
    const result = await client.handleCallback(temporalToken, uniqueId)
    refreshState()
    return result
  }

  async function verifySession() {
    const result = await client.verifySession()
    refreshState()
    return result
  }

  async function logout() {
    await client.logout()
    refreshState()
  }

  async function fetchMe(baseUrl) {
    const result = await client.fetchMe(baseUrl)
    if (result?.authenticated) {
      refreshState()
    }
    return result
  }

  return {
    config,
    client,
    state: {
      token,
      user,
      authenticated,
    },
    token,
    user,
    authenticated,
    isAuthenticated,
    currentUser,
    accessToken,
    roles,
    permisos,
    esAdmin,
    tienePermiso,
    login,
    loginLocal,
    handleCallback,
    verifySession,
    fetchMe,
    logout,
    getToken: () => client.getToken(),
    getUser: () => client.getUser(),
    isSSOSession: () => client.isSSOSession(),
    getUniqueId: () => client.getUniqueId(),
    getAndClearRedirectUrl: () => client.getAndClearRedirectUrl(),
    refreshState,
    socketClient,
    connected,
    socketError,
    connectSocket,
    disconnectSocket,
    socket: {
      emit: (...args) => socketClient.emit(...args),
      on: (...args) => socketClient.on(...args),
      off: (...args) => socketClient.off(...args),
      once: (...args) => socketClient.once(...args),
      setToken: (...args) => socketClient.setToken(...args),
    },
  }
}

/**
 * Instala el SSO a nivel de aplicación (provider global) y lo retorna.
 * Debe llamarse una vez (p. ej. en main.js) pasando la config.
 */
export function installSso(app, config = {}) {
  if (!sharedSingleton) {
    sharedSingleton = makeStore(config)
  }
  app.provide(SSO_INJECT_KEY, sharedSingleton)
  return sharedSingleton
}

/**
 * Composables para consumir el SSO. Si no existe un provider instalado,
 * crea un cliente local a partir de la config dada (útil para uso puntual).
 */
export function useSsoAuth(config = {}) {
  const injected = inject(SSO_INJECT_KEY, null)
  if (injected) {
    return injected
  }
  return makeStore(config)
}
