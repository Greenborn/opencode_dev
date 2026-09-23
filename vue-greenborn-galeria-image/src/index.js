import GaleriaGrid from './components/GaleriaGrid.vue';
import GaleriaLightbox from './components/GaleriaLightbox.vue';
import GbZoomableImage from './components/GbZoomableImage.vue';
import { useGaleriaImage } from './composables/useGaleriaImage.js';
import { normalizeImagen, formatSize } from './models/imagen.js';
import './styles/galeria.css';

export {
  GaleriaGrid,
  GaleriaLightbox,
  GbZoomableImage,
  useGaleriaImage,
  normalizeImagen,
  formatSize,
};
export default GaleriaGrid;
