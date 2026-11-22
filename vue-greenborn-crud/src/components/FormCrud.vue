<template>
  <form class="crud-form" novalidate @submit.prevent="guardar">
    <div v-if="errorGeneral" class="crud-error crud-error-general">{{ errorGeneral }}</div>
    <div v-for="campo in campos" :key="campo.field" class="crud-field" v-bind="atributosAyudaCampo(campo)">
      <label :for="idCampo(campo)">
        {{ campo.headerName === undefined ? campo.field : campo.headerName }}
        <span v-if="campo.required === true" class="crud-required">*</span>
      </label>

      <input
        v-if="campo.form_type === 'checkbox'"
        :id="idCampo(campo)"
        v-model="valores[campo.field]"
        type="checkbox"
        class="crud-checkbox"
      />

      <select
        v-else-if="campo.form_type === 'select'"
        :id="idCampo(campo)"
        v-model="valores[campo.field]"
        class="crud-input"
      >
        <option v-if="campo.required === true" value="" disabled>— Seleccionar —</option>
        <option v-else value="">— Seleccionar —</option>
        <option v-for="op in opcionesDe(campo)" :key="String(op.value)" :value="op.value">
          {{ op.label }}
        </option>
      </select>

      <div
        v-else-if="campo.form_type === 'multiselect'"
        :id="idCampo(campo)"
        class="crud-checks"
        role="group"
      >
        <label v-for="op in opcionesDe(campo)" :key="String(op.value)" class="crud-check">
          <input
            v-model="valores[campo.field]"
            type="checkbox"
            class="crud-checkbox"
            :value="op.value"
          />
          {{ op.label }}
        </label>
        <div v-if="opcionesDe(campo).length === 0" class="crud-help">Sin opciones disponibles.</div>
      </div>

      <textarea
        v-else-if="campo.form_type === 'textarea'"
        :id="idCampo(campo)"
        v-model="valores[campo.field]"
        :rows="filasDe(campo)"
        class="crud-input"
      ></textarea>

      <div v-else-if="campo.form_type === 'markdown'" class="crud-markdown">
        <textarea
          :id="idCampo(campo)"
          v-model="valores[campo.field]"
          :rows="filasDe(campo)"
          class="crud-input"
        ></textarea>
        <div class="crud-markdown-barra">
          <small class="crud-help">Acepta markdown.</small>
          <button
            type="button"
            class="crud-btn-preview"
            @click="alternarPreview(campo)"
          >
            {{ vistaPrevia[campo.field] === true ? 'Editar' : 'Vista previa' }}
          </button>
        </div>
        <div
          v-if="vistaPrevia[campo.field] === true"
          class="crud-markdown-preview"
          v-html="markdownAHtmlSeguro(valorTexto(campo))"
        ></div>
      </div>

      <input
        v-else
        :id="idCampo(campo)"
        v-model="valores[campo.field]"
        :type="tipoInput(campo)"
        class="crud-input"
      />

      <div v-if="errores[campo.field]" class="crud-error">{{ errores[campo.field] }}</div>
    </div>
  </form>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useModal } from '@greenborn/vue-greenborn-modal-manager'
import {
  atributosAyuda,
  valoresIniciales,
  validarFormulario,
  construirPayload,
  extraerError,
  filasDeCampo,
  markdownAHtmlSeguro,
  opcionesDeCampo,
} from '../helpers.js'

const props = defineProps({
  parametros: { type: Object, required: true },
})

const { ocultar_modal } = useModal()
const p = props.parametros
const campos = p.campos
const valores = reactive(valoresIniciales(campos, p.fila))
const errores = reactive({})
const errorGeneral = ref('')
const vistaPrevia = reactive({})

function atributosAyudaCampo(campo) {
  return atributosAyuda(p.ayudaCampos === undefined ? undefined : p.ayudaCampos[campo.field])
}

function idCampo(campo) {
  return `crud-${p.modo}-${campo.field}`
}

function opcionesDe(campo) {
  return opcionesDeCampo(campo)
}

function filasDe(campo) {
  return filasDeCampo(campo)
}

function valorTexto(campo) {
  const v = valores[campo.field]
  return v === undefined || v === null ? '' : String(v)
}

function alternarPreview(campo) {
  vistaPrevia[campo.field] = vistaPrevia[campo.field] !== true
}

function tipoInput(campo) {
  if (campo.form_type === 'date') return 'date'
  if (campo.form_type === 'number') return 'number'
  if (campo.form_type === 'email') return 'email'
  return 'text'
}

function limpiarErrores() {
  for (const k of Object.keys(errores)) delete errores[k]
  errorGeneral.value = ''
}

async function guardar() {
  limpiarErrores()
  const estado = p._modalState
  const erroresCliente = validarFormulario(campos, valores)
  if (Object.keys(erroresCliente).length > 0) {
    Object.assign(errores, erroresCliente)
    return
  }
  estado.guardando = true
  try {
    await p.ejecutar(p.modo, p.id, construirPayload(campos, valores))
    estado.guardando = false
    ocultar_modal(p._modal_cod)
    p.onGuardado()
  } catch (err) {
    console.error('[crud] error al guardar formulario:', err)
    estado.guardando = false
    const { message, errors } = extraerError(err)
    const nombresCampos = campos.map((c) => c.field)
    const sinCampo = Object.keys(errors).filter((k) => !nombresCampos.includes(k))
    for (const k of Object.keys(errors)) {
      if (nombresCampos.includes(k)) errores[k] = errors[k]
    }
    const partes = [message, ...sinCampo.map((k) => `${k}: ${errors[k]}`)]
    if (partes.length > 0 && (Object.keys(errors).length === 0 || sinCampo.length > 0)) {
      errorGeneral.value = partes.join(' ')
    }
  }
}

p._modalState.guardar = guardar
</script>
