import TableEditor from './components/TableEditor.vue'
import { BtnConfig, toBtnConfig } from './core/BtnConfig.js'
import { iconSvg, availableIcons } from './core/icons.js'
import {
  createLocalStoragePrefsAdapter,
  setGlobalPreferencesAdapter,
  getGlobalPreferencesAdapter,
} from './core/preferenciasAdapter.js'
import {
  getCamposJson,
  mapFilaJSONtabla,
  getCamposJSONyFieldDef,
  rowFormatter,
  row_formatter,
  getProcessFieldDef,
  reOrder,
  getFieldDefFFormated,
  greenbornDataPipeline,
} from './core/dataPipeline.js'
import {
  invertHexColor,
  applyRowStyling,
  applyFieldDefCss,
  unwrapCell,
  cellStyle,
} from './core/styling.js'
import './styles/table-editor.css'

export {
  TableEditor,
  TableEditor as default,
  BtnConfig,
  toBtnConfig,
  iconSvg,
  availableIcons,
  createLocalStoragePrefsAdapter,
  setGlobalPreferencesAdapter,
  getGlobalPreferencesAdapter,
  getCamposJson,
  mapFilaJSONtabla,
  getCamposJSONyFieldDef,
  rowFormatter,
  row_formatter,
  getProcessFieldDef,
  reOrder,
  getFieldDefFFormated,
  greenbornDataPipeline,
  invertHexColor,
  applyRowStyling,
  applyFieldDefCss,
  unwrapCell,
  cellStyle,
}
