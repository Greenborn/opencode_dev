export const SSO_TOKEN_KEY = 'sso_bearer_token'
export const SSO_USER_KEY = 'sso_user_data'
export const SSO_REDIRECT_URL_KEY = 'sso_redirect_url'
export const SSO_CLIENT_UNIQUE_ID = 'sso_client_unique_id'

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
