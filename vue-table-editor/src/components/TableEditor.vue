<template>
  <div class="te-wrapper">
    <!-- Toolbar -->
    <div v-if="!config?.hideToolbar" class="te-toolbar">
      <div class="te-toolbar-start">
        <button v-for="btn in toolbarButtons" :key="btn.key"
          :class="['te-btn', severityClass(btn.severity), btn.class]"
          :disabled="btn.isDisabled()"
          @click="btn.onClick"
          :title="btn.getLabel()">
          <span v-if="btn.icon" class="te-btn-icon" v-html="iconSvg(btn.icon)"></span>{{ btn.getLabel() }}
        </button>
      </div>
      <div class="te-toolbar-end">
        <!-- Dropdown visibilidad de columnas -->
        <div class="te-dropdown" ref="colsDropdownRef">
          <button class="te-btn te-btn-outline-secondary" type="button" title="Columnas" @click="colsDropdownOpen = !colsDropdownOpen">
            <span class="te-btn-icon" v-html="iconSvg('columns')"></span>Columnas
          </button>
          <div v-if="colsDropdownOpen" class="te-dropdown-menu" style="min-width:220px">
            <label v-for="col of availableColumns" :key="col.field"
              class="te-dropdown-item">
              <input type="checkbox" :id="'te-cols-'+col.field" :value="col"
                v-model="selectedColumns" class="te-checkbox"
                @change="onColumnsChangeDebounced" />
              {{ col.headerName }}
            </label>
          </div>
        </div>
        <!-- Búsqueda global -->
        <div class="te-search">
          <span class="te-search-icon" v-html="iconSvg('search')"></span>
          <input type="text" class="te-search-input" v-model="globalFilterValue"
            @input="onGlobalFilterDebounced" placeholder="Buscar..." />
        </div>
      </div>
    </div>

    <!-- Scroll wrap -->
    <div class="te-scroll-wrap" :style="scrollHeight ? { height: scrollHeight, minHeight: scrollHeight } : {}"
      ref="scrollWrapRef">
      <!-- Loading overlay -->
      <div v-if="loading" class="te-loading-overlay">
        <div class="te-loading-spinner" role="status">
          <span class="te-sr-only">Cargando...</span>
        </div>
      </div>

      <table class="te-table" :class="{ 'te-striped': striped }">
        <colgroup>
          <col v-if="selectionMode !== null" :style="{ width: selectionColWidth }" />
          <col v-if="rowActionButtons.length" :style="{ width: actionColWidth }" />
          <col v-for="col of visibleColumns" :key="col.field"
            :style="{ width: columnWidths[col.field] || '15rem' }" :data-field="col.field" />
          <col class="te-col-filler" />
        </colgroup>

        <thead>
          <!-- Grupos de columnas -->
          <tr v-if="hasColumnGroups" class="te-header-group-row">
            <th v-if="selectionMode !== null" class="te-th te-th-sel" :rowspan="2">
              <input v-if="selectionMode === 'multiple'" type="checkbox"
                :checked="isAllSelected" @change="toggleSelectAll" class="te-checkbox" />
            </th>
            <th v-if="rowActionButtons.length" class="te-th te-th-acts" :rowspan="2">Acciones</th>
            <template v-for="hcol of columnGroupHeaders" :key="hcol._key">
              <th v-if="hcol._type === 'group'" :colspan="hcol._span" class="te-th te-th-group">
                <span class="te-th-group-label">{{ hcol.headerName }}</span>
              </th>
              <th v-else :rowspan="2" :data-field="hcol._col.field"
                :class="['te-th', hcol._col.css, { 'te-th-sorted': sortField === hcol._col.field }]">
                <div class="te-th-content">
                  <span class="te-th-label" @click="onSortClick(hcol._col.field)">
                    {{ hcol._col.headerName }}
                    <span v-if="hcol._col.sortable !== false" class="te-sort-icon-std">
                      <span v-html="iconSvg(sortIconName(hcol._col.field))"></span>
                    </span>
                  </span>
                </div>
                <div class="te-resize-handle" @pointerdown.stop="onResizeStart($event, hcol._col.field)"
                  @dblclick.stop="onResizeDblClick($event, hcol._col.field)" @click.stop></div>
              </th>
            </template>
            <th class="te-th te-th-filler" :rowspan="2"></th>
          </tr>
          <tr v-if="hasColumnGroups" class="te-header-row te-has-groups">
            <template v-for="hcol of columnGroupHeaders" :key="'r2-'+hcol._key">
              <template v-if="hcol._type === 'group'">
                <th v-for="col of hcol._cols" :key="col.field" :data-field="col.field"
                  :class="['te-th', col.css, { 'te-th-sorted': sortField === col.field }]">
                  <div class="te-th-content">
                    <span class="te-th-label" @click="onSortClick(col.field)">
                      {{ col.headerName }}
                      <span v-if="col.sortable !== false" class="te-sort-icon-std">
                        <span v-html="iconSvg(sortIconName(col.field))"></span>
                      </span>
                    </span>
                  </div>
                  <div class="te-resize-handle" @pointerdown.stop="onResizeStart($event, col.field)"
                    @dblclick.stop="onResizeDblClick($event, col.field)" @click.stop></div>
                </th>
              </template>
            </template>
          </tr>

          <!-- Fila header principal (sin grupos) -->
          <tr v-if="!hasColumnGroups" class="te-header-row">
            <th v-if="selectionMode !== null" class="te-th te-th-sel">
              <input v-if="selectionMode === 'multiple'" type="checkbox"
                :checked="isAllSelected" @change="toggleSelectAll" class="te-checkbox" />
            </th>
            <th v-if="rowActionButtons.length" class="te-th te-th-acts">Acciones</th>
            <th v-for="col of visibleColumns" :key="col.field"
              :data-field="col.field"
              :class="['te-th', col.css, {
                'te-th-dragover-left': dragOverField === col.field && dropSide === 'left',
                'te-th-dragover-right': dragOverField === col.field && dropSide === 'right',
                'te-th-dragging': dragField === col.field,
                'te-th-sorted': sortField === col.field
              }]"
              :draggable="reorderableColumns"
              @dragstart="onDragStart($event, col.field)"
              @dragenter.prevent="onDragEnter($event, col.field)"
              @dragover.prevent="onDragOver($event, col.field)"
              @dragleave="onDragLeave($event, col.field)"
              @drop.prevent="onDrop($event, col.field)"
              @dragend="onDragEnd">
              <div class="te-th-content">
                <span v-if="reorderableColumns" class="te-th-grip" v-html="iconSvg('grip')"></span>
                <span class="te-th-label" @click="onSortClick(col.field)">
                  {{ col.headerName }}
                  <span v-if="col.sortable !== false" class="te-sort-icon-std">
                    <span v-html="iconSvg(sortIconName(col.field))"></span>
                  </span>
                </span>
              </div>
              <div class="te-resize-handle" :class="{ 'te-resizing-active': resizingField === col.field }"
                draggable="false" @pointerdown.stop="onResizeStart($event, col.field)"
                @dblclick.stop="onResizeDblClick($event, col.field)" @click.stop></div>
              <div v-if="dragOverField === col.field && dropSide === 'left'" class="te-drop-indicator te-drop-left"></div>
              <div v-if="dragOverField === col.field && dropSide === 'right'" class="te-drop-indicator te-drop-right"></div>
            </th>
            <th class="te-th te-th-filler"></th>
          </tr>

          <!-- Fila de filtros por columna -->
          <tr v-if="showFilterRow" class="te-filter-row">
            <td v-if="selectionMode !== null" class="te-td"></td>
            <td v-if="rowActionButtons.length" class="te-td"></td>
            <td v-for="col of visibleColumns" :key="'f-'+col.field" class="te-td">
              <input v-model="columnFilters[col.field]" @input="onColumnFilterDebounced"
                type="text" class="te-filter-input" placeholder="" />
              <div class="te-resize-handle" draggable="false"
                @pointerdown.stop="onResizeStart($event, col.field)"
                @dblclick.stop="onResizeDblClick($event, col.field)" @click.stop></div>
            </td>
            <td class="te-td te-td-filler"></td>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(row, rIdx) of displayRows" :key="trackByRow(row, rIdx)"
            :class="['te-tr', row.__css_class, {
              'te-tr-selected': isSelected(row),
              'te-tr-highlight': selectedRow === row
            }]"
            :style="row.__style"
            @click="onRowClick(row)"
            @dblclick="onRowDblClick(row)">
            <td v-if="selectionMode !== null" class="te-td te-td-sel" @click.stop>
              <input v-if="selectionMode === 'multiple'" type="checkbox"
                :checked="isSelected(row)" @change="toggleRowSelection(row)" class="te-checkbox" />
              <input v-else type="radio" :checked="selectedRow === row"
                @change="selectSingle(row)" class="te-checkbox" />
            </td>
            <td v-if="rowActionButtons.length" class="te-td te-td-acts">
              <div class="te-actions-wrap">
                <template v-for="btn of rowActionButtons" :key="btn.key">
                  <button v-if="btn.isVisible()"
                    :class="['te-btn', severityClass(btn.severity), btn.class]"
                    :disabled="btn.isDisabled()"
                    @click.stop="btn.onClick(row)"
                    :title="btn.getLabel()">
                    <span v-if="btn.icon" class="te-btn-icon" v-html="iconSvg(btn.icon)"></span> {{ btn.getLabel() }}
                  </button>
                </template>
              </div>
            </td>
            <td v-for="col of visibleColumns" :key="col.field"
              :class="['te-td', col.css, {
                'te-td-inline-edit': !!getInlineEditCfg(col)
              }]"
              :style="cellStyle(row, col)">
              <template v-if="isEditingCell(row, col)">
                <input v-model="inlineEditValue" type="text" class="te-editing-input"
                  @blur="confirmInlineEdit(row, col)"
                  @keydown.enter="confirmInlineEdit(row, col)"
                  @keydown.escape="cancelInlineEdit"
                  ref="inlineEditRef" />
              </template>
              <div v-else class="te-cell-wrap">
                <span @dblclick="startInlineEdit($event, row, col)" v-html="formatCell(row, col)"></span>
                <button v-if="getInlineEditCfg(col)" class="te-inline-edit-btn"
                  @click.stop="startInlineEdit($event, row, col)" title="Editar inline">
                  <span class="te-btn-icon" v-html="iconSvg('pencil')"></span>
                </button>
              </div>
              <div class="te-resize-handle" draggable="false"
                @pointerdown.stop="onResizeStart($event, col.field)"
                @dblclick.stop="onResizeDblClick($event, col.field)" @click.stop></div>
            </td>
            <td class="te-td te-td-filler"></td>
          </tr>
          <tr v-if="!displayRows.length">
            <td :colspan="totalColspan" class="te-td te-empty">Sin registros</td>
          </tr>
        </tbody>
      </table>

      <!-- Sentinel para infinite scroll -->
      <div v-if="infiniteScroll" ref="sentinelRef" class="te-sentinel">
        <span v-if="isLoadingMore" class="te-loading-spinner"></span>
      </div>
    </div>

    <!-- Paginador -->
    <div v-show="!infiniteScroll && showPaginator" class="te-paginator">
      <span class="te-page-info">Mostrando {{ pageStart }} a {{ pageEnd }} de {{ totalRows }}</span>
      <div class="te-page-controls">
        <button class="te-page-btn" :disabled="page <= 1" @click="goToPage(1)">««</button>
        <button class="te-page-btn" :disabled="page <= 1" @click="goToPage(page - 1)">«</button>
        <span class="te-page-current">{{ page }} / {{ totalPages }}</span>
        <button class="te-page-btn" :disabled="page >= totalPages" @click="goToPage(page + 1)">»</button>
        <button class="te-page-btn" :disabled="page >= totalPages" @click="goToPage(totalPages)">»»</button>
      </div>
      <select v-model="pageSize" class="te-select" @change="onPageSizeChange">
        <option v-for="s of pageSizeOptions" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { BtnConfig, toBtnConfig } from '../core/BtnConfig.js'
