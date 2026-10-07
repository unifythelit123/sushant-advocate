import { Component, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { SignInPanel } from '../shared/sign-in-panel';

@Component({
  selector: 'app-login',
  imports: [SignInPanel],
  template: `
    <section class="wrap page">
      <div class="card box">
        <p class="eyebrow">Your account</p>
        <h1>Sign in</h1>
        <p class="muted">See your applications and your private conversation with Sushant.</p>
        <app-sign-in-panel (done)="go()" />
      </div>
    </section>
  `,
  styles: `
    .page { max-width: 460px; padding-top: 56px; }
    .box { padding: 32px; display: grid; gap: 6px; }
    h1 { font-size: 1.8rem; margin: 4px 0 0; }
    .box > p.muted { margin: 0 0 16px; }
  `,
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  readonly next = input<string>();

  constructor() {
    effect(() => {
      if (this.auth.member()) this.go();
    });
  }

  protected go() {
    const target = this.next();
    const safe = target && target.startsWith('/') && !target.startsWith('//') ? target : null;
    this.router.navigateByUrl(safe ?? (this.auth.isAdmin() ? '/console' : '/messages'));
  }
}
