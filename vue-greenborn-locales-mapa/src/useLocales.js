import { ref } from 'vue';

/**
 * CRUD de locales propios contra @greenborn/express-greenborn-locales.
 * api: cliente con .get/.post/.put/.delete (ej. axios). base: ej. '/api'.
 */
export function useLocales({ api, base = '/api' } = {}) {
  const locales = ref([]);
  const cargando = ref(false);
  const error = ref('');

  async function cargar() {
    cargando.value = true;
    error.value = '';
    try {
      const { data } = await api.get(`${base}/mis-locales`);
      locales.value = data;
    } catch {
      error.value = 'No se pudieron cargar los locales.';
    } finally {
      cargando.value = false;
    }
  }

  async function crear(datos) {
    const { data } = await api.post(`${base}/mis-locales`, datos);
    locales.value = [...locales.value, data];
    return data;
  }

  async function actualizar(id, cambios) {
    const { data } = await api.put(`${base}/mis-locales/${id}`, cambios);
    locales.value = locales.value.map((l) => (l.id === id ? data : l));
    return data;
  }

  async function eliminar(id) {
    await api.delete(`${base}/mis-locales/${id}`);
    locales.value = locales.value.filter((l) => l.id !== id);
  }

  return { locales, cargando, error, cargar, crear, actualizar, eliminar };
}