import { getGlobalPreferencesAdapter } from '../core/preferenciasAdapter.js'
import { iconSvg } from '../core/icons.js'

const props = defineProps({
  api: { type: Object, default: null },
  permisos: { type: Object, default: () => ({}) },
  config: { type: Object, default: () => ({}) },
  data: { type: [Array, Object], default: null },
  id: { type: String, default: null },
})

const emit = defineEmits(['loaded', 'rowSelected', 'rowDoubleClick'])

const STORAGE_KEY_PREFIX = 'te_cfg'

// ── Preferencias ─────────────────────────────────────
const prefStore = computed(() => props.config?.preferencesStore || getGlobalPreferencesAdapter())

function getPrefKey() { return props.id ? `${STORAGE_KEY_PREFIX}_${props.id}` : null }

let saveTimer = null
async function loadPersistedConfig() {
  const key = getPrefKey()
  if (!key) return null
  try {
    const val = prefStore.value.valor(key)
    if (val) return typeof val === 'string' ? JSON.parse(val) : val
    return null
  } catch { return null }
}

async function savePersistedConfig() {
  const key = getPrefKey()
  if (!key) return
  const fields = visibleColumns.value.map(c => c.field)
  const cw = {}
  for (const f of fields) cw[f] = columnWidths.value[f] || '15rem'
  const ord = columnOrder.value.length ? columnOrder.value : fields
  await prefStore.value.guardarValores({ [key]: JSON.stringify({ columnOrder: ord, columnWidths: cw }) })
}

