<template>
  <form id="rc-form" class="rc-form" @submit.prevent="enviar">
    <label class="rc-label" for="rc-notas">Notas <span class="rc-req">*</span></label>
    <textarea id="rc-notas" v-model="form.notas" class="rc-input" rows="5" maxlength="5000" required></textarea>

    <label class="rc-label">Captura de pantalla <span class="rc-muted">(opcional)</span></label>
    <div class="rc-captura">
      <img v-if="form.captura_pantalla" :src="form.captura_pantalla" class="rc-captura-preview" alt="Captura de pantalla" />
      <div class="rc-captura-acciones">
        <button type="button" class="rc-btn rc-btn-secundario" :disabled="capturando" @click="tomarCaptura">
          {{ capturando ? 'Capturando…' : form.captura_pantalla ? 'Tomar otra captura' : 'Tomar captura' }}
        </button>
        <button v-if="form.captura_pantalla" type="button" class="rc-btn rc-btn-secundario" @click="form.captura_pantalla = ''">
          Quitar
        </button>
      </div>
      <div v-if="errorCaptura" class="rc-error" role="alert">{{ errorCaptura }}</div>
    </div>

    <div class="rc-info">
      <div class="rc-info-titulo"><strong>Detalles del elemento</strong></div>
      <div><strong>Elemento:</strong> <code>{{ info.tag }}</code></div>
      <div v-if="info.texto"><strong>Texto:</strong> {{ info.texto }}</div>
      <div class="rc-muted"><code>{{ info.selector }}</code></div>
    </div>

    <div v-if="estado.error" class="rc-error" role="alert">{{ estado.error }}</div>
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
const estado = props.parametros.estado

const form = reactive({
  slug_proyecto: props.parametros.slugProyecto ?? '',
  localizacion_componente: info.localizacion,
  url: info.url,
  version: props.parametros.version ?? '',
  notas: '',
  captura_pantalla: '',
})

const capturando = ref(false)
const errorCaptura = ref('')

// Toma una captura de la pantalla/pestaña vía getDisplayMedia (sin dependencias nuevas).
// Oculta el stack de modales (gmm-stack, de vue-greenborn-modal-manager) mientras el usuario
// elige qué compartir, así la captura resultante no incluye este propio modal.
async function tomarCaptura() {
  errorCaptura.value = ''
  capturando.value = true
  const stack = document.querySelector('.gmm-stack')
  const visibilidadPrevia = stack?.style.visibility ?? ''
  if (stack) stack.style.visibility = 'hidden'

  let stream = null
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
    const video = document.createElement('video')
    video.srcObject = stream
    await video.play()
    await new Promise((resolve) => {
      if (video.readyState >= 2) return resolve()
      video.onloadeddata = () => resolve()
    })

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    // webp pesa bastante menos que png para este tipo de imagen; si el navegador no lo
    // soporta, toDataURL ignora el mime pedido y devuelve png igual (fallback automático).
    form.captura_pantalla = canvas.toDataURL('image/webp', 0.85)
  } catch (err) {
    if (err?.name !== 'NotAllowedError') {
      console.log('[reporte-contextual] Error al tomar la captura:', err)
      errorCaptura.value = 'No se pudo tomar la captura de pantalla.'
    }
  } finally {
    stream?.getTracks().forEach((track) => track.stop())
    if (stack) stack.style.visibility = visibilidadPrevia
    capturando.value = false
  }
}

async function enviar() {
  estado.error = ''
  estado.enviando = true
  try {
    const respuesta = await enviarReporte({
      apiBaseUrl: props.parametros.apiBaseUrl,
      payload: {
        tipo_proyecto: 'PROYECTO',
        slug_proyecto: form.slug_proyecto.trim(),
        captura_pantalla: form.captura_pantalla || null,
        localizacion_componente: form.localizacion_componente,
        url: form.url,
        version: form.version,
        notas: form.notas,
        navegador: info.navegador,
        ancho_viewport: info.ancho_viewport,
        alto_viewport: info.alto_viewport,
        es_movil: info.es_movil,
      },
    })
    if (!respuesta.status) {
      estado.error = respuesta.error
      return
    }
    ocultar_modal(props.parametros._modal_cod)
    mostrar_alerta('Reporte registrado. ¡Gracias!')
  } catch (err) {
    console.log('[reporte-contextual] Error al enviar el reporte:', err)
    estado.error = 'No se pudo enviar el reporte. Intente nuevamente.'
  } finally {
    estado.enviando = false
  }
}
</script>
