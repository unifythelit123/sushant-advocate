import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationResult } from 'firebase/auth';
import { AuthService, authErrorMessage, toE164 } from '../core/auth.service';
import { ToastService } from '../core/toast.service';

type Method = 'email' | 'phone';

@Component({
  selector: 'app-sign-in-panel',
  imports: [FormsModule],
  template: `
    <div class="tabs" role="tablist">
      <button type="button" role="tab" [class.on]="method() === 'email'" (click)="switchTo('email')">Email</button>
      <button type="button" role="tab" [class.on]="method() === 'phone'" (click)="switchTo('phone')">Phone</button>
    </div>

    @if (method() === 'email') {
      @if (!usePassword()) {
        @if (linkSent()) {
          <p class="done">A sign in link is on its way to <strong>{{ emailValue }}</strong>. Open it on this device to finish.</p>
          <button type="button" class="btn btn-link" (click)="linkSent.set(false)">Use a different email</button>
        } @else {
          <form class="stack" (ngSubmit)="sendLink()" #lf="ngForm">
            <div class="field">
              <label for="si-email">Email</label>
              <input id="si-email" class="input" type="email" name="email" [(ngModel)]="emailValue" required email autocomplete="email" />
              <span class="hint">Use the email you gave in your application. We send a one time link, no password needed.</span>
            </div>
            <button class="btn btn-primary btn-block" type="submit" [disabled]="busy() || lf.invalid">Email me a sign in link</button>
          </form>
        }
        <button type="button" class="btn btn-link alt" (click)="usePassword.set(true)">Sign in with a password instead</button>
      } @else {
        <form class="stack" (ngSubmit)="passwordSubmit()" #pf="ngForm">
          <div class="field">
            <label for="si-email2">Email</label>
            <input id="si-email2" class="input" type="email" name="email" [(ngModel)]="emailValue" required email autocomplete="email" />
          </div>
          <div class="field">
            <label for="si-pass">Password</label>
            <input id="si-pass" class="input" type="password" name="password" [(ngModel)]="password" required minlength="8"
              [attr.autocomplete]="mode() === 'create' ? 'new-password' : 'current-password'" />
            @if (mode() === 'create') { <span class="hint">At least 8 characters.</span> }
          </div>
          <button class="btn btn-primary btn-block" type="submit" [disabled]="busy() || pf.invalid">
            {{ mode() === 'create' ? 'Create account' : 'Sign in' }}
          </button>
        </form>
        <div class="switch">
          @if (mode() === 'signin') {
            <button type="button" class="btn btn-link" (click)="mode.set('create')">Create an account</button>
            <button type="button" class="btn btn-link" (click)="reset()">Forgot password</button>
          } @else {
            <button type="button" class="btn btn-link" (click)="mode.set('signin')">I already have an account</button>
          }
          <button type="button" class="btn btn-link" (click)="usePassword.set(false)">Use an email link</button>
        </div>
      }
    } @else {
      @if (!confirmation()) {
        <form class="stack" (ngSubmit)="sendCode()">
          <div class="field">
            <label for="si-phone">Mobile number</label>
            <input id="si-phone" class="input" type="tel" name="phone" [(ngModel)]="phoneValue" required autocomplete="tel" placeholder="98765 43210" />
            <span class="hint">Use the number you gave in your application. Indian numbers can be typed without +91.</span>
          </div>
          <button class="btn btn-primary btn-block" type="submit" id="alc-signin-phone" [disabled]="busy() || !phoneValue.trim()">Text me a code</button>
        </form>
      } @else {
        <form class="stack" (ngSubmit)="verify()">
          <div class="field">
            <label for="si-otp">Enter the 6 digit code sent to {{ e164 }}</label>
            <input id="si-otp" class="input otp" name="otp" [(ngModel)]="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" />
          </div>
          <button class="btn btn-primary btn-block" type="submit" [disabled]="busy() || code.length < 6">Verify and sign in</button>
          <button type="button" class="btn btn-link" (click)="confirmation.set(null)">Change number</button>
        </form>
      }
    }

    <div class="divider">or</div>

    <button type="button" class="btn btn-ghost btn-block" (click)="google()" [disabled]="busy()">
      <svg class="google-mark" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
      </svg>
      Continue with Google
    </button>

    @if (error()) { <p class="error">{{ error() }}</p> }
  `,
  styles: `
    :host { display: grid; gap: 16px; }
    .tabs { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #000; }
    .tabs button { border: 0; background: #fff; padding: 10px; font: 600 .92rem var(--sans); cursor: pointer; color: #000; }
    .tabs button.on { background: #000; color: #fff; }
    .stack { display: grid; gap: 14px; }
    .done { margin: 0; padding: 12px 14px; border: 1px solid #000; font-size: .92rem; overflow-wrap: anywhere; }
    .alt { justify-self: start; font-size: .88rem; }
    .otp { letter-spacing: .3em; font-weight: 600; }
    .error { margin: 0; }
    .switch { display: flex; flex-wrap: wrap; gap: 8px 16px; font-size: .88rem; }
  `,
})
export class SignInPanel {
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  readonly startIn = input<'signin' | 'create'>('signin');
  readonly done = output<void>();

  protected method = signal<Method>('email');
  protected usePassword = signal(false);
  protected mode = signal<'signin' | 'create'>('signin');
  protected busy = signal(false);
  protected error = signal<string | null>(null);
  protected linkSent = signal(false);
  protected confirmation = signal<ConfirmationResult | null>(null);
  protected emailValue = '';
  protected password = '';
  protected phoneValue = '';
  protected code = '';
  protected e164 = '';

  ngOnInit() {
    this.mode.set(this.startIn());
  }

  protected switchTo(m: Method) {
    this.method.set(m);
    this.error.set(null);
  }

  protected async google() {
    await this.run(() => this.auth.google());
  }

  protected async sendLink() {
    await this.run(async () => {
      await this.auth.sendEmailLink(this.emailValue.trim());
      this.linkSent.set(true);
    }, false);
  }

  protected async passwordSubmit() {
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
      this.toast.show('We have emailed you a link to reset your password.');
    }, false);
  }

  protected async sendCode() {
    const phone = toE164(this.phoneValue);
    if (!phone) {
      this.error.set('Please enter a valid mobile number.');
      return;
    }
    this.e164 = phone;
    await this.run(async () => this.confirmation.set(await this.auth.sendPhoneCode(phone, 'alc-signin-phone')), false);
  }

  protected async verify() {
    const c = this.confirmation();
    if (!c) return;
    await this.run(() => this.auth.confirmPhoneCode(c, this.code.trim()));
  }

  private async run(fn: () => Promise<void>, emit = true) {
    this.busy.set(true);
    this.error.set(null);
    try {
      await fn();
      if (emit) this.done.emit();
    } catch (e) {
      console.error(e);
      this.error.set(authErrorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
