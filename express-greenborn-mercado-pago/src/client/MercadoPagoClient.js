import axios from 'axios';
import { ENDPOINTS } from './endpoints.js';

/**
 * Cliente de la API REST de Mercado Pago (api.mercadopago.com).
 *
 * Envuelve axios y centraliza la autenticación (Bearer accessToken), base URL,
 * timeout y endpoints. Agrupamos aquí TODOS los endpoints que hoy consume el
 * ecosistema del backend de mercado_pago_iot, de modo que el paquete pueda
 * crecer para absorber procesador de eventos, preferencias a demanda,
 * sucursales y POS/QR sin duplicar llamadas HTTP.
 *
 * Nota: no usa la SDK oficial npm; usa REST directo (igual que el proyecto
 * de origen), lo que simplifica el empaquetado y el control del transporte.
 */
class MercadoPagoClient {
  constructor({ baseUrl, accessToken, apiTimeoutMs = 4000, httpsAgent = null, logger = null }) {
    if (!accessToken) {
      throw new Error('MercadoPagoClient requiere options.accessToken (MERCADOPAGO_ACCESS_TOKEN)');
    }
    this.accessToken = accessToken;
    this.logger = logger;
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: apiTimeoutMs,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      ...(httpsAgent ? { httpsAgent } : {}),
    });
  }

  _headers(extra = {}) {
    return { Authorization: `Bearer ${this.accessToken}`, ...extra };
  }

  // ──────────────── Pagos y órdenes ────────────────

  async getPayment(paymentId, options = {}) {
    const { data } = await this.http.get(ENDPOINTS.payment(paymentId), {
      headers: this._headers(),
      ...options,
    });
    return data;
  }

  async getMerchantOrder(merchantOrderId, options = {}) {
    const { data } = await this.http.get(ENDPOINTS.merchantOrder(merchantOrderId), {
      headers: this._headers(),
      ...options,
    });
    return data;
  }

  async getOrder(orderId, options = {}) {
    const { data } = await this.http.get(ENDPOINTS.order(orderId), {
      headers: this._headers(),
      ...options,
    });
    return data;
  }

  // ──────────────── Sucursales (stores) ────────────────

  async createStore(userId, storeData, options = {}) {
    const { data } = await this.http.post(ENDPOINTS.createStore(userId), storeData, {
      headers: this._headers(),
      ...options,
    });
    return data;
  }

  async updateStore(userId, storeId, storeData, options = {}) {
    const { data } = await this.http.put(ENDPOINTS.store(userId, storeId), storeData, {
      headers: this._headers(),
      ...options,
    });
    return data;
  }

  async deleteStore(userId, storeId, options = {}) {
    const { data } = await this.http.delete(ENDPOINTS.store(userId, storeId), {
      headers: this._headers(),
      ...options,
    });
    return data;
  }

  // ──────────────── Puntos de venta (POS) ────────────────

  async createPos(posData, idempotencyKey, options = {}) {
    const headers = this._headers();
    if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;
    const { data } = await this.http.post(ENDPOINTS.pos(), posData, { headers, ...options });
    return data;
  }

  async getPosByExternalId(externalId, options = {}) {
    const { data } = await this.http.get(ENDPOINTS.posByExternal(), {
      params: { external_id: externalId },
      headers: this._headers(),
      ...options,
    });
    return data;
  }

  async deletePos(posId, options = {}) {
    const { data } = await this.http.delete(ENDPOINTS.posById(posId), {
      headers: this._headers(),
      ...options,
    });
    return data;
  }

  // ──────────────── Orden QR in-store ────────────────

  /**
   * Crea o reemplaza una orden QR in-store para una sucursal + POS dados.
   * Es el endpoint que usan tanto las cajas (QR estático `CAJA_{id}`) como las
   * preferencias de pago a demanda (`PREF_{caja}_{ts}`).
   */
  async createQrOrder({ userId, externalStoreId, externalPosId, orderPayload }, options = {}) {
    const { data } = await this.http.put(
      ENDPOINTS.qrOrder({ userId, externalStoreId, externalPosId }),
      orderPayload,
      { headers: this._headers(), ...options }
    );
    return data;
  }

  get accessTokenValue() {
    return this.accessToken;
  }
}

export { MercadoPagoClient };
export default MercadoPagoClient;