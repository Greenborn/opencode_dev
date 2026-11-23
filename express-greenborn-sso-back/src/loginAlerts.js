import axios from 'axios';

export const LOGIN_ALERTS_ENDPOINT = '/api/public/alertas-login';
export const DEFAULT_LOGIN_ALERTS_TIMEOUT_MS = 3000;
const MAX_USERNAME_LENGTH = 255;
const MAX_USER_AGENT_LENGTH = 500;

const DISABLED_ALERTER = Object.freeze({
  enabled: false,
  notify() {},
});

/**
 * Normaliza la configuración de alertas de login inválido.
 * Opciones: { enabled, url, projectSlug, apiKey, timeoutMs }.
 * Fallback a variables de entorno: SSO_LOGIN_ALERTS_ENABLED, SGI_ALERTS_URL,
 * SGI_ALERTS_PROJECT_SLUG, SGI_ALERTS_API_KEY.
 * Desactivada por defecto. Si está activada y faltan datos, lanza error.
 */
export function normalizeLoginAlertsConfig(raw, env = process.env) {
  const input = raw === true ? { enabled: true } : (raw && typeof raw === 'object' ? raw : {});

  const enabled = input.enabled !== undefined
    ? input.enabled === true
    : env.SSO_LOGIN_ALERTS_ENABLED === 'true';

  if (!enabled) {
    return { enabled: false };
  }

  const url = input.url !== undefined ? input.url : env.SGI_ALERTS_URL;
  const projectSlug = input.projectSlug !== undefined ? input.projectSlug : env.SGI_ALERTS_PROJECT_SLUG;
  const apiKey = input.apiKey !== undefined ? input.apiKey : env.SGI_ALERTS_API_KEY;
  const timeoutMs = input.timeoutMs !== undefined ? input.timeoutMs : DEFAULT_LOGIN_ALERTS_TIMEOUT_MS;

  const faltantes = [];
  if (typeof url !== 'string' || url.trim() === '') faltantes.push('url (SGI_ALERTS_URL)');
  if (typeof projectSlug !== 'string' || projectSlug.trim() === '') faltantes.push('projectSlug (SGI_ALERTS_PROJECT_SLUG)');
  if (typeof apiKey !== 'string' || apiKey.trim() === '') faltantes.push('apiKey (SGI_ALERTS_API_KEY)');
  if (faltantes.length > 0) {
    throw new Error(`loginAlerts: alertas activadas pero faltan: ${faltantes.join(', ')}`);
  }

  return {
    enabled: true,
    url: url.trim().replace(/\/+$/, ''),
    projectSlug: projectSlug.trim(),
    apiKey: apiKey.trim(),
    timeoutMs: Number(timeoutMs) > 0 ? Number(timeoutMs) : DEFAULT_LOGIN_ALERTS_TIMEOUT_MS,
  };
}

function truncate(value, max) {
  if (value === undefined || value === null) return null;
  return String(value).slice(0, max);
}

/**
 * Crea el emisor de alertas. notify() es fire-and-forget: no bloquea la
 * respuesta del login y ante error solo registra en el logger.
 * @param {object} config - resultado de normalizeLoginAlertsConfig
 * @param {object} opts - { logger, httpClient } (httpClient inyectable para tests)
 */
export function createLoginAlerter(config, { logger = console, httpClient = axios } = {}) {
  if (!config.enabled) {
    return DISABLED_ALERTER;
  }

  const endpoint = `${config.url}${LOGIN_ALERTS_ENDPOINT}`;
  const headers = {
    'x-project-slug': config.projectSlug,
    'x-api-key': config.apiKey,
    'content-type': 'application/json',
  };

  function notify(evento) {
    // La contraseña nunca se incluye: el payload solo tiene el usuario intentado.
    const payload = {
      usuario_intentado: truncate(evento.usuario_intentado, MAX_USERNAME_LENGTH),
      ip: truncate(evento.ip, 64),
      user_agent: truncate(evento.user_agent, MAX_USER_AGENT_LENGTH),
      motivo: evento.motivo,
      endpoint: truncate(evento.endpoint, 255),
      ocurrido_en: evento.ocurrido_en,
    };

    httpClient
      .post(endpoint, payload, { headers, timeout: config.timeoutMs })
      .catch((err) => {
        const status = err.response?.status;
        const detalle = status ? `HTTP ${status}` : err.message;
        (logger?.error || console.error)(`[LoginAlerts] No se pudo enviar la alerta a SGI (${detalle})`);
      });
  }

  return { enabled: true, notify };
}
