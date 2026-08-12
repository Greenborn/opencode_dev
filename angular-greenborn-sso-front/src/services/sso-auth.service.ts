import { Injectable, Inject, Optional } from '@angular/core';
import { Router } from '@angular/router';
import {
  SSOConfig,
  SSO_CONFIG,
  normalizeConfig,
} from '../config/sso-config';
import {
  SSO_TOKEN_KEY,
  SSO_USER_KEY,
  SSO_REDIRECT_URL_KEY,
  SSO_CLIENT_UNIQUE_ID,
  generateUniqueId,
  safeGet,
  safeSet,
} from '../core/keys';
import {
  SSOCallbackResult,
  SSOLoginResponse,
  SSOProfileResponse,
  SSOVerifyResult,
  SSOVerifyResponse,
  SSOUser,
} from '../models/sso.model';

@Injectable({
  providedIn: 'root',
})
export class SSOAuthService {
  private readonly _config: SSOConfig;

  constructor(
    @Optional() @Inject(SSO_CONFIG) config: SSOConfig | null,
    private router: Router
  ) {
    this._config = normalizeConfig(config ?? {});
  }

  get config(): SSOConfig {
    return this._config;
  }

  login(): void {
    const uniqueId = this.getUniqueId();
    const currentUrl = this.router.url;
    if (currentUrl && currentUrl !== '/login' && currentUrl !== '/login-redirect') {
      safeSet(SSO_REDIRECT_URL_KEY, currentUrl);
    }

    const params = new URLSearchParams({
      url_redireccion_app: window.location.origin + this._config.ssoRedirect,
      unique_id: uniqueId,
    });

    window.location.href = `${this._config.ssoBaseUrl}/auth/google?${params}`;
  }

  async handleCallback(temporalToken: string, uniqueId: string): Promise<SSOCallbackResult> {
    if (this.getUniqueId() !== uniqueId) {
      throw new Error('Unique ID no coincide');
    }

    const response = await fetch(`${this._config.ssoBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: temporalToken }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('SSO handleCallback: Error al obtener bearer token', response.status, errText);
      throw new Error('Error al obtener bearer token');
    }

    const data: { data: SSOLoginResponse } = await response.json();
    const bearerToken = data.data?.bearer_token;
    const ssoEmail = data.data?.user?.email;

    if (!bearerToken) {
      throw new Error('No se recibió bearer token del servidor SSO');
    }

    safeSet(SSO_TOKEN_KEY, bearerToken);
    safeSet(SSO_USER_KEY, JSON.stringify(data.data?.user || {}));
    this.setLocalToken(bearerToken);

    let profileData: SSOProfileResponse | null = null;
    if (this._config.nodeApiBaseUrl) {
      const profileResponse = await fetch(
        `${this._config.nodeApiBaseUrl}user/sso-profile?unique_id=${uniqueId}`,
        { headers: { Authorization: `Bearer ${bearerToken}` } }
      );

      if (!profileResponse.ok) {
        this.clearSession();
        throw new Error('Error al verificar perfil local');
      }
      profileData = await profileResponse.json();
    }

    if (profileData && profileData.exists && profileData.user) {
      this.setLocalUserId(profileData.user.id);
      this.setLocalUsername(profileData.user.username);
      return {
        exists: true,
        localUser: {
          id: profileData.user.id,
          username: profileData.user.username,
          email: profileData.user.email,
          role_id: profileData.user.role_id,
        },
        ssoEmail,
        bearer_token: bearerToken,
      };
    }

    return {
      exists: false,
      ssoEmail,
      bearer_token: bearerToken,
    };
  }

  async verifySession(): Promise<SSOVerifyResult> {
    const token = this.getToken();
    if (!token) {
      return { authenticated: false };
    }

    try {
      const response = await fetch(
        `${this._config.ssoBaseUrl}/auth/verify?unique_id=${this.getUniqueId()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        let body: any = {};
        try {
          body = await response.json();
        } catch {
          body = {};
        }
        if (body.require_reauth) {
          this.clearSession();
          this.setLocalToken(null);
          this.notifySessionExpired();
          return { authenticated: false, requireReauth: true };
        }
        throw new Error('Token inválido');
      }

      const newToken = response.headers.get('X-New-Token');
      if (newToken) {
        this.setLocalToken(newToken);
        safeSet(SSO_TOKEN_KEY, newToken);
      }

      const result: { data: SSOVerifyResponse['data'] } = await response.json();
      safeSet(SSO_USER_KEY, JSON.stringify(result.data.user || {}));

      return {
        authenticated: true,
        user: result.data.user,
        extended: result.data.extended,
      };
    } catch (error) {
      this.clearSession();
      this.setLocalToken(null);
      return { authenticated: false };
    }
  }

  async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await fetch(`${this._config.ssoBaseUrl}/auth/logout?unique_id=${this.getUniqueId()}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.error('Error al cerrar sesión SSO:', error);
      }
    }
    this.clearSession();
    this.setLocalToken(null);
  }

  getToken(): string | null {
    return safeGet(SSO_TOKEN_KEY);
  }

  getUser(): SSOUser | null {
    const userData = safeGet(SSO_USER_KEY);
    if (!userData) {
      return null;
    }
    try {
      return JSON.parse(userData);
    } catch {
      return null;
    }
  }

  isSSOSession(): boolean {
    return safeGet(SSO_TOKEN_KEY) !== null;
  }

  getUniqueId(): string {
    let id = safeGet(SSO_CLIENT_UNIQUE_ID);
    if (!id) {
      id = generateUniqueId();
      safeSet(SSO_CLIENT_UNIQUE_ID, id);
    }
    return id;
  }

  getAndClearRedirectUrl(): string | null {
    const url = safeGet(SSO_REDIRECT_URL_KEY);
    safeSet(SSO_REDIRECT_URL_KEY, null);
    return url;
  }

  getLocalToken(): string | null {
    return safeGet(this._config.tokenKey);
  }

  setLocalToken(token: string | null): void {
    safeSet(this._config.tokenKey, token);
  }

  getLocalUserId(): number {
    return parseInt(safeGet(`${this._config.appName}userId`) ?? '', 10) || null;
  }

  setLocalUserId(id: number): void {
    safeSet(`${this._config.appName}userId`, id != null ? String(id) : null);
  }

  setLocalUsername(name: string): void {
    safeSet(`${this._config.appName}username`, name);
  }

  clearSession(): void {
    safeSet(SSO_TOKEN_KEY, null);
    safeSet(SSO_USER_KEY, null);
    safeSet(SSO_REDIRECT_URL_KEY, null);
    safeSet(SSO_CLIENT_UNIQUE_ID, null);
  }

  private notifySessionExpired(): void {
    if (this._config.onSessionExpired) {
      this._config.onSessionExpired();
    }
  }
}
