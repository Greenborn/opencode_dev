import axios from 'axios'

// Cliente HTTP compartido. credentials: 'include' (withCredentials) según la convención del monorepo.
// El token de prueba viaja en Authorization; unique_id es requerido por el middleware SSO.
export const UNIQUE_ID = 'crud-demo'
const TOKEN_KEY = 'crud-demo-token'

const instancia = axios.create({ withCredentials: true, params: { unique_id: UNIQUE_ID } })

instancia.interceptors.request.use((config) => {
  const token = obtenerToken()
  if (token !== null) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let tokenEnMemoria = null

export function guardarToken(token) {
  tokenEnMemoria = token
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch (err) {
    // Sólo persistencia de conveniencia: la sesión sigue en memoria.
    console.log('[crud-demo] no se pudo guardar el token en localStorage:', err)
  }
}

export function obtenerToken() {
  if (tokenEnMemoria !== null) return tokenEnMemoria
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch (err) {
    console.log('[crud-demo] no se pudo leer el token de localStorage:', err)
    return null
  }
}

export function borrarToken() {
  tokenEnMemoria = null
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch (err) {
    console.log('[crud-demo] no se pudo borrar el token de localStorage:', err)
  }
}

// Adaptador que pide `http` al módulo CrudModulo: devuelve la data y lanza en error (err.response.data).
export const http = {
  get: (url, config) => instancia.get(url, config).then((r) => r.data),
  post: (url, body, config) => instancia.post(url, body, config).then((r) => r.data),
  put: (url, body, config) => instancia.put(url, body, config).then((r) => r.data),
  delete: (url, config) => instancia.delete(url, config).then((r) => r.data),
}

export function loginConToken(token) {
  return instancia
    .get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.data.data)
}
