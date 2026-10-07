import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ToastService } from './core/toast.service';
import { ORG, PROFILE } from './core/profile';
import { Icon } from './shared/icon';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  template: `
    <header class="top">
      <div class="wrap bar">
        <a routerLink="/" class="brand" (click)="menu.set(false)" [attr.aria-label]="org.name + ', home'">
          <span class="seal" aria-hidden="true">ALC</span>
          <span class="brand-text">
            <strong>{{ org.name }}</strong>
            <small>{{ org.tagline }}</small>
          </span>
        </a>

        <div class="right">
          <a class="wa" [href]="org.whatsapp" target="_blank" rel="noopener" aria-label="Follow the ALC WhatsApp channel" title="WhatsApp channel">
            <app-icon name="whatsapp" [size]="20" />
          </a>
          <button class="burger" type="button" [attr.aria-expanded]="menu()" aria-label="Menu" (click)="menu.set(!menu())">
            <span></span><span></span><span></span>
          </button>
          <nav [class.open]="menu()" (click)="menu.set(false)">
            <a routerLink="/join" routerLinkActive="on">Join</a>
            <a routerLink="/messages" routerLinkActive="on">{{ auth.member() ? 'My messages' : 'Write to ' + first }}</a>
            @if (auth.isAdmin()) {
              <a routerLink="/admin" routerLinkActive="on">Admin</a>
            }
            @if (auth.member()) {
              <button class="btn btn-ghost btn-sm" type="button" (click)="signOut()">Sign out</button>
            } @else {
              <a class="btn btn-primary btn-sm" routerLink="/login">Sign in</a>
            }
          </nav>
        </div>
      </div>
    </header>

    <main>
      <router-outlet />
    </main>

    <footer class="foot">
      <div class="wrap foot-grid">
        <div class="foot-brand">
          <strong>{{ org.name }}</strong>
          <span class="muted">{{ org.principle.join(' · ') }}</span>
          <a class="mail" [href]="'mailto:' + org.email">{{ org.email }}</a>
        </div>
        <div class="foot-col">
          <span class="label">The Collective</span>
          <div class="icons">
            <a [href]="org.whatsapp" target="_blank" rel="noopener" aria-label="ALC on WhatsApp" title="WhatsApp channel"><app-icon name="whatsapp" /></a>
            <a [href]="org.instagram" target="_blank" rel="noopener" aria-label="ALC on Instagram" title="Instagram @alc.advocates"><app-icon name="instagram" /></a>
          </div>
        </div>
        <div class="foot-col">
          <span class="label">{{ p.name }}</span>
          <div class="icons">
            <a [href]="p.social.linkedin" target="_blank" rel="noopener" aria-label="LinkedIn" title="LinkedIn"><app-icon name="linkedin" /></a>
            <a [href]="p.social.x" target="_blank" rel="noopener" aria-label="X" title="X"><app-icon name="x" /></a>
            <a [href]="p.social.instagram" target="_blank" rel="noopener" aria-label="Instagram" title="Instagram"><app-icon name="instagram" /></a>
            <a [href]="p.social.facebook" target="_blank" rel="noopener" aria-label="Facebook" title="Facebook"><app-icon name="facebook" /></a>
            <a [href]="p.social.utl" target="_blank" rel="noopener" aria-label="Community profile on Unify the Lit" title="Community profile on Unify the Lit"><app-icon name="community" /></a>
          </div>
        </div>
      </div>
      <div class="wrap legal muted">&copy; {{ year }} {{ org.name }}</div>
    </footer>

    @if (toast.message(); as msg) {
      <div class="toast" role="status">{{ msg }}</div>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    main { flex: 1; }
    .top { position: sticky; top: 0; z-index: 20; background: #fff; border-bottom: 1px solid #000; }
    .bar { display: flex; align-items: center; justify-content: space-between; height: 68px; gap: 12px; }
    .brand { display: flex; align-items: center; gap: 12px; text-decoration: none; color: #000; min-width: 0; }
    .seal { width: 42px; height: 42px; flex: none; border: 2px solid #000; border-radius: 50%; display: grid; place-items: center; font: 700 .7rem var(--serif); letter-spacing: .1em; }
    .brand-text { display: flex; flex-direction: column; line-height: 1.15; min-width: 0; }
    .brand-text strong { font-family: var(--serif); font-size: 1.05rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .brand-text small { color: var(--muted); font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; }
    .right { display: flex; align-items: center; gap: 14px; flex: none; }
    .wa { width: 38px; height: 38px; display: grid; place-items: center; border: 1px solid #000; border-radius: 50%; color: #000; }
    .wa:hover { background: #000; color: #fff; }
    nav { display: flex; align-items: center; gap: 22px; }
    nav a:not(.btn) { color: #000; text-decoration: none; font-weight: 500; font-size: .95rem; padding: 4px 0; border-bottom: 1px solid transparent; }
    nav a.on:not(.btn) { border-bottom-color: #000; }
    .burger { display: none; background: none; border: 0; padding: 8px; cursor: pointer; }
    .burger span { display: block; width: 22px; height: 2px; background: #000; margin: 4px 0; }
    .foot { border-top: 1px solid #000; margin-top: 80px; padding-top: 36px; }
    .foot-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 28px; }
    .foot-brand { display: grid; gap: 4px; }
    .foot-brand strong { font: 600 1.1rem var(--serif); }
    .mail { color: #000; overflow-wrap: anywhere; }
    .foot-col { display: grid; gap: 10px; align-content: start; }
    .label { font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
    .icons { display: flex; flex-wrap: wrap; gap: 8px; }
    .icons a { width: 40px; height: 40px; display: grid; place-items: center; border: 1px solid var(--line-strong); border-radius: 50%; color: #000; }
    .icons a:hover { background: #000; color: #fff; border-color: #000; }
    .legal { font-size: .8rem; padding: 28px 20px 32px; }
    .toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); width: max-content; max-width: calc(100vw - 32px); background: #000; color: #fff; padding: 12px 18px; border-radius: 2px; font-size: .92rem; z-index: 50; text-align: center; }
    @media (max-width: 860px) {
      .burger { display: block; }
      nav { display: none; position: absolute; top: 68px; left: 0; right: 0; flex-direction: column; align-items: stretch; gap: 0; background: #fff; border-bottom: 1px solid #000; padding: 4px 20px 16px; }
      nav.open { display: flex; }
      nav a:not(.btn) { padding: 14px 0; border-bottom: 1px solid var(--line); }
      nav a.on:not(.btn) { border-bottom-color: var(--line); font-weight: 700; }
      nav .btn { margin-top: 14px; }
      .foot-grid { grid-template-columns: 1fr; gap: 24px; }
    }
    @media (max-width: 520px) {
      .brand-text small { display: none; }
      .brand-text strong { font-size: .95rem; white-space: normal; line-height: 1.15; }
      .seal { width: 36px; height: 36px; font-size: .62rem; }
      .right { gap: 6px; }
      .wa { width: 34px; height: 34px; }
    }
  `,
})
export class App {
  protected auth = inject(AuthService);
  protected toast = inject(ToastService);
  private router = inject(Router);
  protected menu = signal(false);
  protected org = ORG;
  protected p = PROFILE;
  protected first = PROFILE.first;
  protected year = new Date().getFullYear();

  async signOut() {
    await this.auth.signOut();
    this.toast.show('You are signed out.');
    this.router.navigateByUrl('/');
  }
}
