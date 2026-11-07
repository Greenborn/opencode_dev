import { ref } from 'vue';
import { suscribirPush, desuscribirPush } from './pushClient.js';

/**
 * Composable opcional que envuelve suscribirPush/desuscribirPush con estado
 * reactivo. Requiere `vue` (peerDependency opcional del paquete) — si no usás
 * este composable, no necesitás tener vue instalado.
 */
export function usePush({ http, vapidKeyEndpoint, subscribeEndpoint, unsubscribeEndpoint } = {}) {
  const soportado = ref('serviceWorker' in navigator && 'PushManager' in window);
  const suscripto = ref(false);
  const cargando = ref(false);

  async function suscribir() {
    cargando.value = true;
    try {
      suscripto.value = await suscribirPush({ http, vapidKeyEndpoint, subscribeEndpoint });
      return suscripto.value;
    } finally {
      cargando.value = false;
    }
  }

  async function desuscribir() {
    cargando.value = true;
    try {
      await desuscribirPush({ http, unsubscribeEndpoint });
      suscripto.value = false;
    } finally {
      cargando.value = false;
    }
  }

  return { soportado, suscripto, cargando, suscribir, desuscribir };
}
