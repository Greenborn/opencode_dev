// Cliente HTTP del reporte. La base del SGI la define quien monta el componente.
// El paquete no contiene URLs, tokens ni credenciales: el registro usa el endpoint público.

export const PATH_NOTAS_PUBLICAS = '/api/public/notas-desarrollo';

function normalizarBase(apiBaseUrl) {
  if (typeof apiBaseUrl !== 'string' || apiBaseUrl.trim() === '') {
    throw new Error('apiBaseUrl es requerido');
  }
  return apiBaseUrl.trim().replace(/\/+$/, '');
}

/**
 * Registra la nota de desarrollo en `POST /api/public/notas-desarrollo` (sin autenticación).
 * El servidor responde HTTP 200 con `{ status, data | error }`, incluido el rate limit.
 * @returns {Promise<{status: boolean, data?: object, error?: string}>}
 */
export async function enviarReporte({ apiBaseUrl, payload }) {
  const base = normalizarBase(apiBaseUrl);
  if (!payload || typeof payload !== 'object') {
    throw new Error('payload es requerido');
  }

  const res = await fetch(`${base}${PATH_NOTAS_PUBLICAS}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok && body.status !== false) {
    throw new Error(`HTTP ${res.status} al registrar el reporte`);
  }
  return body;
}
