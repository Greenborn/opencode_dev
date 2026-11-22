<template>
  <div class="demo container py-3">
    <header class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h4 mb-0">Demo CRUD (@greenborn/vue-greenborn-crud)</h1>
      <div v-if="usuario" class="d-flex align-items-center gap-2">
        <span class="small">
          <strong>{{ usuario.username }}</strong> ({{ usuario.email }})
        </span>
        <button class="btn btn-sm btn-outline-secondary" type="button" @click="cerrarSesion">Salir</button>
      </div>
    </header>

    <section v-if="usuario === null" class="card p-3 login">
      <h2 class="h6">Ingresar con token de prueba</h2>
      <form @submit.prevent="ingresar">
        <label class="form-label small" for="token">Token</label>
        <input id="token" v-model="tokenIngresado" class="form-control mb-2" autocomplete="off" />
        <p class="small text-muted mb-2">
          Tokens: <code>token-admin-demo</code> (todos los permisos) y
          <code>token-sin-permisos-demo</code> (sin permisos).
        </p>
        <button class="btn btn-primary btn-sm" type="submit" :disabled="cargando">Ingresar</button>
      </form>
    </section>

    <CrudModulo
      v-else
      recurso="productos"
      endpoint="/api/productos"
      :http="http"
      :permisos="usuario.permisos"
      titulo="Productos"
      :elemento="{ singular: 'Producto', gender: 'M' }"
    />

    <ModalContainer />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { CrudModulo } from '@greenborn/vue-greenborn-crud'
import { ModalContainer, useModal } from '@greenborn/vue-greenborn-modal-manager'
import { http, loginConToken, guardarToken, obtenerToken, borrarToken } from './api.js'

const { mostrar_alerta } = useModal()
const usuario = ref(null)
const tokenIngresado = ref('')
const cargando = ref(false)

async function cargarSesion(token) {
  cargando.value = true
  try {
    usuario.value = await loginConToken(token)
    guardarToken(token)
  } catch (err) {
    console.error('[crud-demo] login fallido:', err)
    borrarToken()
    usuario.value = null
    const mensaje = err?.response?.data?.message ?? 'No se pudo iniciar sesión'
    mostrar_alerta(mensaje)
  } finally {
    cargando.value = false
  }
}

function ingresar() {
  const token = tokenIngresado.value.trim()
  if (token === '') {
    mostrar_alerta('Ingresá un token')
    return
  }
  cargarSesion(token)
}

function cerrarSesion() {
  borrarToken()
  usuario.value = null
  tokenIngresado.value = ''
}

// Restaura la sesión si quedó un token guardado (conveniencia por navegador).
const guardado = obtenerToken()
if (guardado !== null) {
  cargarSesion(guardado)
}
</script>

<style>
.demo { max-width: 1000px; }
.login { max-width: 420px; }
</style>
