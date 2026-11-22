<template>
  <div class="demo">
    <h1>@greenborn/vue-greenborn-crud</h1>
    <p>Demo con <code>http</code> mock en memoria. Cambiá los permisos para ver los botones habilitados.</p>

    <fieldset class="demo-permisos">
      <legend>Permisos del usuario (prop <code>permisos</code>)</legend>
      <label v-for="p in todosLosPermisos" :key="p" class="demo-check">
        <input type="checkbox" :value="p" v-model="permisosSeleccionados" />
        {{ p }}
      </label>
    </fieldset>

    <CrudModulo
      recurso="productos"
      endpoint="/api/productos"
      :http="http"
      :permisos="permisosSeleccionados"
      titulo="Productos"
      :elemento="{ singular: 'Producto', gender: 'M' }"
      :acciones-extra="accionesExtra"
    />

    <ModalContainer />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ModalContainer } from '@greenborn/vue-greenborn-modal-manager'
import { CrudModulo } from '../src/index.js'
import { crearHttpMock } from './mockHttp.js'

const http = crearHttpMock()

const todosLosPermisos = [
  'productos.listar', 'productos.ver', 'productos.crear', 'productos.editar', 'productos.eliminar',
]
const permisosSeleccionados = ref([...todosLosPermisos])

const accionesExtra = [
  {
    key: 'detalle',
    label: 'Detalle',
    icon: 'eye',
    severity: 'outline-info',
    permiso: 'productos.ver',
    onClick: (fila) => console.log('[demo] detalle', fila),
  },
]
</script>

<style>
.demo { padding: 1rem; max-width: 960px; margin: 0 auto; font-family: system-ui, sans-serif; }
.demo-permisos { margin: 0 0 1rem; padding: 0.5rem 0.75rem; }
.demo-check { margin-right: 1rem; font-size: 0.9rem; }
</style>
