import { ref } from 'vue'

/**
 * Lógica de autoactualización de PWA (vite-plugin-pwa, modo injectManifest),
 * extraída de sistema-gestion-interno para reusar en cualquier app Greenborn.
 *
 * No registra el service worker por sí mismo: la app sigue llamando a
 * `useRegisterSW` (o `registerSW`) de `virtual:pwa-register/vue` (o la variante
 * plana) y conecta sus callbacks con `marcarActualizacionDisponible` /
 * `registrarActualizacionSw`. Esto evita acoplar el paquete a la config de
 * Vite de cada proyecto (que define su propio `sw.js` con workbox).
 *
 * Opciones:
 * - versionUrl: ruta de un JSON `{ version }` servido sin cache (default '/version.json').
 *   Pasar `null` desactiva el polling por versión (solo se detecta por `onNeedRefresh`).
 * - currentVersion: versión actual del build (ej. `package.json`'s version), para comparar.
 * - checkIntervalMs: intervalo de polling (default 5 minutos).
 * - autoApplyOnHidden: si true, aplica la actualización sola cuando la pestaña
 *   pasa a segundo plano y hay una actualización pendiente (default false).
 */
export function useAutoUpdatePwa(options = {}) {
  const {
    versionUrl = '/version.json',
    currentVersion = null,
    checkIntervalMs = 5 * 60 * 1000,
    autoApplyOnHidden = false,
  } = options

  const updateAvailable = ref(false)
  let swUpdateFn = null
  let pollTimer = null
  let visibilityListenerAdded = false
  let autoApplyListenerAdded = false

  async function checkVersion() {
    if (!versionUrl) return
    try {
      const res = await fetch(`${versionUrl}?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (data.version && data.version !== currentVersion) {
        marcarActualizacionDisponible()
      }
    } catch {
      // Sin conexión o version.json no disponible: no interrumpir al usuario.
    }
  }

  function iniciarPolling() {
    checkVersion()
    if (!pollTimer && versionUrl) {
      pollTimer = setInterval(checkVersion, checkIntervalMs)
    }
    if (!visibilityListenerAdded) {
      visibilityListenerAdded = true
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkVersion()
      })
    }
  }

  // Registra el callback de vite-plugin-pwa (updateServiceWorker / updateSW) para
  // que "aplicarActualizacion" también fuerce el skipWaiting del service worker,
  // y no solo un reload que seguiría leyendo el SW/caché viejo.
  function registrarActualizacionSw(updateFn) {
    swUpdateFn = updateFn
  }

  function marcarActualizacionDisponible() {
    updateAvailable.value = true
    if (autoApplyOnHidden) activarAutoApplyOnHidden()
  }

  function activarAutoApplyOnHidden() {
    if (autoApplyListenerAdded) return
    autoApplyListenerAdded = true
    const aplicar = () => {
      if (document.visibilityState === 'hidden' && updateAvailable.value) {
        document.removeEventListener('visibilitychange', aplicar)
        autoApplyListenerAdded = false
        aplicarActualizacion()
      }
    }
    document.addEventListener('visibilitychange', aplicar)
  }

  async function aplicarActualizacion() {
    if (swUpdateFn) {
      try {
        // updateServiceWorker/updateSW(true) solo envía el mensaje skipWaiting y
        // resuelve; no espera a que el nuevo SW tome control. Si recargamos ahora
        // mismo, la navegación todavía queda servida por el SW viejo (y su caché
        // de Workbox), que es justo el síntoma de "actualizar recarga pero sigue
        // mostrando la versión anterior hasta Ctrl+F5". Esperamos el
        // controllerchange real antes de recargar.
        if ('serviceWorker' in navigator) {
          await Promise.race([
            new Promise((resolve) => {
              navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true })
            }),
            swUpdateFn(true).then(() => new Promise((resolve) => setTimeout(resolve, 3000))),
          ])
        } else {
          await swUpdateFn(true)
        }
      } catch {
        // Si no hay un service worker en espera, el update no dispara el reload
        // automático; forzamos uno abajo de todos modos.
      }
    } else if ('serviceWorker' in navigator) {
      // Detectado solo por version.json: el SW activo todavía no chequeó contra
      // el server. Forzamos ese chequeo antes de recargar para no terminar
      // sirviendo el index.html viejo desde su cache de Workbox.
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        await reg?.update()
      } catch {
        // noop
      }
    }
    window.location.reload()
  }

  return {
    updateAvailable,
    iniciarPolling,
    checkVersion,
    registrarActualizacionSw,
    marcarActualizacionDisponible,
    aplicarActualizacion,
  }
}
