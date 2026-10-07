import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, authErrorMessage } from '../core/auth.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-sign-in-panel',
  imports: [FormsModule],
  template: `
    <button type="button" class="btn btn-ghost btn-block" (click)="google()" [disabled]="busy()">
      <svg class="google-mark" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
      </svg>
      Continue with Google
    </button>

    <div class="divider">or use email</div>

    <form class="email" (ngSubmit)="email()" #f="ngForm">
      <div class="field">
        <label for="si-email">Email</label>
        <input id="si-email" class="input" type="email" name="email" [(ngModel)]="emailValue" required autocomplete="email" />
      </div>
      <div class="field">
        <label for="si-pass">Password</label>
        <input id="si-pass" class="input" type="password" name="password" [(ngModel)]="password" required minlength="8"
          [attr.autocomplete]="mode() === 'create' ? 'new-password' : 'current-password'" />
        @if (mode() === 'create') { <span class="hint">At least 8 characters.</span> }
      </div>
      <button class="btn btn-primary btn-block" type="submit" [disabled]="busy() || f.invalid">
        {{ mode() === 'create' ? 'Create account' : 'Sign in' }}
      </button>
    </form>

    @if (error()) { <p class="error">{{ error() }}</p> }

    <div class="switch">
      @if (mode() === 'signin') {
        <span class="muted">New here?</span>
        <button type="button" class="btn btn-link" (click)="mode.set('create')">Create an account</button>
        <span class="dot" aria-hidden="true"></span>
        <button type="button" class="btn btn-link" (click)="reset()">Forgot password</button>
      } @else {
        <span class="muted">Already have an account?</span>
        <button type="button" class="btn btn-link" (click)="mode.set('signin')">Sign in</button>
      }
    </div>
  `,
  styles: `
    :host { display: grid; gap: 16px; }
    .email { display: grid; gap: 14px; }
    .error { margin: 0; }
    .switch { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: .9rem; }
    .dot { width: 3px; height: 3px; border-radius: 50%; background: var(--muted); }
  `,
})
export class SignInPanel {
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  readonly startIn = input<'signin' | 'create'>('signin');
  readonly done = output<void>();

  protected mode = signal<'signin' | 'create'>('signin');
  protected busy = signal(false);
  protected error = signal<string | null>(null);
  protected emailValue = '';
  protected password = '';

  ngOnInit() {
    this.mode.set(this.startIn());
  }

  protected async google() {
    await this.run(() => this.auth.google());
  }

  protected async email() {
    const e = this.emailValue.trim();
    await this.run(() => (this.mode() === 'create' ? this.auth.createAccount(e, this.password) : this.auth.emailSignIn(e, this.password)));
  }

  protected async reset() {
    const e = this.emailValue.trim();
    if (!e) {
      this.error.set('Type your email above first, then tap Forgot password.');
      return;
    }
    await this.run(async () => {
      await this.auth.resetPassword(e);
      this.error.set(null);
      this.toast.show('We have emailed you a link to reset your password.');
    }, false);
  }

  private async run(fn: () => Promise<void>, emit = true) {
    this.busy.set(true);
    this.error.set(null);
    try {
      await fn();
      if (emit) this.done.emit();
    } catch (e) {
      this.error.set(authErrorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
