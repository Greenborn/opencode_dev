import GbWebcamViewer from './components/GbWebcamViewer.vue'
import { useWebcam } from './composables/useWebcam.js'
import { dibujarDetecciones, colorClase, drawDetections, classColor } from './utils/draw.js'
import { traducirErrorCamara, MENSAJES_CAMARA } from './utils/errors.js'
import './styles/webcam-viewer.css'

export {
  GbWebcamViewer,
  useWebcam,
  dibujarDetecciones,
  colorClase,
  drawDetections,
  classColor,
  traducirErrorCamara,
  MENSAJES_CAMARA,
}
export default GbWebcamViewer
