import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SSOAuthService } from '../../services/sso-auth.service';
import { SSOCallbackResult } from '../../models/sso.model';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'gb-sso-callback',
  templateUrl: './sso-callback.component.html',
  styleUrls: ['./sso-callback.component.scss'],
})
export class SsoCallbackComponent implements OnInit, OnDestroy {
  @Input() registerPath = '/registro';
  @Input() fallbackPath = '/';
  @Input() autoRedirect = true;

  @Output() success = new EventEmitter<SSOCallbackResult>();
  @Output() error = new EventEmitter<Error>();
  @Output() noParams = new EventEmitter<void>();

  loading = true;
  errorMessage = '';
  result: SSOCallbackResult | null = null;
  private sub: Subscription | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private ssoAuth: SSOAuthService
  ) {}

  ngOnInit(): void {
    this.sub = this.route.queryParams.subscribe((params) => {
      const token = params['token'];
      const uniqueId = params['unique_id'];

      if (token && uniqueId) {
        this.handleCallback(token, uniqueId);
      } else {
        this.loading = false;
        this.errorMessage = 'Parámetros de autenticación no recibidos.';
        this.noParams.emit();
        if (this.autoRedirect) {
          setTimeout(() => this.router.navigateByUrl(`/login?error=missing_params`), 3000);
        }
      }
    });
  }

  private handleCallback(token: string, uniqueId: string): void {
    this.ssoAuth
      .handleCallback(token, uniqueId)
      .then((result) => {
        this.loading = false;
        this.result = result;
        this.success.emit(result);
        if (this.autoRedirect) {
          if (result.exists) {
            const redirectUrl = this.ssoAuth.getAndClearRedirectUrl();
            this.router.navigateByUrl(redirectUrl || this.fallbackPath);
          } else {
            this.router.navigateByUrl(
              `${this.registerPath}?email=${encodeURIComponent(result.ssoEmail)}`
            );
          }
        }
      })
      .catch((err: Error) => {
        this.loading = false;
        this.errorMessage = 'Error al autenticar. Intenta nuevamente.';
        this.error.emit(err);
        if (this.autoRedirect) {
          setTimeout(() => this.router.navigateByUrl('/login?error=auth_failed'), 3000);
        }
      });
  }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
