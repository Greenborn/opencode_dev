import { Component } from '@angular/core';
import { SsoCallbackComponent } from 'angular-greenborn-sso-front';

@Component({
  standalone: true,
  imports: [SsoCallbackComponent],
  selector: 'app-callback',
  template: `
    <div class="card">
      <h2>Callback SSO</h2>
      <gb-sso-callback
        registerPath="/login"
        fallbackPath="/"
        (success)="onSuccess($event)"
        (error)="onError($event)"
      ></gb-sso-callback>
    </div>
  `,
})
export class CallbackComponent {
  onSuccess(result: any): void {
    console.log('SSO success', result);
  }

  onError(err: Error): void {
    console.error('SSO error', err);
  }
}
