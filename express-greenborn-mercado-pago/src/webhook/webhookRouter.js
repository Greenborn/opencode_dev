import { Router } from 'express';

/**
 * Router Express para el webhook de Mercado Pago.
 *
 * Se monta sobre el path que el host elija (en el backend de origen era
 * `/api/webhook`, quedando el endpoint público `POST /api/webhook/mercadopago`).
 * Es una ruta pública (sin autenticación): Mercado Pago envía las notificaciones
 * así. La verificación de firma (X-Signature) queda como mejora pendiente,
 * igual que en el proyecto de origen.
 */
export function createWebhookRouter({ db, config, logger, onNewWebhook }) {
  const router = Router();
  const controller = createWebhookController({ db, config, logger, onNewWebhook });
  router.post('/mercadopago', controller);
  return router;
}

import { createWebhookController } from './webhookController.js';

export { createWebhookController };
export default createWebhookRouter;