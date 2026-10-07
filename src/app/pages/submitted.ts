import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { SignInPanel } from '../shared/sign-in-panel';
import { PROFILE } from '../core/profile';

@Component({
  selector: 'app-submitted',
  imports: [RouterLink, SignInPanel],
  template: `
    <section class="wrap page">
      <div class="card done">
        <div class="tick" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </div>
        <p class="eyebrow">Application received</p>
        <h1>Thank you for standing with the Collective.</h1>
        <p class="muted">
          A confirmation is on its way to your email. {{ firstName }} reads every application personally.
          @if (ref()) { <br /><span class="refno">Reference {{ ref() }}</span> }
        </p>
      </div>

      @if (auth.member()) {
        <div class="card next">
          <h2>Follow it in one place</h2>
          <p class="muted">Your application is linked to your account. Replies from {{ firstName }} will appear in your messages.</p>
          <a class="btn btn-primary" routerLink="/messages">Go to my messages</a>
        </div>
      } @else {
        <div class="card next">
          <h2>Want to see replies here?</h2>
          <p class="muted">
            Sign in or create an account and this application stays with you. You can then read every reply from
            {{ firstName }} and write back in one private conversation. This is optional.
          </p>
          <app-sign-in-panel startIn="create" (done)="linked()" />
          <a class="btn btn-ghost btn-block skip" routerLink="/">Skip for now</a>
          <p class="hint">If you skip, we will still email you when {{ firstName }} replies.</p>
        </div>
      }
    </section>
  `,
  styles: `
    .page { max-width: 640px; padding-top: 48px; display: grid; gap: 20px; }
    .done { padding: 36px; text-align: center; }
    .tick { width: 56px; height: 56px; margin: 0 auto 16px; border-radius: 50%; background: var(--good-soft); display: grid; place-items: center; }
    .tick svg { width: 28px; height: 28px; fill: none; stroke: var(--good); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
    h1 { font-size: 1.8rem; margin-top: 6px; }
    .refno { display: inline-block; margin-top: 10px; font: 500 .82rem ui-monospace, Menlo, monospace; color: var(--muted); }
    .next { padding: 28px; display: grid; gap: 14px; }
    .next h2 { font-size: 1.35rem; margin: 0; }
    .next p { margin: 0; }
    .skip { margin-top: 4px; }
  `,
})
export class SubmittedPage {
  protected auth = inject(AuthService);
  private router = inject(Router);
  readonly ref = input<string>();
  protected firstName = PROFILE.first;

  protected linked() {
    this.router.navigateByUrl('/messages');
  }
}
