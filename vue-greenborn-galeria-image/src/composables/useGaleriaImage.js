import { reactive } from 'vue';

/**
 * Cliente del API de express-greenborn-galeria-image basado en fetch
 * (sin dependencias runtime). Configurable con baseUrl (ej: la del backend
 * express-greenborn-galeria-image) y rootPath (default del paquete).
 */
export function useGaleriaImage(config = {}) {
  const state = reactive({
    imagenes: [],
    total: 0,
    page: 1,
    limit: config.limit ?? 24,
    pages: 1,
    cargando: false,
    error: null,
  });

  const baseUrl = (config.baseUrl ?? '').replace(/\/+$/, '');
  const rootPath = (config.rootPath ?? '/api/galeria-imagenes').replace(/\/+$/, '');

  function url(path) {
    return `${baseUrl}${rootPath}${path}`;
  }

  function authHeaders() {
    const headers = {};
    if (config.token) headers.Authorization = `Bearer ${config.token}`;
    else if (typeof config.getToken === 'function') {
      const token = config.getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  async function request(path, options = {}) {
    const res = await fetch(url(path), {
      ...options,
      headers: { ...authHeaders(), ...(options.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.success === false) {
      throw new Error(body.message || `Error HTTP ${res.status}`);
    }
    return body;
  }

  async function listar(query = {}) {
    state.cargando = true;
    state.error = null;
    try {
      const params = new URLSearchParams();
      const merged = { page: state.page, limit: state.limit, ...query };
      Object.entries(merged).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.set(k, v);
      });
      const body = await request(`/?${params.toString()}`);
      state.imagenes = body.data || [];
      state.total = body.total ?? 0;
      state.page = body.page ?? 1;
      state.limit = body.limit ?? state.limit;
      state.pages = body.pages ?? 1;
      return body;
    } catch (err) {
      state.error = err.message;
      throw err;
    } finally {
      state.cargando = false;
    }
  }

  async function obtener(id) {
    const body = await request(`/${id}`);
    return body.data;
  }

  async function crear({ file, titulo, descripcion, seccion, orden }) {
    const form = new FormData();
    form.append('imagen', file);
    if (titulo !== undefined) form.append('titulo', titulo ?? '');
    if (descripcion !== undefined) form.append('descripcion', descripcion ?? '');
    if (seccion !== undefined) form.append('seccion', seccion ?? '');
    if (orden !== undefined) form.append('orden', orden);
    const body = await request('/', { method: 'POST', body: form });
    return body.data;
  }

  async function actualizar(id, changes) {
    const body = await request(`/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    });
    return body.data;
  }

  async function eliminar(id) {
    await request(`/${id}`, { method: 'DELETE' });
    return true;
  }

  return { state, listar, obtener, crear, actualizar, eliminar };
}

export default useGaleriaImage;