function debouncedPersist() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => savePersistedConfig(), 500)
}

// ── Estado reactivo ──────────────────────────────────
const rows = ref([])
const columnDefs = ref([])
const selectedColumns = ref([])
const availableColumns = ref([])
const isLoaded = ref(false)
const editEnabled = ref(true)
const selectionMode = ref('single')
const selectedRow = ref(null)
const selectedRows = ref(new Map())
const sortField = ref(null)
const sortOrder = ref('asc')
const columnFilters = ref({})
const globalFilterValue = ref('')
const page = ref(1)
const pageSize = ref(25)
const pageSizeOptions = ref([25, 50, 100, 200])
const scrollHeight = ref(null)
const showPaginator = ref(true)
const showFilterRow = ref(false)
const striped = ref(true)
const resizableColumns = ref(true)
const reorderableColumns = ref(true)
const selectionColWidth = ref('3rem')
const actionColWidth = ref('10rem')
const columnWidths = ref({})
const columnOrder = ref([])
const loading = ref(false)
const totalRecords = ref(0)
const lazy = computed(() => props.config?.lazy === true)
const infiniteScroll = computed(() => props.config?.infiniteScroll === true || (props.config?.infiniteScroll !== false && lazy.value))
const isLoadingMore = ref(false)
const hasMorePages = ref(true)
const infinitePage = ref(1)
const sentinelRef = ref(null)
const scrollWrapRef = ref(null)
const colsDropdownRef = ref(null)
const colsDropdownOpen = ref(false)
let infiniteObserver = null

