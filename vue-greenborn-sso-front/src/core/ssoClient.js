import {
  SSO_TOKEN_KEY,
  SSO_USER_KEY,
  SSO_REDIRECT_URL_KEY,
  SSO_CLIENT_UNIQUE_ID,
  generateUniqueId,
  safeGet,
  safeSet,
} from './keys.js'

function normUrl(base) {
  return String(base || '').replace(/\/+$/, '')
}

/**
 * Crea un cliente SSO puro (framework-agnostic) que replica el servicio
 * `SSOAuthService` del frontend de referencia (GFC-Front / Angular).
 *
 * @param {object} config
 * @param {string} config.ssoBaseUrl      Base del servidor SSO, ej. "https://auth.greenborn.com.ar"
 * @param {string} config.ssoRedirect     Ruta de la app que procesa el callback, ej. "/login-redirect"
 * @param {string} [config.nodeApiBaseUrl] Base del API Node local, para verificar el perfil local ("user/sso-profile")
 * @param {string} [config.meEndpoint]    Ruta del perfil local para fetchMe, default "/user/me"
 * @param {string} [config.loginEndpoint] Ruta del login local, default "/login"
 * @returns {object} Cliente SSO con login, handleCallback, verifySession, logout, loginLocal, fetchMe y helpers.
 */
