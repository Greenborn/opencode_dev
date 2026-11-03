<template>
  <form class="gdc-form" @submit.prevent="guardar">
    <label class="gdc-form__label" for="gdc-tab-nombre">
      <b>Nombre</b>
      <input
        id="gdc-tab-nombre"
        v-model="modelo.nombre"
        class="gdc-form__input"
        :class="{ 'is-invalid': tocado && !!error }"
        :maxlength="MAX_NOMBRE"
        autocomplete="off"
        autofocus
        @blur="tocado = true"
      />
      <small v-if="tocado && error" class="gdc-form__error">{{ error }}</small>
    </label>

    <template v-if="cards.length">
      <div class="gdc-form__hint">
        <b>Cards</b>
        <small>
          "Mover" la saca de la pestaña en la que estás; "Copiar" la deja donde está. Las cards que
          no están en esta pestaña sólo se pueden copiar, y desde "Todas" también: esa pestaña tiene
          todas.
        </small>
      </div>

      <div v-for="card in cards" :key="card.clave" class="gdc-form__row">
        <span class="gdc-form__row-label">{{ card.titulo }}</span>
        <span class="gdc-form__choices">
          <label v-for="op in opcionesDe(card)" :key="op.value" class="gdc-form__choice">
            <input v-model="modelo.elecciones[card.clave]" type="radio" :name="`gdc-eleccion-${card.clave}`" :value="op.value" />
            {{ op.label }}
          </label>
        </span>
      </div>
    </template>

    <div class="gdc-form__footer">
      <button type="button" class="gdc-btn gdc-btn--secondary" @click="cerrar">Cancelar</button>
      <button type="submit" class="gdc-btn gdc-btn--success" :disabled="!!error">
        {{ modo === 'renombrar' ? 'Guardar' : 'Crear' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, computed, watchEffect } from 'vue'
import { MAX_NOMBRE } from '../composables/useTabsPreferences.js'

const props = defineProps({
  parametros: { type: Object, required: true },
})

const modelo = props.parametros.modelo
const cards = props.parametros.cards ?? []
const modo = props.parametros.modo ?? 'alta'

const tocado = ref(false)
const error = computed(() => props.parametros.validar(modelo.nombre))

const NO_INCLUIR = { label: 'No incluir', value: 'no' }
const MOVER = { label: 'Mover', value: 'mover' }
const COPIAR = { label: 'Copiar', value: 'copiar' }

function opcionesDe(card) {
  return card.enActiva ? [NO_INCLUIR, MOVER, COPIAR] : [NO_INCLUIR, COPIAR]
}

function cerrar() {
  props.parametros.cerrar?.()
}

function guardar() {
  tocado.value = true
  if (error.value) return
  const elecciones = cards
    .map((c) => ({ clave: c.clave, accion: modelo.elecciones[c.clave] }))
    .filter((e) => e.accion === 'mover' || e.accion === 'copiar')
  props.parametros.onGuardar?.({ nombre: modelo.nombre, elecciones })
  cerrar()
}

watchEffect(() => {
  if (modelo.nombre) tocado.value = true
})
</script>
