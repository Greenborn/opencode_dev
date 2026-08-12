import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { SSOAuthService } from '../services/sso-auth.service';

@Injectable({
  providedIn: 'root',
})
export class SSOAuthGuard implements CanActivate {
  constructor(private router: Router, private ssoAuth: SSOAuthService) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
  ): boolean | UrlTree {
    if (this.ssoAuth.isSSOSession()) {
      return true;
    }
    return this.router.createUrlTree(['/login']);
  }
}
