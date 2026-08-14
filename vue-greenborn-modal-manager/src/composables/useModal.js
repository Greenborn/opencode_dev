import { ref, markRaw } from 'vue'

import DialogConfirm from '../components/DialogConfirm.vue'
import ModalFooter from '../components/ModalFooter.vue'

/**
 * Puerto de `stores/app.js` (SGI) al patrón composable/singleton de módulo, sin Pinia.
 *
 * El estado vive en scope de módulo: cualquier componente o composable que invoque
 * `useModal()` obtiene la misma instancia de la pila y las mismas funciones.
 */

export const MAX_MODALS_LVLS = 20

export const MODALS_INIT = {
  activo: false,
  id: 0,
  code: 0,
  componente: null,
  componente_header: null,
  componente_footer: null,
  parametros: {},
  titulo: '',
  config_modal: {},
}

const modals_ = ref([])
let ultimo_cod_modal = 0

// La pila se inicializa de forma eager al cargar el módulo, así `modals_.value`
// siempre es un array desde el import y el render de `ModalContainer` nunca
// depende de que un consumidor haya invocado `useModal()` antes.
for (let i = 0; i < MAX_MODALS_LVLS; i++) {
  modals_.value.push({ ...MODALS_INIT, id: i })
}

/**
 * Inicializa la pila con `MAX_MODALS_LVLS` slots vacíos. Mantenida por
 * compatibilidad con consumidores previos; no-op porque la pila ya nace poblada.
 */
function inic_modals() {}

/**
 * Reordena la pila para rellenar los huecos que dejan los modales cerrados y así
 * indicar el siguiente slot a ocupar. Mismo algoritmo que `modals_ordenados()` de SGI.
 */
/**
 * Reordena la pila para rellenar los huecos que dejan los modales cerrados y así
 * indicar el siguiente slot a ocupar. Mismo algoritmo que `modals_ordenados()` de SGI.
 *
 * Tras el reordenamiento los activos quedan empaquetados al frente (índices
 * `0..activos.length-1`), de modo que el siguiente slot libre (para `mostrar_modal`)
 * es siempre `ultimo_id + 1 = activos.length`. Los `id` se reasignan tras el
 * reorden para que coincidan con el nuevo índice (usado en el z-index de la pila).
 */
function modals_ordenados() {
  const activos = []
  const inactivos = []
  for (let i = 0; i < modals_.value.length; i++) {
    if (modals_.value[i].activo) activos.push(modals_.value[i])
    else inactivos.push(modals_.value[i])
  }
  const modals = activos.concat(inactivos)
  for (let i = 0; i < modals.length; i++) {
    modals[i].id = i
  }
  return { modals, ultimo_id: activos.length - 1 }
}

/**
 * Muestra un modal.
 *
 * @param {VueComponent|Object} componente - Componente a incrustar en el cuerpo del modal.
 *   Puede ser un componente simple (se usa como body) o un objeto compuesto
 *   `{ body, header?, footer? }`.
 * @param {String} titulo - Título a mostrar en el modal.
 * @param {Object} [parametros={}] - Parámetros a pasar al componente interno (se le
 *   agregan `_modal_cod` y `_config_modal`).
 * @param {Object} [config_modal={}] - Configuración del propio modal: `size`
 *   ('sm'|'md'|'lg'|'full'), `styles` (ancho/alto inline), `cssClass`, `id`.
 * @returns {Object} - `{ code }` identificador del modal para `ocultar_modal(code)`.
 */
function mostrar_modal(componente, titulo, parametros = {}, config_modal = {}) {
  ultimo_cod_modal += 1

  if (!config_modal?.id) {
    const ordenados = modals_ordenados()
    modals_.value = ordenados.modals
    config_modal.id = ordenados.ultimo_id + 1
  }

  const slot = modals_.value[config_modal.id]
  if (!slot) {
    console.error('[useModal] No hay un slot libre para el modal; se ignora la apertura.', config_modal)
    return { code: Number(ultimo_cod_modal) }
  }
  if (slot.activo) {
    console.warn('[useModal] Se sobreescribe un modal activo; puede dar lugar a errores inesperados.', config_modal)
  }

  slot.activo = true

  const esCompuesto = !!(componente && (componente.body || componente.header || componente.footer))
  const bodyComponent = esCompuesto ? componente.body : componente
  const headerComponent = esCompuesto ? componente.header : null
  const footerComponent = esCompuesto ? componente.footer : componente?.footer || null

  slot.componente = bodyComponent ? markRaw(bodyComponent) : null
  slot.componente_header = headerComponent ? markRaw(headerComponent) : null
  slot.componente_footer = footerComponent ? markRaw(footerComponent) : null

  slot.parametros = { ...parametros, '_config_modal': config_modal, '_modal_cod': ultimo_cod_modal }
  slot.titulo = titulo
  slot.config_modal = config_modal
  slot.code = Number(ultimo_cod_modal)

  return { code: Number(ultimo_cod_modal) }
}

/**
 * Oculta el modal con el código recibido. Si no se pasa código, oculta todos.
 *
 * @param {Number|null} cod - Código del modal a ocultar.
 */
function ocultar_modal(cod = null) {
  if (cod != null) {
    for (let i = 0; i < modals_.value.length; i++) {
      if (cod == modals_.value[i].code) {
        modals_.value[i].activo = false
        break
      }
    }
  } else {
    for (let i = 0; i < modals_.value.length; i++) {
      modals_.value[i].activo = false
    }
  }
}

/**
 * Alerta simple (un sólo botón "Aceptar").
 *
 * @param {String} texto - Texto del cuerpo (admite HTML).
 */
function mostrar_alerta(texto) {
  const modal_id = modals_.value.length - 1
  mostrar_modal(
    { body: DialogConfirm, footer: ModalFooter },
    'Info',
    {
      texto,
      botones_footer: [
        { label: 'Aceptar', autofocus: true, onClick: () => ocultar_modal(modals_.value[modal_id].code) },
      ],
    },
    { id: modal_id, size: 'sm' }
  )
}

/**
 * Confirmación Sí/No.
 *
 * @param {Object} params
 * @param {String} params.title - Título del modal.
 * @param {String} params.text - Texto del cuerpo (admite HTML).
 * @param {Function} params.confirmar_accion - Se ejecuta al presionar "Sí".
 * @param {Function} [params.no_confirma_accion=()=>{}] - Se ejecuta al presionar "No".
 * @param {String} [params.severity_confirmar='success'] - Clase de estilo del botón "Sí".
 */
function mostrar_confirm(params) {
  if (!Object.prototype.hasOwnProperty.call(params, 'no_confirma_accion')) {
    params.no_confirma_accion = () => {}
  }
  const modal_id = modals_.value.length - 1
  mostrar_modal(
    { body: DialogConfirm, footer: ModalFooter },
    params.title,
    {
      texto: params.text,
      botones_footer: [
        {
          label: 'No',
          severity: 'secondary',
          autofocus: true,
          onClick: () => {
            ocultar_modal(modals_.value[modal_id].code)
            params.no_confirma_accion()
          },
        },
        {
          label: 'Sí',
          severity: params.severity_confirmar || 'success',
          autofocus: false,
          onClick: () => {
            ocultar_modal(modals_.value[modal_id].code)
            params.confirmar_accion()
          },
        },
      ],
    },
    { id: modal_id, size: 'sm' }
  )
}

export function useModal() {
  return {
    modals_,
    mostrar_modal,
    ocultar_modal,
    mostrar_alerta,
    mostrar_confirm,
    inic_modals,
  }
}