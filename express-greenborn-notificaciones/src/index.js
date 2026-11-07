import { createPushService } from './pushService.js';
import { createRouter } from './router.js';

/**
 * Punto de entrada del paquete. Ver README para el contrato completo.
 *
 * @param {object} options
 * @param {object} options.knex - instancia de Knex ya conectada
 * @param {string} [options.table='push_subscriptions']
 * @param {string} [options.userColumn='usuario_id']
 * @param {object} options.vapid - { publicKey, privateKey, subject }
 * @param {Function} [options.authMiddleware] - middleware Express (req,res,next)
 * @param {string} [options.userField='usuario'] - campo en `req` donde el authMiddleware deja al usuario (ej. 'usuario' o 'user')
 * @param {object} [options.logger] - { error, warn }
 */
export function createNotificaciones(options = {}) {
  const service = createPushService(options);
  const router = createRouter(options, service);

  return {
    router,
    vapidPublicKey: service.vapidPublicKey,
    estaConfigurado: service.estaConfigurado,
    enviarPushAUsuario: service.enviarPushAUsuario,
    enviarPushATodos: service.enviarPushATodos,
  };
}

export { createPushSubscriptionsMigration } from './migrations/create_push_subscriptions.js';
export default createNotificaciones;
