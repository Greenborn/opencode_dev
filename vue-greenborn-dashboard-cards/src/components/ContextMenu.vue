<template>
  <Teleport to="body">
    <div
      v-if="abierto"
      ref="raiz"
      class="gdc-menu"
      :style="{ left: posicion.left + 'px', top: posicion.top + 'px' }"
      role="menu"
      @pointerdown.stop
      @click.stop
      @contextmenu.prevent
    >
      <template v-for="(item, idx) in items" :key="idx">
        <div v-if="item?.separator" class="gdc-menu__sep" role="separator" />
        <div v-else-if="item" class="gdc-menu__item-wrap">
          <button
            type="button"
            role="menuitem"
            class="gdc-menu__item"
            :class="{ 'is-disabled': item.disabled, 'is-active': subAbierto === idx }"
            :disabled="item.disabled || (!item.command && !item.items)"
            @click="elegir(item, idx)"
            @mouseenter="item.items && abrirSub(idx)"
          >
            <span
              v-if="item.colorHex || item.colorVar"
              class="gdc-menu__swatch"
              :class="{ 'is-elegido': item.elegido }"
              :style="{ background: item.colorHex || `var(${item.colorVar})` }"
              aria-hidden="true"
            />
            <span v-else-if="item.icon" class="gdc-menu__icon" aria-hidden="true">{{ item.icon }}</span>
            <span class="gdc-menu__label">{{ item.label }}</span>
            <span v-if="item.items" class="gdc-menu__arrow" aria-hidden="true">›</span>
          </button>
          <div
            v-if="item.items && subAbierto === idx"
            class="gdc-menu gdc-menu--sub"
            role="menu"
            @mouseenter="subAbierto = idx"
          >
            <template v-for="(sub, sIdx) in item.items" :key="sIdx">
              <div v-if="sub?.separator" class="gdc-menu__sep" role="separator" />
              <button
                v-else-if="sub"
                type="button"
                role="menuitem"
                class="gdc-menu__item"
                :class="{ 'is-disabled': sub.disabled }"
                :disabled="sub.disabled"
                @click="elegir(sub, idx)"
              >
                <span
                  v-if="sub.colorHex || sub.colorVar"
                  class="gdc-menu__swatch"
                  :class="{ 'is-elegido': sub.elegido }"
                  :style="{ background: sub.colorHex || `var(${sub.colorVar})` }"
                  aria-hidden="true"
                />
                <span v-else-if="sub.icon" class="gdc-menu__icon" aria-hidden="true">{{ sub.icon }}</span>
                <span class="gdc-menu__label">{{ sub.label }}</span>
              </button>
            </template>
          </div>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
})

const emit = defineEmits(['select'])

const abierto = ref(false)
const raiz = ref(null)
const posicion = ref({ left: 0, top: 0 })
const subAbierto = ref(null)

function open(eventOrElement) {
  const el = eventOrElement?.currentTarget ?? eventOrElement?.target ?? eventOrElement
  const rect = el?.getBoundingClientRect?.() ?? { left: 0, top: 0, bottom: 0, right: 0 }
  posicion.value = { left: rect.left, top: rect.bottom + 4 }
  subAbierto.value = null
  abierto.value = true
  void nextTick(() => limitar())
}

function limitar() {
  const el = raiz.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const margen = 8
  let { left, top } = posicion.value
  if (r.right > window.innerWidth - margen) left = Math.max(margen, window.innerWidth - r.width - margen)
  if (r.bottom > window.innerHeight - margen) top = Math.max(margen, posicion.value.top - r.height - 8)
  posicion.value = { left, top }
}

function close() {
  abierto.value = false
  subAbierto.value = null
}

function toggle(eventOrElement) {
  if (abierto.value) close()
  else open(eventOrElement)
}

function abrirSub(idx) {
  subAbierto.value = idx
}

function elegir(item, idx) {
  if (!item || item.disabled) return
  if (item.items) {
    subAbierto.value = subAbierto.value === idx ? null : idx
    return
  }
  if (item.command) item.command()
  emit('select', item)
  close()
}

function fuera(event) {
  if (!abierto.value) return
  if (raiz.value && !raiz.value.contains(event.target)) close()
}

function tecla(event) {
  if (event.key === 'Escape') close()
}

function alDesplazar(event) {
  if (!abierto.value) return
  if (raiz.value?.contains(event?.target)) return
  close()
}

onMounted(() => {
  document.addEventListener('pointerdown', fuera, true)
  document.addEventListener('keydown', tecla)
  window.addEventListener('resize', alDesplazar)
  window.addEventListener('scroll', alDesplazar, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', fuera, true)
  document.removeEventListener('keydown', tecla)
  window.removeEventListener('resize', alDesplazar)
  window.removeEventListener('scroll', alDesplazar, true)
})

defineExpose({ open, close, toggle })
</script>
