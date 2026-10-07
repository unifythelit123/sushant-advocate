import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationResult } from 'firebase/auth';
import { AuthService, authErrorMessage, toE164 } from '../core/auth.service';
import { PROFILE } from '../core/profile';

/**
 * Shown after an application is submitted. Signing in is optional; it only lets the
 * applicant read replies on the website. Uses the same email or phone they just gave.
 */
@Component({
  selector: 'app-follow-up',
  imports: [FormsModule],
  template: `
    <div class="head">
      <div class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></div>
      <p class="eyebrow">Application received</p>
      <h2>Thank you for standing with the Collective.</h2>
      <p class="muted">
        A confirmation is on its way to <strong>{{ email() }}</strong>. {{ name }} reads every application personally.
      </p>
      @if (refNo()) { <span class="ref">Reference {{ refNo() }}</span> }
    </div>

    <div class="body">
      @if (auth.member(); as m) {
        <p>You are signed in. Replies from {{ first }} will appear in your messages.</p>
        <button class="btn btn-primary btn-block" type="button" (click)="finish.emit('messages')">Go to my messages</button>
      } @else {
        <h3>See replies here <span class="opt">(optional)</span></h3>
        <p class="muted small">Sign in with the same email or phone number you used in the form. You can skip this; we will still email you.</p>

        @if (linkSent()) {
          <p class="done">A sign in link is on its way to <strong>{{ email() }}</strong>. Open it on this device to finish.</p>
        } @else {
          <button class="btn btn-primary btn-block" type="button" (click)="emailLink()" [disabled]="busy()">
            Email me a sign in link
          </button>
        }

        @if (phone()) {
          @if (!confirmation()) {
            <button class="btn btn-ghost btn-block" type="button" id="alc-phone-btn" (click)="sendCode()" [disabled]="busy()">
              Text a code to {{ phone() }}
            </button>
          } @else {
            <form class="otp" (ngSubmit)="verify()">
              <label for="otp" class="small">Enter the 6 digit code sent to {{ phone() }}</label>
              <div class="row">
                <input id="otp" class="input" name="otp" [(ngModel)]="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" />
                <button class="btn btn-primary" type="submit" [disabled]="busy() || code.length < 6">Verify</button>
              </div>
            </form>
          }
        }

        <button class="btn btn-ghost btn-block" type="button" (click)="google()" [disabled]="busy()">Continue with Google</button>

        @if (error()) { <p class="error">{{ error() }}</p> }

        <button class="btn btn-link skip" type="button" (click)="finish.emit('skip')">Not now</button>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .head { padding: 28px 28px 20px; text-align: center; border-bottom: 1px solid var(--line); }
    .tick { width: 52px; height: 52px; margin: 0 auto 14px; border-radius: 50%; background: var(--good-soft); border: 2px solid var(--good); display: grid; place-items: center; }
    .tick svg { width: 26px; height: 26px; fill: none; stroke: var(--good); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
    h2 { font-size: 1.45rem; margin: 6px 0 8px; }
    .head p { margin: 0; }
    .head strong { overflow-wrap: anywhere; }
    .ref { display: inline-block; margin-top: 10px; font: 500 .8rem ui-monospace, Menlo, monospace; color: var(--muted); overflow-wrap: anywhere; }
    .body { padding: 22px 28px 26px; display: grid; gap: 12px; }
    h3 { font-size: 1.1rem; margin: 0; }
    .opt { font: 400 .85rem var(--sans); color: var(--muted); }
    .small { font-size: .88rem; margin: 0; }
    .done { margin: 0; padding: 12px 14px; border: 1px solid var(--good); background: var(--good-soft); color: #0d4f27; font-size: .92rem; overflow-wrap: anywhere; }
    .otp { display: grid; gap: 6px; }
    .row { display: flex; gap: 8px; }
    .row .input { letter-spacing: .3em; font-weight: 600; }
    .error { margin: 0; }
    .skip { justify-self: center; margin-top: 4px; }
    @media (max-width: 420px) {
      .head, .body { padding-left: 18px; padding-right: 18px; }
    }
  `,
})
export class FollowUp {
  protected auth = inject(AuthService);
  readonly email = input.required<string>();
  readonly contact = input('');
  readonly refNo = input('');
  readonly finish = output<'messages' | 'skip'>();

  protected name = PROFILE.name;
  protected first = PROFILE.first;
  protected phone = computed(() => toE164(this.contact()));
  protected busy = signal(false);
  protected error = signal<string | null>(null);
  protected linkSent = signal(false);
  protected confirmation = signal<ConfirmationResult | null>(null);
  protected code = '';

  protected async emailLink() {
    await this.run(async () => {
      await this.auth.sendEmailLink(this.email());
      this.linkSent.set(true);
    });
  }

  protected async sendCode() {
    const phone = this.phone();
    if (!phone) return;
    await this.run(async () => this.confirmation.set(await this.auth.sendPhoneCode(phone, 'alc-phone-btn')));
  }

  protected async verify() {
    const c = this.confirmation();
    if (!c) return;
    await this.run(async () => {
      await this.auth.confirmPhoneCode(c, this.code.trim());
      this.finish.emit('messages');
    });
  }

  protected async google() {
    await this.run(async () => {
      await this.auth.google();
      this.finish.emit('messages');
    });
  }

  private async run(fn: () => Promise<void>) {
    this.busy.set(true);
    this.error.set(null);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      this.error.set(authErrorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