// Drag & drop
const dragField = ref(null)
const dragOverField = ref(null)
const dropSide = ref(null)

// Resize
const resizingField = ref(null)
let resizeStartX = null
let resizeStartWidth = null

// Inline editing
const editingCell = ref(null)
const inlineEditValue = ref('')
const inlineEditRef = ref(null)
let inlineSaveTimer = null
let pendingInlineSave = null

// Filter debounce
let filterTimer = null
let gfTimer = null
let colsTimer = null

// Labels
const elementLabels = ref({
  create: 'Nuevo', edit: 'Editar', delete: 'Borrar',
  article: 'un', deleted: 'eliminado'
})

// ── Computed ─────────────────────────────────────────
const visibleColumns = computed(() => {
  const sel = selectedColumns.value
  if (columnOrder.value.length) {
    const ordered = []
    for (const f of columnOrder.value) {
      const found = sel.find(c => c.field === f)
      if (found) ordered.push(found)
    }
    for (const c of sel) if (!ordered.some(x => x.field === c.field)) ordered.push(c)
    return ordered
  }
  return sel
})

const rowActionButtons = computed(() => buttonGroups.value.rowActions || [])

const totalColspan = computed(() => {
  let n = visibleColumns.value.length + 1
  if (selectionMode.value !== null) n++
  if (rowActionButtons.value.length) n++
  return n
})

const hasColumnGroups = computed(() => props.config?.columnGroups?.length > 0)

const inlineEditingConfig = computed(() => props.config?.inlineEditing)
const inlineEditFields = computed(() => inlineEditingConfig.value?.campos || {})

const columnGroupHeaders = computed(() => {
  if (!hasColumnGroups.value) return []
  const groups = props.config.columnGroups || []
  const cols = visibleColumns.value
  const fieldToGroup = {}
  for (let gi = 0; gi < groups.length; gi++) {
    for (const f of groups[gi].fields) fieldToGroup[f] = gi
  }
  const result = []
  let i = 0
  while (i < cols.length) {
    const col = cols[i]
    const gi = fieldToGroup[col.field]
    if (gi !== undefined) {
      const groupCols = []
      while (i < cols.length && fieldToGroup[cols[i].field] === gi) {
        groupCols.push(cols[i])
        i++
      }
      result.push({ _key: 'g-' + gi, _type: 'group', headerName: groups[gi].headerName, _span: groupCols.length, _cols: groupCols })
    } else {
      result.push({ _key: 'c-' + col.field, _type: 'col', _col: col })
      i++
    }
  }
  return result
})

// Data filtering (client-side)
const filteredRows = computed(() => {
  let r = rows.value || []
  const gf = globalFilterValue.value
  if (gf) {
    const q = gf.toLowerCase()
    r = r.filter(row => visibleColumns.value.some(c => {
      const v = row[c.field]
      return v != null && String(v).toLowerCase().includes(q)
    }))
  }
  for (const col of visibleColumns.value) {
    const fv = columnFilters.value[col.field]
    if (fv) {
      const q = fv.toLowerCase()
      r = r.filter(row => {
        const v = row[col.field]
        return v != null && String(v).toLowerCase().includes(q)
      })
    }
  }
  if (sortField.value) {
    r = [...r].sort((a, b) => {
      let va = a[sortField.value], vb = b[sortField.value]
      if (va == null) va = ''
      if (vb == null) vb = ''
      if (typeof va === 'number' && typeof vb === 'number')
        return sortOrder.value === 'asc' ? va - vb : vb - va
      va = String(va).toLowerCase()
      vb = String(vb).toLowerCase()
      return sortOrder.value === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }
  return r
})

const totalRows = computed(() => lazy.value ? totalRecords.value : filteredRows.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize.value)))

