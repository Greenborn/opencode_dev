import { ref, computed, unref, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue'
import { traducirErrorCamara } from '../utils/errors.js'

const RESTRICCIONES_DEFAULT = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
}

export function useWebcam(options = {}) {
  const {
    autoIniciar = false,
    restricciones = RESTRICCIONES_DEFAULT,
    videoRef: videoRefExterno = null,
    dispositivoId: dispositivoIdInicial = '',
    maxLado = 480,
    calidad = 0.8,
    calidadFoto = 0.92,
  } = options

  const videoRef = videoRefExterno || ref(null)
  const streaming = ref(false)
  const iniciando = ref(false)
  const dispositivos = ref([])
  const dispositivoId = ref(dispositivoIdInicial)
  const error = ref('')
  const errorOriginal = ref(null)
  const stream = ref(null)
  const errorTexto = computed(() => error.value)

  let sendCanvas = null
  let sendCtx = null
  let photoCanvas = null
  let photoCtx = null
  let solicitudId = 0
  let desmontado = false

  function getVideo() {
    return unref(videoRef)
  }

  function limpiarError() {
    error.value = ''
    errorOriginal.value = null
  }

  function registrarError(e) {
    errorOriginal.value = e
    error.value = traducirErrorCamara(e)
  }

  function adjuntarStream(s) {
    const video = getVideo()
    if (!video) return
    video.srcObject = s
    video.onloadedmetadata = () => {
      video.play().catch(() => {})
    }
  }

  async function enumerarDispositivos() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return []
    }
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      dispositivos.value = all.filter((d) => d.kind === 'videoinput')
      return dispositivos.value
    } catch (e) {
      return dispositivos.value
    }
  }

  // Algunas webcams UVC (sobre todo en Linux) quedan "trabadas" a nivel de
  // driver si se pide un segundo getUserMedia mientras el stream anterior
  // sigue abierto (track sin stop()): el dispositivo deja de responder y
  // solo se recupera cambiándolo de puerto USB. Por eso iniciar() siempre
  // libera cualquier stream previo antes de pedir uno nuevo, y se usa el
  // guard `iniciando` para no disparar dos getUserMedia en paralelo.
  async function iniciar(overrides = {}) {
    if (iniciando.value || desmontado) return false
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      registrarError(new Error('getUserMedia no está disponible'))
      return false
    }

    iniciando.value = true
    limpiarError()
    detener()

    const idSolicitud = ++solicitudId
    const deviceId = overrides.dispositivoId ?? dispositivoId.value
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
          ...restricciones,
        },
        audio: false,
      })
      // Si mientras se esperaba el permiso se detuvo la cámara o se desmontó
      // el componente, liberar el stream recién obtenido para no dejar la
      // cámara encendida.
      if (desmontado || idSolicitud !== solicitudId) {
        for (const track of s.getTracks()) track.stop()
        return false
      }
      stream.value = s
      adjuntarStream(s)
      streaming.value = true
      await enumerarDispositivos()
      if (desmontado || idSolicitud !== solicitudId) return false
      if (!dispositivoId.value && dispositivos.value.length) {
        const track = s.getVideoTracks()[0]
        const actual = track && track.getSettings ? track.getSettings().deviceId : ''
        dispositivoId.value = actual || dispositivos.value[0].deviceId
      }
      return true
    } catch (e) {
      registrarError(e)
      detener()
      return false
    } finally {
      iniciando.value = false
    }
  }

  function detener() {
    solicitudId++
    const s = stream.value
    if (s) {
      for (const track of s.getTracks()) track.stop()
      stream.value = null
    }
    const video = getVideo()
    if (video) video.srcObject = null
    streaming.value = false
  }

  async function reiniciar(overrides = {}) {
    detener()
    return iniciar(overrides)
  }

  function getSendCanvas() {
    if (!sendCanvas) {
      sendCanvas = document.createElement('canvas')
      sendCtx = sendCanvas.getContext('2d')
    }
    return sendCanvas
  }

  function getPhotoCanvas() {
    if (!photoCanvas) {
      photoCanvas = document.createElement('canvas')
      photoCtx = photoCanvas.getContext('2d')
    }
    return photoCanvas
  }

  async function capturarFrame(opciones = {}) {
    const video = getVideo()
    const lado = opciones.maxLado ?? maxLado
    const calidadJpeg = opciones.calidad ?? calidad
    if (!video || !video.videoWidth || typeof document === 'undefined') return null

    const scale = Math.min(1, lado / Math.max(video.videoWidth, video.videoHeight))
    const canvas = getSendCanvas()
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
    sendCtx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', calidadJpeg)
    })
    if (!blob) return null
    return { blob, width: canvas.width, height: canvas.height }
  }

  async function capturarFoto(opciones = {}) {
    const video = getVideo()
    const calidadJpeg = opciones.calidad ?? calidadFoto
    if (!video || !video.videoWidth || typeof document === 'undefined') return null

    const canvas = getPhotoCanvas()
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    photoCtx.drawImage(video, 0, 0, canvas.width, canvas.height)

    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', calidadJpeg)
    })
  }

  function onPageHide() {
    detener()
  }

  function onDeviceChange() {
    enumerarDispositivos()
  }

  function limpiar() {
    desmontado = true
    detener()
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('beforeunload', onPageHide)
    }
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.removeEventListener) {
      navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange)
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('beforeunload', onPageHide)
  }
  if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', onDeviceChange)
  }

  const instancia = getCurrentInstance()
  if (instancia) {
    onBeforeUnmount(limpiar)
    if (autoIniciar) onMounted(() => iniciar())
  }

  return {
    videoRef,
    stream,
    streaming,
    iniciando,
    dispositivos,
    dispositivoId,
    error,
    errorOriginal,
    errorTexto,
    iniciar,
    detener,
    reiniciar,
    enumerarDispositivos,
    capturarFrame,
    capturarFoto,
    limpiar,
  }
}
