/**
 * Adaptador de preferencias para TableEditor.
 *
 * Por defecto persiste en localStorage (autónomo, sin backend). El consumidor
 * puede inyectar su propio adaptador (p. ej. un store Pinia del host) vía la
 * prop `config.preferencesStore` siempre que exponga la misma interfaz:
 *
 *   {
 *     misValores: object,                      // estado reactivo o plano
 *     valor(key): any,                         // devuelve el valor guardado
 *     guardarValores(data): Promise|void,      // persiste { key: value }
 *     fetchMisPreferencias(): Promise|void      // carga inicial
 *   }
 */

const DEFAULT_STORAGE_KEY = 'te_preferencias'

/**
 * Crea un adaptador basado en localStorage con la interfaz del store del host.
 */
export function createLocalStoragePrefsAdapter(storageKey = DEFAULT_STORAGE_KEY) {
  let misValores = {}

  function load() {
    try {
      const raw = localStorage.getItem(storageKey)
      misValores = raw ? JSON.parse(raw) : {}
    } catch {
      misValores = {}
    }
  }

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(misValores))
    } catch {
      /* ignore quota / privado */
    }
  }

  load()

  return {
    get misValores() {
      return misValores
    },
    valor(key) {
      const val = misValores[key]
      if (!val) return null
      try {
        return JSON.parse(val)
      } catch {
        return val
      }
    },
    async guardarValores(data) {
      misValores = { ...misValores, ...data }
      persist()
      return { status: true }
    },
    async fetchMisPreferencias() {
      load()
    },
  }
}

/**
 * Store global de preferencias para la librería.
 * Permite registrar un adaptador global (útil para SSR/inyección manual).
 */
const globalState = {
  adapter: null,
}

export function setGlobalPreferencesAdapter(adapter) {
  globalState.adapter = adapter
}

export function getGlobalPreferencesAdapter() {
  if (!globalState.adapter) {
    globalState.adapter = createLocalStoragePrefsAdapter()
  }
  return globalState.adapter
}