const displayRows = computed(() => {
  if (infiniteScroll.value) return rows.value || []
  if (lazy.value) return rows.value || []
  const start = (page.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

const pageStart = computed(() => (page.value - 1) * pageSize.value + 1)
const pageEnd = computed(() => Math.min(page.value * pageSize.value, totalRows.value))

const isAllSelected = computed(() => {
  return displayRows.value.length > 0 && displayRows.value.every(r => isSelected(r))
})

// ── Toolbar buttons ──────────────────────────────────
const buttonGroups = ref({
  toolbar: [
    new BtnConfig({ key: 'refresh', icon: 'refresh', severity: 'outline-info',
      isVisible: () => !props.config?.hideRefresh,
      onClick: () => refresh() }),
    new BtnConfig({ key: 'csv', icon: 'download', severity: 'outline-info', label: 'CSV',
      isVisible: () => !props.config?.hideCsvExport,
      onClick: () => exportCsv() }),
    new BtnConfig({ key: 'create', icon: 'plus', severity: 'success',
      isVisible: () => props.api?.create != null,
      getLabel: () => elementLabels.value.create,
      onClick: () => createRecord() }),
    new BtnConfig({ key: 'edit', icon: 'pencil', severity: 'warning',
      isVisible: () => props.api?.edit != null,
      getLabel: () => elementLabels.value.edit,
      isDisabled: () => editEnabled.value,
      onClick: () => editRecord() }),
    new BtnConfig({ key: 'delete', icon: 'trash', severity: 'danger',
      isVisible: () => props.api?.delete != null,
      getLabel: () => elementLabels.value.delete,
      isDisabled: () => editEnabled.value,
      onClick: () => deleteRecord() }),
  ],
  rowActions: []
})

const toolbarButtons = computed(() => {
  const btns = []
  for (const b of buttonGroups.value.toolbar) {
    if (b.isVisible()) btns.push(b)
  }
  if (props.config?.buttons?.toolbar) {
    for (const b of props.config.buttons.toolbar) {
      btns.push(toBtnConfig(b))
    }
  }
  return btns
})

// ── Config ───────────────────────────────────────────
function applyConfig() {
  if (props.config?.selectionMode != null) selectionMode.value = props.config.selectionMode
  if (props.config?.elementName?.gender === 'F') {
    elementLabels.value = { create: 'Nueva', edit: 'Editar', delete: 'Borrar', article: 'una', deleted: 'eliminada' }
  }
  if (props.config?.pageSize != null) pageSize.value = props.config.pageSize
  if (props.config?.pageSizeOptions != null) pageSizeOptions.value = props.config.pageSizeOptions
  if (props.config?.scrollHeight != null) scrollHeight.value = props.config.scrollHeight
  if (props.config?.showPaginator != null) showPaginator.value = props.config.showPaginator
  if (props.config?.showFilterRow != null) showFilterRow.value = props.config.showFilterRow
  if (props.config?.buttons?.rowActions) {
    buttonGroups.value.rowActions = props.config.buttons.rowActions.map(toBtnConfig)
  }
}

// ── Format helpers ───────────────────────────────────
function invertHexColor(h) {
  if (h.length !== 7) return null
  return '#' + (255 - parseInt(h.slice(1, 3), 16)).toString(16).padStart(2, '0') +
    (255 - parseInt(h.slice(3, 5), 16)).toString(16).padStart(2, '0') +
    (255 - parseInt(h.slice(5, 7), 16)).toString(16).padStart(2, '0')
}

function unwrapCell(row, col) {
  if (row == null) return { value: null, style: null }
  const v = row[col?.field]
  if (v != null && typeof v === 'object' && '__style' in v) return { value: v.value, style: v.__style }
  if (row.__field_styles?.[col?.field]) return { value: v, style: row.__field_styles[col?.field] }
  return { value: v, style: null }
}

function cellStyle(row, col) {
  return unwrapCell(row, col).style
}

function formatCell(row, col) {
  let { value: data } = unwrapCell(row, col)
  if (data == null || data === '') return '-'
  const formatter = props.config?.valueFormatters?.[col?.field]
  if (col?.form_type === 'color') {
    const bg = '#' + (data || '000000')
    const fg = invertHexColor(bg) || '#ffffff'
    return `<span class="te-color-badge" style="background:${bg};color:${fg}">${data}</span>`
  }
  if (col?.form_type === 'json') return JSON.stringify(data)
  if (col?.type === 'date' || col?.field?.endsWith('_at') || col?.field?.endsWith('At')) {
    try { return new Date(data).toLocaleDateString() } catch { return data }
  }
  if (col?.type === 'datetime') {
    try { return new Date(data).toLocaleString() } catch { return data }
  }
  if (col?.type === 'boolean' || col?.type === 'bool') return data ? 'Sí' : 'No'
  return typeof formatter === 'function' ? formatter(row) : String(data)
}

// ── Selection ────────────────────────────────────────
function isSelected(row) {
  if (selectionMode.value === 'single') return selectedRow.value === row
  return selectedRows.value.has(row)
}

function selectSingle(row) {
  selectedRow.value = row
  editEnabled.value = false
  emit('rowSelected', row)
}

function toggleRowSelection(row) {
  if (selectedRows.value.has(row)) selectedRows.value.delete(row)
  else selectedRows.value.set(row, true)
  editEnabled.value = selectedRows.value.size === 0
  emit('rowSelected', [...selectedRows.value.keys()])
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedRows.value = new Map()
    editEnabled.value = true
    emit('rowSelected', [])
  } else {
    const m = new Map()
    for (const r of displayRows.value) m.set(r, true)
    selectedRows.value = m
    editEnabled.value = false
    emit('rowSelected', [...m.keys()])
  }
}

function onRowClick(row) {
  if (resizingField.value || dragField.value) return
  if (selectionMode.value === 'multiple') toggleRowSelection(row)
  else selectSingle(row)
}

function onRowDblClick(row) {
  if (resizingField.value || dragField.value) return
  emit('rowDoubleClick', row)
}

// ── Sort ─────────────────────────────────────────────
function sortIconName(field) {
  if (sortField.value !== field) return 'sort'
  return sortOrder.value === 'asc' ? 'sort-asc' : 'sort-desc'
}

function onSortClick(field) {
  if (resizingField.value || dragField.value) return
  const col = visibleColumns.value.find(c => c.field === field)
  if (col?.sortable === false) return
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'asc'
  }
  page.value = 1
  if (lazy.value) {
    if (infiniteScroll.value) { infinitePage.value = 1; hasMorePages.value = true; rows.value = [] }
    loadLazyData()
  }
}

// ── Filter ───────────────────────────────────────────
function onGlobalFilterDebounced() {
  if (gfTimer) clearTimeout(gfTimer)
  gfTimer = setTimeout(() => {
    page.value = 1
    if (lazy.value) {
      if (infiniteScroll.value) { infinitePage.value = 1; hasMorePages.value = true; rows.value = [] }
      loadLazyData()
    }
  }, 300)
}

function onColumnFilterDebounced() {
  if (filterTimer) clearTimeout(filterTimer)
  filterTimer = setTimeout(() => {
    page.value = 1
    if (lazy.value) {
      if (infiniteScroll.value) { infinitePage.value = 1; hasMorePages.value = true; rows.value = [] }
      loadLazyData()
    }
  }, 400)
}

function onColumnsChangeDebounced() {
  if (colsTimer) clearTimeout(colsTimer)
  colsTimer = setTimeout(() => debouncedPersist(), 300)
}

// ── Pagination ───────────────────────────────────────
function goToPage(p) {
  flushInlineEdit()
  page.value = Math.max(1, Math.min(p, totalPages.value))
  if (lazy.value) loadLazyData()
}

function onPageSizeChange() {
  flushInlineEdit()
  page.value = 1
  if (lazy.value) loadLazyData()
}

// ── Column resize (pointer events) ───────────────────
function onResizeStart(e, field) {
  if (e.button !== 0 || dragField.value) return
  e.preventDefault()
  const el = e.currentTarget.closest('th, td')
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (rect.right - e.clientX > 11) return
  try { el.setPointerCapture(e.pointerId) } catch (_) {}
  resizingField.value = field
  resizeStartX = e.clientX
  resizeStartWidth = el.offsetWidth
  document.body.style.cursor = 'col-resize'
  document.body.classList.add('te-resizing')
  document.addEventListener('pointermove', onResizeMove)
  document.addEventListener('pointerup', onResizeEnd)
}

function onResizeMove(e) {
  if (!resizingField.value || resizeStartX == null || resizeStartWidth == null) return
  const nw = Math.max(100, resizeStartWidth + (e.clientX - resizeStartX))
  columnWidths.value = { ...columnWidths.value, [resizingField.value]: nw + 'px' }
}

function onResizeEnd() {
  document.removeEventListener('pointermove', onResizeMove)
  document.removeEventListener('pointerup', onResizeEnd)
  document.body.style.cursor = ''
  document.body.classList.remove('te-resizing')
  if (resizingField.value) debouncedPersist()
  resizeStartX = null
  resizeStartWidth = null
  resizingField.value = null
}

function onResizeDblClick(e, field) {
  onResizeStart(e, field)
}

// ── Column reorder (drag & drop) ─────────────────────
function onDragStart(e, field) {
  if (resizingField.value) { e.preventDefault(); return }
  dragField.value = field
  dragOverField.value = null
  dropSide.value = null
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', field)
  }
}

