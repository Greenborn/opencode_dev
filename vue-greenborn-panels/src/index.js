import TabBar from './components/TabBar.vue'
import TabPanel from './components/TabPanel.vue'
import ResizablePanel from './components/ResizablePanel.vue'
import { usePanelRegistry } from './composables/usePanelRegistry.js'
import { useTabController } from './composables/useTabController.js'
import { useLayoutState } from './composables/useLayoutState.js'
import { sortTabs } from './utils/sortTabs.js'
import './styles/panels.css'

export {
  TabBar,
  TabPanel,
  ResizablePanel,
  usePanelRegistry,
  useTabController,
  useLayoutState,
  sortTabs,
}
export default TabBar