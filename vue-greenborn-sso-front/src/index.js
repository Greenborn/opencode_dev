import SsoCallback from './components/SsoCallback.vue'
import { useSsoAuth, installSso } from './composables/useSsoAuth.js'
import { useSsoSocket } from './composables/useSsoSocket.js'
import { createSsoClient } from './core/ssoClient.js'
import { createSocketClient } from './core/socketClient.js'
import {
  SSO_TOKEN_KEY,
  SSO_USER_KEY,
  SSO_REDIRECT_URL_KEY,
  SSO_CLIENT_UNIQUE_ID,
  resolveStorageKeys,
} from './core/keys.js'

export {
  SsoCallback,
  SsoCallback as default,
  useSsoAuth,
  installSso,
  useSsoSocket,
  createSsoClient,
  createSocketClient,
  resolveStorageKeys,
  SSO_TOKEN_KEY,
  SSO_USER_KEY,
  SSO_REDIRECT_URL_KEY,
  SSO_CLIENT_UNIQUE_ID,
}
