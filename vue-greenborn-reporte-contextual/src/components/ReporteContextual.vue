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
  // Versión que se precompleta en el reporte (opcional).
  version: { type: String, default: null },
})

const { mostrar_modal } = useModal()

const ANCHO_MENU = 200
const ALTO_MENU = 40
const MARGEN = 8

const menuRef = ref(null)
const menu = reactive({ visible: false, x: 0, y: 0, info: null })

// Tecla "d" mantenida apretada: dispara el reporte directo con clic izquierdo.
// Es un estado propio (no un modificador nativo como altKey/ctrlKey) porque
// no hay evento de teclado estándar para "d".
let dPresionada = false

function cerrar() {
  menu.visible = false
  menu.info = null
}

function dentroDelMenu(objetivo) {
  return menuRef.value !== null && menuRef.value.contains(objetivo)
}

function onContextMenu(evento) {
  // Solo Alt + clic derecho abre el menú del reporte; el clic derecho normal conserva el nativo.
  // (No se usa Shift: Firefox no dispara el evento contextmenu cuando Shift está apretado,
  // así que el menú nunca podría interceptarse en ese navegador.)
  if (!evento.altKey) return
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

// "d" + clic izquierdo: abre el modal de reporte directamente, sin el menú
// intermedio. Alternativa a Alt + clic derecho para entornos donde el gestor
// de ventanas intercepta esa combinación (p. ej. KDE/KWin usa por defecto
// Alt + clic derecho para redimensionar la ventana).
function onClickConD(evento) {
  if (!dPresionada) return
  if (!(evento.target instanceof Element)) return
  if (dentroDelMenu(evento.target)) return

  evento.preventDefault()
  evento.stopPropagation()
  evento.stopImmediatePropagation()
  // Se limpia enseguida: evita que quede "pegada" si el foco cambia con el clic
  // y el keyup de "d" no llega a dispararse sobre este documento.
  dPresionada = false

  abrirReporte(obtenerInfoElemento(evento.target))
}

function onKeyDown(evento) {
  if (evento.key === 'Escape') cerrar()
  if (evento.key.toLowerCase() === 'd') dPresionada = true
}

function onKeyUp(evento) {
  if (evento.key.toLowerCase() === 'd') dPresionada = false
}

function limpiarEstadoTeclado() {
  dPresionada = false
}

function abrirReporte(info) {
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
      version: props.version,
    },
    { size: 'lg' },
  )
}

function reportar() {
  const info = menu.info
  cerrar()
  abrirReporte(info)
}

onMounted(() => {
  document.addEventListener('contextmenu', onContextMenu, true)
  document.addEventListener('mousedown', onPointerDown, true)
  document.addEventListener('click', onClickConD, true)
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', limpiarEstadoTeclado)
  window.addEventListener('scroll', cerrar, true)
  window.addEventListener('resize', cerrar)
})

onBeforeUnmount(() => {
  document.removeEventListener('contextmenu', onContextMenu, true)
  document.removeEventListener('mousedown', onPointerDown, true)
  document.removeEventListener('click', onClickConD, true)
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', limpiarEstadoTeclado)
  window.removeEventListener('scroll', cerrar, true)
  window.removeEventListener('resize', cerrar)
})
</script>
