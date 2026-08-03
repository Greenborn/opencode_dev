<template>
  <div class="demo">
    <h1>vue-table-editor</h1>
    <p class="demo-sub">
      Tabla genérica autocontenida para Vue 3: redimensionable, reordenable, preferencias de
      columnas, lazy loading server-side, edición inline, CSV, paginación e infinite scroll.
    </p>

    <h4>1) Server-side (lazy) con API simulada</h4>
    <div style="height: 420px" class="demo-block">
      <TableEditor
        ref="tableLazy"
        id="demo-lazy"
        :api="apiLazy"
        :config="configLazy"
        @rowSelected="onSelectedLazy"
        @rowDoubleClick="onDblLazy"
      />
    </div>

    <h4 class="demo-h4">2) Client-side con data directa, edición inline y grupos</h4>
    <div style="height: 420px">
      <TableEditor
        ref="tableClient"
        id="demo-client"
        :data="clientData"
        :config="configClient"
        @rowSelected="onSelectedClient"
      />
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import TableEditor from '../components/TableEditor.vue'
import { crearApiClientes, clientesData, clientesFields } from './api.js'
import { createLocalStoragePrefsAdapter } from '../core/preferenciasAdapter.js'

export default {
  name: 'App',
  components: { TableEditor },
  setup() {
    const apiLazy = crearApiClientes()
    const tableLazy = ref(null)
    const tableClient = ref(null)

    const clientData = ref({ rows: clientesData.slice(0, 40), fields_def: clientesFields })

    const configLazy = {
      lazy: true,
      selectionMode: 'single',
      elementName: { singular: 'Cliente', gender: 'M' },
      showFilterRow: true,
      buttons: {
        toolbar: [
          { key: 'crear', icon: 'plus', severity: 'success', label: 'Nuevo',
            onClick: () => alert('Abrir modal de alta (demo)') },
          { key: 'ver', icon: 'eye', severity: 'info', label: 'Ver',
            isDisabled: () => !selectedLazy.value, onClick: () => alert('Ver ' + (selectedLazy.value?.nombre || '')) },
        ],
        rowActions: [
          { key: 'crear', icon: 'eye', severity: 'info', label: 'Ver',
            onClick: (r) => alert('Ver ' + r.nombre) },
          { key: 'eliminar', icon: 'trash', severity: 'danger', label: 'Borrar',
            onClick: async (r) => { await apiLazy.delete({ id: r.id }); tableLazy.value?.refresh() } },
        ],
      },
    }

    const configClient = {
      lazy: false,
      selectionMode: 'multiple',
      showPaginator: true,
      showFilterRow: true,
      columnGroups: [
        { headerName: 'Datos', fields: ['nombre', 'precio', 'stock'] },
        { headerName: 'Estado', fields: ['estado', 'activo'] },
      ],
      inlineEditing: {
        campos: {
          precio: { type: 'number', min: 0 },
          stock: { type: 'integer', min: 0 },
        },
        api: async ({ id, field, value }) => {
          console.log('[inline save]', id, field, value)
          return { status: true }
        },
        debounce_ms: 800,
        onSave: () => console.log('Guardado inline'),
      },
      preferencesStore: createLocalStoragePrefsAdapter('te_demo_client'),
    }

    const selectedLazy = ref(null)
    const selectedClient = ref(null)

    function onSelectedLazy(row) { selectedLazy.value = row }
    function onDblLazy(row) { alert('Doble click: ' + row.nombre) }
    function onSelectedClient(rows) { selectedClient.value = rows }

    return {
      apiLazy, tableLazy, tableClient, clientData,
      configLazy, configClient, selectedLazy,
      onSelectedLazy, onDblLazy, onSelectedClient,
    }
  },
}
</script>

<style>
body { margin: 0; background: #f4f6f8; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1a202c; }
.demo { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem; }
.demo h1 { margin: 0 0 0.5rem; font-size: 1.6rem; }
.demo h4 { margin: 0 0 1rem; }
.demo-h4 { margin-top: 2.5rem; }
.demo-block { margin-bottom: 2rem; }
.demo-sub { color: #6c757d; margin: 0 0 2rem; }
</style>
