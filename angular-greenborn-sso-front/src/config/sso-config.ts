import { InjectionToken, Provider, ValueProvider } from '@angular/core';

export interface SSOConfig {
  /** Base del servidor SSO, ej. https://auth.greenborn.com.ar */
  ssoBaseUrl: string;
  /** Ruta de la app que procesa el callback, ej. '/#/login-redirect' (hash) o '/login-redirect' */
  ssoRedirect: string;
  /** Base del API Node local, ej. 'https://.../api/' (para user/sso-profile). Opcional. */
  nodeApiBaseUrl?: string;
  /** Prefijo de clave de token local, ej. 'app_gfc_prod-' (default ''). */
  appName?: string;
  /** Override directo de la clave de token local (default appName + 'token'). */
  tokenKey?: string;
  /** Base del servidor WebSocket (opcional). */
  wsUrl?: string;
  /** Ruta del socket (default '/socket.io'). */
  wsPath?: string;
  /** Callback al expirar la sesión (require_reauth). */
  onSessionExpired?: () => void;
}

export const SSO_CONFIG = new InjectionToken<SSOConfig>('SSO_CONFIG');

export function normalizeConfig(config: Partial<SSOConfig> = {}): SSOConfig {
  const appName = config.appName ?? '';
  return {
    ssoRedirect: '/#/login-redirect',
    wsPath: '/socket.io',
    ...config,
    appName,
    tokenKey: config.tokenKey ?? `${appName}token`,
  };
}

export function provideSso(config: Partial<SSOConfig>): Provider {
  const value: SSOConfig = normalizeConfig(config);
  const provider: ValueProvider = { provide: SSO_CONFIG, useValue: value };
  return provider;
}
