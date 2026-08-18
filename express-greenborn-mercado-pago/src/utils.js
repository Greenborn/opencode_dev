/**
 * Helpers utilitarios del módulo de Mercado Pago, extraídos del pipeline
 * del backend de referencia (webhookController/eventoProcessorService).
 */

/**
 * Extrae (payment_id, payment_status) normalizados desde el payload del
 * webhook de Mercado Pago, contemplando las variantes de estructura:
 * - { data: { id, status } }
 * - { id, status }
 * - { id, order_status }
 * - { payments: [{ id, status }] } (merchant_order)
 */
export function extractPaymentInfo(obj) {
  const info = { payment_id: '', payment_status: '' };
  if (!obj || typeof obj !== 'object') return info;
  if (obj.data?.id) info.payment_id = String(obj.data.id);
  else if (obj.id) info.payment_id = String(obj.id);
  if (obj.data?.status) info.payment_status = String(obj.data.status);
  else if (obj.status) info.payment_status = String(obj.status);
  else if (obj.order_status) info.payment_status = String(obj.order_status);
  if ((info.payment_id === '' || info.payment_status === '') && Array.isArray(obj.payments)) {
    const p = obj.payments[0];
    if (p) {
      if (info.payment_id === '' && p.id) info.payment_id = String(p.id);
      if (info.payment_status === '' && p.status) info.payment_status = String(p.status);
    }
  }
  return info;
}

/**
 * Extrae los distintos estados presentes en un objeto de respuesta de MP
 * (status / order_status / payments[*].status), útil para poblar catálogos.
 */
export function extractStatuses(obj) {
  const set = new Set();
  if (obj?.status) set.add(String(obj.status));
  if (obj?.order_status) set.add(String(obj.order_status));
  if (Array.isArray(obj?.payments)) {
    obj.payments.forEach((p) => p?.status && set.add(String(p.status)));
  }
  return Array.from(set);
}

/**
 * Sustituye la columna `id_preferencia_pago` por `id_caja` (renombre histórico).
 * Se deja documentado por si se reutiliza en migraciones o scripts.
 */
export const EVENTO_TABLE = 'evento_mercado_pago';

export function safeParse(raw) {
  if (raw === undefined || raw === null) return {};
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}