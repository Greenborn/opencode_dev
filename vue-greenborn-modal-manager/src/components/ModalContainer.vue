<template>
  <Teleport to="body">
    <div class="gmm-stack">
      <div
        v-for="_modal of modals_.filter((m) => m.activo)"
        :key="_modal.code"
        class="gmm-layer"
        :style="`z-index: ${z_index_base.value + _modal.id}`"
        @mousedown="traer_al_frente(_modal.code)"
      >
          <div
            class="gmm-overlay"
            :data-modal-code="_modal.code"
            @click="(e) => click_overlay(_modal, e)"
          >
          <div
            class="gmm-dialog"
            :class="[...clases_modal(_modal), ...(es_draggable(_modal) ? ['gmm-draggable'] : [])]"
            :style="{ ...estilo_modal(_modal), ...estilo_posicion(_modal) }"
            role="dialog"
            aria-modal="true"
            @mousedown.stop
          >
            <div
              class="gmm-header"
              :class="es_draggable(_modal) ? 'gmm-header-drag' : ''"
              @mousedown="(e) => es_draggable(_modal) && start_drag(e, _modal)"
            >
              <component
                v-if="_modal.componente_header"
                :is="_modal.componente_header"
                :parametros="_modal.parametros"
              />
              <span v-else class="gmm-header-title">{{ _modal.titulo }}</span>
              <button
                v-if="_modal.config_modal?.closable !== false"
                type="button"
                class="gmm-header-close"
                aria-label="Cerrar"
                @mousedown.stop
                @click="ocultar_modal(_modal.code)"
              >
                &times;
              </button>
            </div>

            <div class="gmm-body">
              <div class="gmm-content-wrapper">
                <component
                  :is="_modal.componente"
                  :parametros="_modal.parametros"
                />
              </div>
            </div>

            <div v-if="_modal.componente_footer" class="gmm-footer">
              <component
                :is="_modal.componente_footer"
                :parametros="_modal.parametros"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useModal } from '../composables/useModal'

const { modals_, ocultar_modal, traer_al_frente, actualizar_posicion, z_index_base } = useModal()

// Escala de anchos. Cada valor tiene su clase en styles/modal.css.
const SIZES = ['sm', 'md', 'lg', 'full']

// Estado de arrastre activo.
let dragging_code = null
let drag_offset = { x: 0, y: 0 }

/**
 * Se emite inline sólo el ancho/alto que el call site definió explícitamente en
 * `config_modal.styles`. Todo lo demás (escala `size`, ancho automático, max-width,
 * max-height) vive en modal.css.
 */
function estilo_modal(modal) {
  const styles = modal.config_modal?.styles || {}
  return {
    ...(styles.width ? { width: styles.width } : {}),
    ...(styles.height ? { height: styles.height } : {}),
  }
}

/**
 * Desplazamiento por arrastre, aplicado como transform sobre el diálogo centrado.
 */
function estilo_posicion(modal) {
  return {
    transform: `translate(${modal.position.x}px, ${modal.position.y}px)`,
  }
}

/**
 * Resuelve el ancho a una clase, con esta precedencia:
 *   styles.width (inline, escape hatch) > size > automático según contenido.
 */
function clases_modal(modal) {
  const config = modal.config_modal || {}
  const styles = config.styles || {}

  let clase_ancho = null
  if (!styles.width) {
    if (config.size && !SIZES.includes(config.size)) {
      console.warn(
        `[ModalContainer] config_modal.size="${config.size}" no está en la escala (${SIZES.join(', ')}); se ignora.`
      )
    }
    clase_ancho = SIZES.includes(config.size)
      ? `gmm-size-${config.size}`
      : 'gmm-ancho-auto'
  }

  return [config.cssClass, clase_ancho, { 'gmm-alto-auto': !styles.height }]
}

/**
 * Un modal es arrastrable salvo que `config_modal.draggable` sea explícitamente `false`.
 */
function es_draggable(modal) {
  return (modal.config_modal?.draggable ?? true) !== false
}

/**
 * Clic en el overlay para cerrar: respeta `dismissableMask`. Sólo se aplica si el
 * click se hizo directamente sobre el overlay (no sobre el diálogo).
 */
function click_overlay(modal, event) {
  const dismiss = modal.config_modal?.dismissableMask ?? false
  if (dismiss && event.target === event.currentTarget) ocultar_modal(modal.code)
}

/**
 * Inicia el arrastre desde el header del modal y trae el modal al frente.
 */
function start_drag(event, modal) {
  dragging_code = modal.code
  const el = event.currentTarget.closest('.gmm-dialog')
  const rect = el.getBoundingClientRect()
  drag_offset.x = event.clientX - (rect.left + rect.width / 2)
  drag_offset.y = event.clientY - (rect.top + rect.height / 2)

  document.addEventListener('mousemove', on_drag)
  document.addEventListener('mouseup', stop_drag)
}

function on_drag(event) {
  if (dragging_code == null) return
  const x = event.clientX - drag_offset.x - window.innerWidth / 2
  const y = event.clientY - drag_offset.y - window.innerHeight / 2
  actualizar_posicion(dragging_code, x, y)
}

function stop_drag() {
  dragging_code = null
  document.removeEventListener('mousemove', on_drag)
  document.removeEventListener('mouseup', stop_drag)
}
</script>