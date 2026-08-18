/**
 * Constantes de URLs de la API de Mercado Pago usadas por el módulo.
 * Se interpolan a partir de la base (config.baseUrl).
 */

export const ENDPOINTS = {
  // Pagos y órdenes
  payment: (id) => `/v1/payments/${id}`,
  merchantOrder: (id) => `/merchant_orders/${id}`,
  order: (id) => `/v1/orders/${id}`,

  // Sucursales (stores)
  createStore: (userId) => `/users/${userId}/stores`,
  store: (userId, storeId) => `/users/${userId}/stores/${storeId}`,

  // Puntos de venta (POS)
  pos: () => '/pos',
  posByExternal: () => '/pos',
  posById: (posId) => `/pos/${posId}`,

  // Órdenes QR in-store
  qrOrder: ({ userId, externalStoreId, externalPosId }) =>
    `/instore/qr/seller/collectors/${userId}/stores/${externalStoreId}/pos/${externalPosId}/orders`,
};