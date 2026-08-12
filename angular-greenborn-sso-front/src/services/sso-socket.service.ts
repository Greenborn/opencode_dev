import { Injectable, Inject, Optional, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SSOConfig, SSO_CONFIG, normalizeConfig } from '../config/sso-config';
import { createSocketClient, SocketClient, EventHandler } from '../core/socket-client';
import { SSOAuthService } from './sso-auth.service';

@Injectable({
  providedIn: 'root',
})
export class SSOSocketService implements OnDestroy {
  private _config: SSOConfig;
  private client: SocketClient | null = null;
  private _connected = new BehaviorSubject<boolean>(false);
  private _error = new BehaviorSubject<any>(null);
  private unsubscribeFns: Array<() => void> = [];

  constructor(
    @Optional() @Inject(SSO_CONFIG) config: SSOConfig | null,
    private ssoAuth: SSOAuthService
  ) {
    this._config = normalizeConfig(config ?? {});
  }

  get connected$(): Observable<boolean> {
    return this._connected.asObservable();
  }

  get socketError$(): Observable<any> {
    return this._error.asObservable();
  }

  get isConnected(): boolean {
    return this.client ? this.client.isConnected : false;
  }

  connect(): void {
    if (!this._config.wsUrl) {
      return;
    }
    if (!this.client) {
      this.client = createSocketClient({
        url: this._config.wsUrl,
        path: this._config.wsPath,
        token: this.ssoAuth.getToken() || '',
        uniqueId: this.ssoAuth.getUniqueId(),
      });
      const unsubConnected = this.client.subscribe((e) => {
        if (e.type === 'connect') {
          this._connected.next(true);
          this._error.next(null);
        } else if (e.type === 'disconnect') {
          this._connected.next(false);
        } else if (e.type === 'error') {
          this._error.next(e.error);
        }
      });
      this.unsubscribeFns.push(unsubConnected);
    }
    this.client.setToken(this.ssoAuth.getToken() || '', this.ssoAuth.getUniqueId());
    this.client.connect();
  }

  disconnect(): void {
    if (this.client) {
      this.client.disconnect();
    }
    this._connected.next(false);
  }

  setToken(newToken: string, newUniqueId: string): void {
    if (this.client) {
      this.client.setToken(newToken, newUniqueId);
    }
  }

  emit(name: string, payload?: any, callback?: (res: any) => void): Promise<any> | void {
    if (!this.client) {
      const err = { success: false, error: 'Socket no configurado' };
      if (callback) {
        callback(err);
        return;
      }
      return Promise.reject(err);
    }
    return this.client.emit(name, payload, callback);
  }

  on(name: string, handler: EventHandler): void {
    if (!this.client) this.connect();
    this.client.on(name, handler);
  }

  off(name: string, handler: EventHandler): void {
    if (this.client) this.client.off(name, handler);
  }

  once(name: string, handler: EventHandler): void {
    if (!this.client) this.connect();
    this.client.once(name, handler);
  }

  ngOnDestroy(): void {
    this.unsubscribeFns.forEach((fn) => fn());
    this.unsubscribeFns = [];
    this.disconnect();
  }
}