export function createSsoClient(config = {}) {
  const {
    ssoBaseUrl = '',
    ssoRedirect = '/login-redirect',
    nodeApiBaseUrl = '',
    meEndpoint = '/user/me',
    loginEndpoint = '/login',
  } = config

  const ssoBase = normUrl(ssoBaseUrl)

  function login() {
    const uniqueId = getUniqueId()
    const currentUrl = window.location.href
    const inAppPath = (() => {
      try {
        return window.location.hash || window.location.pathname + window.location.search
      } catch {
        return ''
      }
    })()
    if (inAppPath && inAppPath !== '/login' && inAppPath !== '/login-redirect') {
      safeSet(SSO_REDIRECT_URL_KEY, currentUrl)
    }

    const params = new URLSearchParams({
      url_redireccion_app: window.location.origin + ssoRedirect,
      unique_id: uniqueId,
    })

    window.location.href = `${ssoBase}/auth/google?${params.toString()}`
  }

  async function handleCallback(temporalToken, uniqueId) {
    if (getUniqueId() !== uniqueId) {
      throw new Error('Unique ID no coincide')
    }

    const response = await fetch(`${ssoBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: temporalToken }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error('SSO handleCallback: Error al obtener bearer token', response.status, errText)
      throw new Error('Error al obtener bearer token')
    }

    const data = await response.json()
    const bearerToken = data?.data?.bearer_token
    const ssoEmail = data?.data?.user?.email

    if (!bearerToken) {
      throw new Error('No se recibió bearer token del servidor SSO')
    }

    safeSet(SSO_TOKEN_KEY, bearerToken)
    safeSet(SSO_USER_KEY, JSON.stringify(data?.data?.user || {}))

    if (nodeApiBaseUrl) {
      const profileResponse = await fetch(
        `${normUrl(nodeApiBaseUrl)}user/sso-profile?unique_id=${uniqueId}`,
        { headers: { Authorization: `Bearer ${bearerToken}` } },
      )

      if (!profileResponse.ok) {
        clearSession()
        throw new Error('Error al verificar perfil local')
      }

      const profileData = await profileResponse.json()

      if (profileData?.exists && profileData?.user) {
        const pu = profileData.user
        return {
          exists: true,
          localUser: {
            id: pu.id,
            username: pu.username,
            email: pu.email,
            role_id: pu.role_id,
            roles: pu.roles || [],
            permisos: pu.permisos || [],
          },
          ssoEmail,
          bearer_token: bearerToken,
        }
      }

      return {
        exists: false,
        ssoEmail,
        bearer_token: bearerToken,
      }
    }

    return {
      exists: true,
      ssoEmail,
      bearer_token: bearerToken,
    }
  }

  async function verifySession() {
    const token = getToken()
    if (!token) {
      return { authenticated: false }
    }

    try {
      const response = await fetch(
        `${ssoBase}/auth/verify?unique_id=${getUniqueId()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        if (error.require_reauth) {
          clearSession()
          return { authenticated: false, requireReauth: true }
        }
        throw new Error('Token inválido')
      }

      const result = await response.json()
      safeSet(SSO_USER_KEY, JSON.stringify(result?.data?.user || {}))

      return {
        authenticated: true,
        user: result?.data?.user,
        extended: result?.data?.extended,
      }
    } catch (error) {
      clearSession()
      return { authenticated: false }
    }
  }

  async function fetchMe(baseUrl) {
    const token = getToken()
    const base = normUrl(baseUrl || nodeApiBaseUrl)
    if (!token) {
      return { success: false, authenticated: false, error: 'Sin token' }
    }
    if (!base) {
      return { success: false, authenticated: false, error: 'Sin nodeApiBaseUrl configurado' }
    }

    try {
      const response = await fetch(`${base}${meEndpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        if (error.require_reauth) {
          return { success: false, authenticated: false, requireReauth: true }
        }
        return { success: false, authenticated: false, error: 'Error al obtener perfil local' }
      }

      const result = await response.json()
      const user = result?.data?.user ?? result?.user
      if (user) {
        safeSet(SSO_USER_KEY, JSON.stringify(user))
      }

      return {
        success: true,
        authenticated: true,
        user: user || null,
        roles: user?.roles || [],
        permisos: user?.permisos || [],
      }
    } catch (error) {
      console.error('SSO fetchMe: error', error)
      return { success: false, authenticated: false, error: error.message }
    }
  }

  async function loginLocal(username, password) {
    const base = normUrl(nodeApiBaseUrl)
    if (!base) {
      throw new Error('Login local requiere nodeApiBaseUrl')
    }
    if (!username || !password) {
      throw new Error('Usuario y contraseña requeridos')
    }

    const response = await fetch(`${base}${loginEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    const body = await response.json().catch(() => ({}))

    if (!response.ok || !body?.success) {
      throw new Error(body?.message || 'Credenciales inválidas')
    }

    const bearerToken = body?.data?.token
    if (!bearerToken) {
      throw new Error('No se recibió token del servidor')
    }

    safeSet(SSO_TOKEN_KEY, bearerToken)
    safeSet(SSO_USER_KEY, JSON.stringify(body?.data?.user || {}))

    return {
      success: true,
      user: body?.data?.user || null,
      bearer_token: bearerToken,
    }
  }

  async function logout() {
    const token = getToken()
    if (token) {
      try {
        await fetch(`${ssoBase}/auth/logout?unique_id=${getUniqueId()}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch (error) {
        console.error('Error al cerrar sesión SSO:', error)
      }
    }
    clearSession()
  }

  function getToken() {
    return safeGet(SSO_TOKEN_KEY)
  }

  function getUser() {
    const raw = safeGet(SSO_USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  function isSSOSession() {
    return safeGet(SSO_TOKEN_KEY) !== null
  }

  function getUniqueId() {
    let id = safeGet(SSO_CLIENT_UNIQUE_ID)
    if (!id) {
      id = generateUniqueId()
      safeSet(SSO_CLIENT_UNIQUE_ID, id)
    }
    return id
  }

  function getAndClearRedirectUrl() {
    const url = safeGet(SSO_REDIRECT_URL_KEY)
    safeSet(SSO_REDIRECT_URL_KEY, null)
    return url
  }

  function clearSession() {
    safeSet(SSO_TOKEN_KEY, null)
    safeSet(SSO_USER_KEY, null)
    safeSet(SSO_REDIRECT_URL_KEY, null)
    safeSet(SSO_CLIENT_UNIQUE_ID, null)
  }

  return {
    login,
    loginLocal,
    handleCallback,
    verifySession,
    fetchMe,
    logout,
    getToken,
    getUser,
    isSSOSession,
    getUniqueId,
    getAndClearRedirectUrl,
    clearSession,
  }
}
