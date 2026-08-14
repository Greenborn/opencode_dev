<template>
  <Teleport to="body">
    <div class="gmm-stack">
      <div
        v-for="_modal of modals_.filter((m) => m.activo)"
        :key="_modal.code"
        class="gmm-layer"
        :style="`z-index: ${z_index_base + _modal.id}`"
      >
          <div
            class="gmm-overlay"
            :data-modal-code="_modal.code"
            @click="(e) => click_overlay(_modal, e)"
          >
          <div
            class="gmm-dialog"
            :class="clases_modal(_modal)"
            :style="estilo_modal(_modal)"
            role="dialog"
            aria-modal="true"
          >
            <div class="gmm-header">
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

const { modals_, ocultar_modal } = useModal()

// Escala de anchos. Cada valor tiene su clase en styles/modal.css.
const SIZES = ['sm', 'md', 'lg', 'full']

// Base de apilamiento: los modales anidados se dibujan encima según su posición en la pila.
const z_index_base = 1000

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
 * Clic en el overlay para cerrar: respeta `dismissableMask`. Sólo se aplica si el
 * click se hizo directamente sobre el overlay (no sobre el diálogo).
 */
function click_overlay(modal, event) {
  const dismiss = modal.config_modal?.dismissableMask ?? false
  if (dismiss && event.target === event.currentTarget) ocultar_modal(modal.code)
}
</script>
