import { resolveConfig } from './config.js';
import { normalizeLogger } from './logger.js';
import { MercadoPagoClient } from './client/MercadoPagoClient.js';
import { ENDPOINTS } from './client/endpoints.js';
import { createWebhookRouter, createWebhookController } from './webhook/webhookRouter.js';
export * from './utils.js';
export { MercadoPagoClient } from './client/MercadoPagoClient.js';
export { ENDPOINTS } from './client/endpoints.js';
export { resolveConfig, normalizeLogger };

/**
 * createMercadoPago(options)
 *
 * Factory principal del paquete express-greenborn-mercado-pago.
 * Centraliza la integración con Mercado Pago mediante inyección de
 * dependencias (patrón homólogo a createSsoAuth de express-greenborn-sso-back):
 * el host inyecta su instancia de knex, logger y credenciales; el paquete no
 * depende del esquema de BD ni de la configuración global del proyecto.
 *
 * Alcance actual: API client + webhook receptor. La factory devuelve un objeto
 * con espacio para crecer e ir absorbiendo a futuro el resto del ecosistema MP
 * (procesador de eventos, preferencias a demanda, sucursales, POS/QR).
 *
 * Opciones:
 *   knex            {object}  obligatorio — instancia de Knex del host
 *   accessToken     {string}  token de MP (o env MERCADOPAGO_ACCESS_TOKEN)
 *   userId          {number}  id de cuenta de MP (o env MERCADOPAGO_USER_ID)
 *   logger          {object}  { info, warn, error, debug, log } (default console-like silencioso)
 *   baseUrl         {string}  default https://api.mercadopago.com
 *   apiTimeoutMs    {number}  default 4000
 *   onNewWebhook    {fn}      (payload, info) => void — se dispara al registrar un evento nuevo
 *   ...otras opciones de config (createStoreOnLocal, posCategory, etc.)
 *
 * Retorna:
 *   { client, webhookRouter, webhookHandler, config, rootPath }
 */
export function createMercadoPago(options = {}) {
  const { knex } = options;
  if (!knex) {
    throw new Error('createMercadoPago requiere options.knex (instancia de Knex)');
  }
  const logger = normalizeLogger(options.logger);
  const config = resolveConfig(options);

  const client = new MercadoPagoClient({
    baseUrl: config.baseUrl,
    accessToken: config.accessToken,
    apiTimeoutMs: config.apiTimeoutMs,
    httpsAgent: options.httpsAgent || null,
    logger,
  });

  const webhookHandler = createWebhookController({
    db: knex,
    config,
    logger,
    onNewWebhook: options.onNewWebhook || null,
  });

  const webhookRouter = createWebhookRouter({
    db: knex,
    config,
    logger,
    onNewWebhook: options.onNewWebhook || null,
  });

  return {
    client,
    webhookRouter,
    webhookHandler,
    config,
    // Ruta raíz sugerida para montar el router (endpoint público final:
    // `<host>/api/webhook/mercadopago`, igual que en el proyecto de origen).
    rootPath: '/api/webhook',
  };
}

export default createMercadoPago;