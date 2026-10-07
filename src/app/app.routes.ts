import { Routes } from '@angular/router';
import { adminGuard, memberGuard } from './core/guards';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home').then((m) => m.HomePage), title: 'Ambedkarite Lawyers Collective' },
  { path: 'join', loadComponent: () => import('./pages/join').then((m) => m.JoinPage), title: 'Join the Collective' },
  { path: 'join/submitted', loadComponent: () => import('./pages/submitted').then((m) => m.SubmittedPage), title: 'Application received' },
  { path: 'login', loadComponent: () => import('./pages/login').then((m) => m.LoginPage), title: 'Sign in' },
  { path: 'messages', canActivate: [memberGuard], loadComponent: () => import('./pages/messages').then((m) => m.MessagesPage), title: 'My messages' },
  { path: 'admin', canActivate: [adminGuard], loadComponent: () => import('./pages/console').then((m) => m.ConsolePage), title: 'Admin' },
  { path: 'console', redirectTo: 'admin' },
  { path: '**', redirectTo: '' },
];
