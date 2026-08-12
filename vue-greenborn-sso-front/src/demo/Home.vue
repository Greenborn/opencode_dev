<template>
  <div>
    <h1>vue-greenborn-sso-front — demo</h1>
    <p>
      Paquete de cliente SSO para Vue 3. Usa el servidor de autenticación de Greenborn.
    </p>

    <section v-if="sso.isAuthenticated.value">
      <p>✅ Sesión SSO activa.</p>
      <pre class="user-box">{{ sso.currentUser.value }}</pre>
      <h4>RBAC</h4>
      <p>
        Roles: <code>{{ sso.roles.value.join(', ') || '—' }}</code><br />
        Permisos: <code>{{ sso.permisos.value.join(', ') || '—' }}</code><br />
        esAdmin: <code>{{ sso.esAdmin.value }}</code><br />
        tienePermiso('proyectos.ver'): <code>{{ sso.tienePermiso('proyectos.ver') }}</code>
      </p>
      <button @click="refreshProfile">Refrescar perfil (fetchMe)</button>
      <button @click="logout">Cerrar sesión</button>
    </section>

    <section v-else>
      <p>No hay sesión activa.</p>
      <button @click="loginWithGoogle">Iniciar sesión con Google (SSO)</button>

      <h4>Login local (opcional)</h4>
      <form @submit.prevent="submitLocalLogin">
        <input v-model="localUsername" placeholder="Usuario" />
        <input v-model="localPassword" type="password" placeholder="Contraseña" />
        <button type="submit">Entrar (usuario/contraseña)</button>
      </form>
      <p v-if="localError" class="error">{{ localError }}</p>
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
const localUsername = ref('')
const localPassword = ref('')
const localError = ref(null)

function loginWithGoogle() {
  sso.login()
}

async function submitLocalLogin() {
  localError.value = null
  try {
    await sso.loginLocal(localUsername.value, localPassword.value)
  } catch (e) {
    localError.value = e.message
  }
}

async function logout() {
  await sso.logout()
}

async function refreshProfile() {
  await sso.fetchMe()
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
.error {
  color: #b91c1c;
}
</style>
