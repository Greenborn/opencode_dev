import SsoCallback from './components/SsoCallback.vue'
import { useSsoAuth, installSso } from './composables/useSsoAuth.js'
import { createSsoClient } from './core/ssoClient.js'
import {
  SSO_TOKEN_KEY,
  SSO_USER_KEY,
  SSO_REDIRECT_URL_KEY,
  SSO_CLIENT_UNIQUE_ID,
} from './core/keys.js'

export {
  SsoCallback,
  SsoCallback as default,
  useSsoAuth,
  installSso,
  createSsoClient,
  SSO_TOKEN_KEY,
  SSO_USER_KEY,
  SSO_REDIRECT_URL_KEY,
  SSO_CLIENT_UNIQUE_ID,
}