function onDragEnter(e, field) {
  if (dragField.value === field || (e.relatedTarget && e.currentTarget.contains(e.relatedTarget))) return
  dragOverField.value = field
}

function onDragOver(e, field) {
  if (dragField.value === field) return
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  const rect = e.currentTarget.getBoundingClientRect()
  dropSide.value = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right'
}

function onDragLeave(e, field) {
  if (e.currentTarget.contains(e.relatedTarget)) return
  if (dragOverField.value === field) { dragOverField.value = null; dropSide.value = null }
}

function onDrop(e, field) {
  if (!dragField.value || dragField.value === field) { onDragEnd(); return }
  const order = columnOrder.value.length ? [...columnOrder.value] : selectedColumns.value.map(c => c.field)
  const from = order.indexOf(dragField.value)
  const to = order.indexOf(field)
  if (from < 0 || to < 0) { onDragEnd(); return }
  const [m] = order.splice(from, 1)
  const at = from < to
    ? (dropSide.value === 'right' ? to : to - 1)
    : (dropSide.value === 'left' ? to : to + 1)
  order.splice(Math.max(0, Math.min(order.length, at)), 0, m)
  columnOrder.value = order
  debouncedPersist()
  onDragEnd()
}

function onDragEnd() {
  dragField.value = null
  dragOverField.value = null
  dropSide.value = null
}

// ── Inline editing ───────────────────────────────────
function getInlineEditCfg(col) {
  return inlineEditFields.value[col?.field] || null
}

