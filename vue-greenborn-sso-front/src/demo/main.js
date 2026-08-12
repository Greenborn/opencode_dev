import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Home from './Home.vue'
import SsoCallbackPage from './SsoCallbackPage.vue'
import { installSso } from '../composables/useSsoAuth.js'

const SSO_CONFIG = {
  ssoBaseUrl: import.meta.env.VITE_SSO_BASE_URL || 'https://auth.greenborn.com.ar',
  ssoRedirect: '/login-redirect',
  nodeApiBaseUrl: import.meta.env.VITE_NODE_API_BASE_URL || 'https://gfc.api2.greenborn.com.ar/api/',
  wsUrl: import.meta.env.VITE_WS_URL || 'http://localhost:5175',
  wsPath: import.meta.env.VITE_WS_PATH || '/socket.io',
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/login-redirect', component: SsoCallbackPage },
  ],
})

const app = createApp(App)

installSso(app, SSO_CONFIG)

app.use(router)
app.mount('#app')
