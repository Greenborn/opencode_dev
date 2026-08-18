export const SSO_TOKEN_KEY = 'sso_bearer_token'
export const SSO_USER_KEY = 'sso_user_data'
export const SSO_REDIRECT_URL_KEY = 'sso_redirect_url'
export const SSO_CLIENT_UNIQUE_ID = 'sso_client_unique_id'

/**
 * Resuelve las claves de `localStorage` usadas por el cliente SSO.
 *
 * Retrocompatible: si no se pasa configuración, devuelve las claves por defecto
 * (`sso_*`). Acepta nomenclatura personalizada de dos formas combinables:
 *
 * - `storagePrefix`: reemplaza el prefijo por defecto `sso_` por otro (p. ej.
 *   `'app_mascotas_'`). No aplica a claves que no empiecen con `sso_`.
 * - `keyMap`: anula el nombre de una o varias claves individualmente
 *   (`token`, `user`, `redirectUrl`, `uniqueId`). Tiene prioridad sobre el prefijo.
 *
 * @param {object} [options]
 * @param {string} [options.storagePrefix]
 * @param {object} [options.keyMap]
 * @returns {{ token: string, user: string, redirectUrl: string, uniqueId: string }}
 */
export function resolveStorageKeys(options = {}) {
  const { storagePrefix = '', keyMap = {} } = options
  const applyPrefix = (base) => {
    if (!storagePrefix) return base
    return base.startsWith('sso_') ? storagePrefix + base.slice(4) : storagePrefix + base
  }
  return {
    token: keyMap.token ?? applyPrefix(SSO_TOKEN_KEY),
    user: keyMap.user ?? applyPrefix(SSO_USER_KEY),
    redirectUrl: keyMap.redirectUrl ?? applyPrefix(SSO_REDIRECT_URL_KEY),
    uniqueId: keyMap.uniqueId ?? applyPrefix(SSO_CLIENT_UNIQUE_ID),
  }
}

export function generateUniqueId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function safeGet(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSet(key, value) {
  try {
    if (value == null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    /* localStorage no disponible */
  }
}
