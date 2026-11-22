<template>
  <div class="crud-modulo">
    <h2 v-if="titulo" class="crud-titulo">{{ titulo }}</h2>
    <div v-if="!puedeListar" class="crud-sin-permiso">
      No tenés permiso para ver este listado ({{ recurso }}.listar).
    </div>
    <template v-else>
      <div v-if="filtrosDisponibles.length > 0" class="crud-filtros">
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          :aria-expanded="mostrarFiltros ? 'true' : 'false'"
          @click="mostrarFiltros = !mostrarFiltros"
        >
          {{ mostrarFiltros ? 'Ocultar filtros' : 'Filtros avanzados' }}
        </button>
        <div v-if="mostrarFiltros" class="crud-filtros-panel">
          <div v-for="campo in filtrosDisponibles" :key="campo.field" class="crud-filtro-fila">
            <label :for="`crud-filtro-op-${recurso}-${campo.field}`" class="form-label small mb-0">
              {{ campo.headerName }}
            </label>
            <select
              :id="`crud-filtro-op-${recurso}-${campo.field}`"
              v-model="filtrosEstado[campo.field].op"
              class="form-select form-select-sm"
            >
              <option value="">Sin filtro</option>
              <option v-for="op in operadoresDe(campo)" :key="op" :value="op">{{ etiquetaOp(op) }}</option>
            </select>

            <template v-if="filtrosEstado[campo.field].op === 'rango'">
              <input v-model="filtrosEstado[campo.field].desde" :type="tipoInput(campo)" class="form-control form-control-sm" placeholder="Desde" :aria-label="`${campo.headerName} desde`" />
              <input v-model="filtrosEstado[campo.field].hasta" :type="tipoInput(campo)" class="form-control form-control-sm" placeholder="Hasta" :aria-label="`${campo.headerName} hasta`" />
            </template>
            <select
              v-else-if="filtrosEstado[campo.field].op === 'nulo' || (campo.type === 'boolean' && filtrosEstado[campo.field].op !== '' && filtrosEstado[campo.field].op !== 'en')"
              v-model="filtrosEstado[campo.field].valor"
              class="form-select form-select-sm"
              :aria-label="`${campo.headerName} valor`"
            >
              <option value="">—</option>
              <option value="si">{{ filtrosEstado[campo.field].op === 'nulo' ? 'Sí' : 'Sí / verdadero' }}</option>
              <option value="no">{{ filtrosEstado[campo.field].op === 'nulo' ? 'No' : 'No / falso' }}</option>
            </select>
            <select
              v-else-if="filtrosEstado[campo.field].op !== '' && filtrosEstado[campo.field].op !== 'en' && opcionesDe(campo).length > 0"
              v-model="filtrosEstado[campo.field].valor"
              class="form-select form-select-sm"
              :aria-label="`${campo.headerName} valor`"
            >
              <option value="">—</option>
              <option v-for="o in opcionesDe(campo)" :key="String(o.value)" :value="String(o.value)">{{ o.label }}</option>
            </select>
            <input
              v-else-if="filtrosEstado[campo.field].op !== ''"
              v-model="filtrosEstado[campo.field].valor"
              :type="filtrosEstado[campo.field].op === 'en' ? 'text' : tipoInput(campo)"
              class="form-control form-control-sm"
              :placeholder="filtrosEstado[campo.field].op === 'en' ? 'Valores separados por coma' : 'Valor'"
              :aria-label="`${campo.headerName} valor`"
            />
          </div>
          <div v-if="errorFiltros" class="crud-error">{{ errorFiltros }}</div>
          <div class="crud-filtros-acciones">
            <button type="button" class="btn btn-sm btn-primary" @click="aplicarFiltros">Aplicar filtros</button>
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="limpiarFiltros">Limpiar</button>
          </div>
        </div>
      </div>
      <TableEditor
        ref="tabla"
        :id="recurso"
        :api="api"
        :config="tableConfig"
        @rowSelected="onRowSelected"
      />
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { TableEditor } from '@greenborn/vue-table-editor'
import { useCrud } from '../composables/useCrud.js'
import { ETIQUETAS_OPERADOR, operadoresDeFiltro, opcionesDeCampo } from '../helpers.js'

const props = defineProps({
  recurso: { type: String, required: true },
  endpoint: { type: String, required: true },
  http: { type: Object, required: true },
  permisos: { type: Array, required: true },
  campos: { type: Array, default: null },
  titulo: { type: String, default: '' },
  elemento: { type: Object, default: null },
  accionesExtra: { type: Array, default: () => [] },
  pk: { type: String, default: 'id' },
  // Dependencia opcional { leer(clave), guardar(clave, valor) } para preferencias de columnas (sin SSO: ver README).
  preferencias: { type: Object, default: null },
  // Configuración de ayuda contextual: { clave, botones: { listar, crear, editar, eliminar, campo } }.
  ayuda: { type: Object, default: null },
})

const tabla = ref(null)
const mostrarFiltros = ref(false)

const {
  api,
  tableConfig,
  puedeListar,
  onRowSelected,
  setTabla,
  refresh,
  filtrosDisponibles,
  filtrosEstado,
  errorFiltros,
  aplicarFiltros,
  limpiarFiltros,
} = useCrud({
  recurso: props.recurso,
  endpoint: props.endpoint,
  http: props.http,
  permisos: computed(() => props.permisos),
  campos: computed(() => props.campos),
  pk: props.pk,
  elemento: computed(() => props.elemento),
  accionesExtra: computed(() => props.accionesExtra),
  preferencias: props.preferencias,
  ayuda: props.ayuda,
})

function operadoresDe(campo) {
  return operadoresDeFiltro(campo)
}

function etiquetaOp(op) {
  return ETIQUETAS_OPERADOR[op]
}

function opcionesDe(campo) {
  return opcionesDeCampo(campo)
}

function tipoInput(campo) {
  if (campo.type === 'number') return 'number'
  if (campo.type === 'date') return 'date'
  return 'text'
}

watch(tabla, (valor) => setTabla(valor), { immediate: true })

watch(tableConfig, () => {
  if (tabla.value === null) return
  tabla.value.applyConfig()
})

defineExpose({ refresh })
</script>
