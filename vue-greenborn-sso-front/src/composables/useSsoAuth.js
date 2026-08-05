import { ref, computed, provide, inject } from 'vue'
import { createSsoClient } from '../core/ssoClient.js'

const SSO_INJECT_KEY = 'vue-greenborn-sso'

let sharedSingleton = null

function makeStore(config) {
  const client = createSsoClient(config)

  const token = ref(client.getToken())
  const user = ref(client.getUser())
  const authenticated = ref(client.isSSOSession())

  const isAuthenticated = computed(() => authenticated.value)
  const currentUser = computed(() => user.value)
  const accessToken = computed(() => token.value)

  function refreshState() {
    token.value = client.getToken()
    user.value = client.getUser()
    authenticated.value = client.isSSOSession()
  }

  async function login() {
    return client.login()
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
    login,
    handleCallback,
    verifySession,
    logout,
    getToken: () => client.getToken(),
    getUser: () => client.getUser(),
    isSSOSession: () => client.isSSOSession(),
    getUniqueId: () => client.getUniqueId(),
    getAndClearRedirectUrl: () => client.getAndClearRedirectUrl(),
    refreshState,
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
