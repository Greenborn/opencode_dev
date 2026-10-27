import ReporteContextual from './components/ReporteContextual.vue'
import ReporteFormModal from './components/ReporteFormModal.vue'
import { construirSelector, extraerTexto, obtenerInfoElemento } from './utils/infoElemento.js'
import { cargarProyectos, enviarReporte } from './utils/reporteApi.js'
import './styles/reporte.css'

export {
  ReporteContextual,
  ReporteFormModal,
  construirSelector,
  extraerTexto,
  obtenerInfoElemento,
  cargarProyectos,
  enviarReporte,
}

export default ReporteContextual
