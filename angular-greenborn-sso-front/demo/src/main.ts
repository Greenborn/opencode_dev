import { bootstrapApplication } from '@angular/platform-browser';
import { provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation, Routes } from '@angular/router';
import { provideSso, installSsoAxiosInterceptors } from 'angular-greenborn-sso-front';
import { AppComponent } from './app/app.component';
import { HomeComponent } from './app/home.component';
import { CallbackComponent } from './app/callback.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: HomeComponent },
  { path: 'login-redirect', component: CallbackComponent },
];

const SSO_CONFIG = {
  ssoBaseUrl: 'https://auth.greenborn.com.ar',
  ssoRedirect: '/#/login-redirect',
  nodeApiBaseUrl: 'https://gfc.api2.greenborn.com.ar/api/',
  appName: 'demo_sso-',
  wsUrl: 'http://localhost:5175',
  wsPath: '/socket.io',
};

installSsoAxiosInterceptors(SSO_CONFIG);

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    provideRouter(routes, withHashLocation()),
    provideSso(SSO_CONFIG),
  ],
}).catch((err) => console.error(err));
