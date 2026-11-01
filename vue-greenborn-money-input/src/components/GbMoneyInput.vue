<template>
  <div class="gb-money-input">
    <span v-if="prefijo" class="gb-money-input__prefijo" aria-hidden="true">{{ prefijo }}</span>
    <input
      ref="inputRef"
      class="gb-money-input__campo"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      :id="id"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-label="ariaLabel"
      :value="textoVisible"
      @input="onInput"
      @keydown="onKeydown"
      @paste="onPaste"
      @blur="onBlur"
      @focus="onFocus"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: [Number, null], default: null },
  id: { type: String, default: '' },
  placeholder: { type: String, default: '0,00' },
  disabled: { type: Boolean, default: false },
  prefijo: { type: String, default: '$' },
  ariaLabel: { type: String, default: 'Monto' },
  // Cantidad máxima de dígitos enteros (antes de la coma). 0 = sin límite.
  maxEnteros: { type: Number, default: 0 },
})

const emit = defineEmits(['update:modelValue'])

const inputRef = ref(null)

// Estado interno: los centavos se guardan como entero (string de dígitos).
// Esto evita ambigüedades de punto flotante y permite autoformatear mientras se tipea.
const centavos = ref(valorACentavos(props.modelValue))

function valorACentavos(valor) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return ''
  const entero = Math.round(Number(valor) * 100)
  if (!Number.isFinite(entero) || entero <= 0) return entero === 0 ? '' : ''
  return String(entero)
}

function centavosANumero(dígitos) {
  if (!dígitos) return null
  const entero = parseInt(dígitos, 10)
  if (!Number.isFinite(entero)) return null
  return entero / 100
}

function formatearDesdeDigitos(dígitos) {
  if (!dígitos) return ''
  const entero = parseInt(dígitos, 10)
  const parteEntera = Math.floor(entero / 100)
  const parteDecimal = String(entero % 100).padStart(2, '0')
  const parteEnteraFormateada = parteEntera.toLocaleString('es-AR')
  return `${parteEnteraFormateada},${parteDecimal}`
}

const textoVisible = computed(() => formatearDesdeDigitos(centavos.value))

watch(
  () => props.modelValue,
  (nuevo) => {
    const nuevosCentavos = valorACentavos(nuevo)
    if (nuevosCentavos !== centavos.value) {
      centavos.value = nuevosCentavos
    }
  }
)

function limiteAlcanzado(dígitos) {
  if (!props.maxEnteros) return false
  const soloEnteros = dígitos.slice(0, -2) || ''
  return soloEnteros.length > props.maxEnteros
}

function aplicarDigitos(nuevosDígitos, cursorAlFinal = true) {
  // Se quitan ceros a la izquierda que sobren, pero se preserva al menos un dígito.
  const limpio = nuevosDígitos.replace(/^0+(?=\d)/, '')
  if (limiteAlcanzado(limpio)) return
  centavos.value = limpio
  emit('update:modelValue', centavosANumero(limpio))
  if (cursorAlFinal) {
    nextTick(() => {
      const el = inputRef.value
      if (el) {
        const largo = el.value.length
        el.setSelectionRange(largo, largo)
      }
    })
  }
}

// Sólo se permiten dígitos; cualquier otro carácter se descarta. Cada dígito nuevo
// se agrega al final de los centavos (igual a como funciona el teclado numérico de una caja registradora).
function onInput(evento) {
  const valorAnterior = textoVisible.value
  const valorActual = evento.target.value
  // Si el usuario borró caracteres (backspace/delete), se quita el último dígito.
  if (valorActual.length < valorAnterior.length) {
    aplicarDigitos(centavos.value.slice(0, -1))
    return
  }
  const soloDígitosNuevos = valorActual.replace(/\D/g, '')
  const dígitosAnteriores = centavos.value
  // Se toman únicamente los dígitos que se agregaron (todo lo que no sea numérico se ignora).
  const agregados = soloDígitosNuevos.length > dígitosAnteriores.length
    ? soloDígitosNuevos.slice(soloDígitosNuevos.length - (soloDígitosNuevos.length - dígitosAnteriores.length))
    : ''
  if (agregados) {
    aplicarDigitos(dígitosAnteriores + agregados)
  } else {
    // No se detectó un dígito nuevo (p.ej. se pegó texto no numérico): se mantiene el valor previo.
    aplicarDigitos(dígitosAnteriores)
  }
}

function onKeydown(evento) {
  const teclasPermitidas = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter']
  if (teclasPermitidas.includes(evento.key) || evento.ctrlKey || evento.metaKey) return
  if (!/^[0-9]$/.test(evento.key)) {
    evento.preventDefault()
  }
}

function onPaste(evento) {
  evento.preventDefault()
  const texto = (evento.clipboardData || window.clipboardData).getData('text')
  const soloDígitos = texto.replace(/\D/g, '')
  if (soloDígitos) {
    aplicarDigitos(centavos.value + soloDígitos)
  }
}

function onFocus() {
  nextTick(() => {
    const el = inputRef.value
    if (el) {
      const largo = el.value.length
      el.setSelectionRange(largo, largo)
    }
  })
}

function onBlur() {
  // Nada que normalizar: el valor ya queda siempre formateado mientras se tipea.
}

defineExpose({ focus: () => inputRef.value?.focus() })
</script>
