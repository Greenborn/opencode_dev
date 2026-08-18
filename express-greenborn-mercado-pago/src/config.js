/**
 * Normaliza la configuración del módulo de Mercado Pago.
 *
 * Las credenciales/opciones pueden inyectarse explícitamente o leerse desde
 * process.env (MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_USER_ID, etc.), igual que
 * hacía el backend de referencia (config/config.js). El host puede pasarvalues
 * propios por opciones a createMercadoPago.
 */

const MP_API_BASE = 'https://api.mercadopago.com';

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
}

export function resolveConfig(options = {}, env = process.env) {
  const accessToken = options.accessToken || env.MERCADOPAGO_ACCESS_TOKEN;
  const userIdRaw = options.userId ?? env.MERCADOPAGO_USER_ID;
  const userId = userIdRaw ? Number(userIdRaw) : undefined;

  const storeCreateOnLocal = options.createStoreOnLocal ?? env.MERCADOPAGO_CREATE_STORE_ON_LOCAL;
  const storeExternalPrefix = options.storeExternalPrefix || env.MERCADOPAGO_STORE_EXTERNAL_PREFIX || 'SUC_';

  const posAutoCreateOnOrder = options.autoCreatePosOnOrder ?? env.MERCADOPAGO_AUTO_CREATE_POS_ON_ORDER;
  let posCategory;
  if (options.posCategory !== undefined && options.posCategory !== null && options.posCategory !== '') {
    posCategory = Number(options.posCategory);
  }
  if (posCategory === undefined || Number.isNaN(posCategory)) {
    posCategory = env.MERCADOPAGO_POS_CATEGORY ? Number(env.MERCADOPAGO_POS_CATEGORY) : 621102;
  }
  const posDefaultName = options.posDefaultName || env.MERCADOPAGO_POS_DEFAULT_NAME || 'Caja Principal';
  const posExternalPrefix = options.posExternalPrefix || env.MERCADOPAGO_POS_EXTERNAL_PREFIX || 'POS';

  const prefExpiracionMinutos = options.preferenciaExpiracionMinutos ||
    (env.PREFERENCIA_EXPIRACION_MINUTOS ? parseInt(String(env.PREFERENCIA_EXPIRACION_MINUTOS), 10) : 15);

  return {
    baseUrl: options.baseUrl || options.apiBase || env.MERCADOPAGO_API_BASE || MP_API_BASE,
    accessToken,
    userId,
    apiTimeoutMs: options.apiTimeoutMs || (env.MERCADOPAGO_API_TIMEOUT_MS ? Number(env.MERCADOPAGO_API_TIMEOUT_MS) : 4000),
    webhookUrl: options.webhookUrl || env.MERCADOPAGO_WEBHOOK_URL || '',
    backUrls: {
      success: options.backUrlSuccess || env.MERCADOPAGO_BACK_URL_SUCCESS || '',
      failure: options.backUrlFailure || env.MERCADOPAGO_BACK_URL_FAILURE || '',
      pending: options.backUrlPending || env.MERCADOPAGO_BACK_URL_PENDING || '',
    },
    store: {
      createOnLocal: toBool(storeCreateOnLocal, false),
      externalPrefix: storeExternalPrefix,
      defaultLat: options.storeDefaultLat ?? (env.MERCADOPAGO_STORE_DEFAULT_LAT ? Number(env.MERCADOPAGO_STORE_DEFAULT_LAT) : undefined),
      defaultLng: options.storeDefaultLng ?? (env.MERCADOPAGO_STORE_DEFAULT_LNG ? Number(env.MERCADOPAGO_STORE_DEFAULT_LNG) : undefined),
    },
    pos: {
      autoCreateOnOrder: toBool(posAutoCreateOnOrder, true),
      category: posCategory,
      defaultName: posDefaultName,
      externalPrefix: posExternalPrefix,
    },
    preferencia: {
      expiracionMinutos: prefExpiracionMinutos,
    },
    qr: {
      autoRenewOnPaymentApproved: toBool(options.qrAutoRenewOnPaymentApproved ?? env.QR_RENOVATION_ON_PAYMENT_APPROVED, true),
    },
  };
}