function isEditingCell(row, col) {
  if (!editingCell.value) return false
  return editingCell.value.row === row && editingCell.value.field === col.field
}

function startInlineEdit(event, row, col) {
  const cfg = getInlineEditCfg(col)
  if (!cfg) return
  event?.stopPropagation?.()
  const val = row[col.field] ?? ''
  editingCell.value = { row, field: col.field }
  inlineEditValue.value = val
  nextTick(() => {
    const el = inlineEditRef.value
    if (el && typeof el.focus === 'function') { el.focus(); el.select() }
  })
}

function confirmInlineEdit(row, col) {
  if (!editingCell.value) return
  const cfg = getInlineEditCfg(col)
  if (!cfg) { cancelInlineEdit(); return }
  let val = inlineEditValue.value
  if (cfg.type === 'integer') {
    val = parseInt(val, 10)
    if (isNaN(val) || (cfg.min !== undefined && val < cfg.min)) { cancelInlineEdit(); return }
  } else if (cfg.type === 'number') {
    val = parseFloat(val)
    if (isNaN(val) || (cfg.min !== undefined && val < cfg.min)) { cancelInlineEdit(); return }
  }
  row[col.field] = val
  if (!row.__raw) row.__raw = {}
  row.__raw[col.field] = val
  if (cfg.afterEdit) cfg.afterEdit(row, col.field, val)
  editingCell.value = null
  debouncedInlineSave(row, col.field, val)
}

function cancelInlineEdit() {
  editingCell.value = null
  inlineEditValue.value = ''
}

function debouncedInlineSave(row, field, value) {
  const cfg = inlineEditingConfig.value
  if (!cfg?.api) return
  const id = row.id
  if (!id) return
  if (inlineSaveTimer) { clearTimeout(inlineSaveTimer); inlineSaveTimer = null }
  if (pendingInlineSave) { pendingInlineSave.api(pendingInlineSave.data); pendingInlineSave = null }
  pendingInlineSave = { api: cfg.api, data: { id, field, value } }
  inlineSaveTimer = setTimeout(async () => {
    const res = await cfg.api({ id, field, value })
    pendingInlineSave = null
    if (res?.status !== false && cfg.onSave) cfg.onSave()
  }, cfg.debounce_ms ?? 1000)
}

function flushInlineEdit() {
  editingCell.value = null
  inlineEditValue.value = ''
  if (inlineSaveTimer) { clearTimeout(inlineSaveTimer); inlineSaveTimer = null }
  if (pendingInlineSave) { pendingInlineSave.api(pendingInlineSave.data); pendingInlineSave = null }
}

// ── CRUD ─────────────────────────────────────────────
async function createRecord() {
  console.log('[TableEditor] createRecord - implementar via api.create')
}

async function editRecord() {
  console.log('[TableEditor] editRecord - implementar via api.edit')
}

async function deleteRecord() {
  console.log('[TableEditor] deleteRecord - implementar via api.delete')
}

// ── CSV Export ───────────────────────────────────────
async function exportCsv() {
  let data = rows.value || []
  if (!data.length) return
  const cols = visibleColumns.value
  let csv = cols.map(c => csvEscape(c.headerName)).join(',') + '\n'
  for (const r of data) {
    csv += cols.map(c => csvEscape(r[c.field] != null ? String(r[c.field]) : '')).join(',') + '\n'
  }
  const a = document.createElement('a')
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFF' + csv)
  a.download = 'datos.csv'
  a.click()
}

