<template>
  <main class="demo">
    <h1 data-reporte="demo.titulo">Demo · reporte contextual</h1>
    <p>Mantenga Alt y haga clic derecho sobre cualquier elemento para reportarlo. El clic derecho sin Alt abre el menú nativo.</p>

    <section data-reporte="demo.seccion-botones">
      <button type="button" class="demo-boton">Botón de prueba</button>
      <button type="button" class="demo-boton" data-reporte="demo.boton-guardar">Guardar (con etiqueta)</button>
    </section>

    <ReporteContextual :api-base-url="apiBaseUrl" :version="version" />
    <ModalContainer />
  </main>
</template>

<script setup>
import { ModalContainer } from 'vue-greenborn-modal-manager'
import 'vue-greenborn-modal-manager/style.css'
import { ReporteContextual } from '../src/index.js'

// Variables tomadas de .env (ver .env.example). El paquete no maneja credenciales.
const apiBaseUrl = import.meta.env.VITE_SGI_API_URL
const version = import.meta.env.VITE_REPORTE_VERSION

if (!apiBaseUrl) {
  console.log('[demo] Falta VITE_SGI_API_URL en .env')
}
</script>

<style>
body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; }
.demo-boton { margin: 6px; padding: 8px 14px; }
</style>
