<template>
  <Teleport to="body">
    <div class="gmm-stack" :style="`z-index: ${z_index_base}`">
      <div
        v-for="_modal of activos"
        :key="_modal.code"
        class="gmm-layer"
        :style="`z-index: ${_modal.zIndex}`"
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
              <div class="gmm-header-controls">
                <button
                  v-if="_modal.config_modal?.minimizable !== false"
                  type="button"
                  class="gmm-header-minimize"
                  aria-label="Minimizar"
                  @mousedown.stop
                  @click="minimizar(_modal.code)"
                >
                  &minus;
                </button>
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

      <div
        v-if="minimizados.length"
        class="gmm-taskbar"
        :class="{ visible: show_taskbar }"
        @mouseenter="on_taskbar_enter"
        @mouseleave="on_taskbar_leave"
      >
        <div class="gmm-taskbar-inner">
          <div
            v-for="_modal of minimizados"
            :key="`min-${_modal.code}`"
            class="gmm-taskbar-item"
            :title="_modal.titulo"
            @click="restaurar(_modal.code)"
          >
            <span class="gmm-taskbar-title">{{ _modal.titulo }}</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useModal } from '../composables/useModal'

const { modals_, z_index_base, ocultar_modal, minimizar, restaurar, traer_al_frente, actualizar_posicion } = useModal()

const activos = computed(() => modals_.value.filter((m) => m.activo && !m.minimized))
const minimizados = computed(() => modals_.value.filter((m) => m.activo && m.minimized))

const show_taskbar = ref(false)
let hide_taskbar_timer = null
const BOTTOM_THRESHOLD = 12

function on_global_mousemove(e) {
  const nearBottom = window.innerHeight - e.clientY < BOTTOM_THRESHOLD
  if (nearBottom && minimizados.value.length) {
    if (hide_taskbar_timer) {
      clearTimeout(hide_taskbar_timer)
      hide_taskbar_timer = null
    }
    show_taskbar.value = true
  }
}

function on_taskbar_enter() {
  if (hide_taskbar_timer) {
    clearTimeout(hide_taskbar_timer)
    hide_taskbar_timer = null
  }
  show_taskbar.value = true
}

function on_taskbar_leave() {
  if (hide_taskbar_timer) clearTimeout(hide_taskbar_timer)
  hide_taskbar_timer = setTimeout(() => {
    show_taskbar.value = false
    hide_taskbar_timer = null
  }, 300)
}

onMounted(() => {
  document.addEventListener('mousemove', on_global_mousemove)
  window.addEventListener('resize', reclamp_all)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', on_global_mousemove)
  window.removeEventListener('resize', reclamp_all)
  if (hide_taskbar_timer) clearTimeout(hide_taskbar_timer)
  if (reclamp_timer) clearTimeout(reclamp_timer)
})


// Escala de anchos. Cada valor tiene su clase en styles/modal.css.
const SIZES = ['sm', 'md', 'lg', 'full']

// Estado de arrastre activo.
let dragging_code = null
let drag_start = null

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
 * Visibilidad mínima garantizada del header sobre el borde de la pantalla:
 * 3rem según el font-size raíz (fallback 48px).
 */
function min_visible_px() {
  const fs = parseFloat(getComputedStyle(document.documentElement).fontSize)
  return Number.isFinite(fs) && fs > 0 ? fs * 3 : 48
}

/**
 * Rango de posiciones del header (coordenadas del viewport) que garantiza que
 * siempre quede en pantalla un área de al menos 3rem × 3rem para agarrarlo.
 */
function clamp_bounds(width, height) {
  const min = min_visible_px()
  const min_x = Math.min(min, width)
  const min_y = Math.min(min, height)
  return {
    min_left: min_x - width,
    max_left: window.innerWidth - min_x,
    min_top: min_y - height,
    max_top: window.innerHeight - min_y,
  }
}

function clamp_value(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/**
 * Inicia el arrastre desde el header del modal y trae el modal al frente.
 */
function start_drag(event, modal) {
  dragging_code = modal.code
  const header_rect = event.currentTarget.getBoundingClientRect()
  drag_start = {
    mouse_x: event.clientX,
    mouse_y: event.clientY,
    header_left: header_rect.left,
    header_top: header_rect.top,
    bounds: clamp_bounds(header_rect.width, header_rect.height),
    pos_x: modal.position.x,
    pos_y: modal.position.y,
  }

  document.addEventListener('mousemove', on_drag)
  document.addEventListener('mouseup', stop_drag)
}

function on_drag(event) {
  if (dragging_code == null || !drag_start) return
  const left = clamp_value(
    drag_start.header_left + (event.clientX - drag_start.mouse_x),
    drag_start.bounds.min_left,
    drag_start.bounds.max_left
  )
  const top = clamp_value(
    drag_start.header_top + (event.clientY - drag_start.mouse_y),
    drag_start.bounds.min_top,
    drag_start.bounds.max_top
  )
  actualizar_posicion(
    dragging_code,
    drag_start.pos_x + (left - drag_start.header_left),
    drag_start.pos_y + (top - drag_start.header_top)
  )
}

function stop_drag() {
  dragging_code = null
  drag_start = null
  document.removeEventListener('mousemove', on_drag)
  document.removeEventListener('mouseup', stop_drag)
}

/**
 * Re-clampea la posición de todos los modales visibles contra el viewport:
 * cubre cambios de tamaño de ventana y restauraciones de minimizados, para que
 * el header nunca quede fuera de pantalla fuera del arrastre.
 */
function reclamp_all() {
  const overlays = document.querySelectorAll('.gmm-layer .gmm-overlay[data-modal-code]')
  for (const overlay of overlays) {
    const code = Number(overlay.dataset.modalCode)
    const modal = modals_.value.find((m) => m.activo && m.code === code)
    const header = overlay.querySelector('.gmm-header')
    if (!modal || !header) continue
    const rect = header.getBoundingClientRect()
    const bounds = clamp_bounds(rect.width, rect.height)
    const left = clamp_value(rect.left, bounds.min_left, bounds.max_left)
    const top = clamp_value(rect.top, bounds.min_top, bounds.max_top)
    if (left !== rect.left || top !== rect.top) {
      actualizar_posicion(
        code,
        modal.position.x + (left - rect.left),
        modal.position.y + (top - rect.top)
      )
    }
  }
}

// El re-clamp se difiere hasta que termina la animación de entrada
// (`gmm-pop-in`, 0.18s): durante la animación el transform inline (posición
// arrastrada) queda suspendido y medir el header daría la posición centrada.
let reclamp_timer = null
function schedule_reclamp() {
  if (reclamp_timer) clearTimeout(reclamp_timer)
  reclamp_timer = setTimeout(() => {
    reclamp_timer = null
    reclamp_all()
  }, 200)
}

watch(
  () => activos.value.map((m) => m.code).join(','),
  schedule_reclamp
)
</script>