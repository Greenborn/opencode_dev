/**
 * Entry point separado (`vue-greenborn-notificaciones/sw`) para usar DENTRO
 * del service worker propio del proyecto consumidor.
 *
 * Cada proyecto compila su propio sw.js (típicamente con vite-plugin-pwa en
 * modo `injectManifest`) — este paquete NO puede inyectar un service worker
 * completo, solo exporta una función que ese sw.js debe invocar:
 *
 *   // src/sw.js del proyecto consumidor
 *   import { precacheAndRoute } from 'workbox-precaching'
 *   import { registrarPushListener } from 'vue-greenborn-notificaciones/sw'
 *
 *   precacheAndRoute(self.__WB_MANIFEST)
 *   registrarPushListener(self)
 */
export function registrarPushListener(self, opts = {}) {
  const {
    tituloPorDefecto = 'Notificación',
    icon = '/pwa-192x192.svg',
    badge = '/pwa-192x192.svg',
    vibrate = [200, 100, 200],
    urlAlEnfocar = '/',
  } = opts;

  self.addEventListener('push', (event) => {
    let payload = { titulo: tituloPorDefecto, mensaje: '' };
    try {
      if (event.data) payload = event.data.json();
    } catch {
      payload.mensaje = event.data ? event.data.text() : '';
    }

    event.waitUntil(
      self.registration.showNotification(payload.titulo || tituloPorDefecto, {
        body: payload.mensaje || '',
        icon,
        badge,
        vibrate,
        requireInteraction: false,
      })
    );
  });

  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientsArr) => {
        const existente = clientsArr.find((c) => c.url.includes(self.location.origin));
        if (existente) return existente.focus();
        return self.clients.openWindow(urlAlEnfocar);
      })
    );
  });
}