function csvEscape(v) {
  v = String(v).replace(/"/g, '""')
  return v.includes(',') || v.includes('"') || v.includes('\n') ? '"' + v + '"' : v
}

// ── Helpers de UI ────────────────────────────────────
function severityClass(sev) {
  let s = String(sev || 'primary')
  if (s.startsWith('te-btn-')) return s
  if (s.startsWith('btn-')) s = s.slice(4)
  return 'te-btn-' + s
}

function onGlobalClick(e) {
  if (colsDropdownRef.value && !colsDropdownRef.value.contains(e.target)) {
    colsDropdownOpen.value = false
  }
}

// ── Data loading ─────────────────────────────────────
function refresh() {
  flushInlineEdit()
  selectedRow.value = null
  selectedRows.value = new Map()
  editEnabled.value = true
  if (infiniteScroll.value) { infinitePage.value = 1; hasMorePages.value = true; rows.value = [] }
  loadData()
}

async function loadLazyData() {
  flushInlineEdit()
  loading.value = true
  const p = {
    page: infiniteScroll.value ? infinitePage.value : page.value,
    pageSize: pageSize.value,
    sortField: sortField.value || '',
    sortOrder: sortOrder.value,
    search: globalFilterValue.value || '',
  }
  const cf = {}
  for (const k of Object.keys(columnFilters.value)) {
    if (columnFilters.value[k]) cf[k] = columnFilters.value[k]
  }
  if (Object.keys(cf).length) p.filters = JSON.stringify(cf)
  try {
    const res = await props.api.list(p)
    if (res?.status !== false) {
      totalRecords.value = res?.data?.totalRecords || res?.data?.total || 0
      processData(res?.data)
    }
  } catch (err) {
    console.error('[TableEditor] load error:', err)
  } finally {
    loading.value = false
  }
}

async function loadData(dataOverride) {
  const src = dataOverride || props.data
  if (src != null) return processData(src)
  if (props.api?.list) {
    if (lazy.value) return loadLazyData()
    loading.value = true
    try {
      const res = await props.api.list()
      if (res?.status !== false) processData(res?.data)
    } catch (err) {
      console.error('[TableEditor] load error:', err)
    } finally {
      loading.value = false
    }
  }
  emit('rowSelected', selectionMode.value === 'single' ? null : [])
  selectedRow.value = null
  selectedRows.value = new Map()
}

function processData(data) {
  if (!data) { isLoaded.value = true; emit('loaded', true); return }
  rows.value = data.rows || []
  let fields_def = data.fields_def
  if (fields_def) {
    columnDefs.value = [...fields_def]
    selectedColumns.value = [...fields_def]
    availableColumns.value = [...fields_def]
    if (props.config?.defaultColumnProps) {
      for (let c = 0; c < selectedColumns.value.length; c++) {
        selectedColumns.value[c] = { ...selectedColumns.value[c], ...props.config.defaultColumnProps }
      }
    }
    if (props.config?.columnOrder) {
      const ordered = []
      for (const f of props.config.columnOrder) {
        const found = selectedColumns.value.find(c => c.field === f)
        if (found) ordered.push(found)
      }
      for (const c of selectedColumns.value) {
        if (!ordered.some(x => x.field === c.field)) ordered.push(c)
      }
      selectedColumns.value = ordered
    }
    loadPersistedConfig().then(saved => {
      if (saved?.columnWidths) {
        for (const [f, w] of Object.entries(saved.columnWidths)) {
          columnWidths.value[f] = w
        }
      }
      columnOrder.value = saved?.columnOrder || []
    })
  }
  isLoaded.value = true
  emit('loaded', true)
}

// ── Infinite scroll ──────────────────────────────────
function setupInfiniteScroll() {
  if (!infiniteScroll.value) return
  const wrap = scrollWrapRef.value
  if (!wrap || !sentinelRef.value) return
  infiniteObserver?.disconnect()
  infiniteObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && hasMorePages.value && !isLoadingMore.value) {
      loadMoreInfinite()
    }
  }, { root: wrap, rootMargin: '0px 0px 200px 0px', threshold: 0 })
  infiniteObserver.observe(sentinelRef.value)
}

async function loadMoreInfinite() {
  isLoadingMore.value = true
  if (lazy.value) {
    infinitePage.value++
    const p = {
      page: infinitePage.value,
      pageSize: pageSize.value,
      sortField: sortField.value || '',
      sortOrder: sortOrder.value,
      search: globalFilterValue.value || '',
    }
    try {
      const res = await props.api.list(p)
      if (res?.status !== false) {
        const newRows = res?.data?.rows || []
        rows.value = [...rows.value, ...newRows]
        totalRecords.value = res?.data?.totalRecords || res?.data?.total || 0
      }
      hasMorePages.value = rows.value.length < totalRecords.value
    } catch { hasMorePages.value = false }
  } else {
    const total = filteredRows.value.length
    const shown = rows.value.length
    const next = Math.min(shown + pageSize.value, total)
    if (next > shown) rows.value = [...filteredRows.value.slice(0, next)]
    hasMorePages.value = rows.value.length < total
  }
  isLoadingMore.value = false
}

// ── Track helpers ────────────────────────────────────
function trackByRow(row, index) {
  return row?.id ?? row?.__uid ?? index
}

// ── Watchers ─────────────────────────────────────────
watch(() => props.data, (nd) => {
  if (nd?.rows !== undefined) loadData(nd)
})

// ── Lifecycle ────────────────────────────────────────
onMounted(async () => {
  applyConfig()
  document.addEventListener('click', onGlobalClick)
  if (prefStore.value.fetchMisPreferencias) {
    await prefStore.value.fetchMisPreferencias()
  }
  await loadData()
  nextTick(() => setupInfiniteScroll())
})

onUnmounted(() => {
  document.removeEventListener('click', onGlobalClick)
  document.removeEventListener('pointermove', onResizeMove)
  document.removeEventListener('pointerup', onResizeEnd)
  infiniteObserver?.disconnect()
  if (inlineSaveTimer) { clearTimeout(inlineSaveTimer); inlineSaveTimer = null }
  if (pendingInlineSave) { pendingInlineSave.api(pendingInlineSave.data); pendingInlineSave = null }
  if (saveTimer) clearTimeout(saveTimer)
  if (filterTimer) clearTimeout(filterTimer)
  if (gfTimer) clearTimeout(gfTimer)
  if (colsTimer) clearTimeout(colsTimer)
})

defineExpose({ loadData, applyConfig, refresh })
</script>
