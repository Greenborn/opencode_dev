import DashboardCardsGrid from './components/DashboardCardsGrid.vue'
import DashboardCard from './components/DashboardCard.vue'
import TabsBar from './components/TabsBar.vue'
import ContextMenu from './components/ContextMenu.vue'
import CardOcultas from './components/CardOcultas.vue'
import SelectorCardsOcultas from './components/SelectorCardsOcultas.vue'
import TabFormModal from './components/TabFormModal.vue'
import InternalDialog from './components/InternalDialog.vue'
import TextoResaltado from './components/TextoResaltado.vue'
import Sparkline from './components/charts/Sparkline.vue'
import {
  provideDashboardCardsContext,
  useDashboardCardsContext,
  DASHBOARD_CARDS_CONTEXT_KEY,
} from './composables/useDashboardCardsContext.js'
import { createCardRegistry } from './composables/useCardRegistry.js'
import { useCardPreferences } from './composables/useCardPreferences.js'
import { COLORES_CARDS, colorDe } from './config/coloresCards.js'
import './styles/dashboard-cards.css'

export {
  DashboardCardsGrid,
  DashboardCard,
  TabsBar,
  ContextMenu,
  CardOcultas,
  SelectorCardsOcultas,
  TabFormModal,
  InternalDialog,
  TextoResaltado,
  Sparkline,
  provideDashboardCardsContext,
  useDashboardCardsContext,
  DASHBOARD_CARDS_CONTEXT_KEY,
  createCardRegistry,
  useCardPreferences,
  COLORES_CARDS,
  colorDe,
}

export * from './composables/useTabsPreferences.js'
export * from './composables/useDashboardFilter.js'
export * from './composables/useCardRefresh.js'
export * from './composables/useQueryQueue.js'

export default DashboardCardsGrid
