import axios, { AxiosInstance } from 'axios';
import { SSOConfig, normalizeConfig } from '../config/sso-config';
import {
  SSO_TOKEN_KEY,
  SSO_CLIENT_UNIQUE_ID,
  SSO_USER_KEY,
  SSO_REDIRECT_URL_KEY,
  safeGet,
  safeSet,
} from '../core/keys';

export interface SsoAxiosInterceptors {
  install(): void;
  isInstalled(): boolean;
  clearSession(): void;
}

const isLoginUrl = (url: string) => url.endsWith('/auth/login') || url.includes('/auth/login?');

export function installSsoAxiosInterceptors(
  config: Partial<SSOConfig>,
  instance: AxiosInstance = axios
): SsoAxiosInterceptors {
  const cfg = normalizeConfig(config);
  const apiBase = cfg.nodeApiBaseUrl || '';
  let installed = false;

  function applyNewToken(token: string): void {
    safeSet(SSO_TOKEN_KEY, token);
    safeSet(cfg.tokenKey, token);
  }

  function clearSession(): void {
    safeSet(SSO_TOKEN_KEY, null);
    safeSet(SSO_USER_KEY, null);
    safeSet(SSO_REDIRECT_URL_KEY, null);
    safeSet(SSO_CLIENT_UNIQUE_ID, null);
    safeSet(cfg.tokenKey, null);
  }

  function requestInterceptor(req: any): any {
    if (apiBase && req.url?.startsWith(apiBase)) {
      const token = safeGet(cfg.tokenKey) || safeGet(SSO_TOKEN_KEY);
      if (token) {
        req.headers.Authorization = 'Bearer ' + token;
      }
      const uniqueId = safeGet(SSO_CLIENT_UNIQUE_ID);
      if (uniqueId) {
        const separator = req.url.includes('?') ? '&' : '?';
        req.url += separator + 'unique_id=' + encodeURIComponent(uniqueId);
      }
    }
    return req;
  }

  function responseInterceptor(response: any): any {
    if (response.headers?.['x-new-token']) {
      applyNewToken(response.headers['x-new-token']);
    }
    return response;
  }

  function errorInterceptor(error: any): Promise<any> {
    const url = error.config?.url || '';
    if (apiBase && url.startsWith(apiBase) && !isLoginUrl(url)) {
      if (error.response?.status === 401) {
        clearSession();
        const body = error.response.data || {};
        if (body.require_reauth && cfg.onSessionExpired) {
          cfg.onSessionExpired();
        } else {
          try {
            window.location.hash = '#/login';
          } catch {
            /* ignore */
          }
        }
      }
    }
    return Promise.reject(error);
  }

  return {
    install(): void {
      if (installed) {
        return;
      }
      instance.interceptors.request.use(requestInterceptor);
      instance.interceptors.response.use(responseInterceptor, errorInterceptor);
      installed = true;
    },
    isInstalled(): boolean {
      return installed;
    },
    clearSession(): void {
      clearSession();
    },
  };
}
