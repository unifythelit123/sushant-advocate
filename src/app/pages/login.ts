import { Component, afterNextRender, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, authErrorMessage } from '../core/auth.service';
import { SignInPanel } from '../shared/sign-in-panel';
import { PROFILE } from '../core/profile';

@Component({
  selector: 'app-login',
  imports: [SignInPanel, FormsModule],
  template: `
    <section class="wrap page">
      <div class="card box">
        <p class="eyebrow">Your account</p>
        @if (linkMode()) {
          <h1>Finish signing in</h1>
          @if (finishing()) {
            <p class="muted">Signing you in...</p>
          } @else {
            <p class="muted">Confirm the email address the sign in link was sent to.</p>
            <form class="confirm" (ngSubmit)="finishLink()">
              <input class="input" type="email" name="email" [(ngModel)]="linkEmail" required autocomplete="email" />
              <button class="btn btn-primary btn-block" type="submit">Continue</button>
            </form>
          }
          @if (error()) { <p class="error">{{ error() }}</p> }
        } @else {
          <h1>Sign in</h1>
          <p class="muted">See your applications and your private conversation with {{ name }}.</p>
          <app-sign-in-panel (done)="go()" />
        }
      </div>
    </section>
  `,
  styles: `
    .page { max-width: 460px; padding-top: 56px; }
    .box { padding: 32px; display: grid; gap: 6px; }
    h1 { font-size: 1.8rem; margin: 4px 0 0; }
    .box > p.muted { margin: 0 0 16px; }
    .confirm { display: grid; gap: 12px; }
    @media (max-width: 420px) {
      .page { padding-top: 28px; }
      .box { padding: 22px 18px; }
    }
  `,
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  readonly next = input<string>();

  protected name = PROFILE.name;
  protected linkMode = signal(false);
  protected finishing = signal(false);
  protected error = signal<string | null>(null);
  protected linkEmail = '';

  constructor() {
    effect(() => {
      if (this.auth.member() && !this.linkMode()) this.go();
    });
    afterNextRender(() => {
      if (!this.auth.isEmailLink(location.href)) return;
      this.linkMode.set(true);
      this.linkEmail = this.auth.storedLinkEmail();
      if (this.linkEmail) this.finishLink();
    });
  }

  protected async finishLink() {
    const email = this.linkEmail.trim();
    if (!email) return;
    this.finishing.set(true);
    this.error.set(null);
    try {
      await this.auth.completeEmailLink(email, location.href);
      this.router.navigateByUrl('/messages', { replaceUrl: true });
    } catch (e) {
      console.error(e);
      this.error.set(authErrorMessage(e));
      this.finishing.set(false);
    }
  }

  protected go() {
    const target = this.next();
    const safe = target && target.startsWith('/') && !target.startsWith('//') ? target : null;
    this.router.navigateByUrl(safe ?? (this.auth.isAdmin() ? '/admin' : '/messages'));
  }
}
