export { SSOConfig, SSO_CONFIG, provideSso, normalizeConfig } from './config/sso-config';
export {
  SSO_TOKEN_KEY,
  SSO_USER_KEY,
  SSO_REDIRECT_URL_KEY,
  SSO_CLIENT_UNIQUE_ID,
  generateUniqueId,
  safeGet,
  safeSet,
  safeRemove,
} from './core/keys';
export {
  createSocketClient,
  SocketClient,
  SocketClientOptions,
  SocketError,
  SocketEvent,
  EventHandler,
} from './core/socket-client';
export { SSOAuthService } from './services/sso-auth.service';
export { SSOSocketService } from './services/sso-socket.service';
export { RoleService } from './services/role.service';
export { SSOAuthGuard } from './guards/sso-auth.guard';
export {
  installSsoAxiosInterceptors,
  SsoAxiosInterceptors,
} from './interceptor/sso-axios';
export {
  SSOCallbackParams,
  SSOUser,
  SSOLoginResponse,
  SSOVerifyResponse,
  SSOProfileResponse,
  SSOCallbackResult,
  SSOVerifyResult,
  SSOSessionState,
} from './models/sso.model';
export { SsoCallbackComponent } from './components/sso-callback/sso-callback.component';
