<template>
  <Teleport to="body">
    <div
      v-if="menu.visible"
      ref="menuRef"
      class="rc-menu"
      role="menu"
      :style="{ top: `${menu.y}px`, left: `${menu.x}px` }"
      @contextmenu.prevent
    >
      <button type="button" class="rc-menu-item" role="menuitem" @click="reportar">
        Reportar este elemento
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useModal } from 'vue-greenborn-modal-manager'
import ReporteFormModal from './ReporteFormModal.vue'
import { obtenerInfoElemento } from '../utils/infoElemento.js'

// Montar una sola vez en la raíz de la app, junto a <ModalContainer />.
const props = defineProps({
  apiBaseUrl: { type: String, required: true },
  // Devuelve las cabeceras de autenticación del SGI (p. ej. { Authorization: 'Bearer ...' }).
  // Solo se usa para listar proyectos; el envío de la nota es público.
  getAuthHeaders: { type: Function, default: null },
  // Versión que se precompleta en el reporte (opcional).
  version: { type: String, default: null },
})

const { mostrar_modal } = useModal()

const ANCHO_MENU = 200
const ALTO_MENU = 40
const MARGEN = 8

const menuRef = ref(null)
const menu = reactive({ visible: false, x: 0, y: 0, info: null })

function cerrar() {
  menu.visible = false
  menu.info = null
}

function dentroDelMenu(objetivo) {
  return menuRef.value !== null && menuRef.value.contains(objetivo)
}

function onContextMenu(evento) {
  // Shift + clic derecho conserva el menú nativo del navegador.
  if (evento.shiftKey) return
  if (dentroDelMenu(evento.target)) return
  if (!(evento.target instanceof Element)) return

  evento.preventDefault()
  // La información se captura en el momento: la vista puede cambiar antes de enviar.
  menu.info = obtenerInfoElemento(evento.target)
  menu.x = Math.max(MARGEN, Math.min(evento.clientX, window.innerWidth - ANCHO_MENU - MARGEN))
  menu.y = Math.max(MARGEN, Math.min(evento.clientY, window.innerHeight - ALTO_MENU - MARGEN))
  menu.visible = true
}

function onPointerDown(evento) {
  if (!menu.visible) return
  if (dentroDelMenu(evento.target)) return
  cerrar()
}

function onKeyDown(evento) {
  if (evento.key === 'Escape') cerrar()
}

function reportar() {
  const info = menu.info
  cerrar()
  if (info === null) {
    console.log('[reporte-contextual] Se intentó reportar sin información del elemento')
    return
  }
  mostrar_modal(
    ReporteFormModal,
    'Reportar elemento',
    {
      info,
      apiBaseUrl: props.apiBaseUrl,
      getAuthHeaders: props.getAuthHeaders,
      version: props.version,
    },
    { size: 'lg' },
  )
}

onMounted(() => {
  document.addEventListener('contextmenu', onContextMenu, true)
  document.addEventListener('mousedown', onPointerDown, true)
  document.addEventListener('keydown', onKeyDown)
  window.addEventListener('scroll', cerrar, true)
  window.addEventListener('resize', cerrar)
})

onBeforeUnmount(() => {
  document.removeEventListener('contextmenu', onContextMenu, true)
  document.removeEventListener('mousedown', onPointerDown, true)
  document.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('scroll', cerrar, true)
  window.removeEventListener('resize', cerrar)
})
</script>
