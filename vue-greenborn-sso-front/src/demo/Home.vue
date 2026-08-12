<template>
  <div>
    <h1>vue-greenborn-sso-front — demo</h1>
    <p>
      Paquete de cliente SSO para Vue 3. Usa el servidor de autenticación de Greenborn.
    </p>

    <section v-if="sso.isAuthenticated.value">
      <p>✅ Sesión SSO activa.</p>
      <pre class="user-box">{{ sso.currentUser.value }}</pre>
      <button @click="logout">Cerrar sesión</button>
    </section>

    <section v-else>
      <p>No hay sesión SSO activa.</p>
      <button @click="loginWithGoogle">Iniciar sesión con Google</button>
    </section>

    <hr class="spacer" />

    <h3>Helpers</h3>
    <p>
      Unique ID: <code>{{ sso.getUniqueId() }}</code><br />
      Token: <code>{{ sso.getToken() ? 'presente ✓' : '—' }}</code>
    </p>

    <h3>Verificar sesión</h3>
    <button @click="runVerify">Verificar</button>
    <pre v-if="verifyResult" class="user-box">{{ verifyResult }}</pre>

    <hr class="spacer" />

    <h3>WebSocket complementario (socket.io)</h3>
    <p>
      Estado: <code>{{ sso.connected.value ? 'conectado ✓' : (sso.socketError.value ? 'error: ' + sso.socketError.value.message : 'desconectado') }}</code><br />
      Se conecta/desconecta automáticamente con la sesión SSO.
    </p>
    <button @click="connectSocket">Conectar</button>
    <button @click="disconnectSocket">Desconectar</button>
    <button @click="runEcho">Emit 'echo' (ack)</button>
    <pre v-if="echoResult" class="user-box">{{ echoResult }}</pre>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSsoAuth } from '../composables/useSsoAuth.js'

const sso = useSsoAuth()
const verifyResult = ref(null)
const echoResult = ref(null)

function loginWithGoogle() {
  sso.login()
}

async function logout() {
  await sso.logout()
}

async function runVerify() {
  verifyResult.value = await sso.verifySession()
}

function connectSocket() {
  sso.connectSocket()
}

function disconnectSocket() {
  sso.disconnectSocket()
}

async function runEcho() {
  const res = await sso.socket.emit('echo', { hola: 'mundo' })
  echoResult.value = res
}
</script>

<style scoped>
.user-box {
  background: #f1f5f9;
  border-radius: 6px;
  padding: 0.75rem;
  white-space: pre-wrap;
  word-break: break-word;
}
.spacer {
  margin: 1.5rem 0;
  border: 0;
  border-top: 1px solid #e2e8f0;
}
</style>
