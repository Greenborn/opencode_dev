import { reactive, ref, computed } from 'vue';
import { camposDeFormulario, valoresIniciales, cambiosRespecto, textosEntidad } from './logica.js';

/**
 * Composable de carga y guardado del perfil propio.
 * opciones:
 *   api      -> cliente HTTP con .get(url) / .put(url, body) que devuelve { data } (ej. axios)
 *   base     -> ruta donde está montado el router, ej. '/api/perfil'
 *   campos   -> mismo esquema que en el backend
 *   terminos -> { singular, plural }
 */
export function usePerfil({ api, base = '/api/perfil', campos, terminos } = {}) {
  const formulario = camposDeFormulario(campos);
  const textos = textosEntidad(terminos);
  const cargando = ref(false);
  const guardando = ref(false);
  const error = ref('');
  const mensaje = ref('');
  const valores = reactive(valoresIniciales(campos));
  let original = { ...valores };

  function aplicar(fila) {
    const v = valoresIniciales(campos, fila || {});
    Object.assign(valores, v);
    original = { ...v };
  }

  async function cargar() {
    cargando.value = true;
    error.value = '';
    try {
      const { data } = await api.get(`${base}/mi-perfil`);
      aplicar(data);
    } catch {
      error.value = `No se pudo cargar tu ${terminos?.singular || 'negocio'}.`;
    } finally {
      cargando.value = false;
    }
  }

  async function guardar() {
    const cambios = cambiosRespecto(original, { ...valores });
    if (!Object.keys(cambios).length) {
      mensaje.value = 'No hay cambios para guardar.';
      return true;
    }
    guardando.value = true;
    error.value = '';
    mensaje.value = '';
    try {
      const { data } = await api.put(`${base}/mi-perfil`, cambios);
      aplicar(data);
      mensaje.value = textos.guardado;
      return true;
    } catch {
      error.value = 'No se pudieron guardar los cambios.';
      return false;
    } finally {
      guardando.value = false;
    }
  }

  const hayCambios = computed(() => Object.keys(cambiosRespecto(original, { ...valores })).length > 0);

  return { formulario, textos, valores, cargando, guardando, error, mensaje, hayCambios, cargar, guardar };
}
