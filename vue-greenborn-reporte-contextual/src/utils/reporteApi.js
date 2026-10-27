// Cliente HTTP del reporte. La base del SGI la define quien monta el componente; el paquete
// no contiene URLs ni credenciales fijas.

export const PATH_PROYECTOS = '/api/proyectos';
export const PATH_NOTAS_PUBLICAS = '/api/public/notas-desarrollo';

const PAGE_SIZE = 100;
const MAX_PAGINAS = 50;

function normalizarBase(apiBaseUrl) {
  if (typeof apiBaseUrl !== 'string' || apiBaseUrl.trim() === '') {
    throw new Error('apiBaseUrl es requerido');
  }
  return apiBaseUrl.trim().replace(/\/+$/, '');
}

function cabecerasAutenticadas(getAuthHeaders) {
  const cabeceras = { Accept: 'application/json' };
  if (getAuthHeaders === undefined || getAuthHeaders === null) {
    return cabeceras;
  }
  if (typeof getAuthHeaders !== 'function') {
    throw new Error('getAuthHeaders debe ser una función');
  }
  const extra = getAuthHeaders();
  if (!extra || typeof extra !== 'object') {
    throw new Error('getAuthHeaders debe devolver un objeto de cabeceras');
  }
  return { ...cabeceras, ...extra };
}

/**
 * Lista los proyectos del SGI (`GET /api/proyectos`, requiere permiso `proyectos.ver`).
 * Pagina hasta agotar el total informado por el servidor.
 * @returns {Promise<Array<{slug: string, nombre: string}>>}
 */
export async function cargarProyectos({ apiBaseUrl, getAuthHeaders }) {
  const base = normalizarBase(apiBaseUrl);
  const headers = cabecerasAutenticadas(getAuthHeaders);
  const proyectos = [];

  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const url = `${base}${PATH_PROYECTOS}?page=${pagina}&pageSize=${PAGE_SIZE}&sortField=slug&sortOrder=asc`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} al listar proyectos`);
    }
    const body = await res.json();
    if (!body.status) {
      throw new Error(body.error ?? 'Error al listar proyectos');
    }

    const filas = body.data.rows;
    for (const fila of filas) {
      proyectos.push({ slug: fila.slug, nombre: fila.nombre });
    }
    if (filas.length === 0 || proyectos.length >= body.data.total) {
      break;
    }
  }

  return proyectos;
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
