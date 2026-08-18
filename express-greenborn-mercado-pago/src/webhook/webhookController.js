import { extractPaymentInfo } from '../utils.js';

/**
 * Controlador del webhook de Mercado Pago.
 *
 * Extraído de webhookController.js (backend mercado_pago_iot). Persiste cada
 * notificación en la tabla `evento_mercado_pago` con deduplicación atómica
 * vía UNIQUE(payment_id, payment_status): si el evento ya existe, ON DUPLICATE
 * KEY hace un no-op (affectedRows = 0) y se responde igualmente 200.
 *
 * Todas las consultas usan la instancia de knex inyectada (DI). Si el evento es
 * nuevo, se dispara `onNewWebhook(payload)` si el host lo provee (en el backend
 * de origen esto activaba el procesador de eventos asíncrono).
 */
export function createWebhookController({ db, config, logger, onNewWebhook }) {
  const TABLE = 'evento_mercado_pago';

  return async function webhookMercadoPago(req, res) {
    try {
      const payload = req.body;

      logger.info('Webhook de Mercado Pago recibido', { id: payload?.id, type: payload?.type });

      if (!payload || !payload.id) {
        logger.warn('Webhook sin datos válidos');
        return res.status(400).json({ error: 'Datos inválidos' });
      }

      const info = extractPaymentInfo(payload);
      const pid = info.payment_id || '';
      const pst = info.payment_status || '';

      const [result] = await db.raw(
        `INSERT INTO ${TABLE}
           (json, payment_id, payment_status, id_local_comercio, id_dispositivo, id_caja, creado_el)
         VALUES (?, ?, ?, NULL, NULL, NULL, NOW())
         ON DUPLICATE KEY UPDATE id_evento_mercado_pago = id_evento_mercado_pago`,
        [JSON.stringify(payload), pid, pst]
      );

      const affectedRows = Number(result?.affectedRows ?? 0);
      const esNuevo = affectedRows === 1;

      if (esNuevo) {
        logger.info('Webhook registrado exitosamente', { payment_id: pid || 'N/A' });
        if (typeof onNewWebhook === 'function') {
          // No bloquear la respuesta: se dispara en segundo plano (catch para no
          // reventar el flujo si el handler del host lanza).
          Promise.resolve()
            .then(() => onNewWebhook(payload, { payment_id: pid, payment_status: pst }))
            .catch((error) => logger.error('Error en onNewWebhook', { error: error?.message || error }));
        }
      } else {
        logger.info('Evento duplicado ignorado', { payment_id: pid, payment_status: pst });
      }

      return res.json({ mensaje: 'Webhook recibido correctamente' });
    } catch (error) {
      logger.error('Error registrando webhook de Mercado Pago', error);
      return res.status(500).json({ error: 'Error registrando webhook' });
    }
  };
}