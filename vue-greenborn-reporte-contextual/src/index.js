import ReporteContextual from './components/ReporteContextual.vue'
import ReporteFormModal from './components/ReporteFormModal.vue'
import { construirSelector, extraerTexto, obtenerInfoElemento } from './utils/infoElemento.js'
import { enviarReporte } from './utils/reporteApi.js'
import './styles/reporte.css'

export {
  ReporteContextual,
  ReporteFormModal,
  construirSelector,
  extraerTexto,
  obtenerInfoElemento,
  enviarReporte,
}

export default ReporteContextual
