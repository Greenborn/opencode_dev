import DashboardCardsGrid from './components/DashboardCardsGrid.vue'
import DashboardCard from './components/DashboardCard.vue'
import Sparkline from './components/charts/Sparkline.vue'
import {
  provideDashboardCardsContext,
  useDashboardCardsContext,
  DASHBOARD_CARDS_CONTEXT_KEY,
} from './composables/useDashboardCardsContext.js'
import { createCardRegistry } from './composables/useCardRegistry.js'
import { useCardPreferences } from './composables/useCardPreferences.js'
import './styles/dashboard-cards.css'

export {
  DashboardCardsGrid,
  DashboardCard,
  Sparkline,
  provideDashboardCardsContext,
  useDashboardCardsContext,
  DASHBOARD_CARDS_CONTEXT_KEY,
  createCardRegistry,
  useCardPreferences,
}
export default DashboardCardsGrid
