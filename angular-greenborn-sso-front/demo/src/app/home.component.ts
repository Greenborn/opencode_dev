import { Component, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  SSOAuthService,
  SSOSocketService,
  RoleService,
} from 'angular-greenborn-sso-front';

@Component({
  standalone: true,
  imports: [RouterModule],
  selector: 'app-home',
  template: `
    <div class="card">
      <h2>angular-greenborn-sso-front</h2>
      @if (ssoAuth.isSSOSession()) {
        <p><strong>Token:</strong> {{ ssoAuth.getToken() }}</p>
        <p><strong>Unique ID:</strong> {{ ssoAuth.getUniqueId() }}</p>
        <p><strong>User:</strong> {{ user | json }}</p>
        <p><strong>Rol:</strong> {{ role }}</p>
        <p><strong>Socket conectado:</strong> {{ connected }}</p>
        <button class="btn btn-secondary" (click)="verify()">Verificar sesión</button>
        <button class="btn btn-primary" (click)="logout()">Cerrar sesión</button>
      } @else {
        <p>No hay sesión activa.</p>
        <button class="btn btn-primary" (click)="login()">Login con Google</button>
      }
    </div>
  `,
})
export class HomeComponent implements OnDestroy {
  user: any = null;
  connected = false;
  role = '';
  private subs: Subscription[] = [];

  constructor(
    public ssoAuth: SSOAuthService,
    private socket: SSOSocketService,
    private roleService: RoleService
  ) {
    this.user = this.ssoAuth.getUser();
    if (this.user) {
      this.role = this.roleService.roleName(this.user.role_id);
    }
    this.subs.push(this.socket.connected$.subscribe((c) => (this.connected = c)));
  }

  login(): void {
    this.ssoAuth.login();
  }

  async verify(): Promise<void> {
    const res = await this.ssoAuth.verifySession();
    console.log('verifySession', res);
    this.user = this.ssoAuth.getUser();
    if (this.user) {
      this.role = this.roleService.roleName(this.user.role_id);
    }
  }

  async logout(): Promise<void> {
    await this.ssoAuth.logout();
    this.user = null;
    this.role = '';
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
