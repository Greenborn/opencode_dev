/**
 * Cliente Web Push agnóstico de librería HTTP: recibe un `http` mínimo
 * { get(url), post(url, body), delete(url, { data }) } — compatible con una
 * instancia de axios tal cual, o un wrapper propio sobre fetch.
 */

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Pide permiso de notificaciones y suscribe el Service Worker activo a Web
 * Push (VAPID), registrando la suscripción en el backend. No hace nada si el
 * navegador no soporta push o si el usuario no otorga el permiso.
 *
 * @param {object} opts
 * @param {{get:Function,post:Function}} opts.http
 * @param {string} [opts.vapidKeyEndpoint='/push/vapid-public-key']
 * @param {string} [opts.subscribeEndpoint='/push/suscripcion']
 * @returns {Promise<boolean>}
 */
export async function suscribirPush({ http, vapidKeyEndpoint = '/push/vapid-public-key', subscribeEndpoint = '/push/suscripcion' }) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  if (Notification.permission !== 'granted') return false;

  const { data: keyBody } = await http.get(vapidKeyEndpoint);
  if (!keyBody.status || !keyBody.data.configurado || !keyBody.data.publicKey) return false;

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyBody.data.publicKey),
    });
  }

  await http.post(subscribeEndpoint, {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: arrayBufferToBase64Url(subscription.getKey('p256dh')),
      auth: arrayBufferToBase64Url(subscription.getKey('auth')),
    },
  });
  return true;
}

/**
 * @param {object} opts
 * @param {{delete:Function}} opts.http
 * @param {string} [opts.unsubscribeEndpoint='/push/suscripcion']
 */
export async function desuscribirPush({ http, unsubscribeEndpoint = '/push/suscripcion' }) {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await http.delete(unsubscribeEndpoint, { data: { endpoint: subscription.endpoint } });
  await subscription.unsubscribe();
}
