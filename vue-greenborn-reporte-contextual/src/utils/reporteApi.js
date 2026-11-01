// Cliente HTTP del reporte. La base del SGI la define quien monta el componente.
// El paquete no contiene URLs, tokens ni credenciales: el registro usa el endpoint público.

export const PATH_NOTAS_PUBLICAS = '/api/public/notas-desarrollo';
export const PATH_API_KEY = '/api/public/notas-desarrollo/api-key';

function normalizarBase(apiBaseUrl) {
  if (typeof apiBaseUrl !== 'string' || apiBaseUrl.trim() === '') {
    throw new Error('apiBaseUrl es requerido');
  }
  return apiBaseUrl.trim().replace(/\/+$/, '');
}

/**
 * Consulta la apikey pública vigente en `GET /api/public/notas-desarrollo/api-key`.
 * Es la misma para todos los clientes y rota una vez por día; por eso se reconsulta
 * antes de cada envío en vez de cachearla localmente.
 * @returns {Promise<string>}
 */
export async function obtenerApiKeyPublica({ apiBaseUrl }) {
  const base = normalizarBase(apiBaseUrl);
  const res = await fetch(`${base}${PATH_API_KEY}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const body = await res.json();
  if (!res.ok || body.status !== true || !body.data?.apiKey) {
    throw new Error('No se pudo obtener la apikey del reporte');
  }
  return body.data.apiKey;
}

/**
 * Registra la nota de desarrollo en `POST /api/public/notas-desarrollo` (apikey pública
 * en el header `X-Api-Key`, reconsultada antes de cada envío).
 * El servidor responde HTTP 200 con `{ status, data | error }`, incluido el rate limit.
 * @returns {Promise<{status: boolean, data?: object, error?: string}>}
 */
export async function enviarReporte({ apiBaseUrl, payload }) {
  const base = normalizarBase(apiBaseUrl);
  if (!payload || typeof payload !== 'object') {
    throw new Error('payload es requerido');
  }

  const apiKey = await obtenerApiKeyPublica({ apiBaseUrl: base });

  const res = await fetch(`${base}${PATH_NOTAS_PUBLICAS}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Api-Key': apiKey },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok && body.status !== false) {
    throw new Error(`HTTP ${res.status} al registrar el reporte`);
  }
  return body;
}
