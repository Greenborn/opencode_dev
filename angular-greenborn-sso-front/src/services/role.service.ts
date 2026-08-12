import { Injectable } from '@angular/core';
import { SSOUser } from '../models/sso.model';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  isAdmin(u: SSOUser): boolean {
    return u?.role_id === 1;
  }

  esDelegado(u: SSOUser): boolean {
    return u?.role_id === 2;
  }

  esConcursante(u: SSOUser): boolean {
    return u?.role_id === 3;
  }

  esJuez(u: SSOUser): boolean {
    return u?.role_id === 4;
  }

  isNotPrivilegies(u: SSOUser): boolean {
    return u?.role_id === 3 || u?.role_id > 4;
  }

  roleName(role_id: number): string {
    switch (role_id) {
      case 1:
        return 'Administrador';
      case 2:
        return 'Delegado';
      case 3:
        return 'Concursante';
      case 4:
        return 'Juez';
      default:
        return 'Usuario';
    }
  }
}
