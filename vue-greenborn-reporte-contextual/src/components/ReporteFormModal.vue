<template>
  <form class="rc-form" @submit.prevent="enviar">
    <div class="rc-info">
      <div><strong>Elemento:</strong> <code>{{ info.tag }}</code></div>
      <div v-if="info.texto"><strong>Texto:</strong> {{ info.texto }}</div>
      <div class="rc-muted"><code>{{ info.selector }}</code></div>
    </div>

    <label class="rc-label" for="rc-proyecto">Slug del proyecto <span class="rc-req">*</span></label>
    <input
      id="rc-proyecto"
      v-model="form.slug_proyecto"
      class="rc-input"
      type="text"
      maxlength="255"
      placeholder="slug del proyecto"
      required
    />

    <label class="rc-label" for="rc-componente">Localización del componente</label>
    <input id="rc-componente" v-model="form.localizacion_componente" class="rc-input" type="text" maxlength="255" />

    <label class="rc-label" for="rc-url">URL de la vista</label>
    <input id="rc-url" v-model="form.url" class="rc-input" type="text" maxlength="500" />

    <label class="rc-label" for="rc-version">Versión <span class="rc-muted">(opcional)</span></label>
    <input id="rc-version" v-model="form.version" class="rc-input" type="text" maxlength="50" />

    <label class="rc-label" for="rc-notas">Notas <span class="rc-req">*</span></label>
    <textarea id="rc-notas" v-model="form.notas" class="rc-input" rows="5" maxlength="5000" required></textarea>

    <div v-if="error" class="rc-error" role="alert">{{ error }}</div>

    <div class="rc-acciones">
      <button type="button" class="rc-btn rc-btn-secundario" @click="cancelar">Cancelar</button>
      <button type="submit" class="rc-btn rc-btn-primario" :disabled="enviando">
        {{ enviando ? 'Enviando…' : 'Enviar reporte' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useModal } from 'vue-greenborn-modal-manager'
import { enviarReporte } from '../utils/reporteApi.js'

const props = defineProps({
  parametros: { type: Object, required: true },
})

const { mostrar_alerta, ocultar_modal } = useModal()

const info = props.parametros.info
const version = props.parametros.version ?? ''

const form = reactive({
  slug_proyecto: '',
  localizacion_componente: info.localizacion,
  url: info.url,
  version,
  notas: '',
})

const enviando = ref(false)
const error = ref('')

function cerrar() {
  ocultar_modal(props.parametros._modal_cod)
}

function cancelar() {
  cerrar()
}

async function enviar() {
  error.value = ''
  enviando.value = true
  try {
    const respuesta = await enviarReporte({
      apiBaseUrl: props.parametros.apiBaseUrl,
      payload: {
        tipo_proyecto: 'PROYECTO',
        slug_proyecto: form.slug_proyecto.trim(),
        localizacion_componente: form.localizacion_componente,
        url: form.url,
        version: form.version,
        notas: form.notas,
      },
    })
    if (!respuesta.status) {
      error.value = respuesta.error
      return
    }
    cerrar()
    mostrar_alerta('Reporte registrado. ¡Gracias!')
  } catch (err) {
    console.log('[reporte-contextual] Error al enviar el reporte:', err)
    error.value = 'No se pudo enviar el reporte. Intente nuevamente.'
  } finally {
    enviando.value = false
  }
}
</script>
