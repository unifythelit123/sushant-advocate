import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ORG, PROFILE } from '../core/profile';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-home',
  imports: [RouterLink, Icon],
  template: `
    <!-- First screen: who, what, and the two actions -->
    <section class="hero">
      <div class="wrap hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">{{ org.name }}</p>
          <h1>Justice through law.</h1>
          <p class="lead">
            A community of lawyers, law students and young legal professionals, anchored in the constitutional
            vision of Dr. B.R. Ambedkar.
          </p>
          <div class="cta">
            <a class="btn btn-primary" routerLink="/join">Apply to join</a>
            <a class="btn btn-ghost" routerLink="/messages">Write to {{ p.first }}</a>
          </div>
          <p class="principle" aria-label="Guiding principle">
            @for (w of org.principle; track w; let last = $last) {
              <span>{{ w }}</span>@if (!last) {<i aria-hidden="true"></i>}
            }
          </p>
        </div>

        <figure class="founder">
          <div class="photo">
            <img [src]="p.photo" [alt]="p.name + ', Founder of the ' + org.name" width="846" height="1280" fetchpriority="high" />
          </div>
          <figcaption>
            <span class="label">Founder</span>
            <strong>{{ p.name }}</strong>
            <span class="muted">Advocate, Supreme Court of India and Delhi High Court</span>
          </figcaption>
        </figure>
      </div>
    </section>

    <!-- What you can do here -->
    <section class="wrap actions">
      <a class="action" routerLink="/join">
        <span class="num">I</span>
        <h3>Join the Collective</h3>
        <p class="muted">Tell us about your work and why you want to be part of this. Save a draft and finish later.</p>
        <span class="go">Start application</span>
      </a>
      <a class="action" routerLink="/messages">
        <span class="num">II</span>
        <h3>One channel to {{ p.first }}</h3>
        <p class="muted">A private conversation in one place, instead of messages scattered across WhatsApp, Instagram and email.</p>
        <span class="go">Open conversation</span>
      </a>
      <a class="action" [routerLink]="auth.member() ? '/messages' : '/login'">
        <span class="num">III</span>
        <h3>Follow your application</h3>
        <p class="muted">Sign in to see the status of what you sent and every reply, together.</p>
        <span class="go">{{ auth.member() ? 'See my updates' : 'Sign in' }}</span>
      </a>
    </section>

    <!-- The Collective -->
    <section class="wrap block" id="about">
      <div class="block-head">
        <p class="eyebrow">About the Collective</p>
        <h2>Learning, mentorship and opportunity, rooted in constitutional values.</h2>
      </div>
      <div class="two">
        <div>
          <p class="body">{{ org.about }}</p>
          <p class="body muted">{{ org.approach }}</p>
        </div>
        <div>
          <span class="label">Aims and objects</span>
          <ol class="aims">
            @for (a of org.aims; track a) { <li>{{ a }}</li> }
          </ol>
        </div>
      </div>
    </section>

    <section class="mission">
      <div class="wrap">
        <blockquote>
          <p>{{ org.mission }}</p>
        </blockquote>
      </div>
    </section>

    <!-- Work so far -->
    <section class="wrap block" id="sessions">
      <div class="block-head">
        <p class="eyebrow">Work so far</p>
        <h2>Sessions and outreach</h2>
      </div>
      <div class="sessions">
        @for (s of org.sessions; track s.title) {
          <article class="session">
            <span class="when">{{ s.when }}</span>
            <h3>{{ s.title }}</h3>
            <span class="focus">{{ s.focus }}</span>
            <p class="muted">{{ s.text }}</p>
          </article>
        }
      </div>
    </section>

    <!-- Founder -->
    <section class="wrap block" id="founder">
      <div class="block-head">
        <p class="eyebrow">The Founder</p>
        <h2>{{ p.name }}</h2>
        <p class="muted sub">{{ p.role }} &middot; {{ p.years }}</p>
      </div>

      <div class="founder-grid">
        <div class="founder-main">
          <p class="body">{{ p.intro }}</p>
          <p class="courts">
            @for (c of p.courts; track c) { <span>{{ c }}</span> }
          </p>

          <span class="label">Practice areas</span>
          <ul class="practice">
            @for (x of p.practice; track x.area) {
              <li><strong>{{ x.area }}</strong><span class="muted">{{ x.detail }}</span></li>
            }
          </ul>
        </div>

        <aside class="founder-side">
          <div class="side-block">
            <span class="label">Education</span>
            <ul class="lines">
              @for (e of p.education; track e.degree) {
                <li><strong>{{ e.degree }}</strong>, {{ e.school }}@if (e.note) {<span class="muted">, {{ e.note }}</span>}</li>
              }
            </ul>
          </div>
          <div class="side-block">
            <span class="label">Connect</span>
            <div class="icons">
              <a [href]="p.social.linkedin" target="_blank" rel="noopener" aria-label="LinkedIn"><app-icon name="linkedin" /></a>
              <a [href]="p.social.x" target="_blank" rel="noopener" aria-label="X"><app-icon name="x" /></a>
              <a [href]="p.social.instagram" target="_blank" rel="noopener" aria-label="Instagram"><app-icon name="instagram" /></a>
              <a [href]="p.social.facebook" target="_blank" rel="noopener" aria-label="Facebook"><app-icon name="facebook" /></a>
              <a [href]="p.social.utl" target="_blank" rel="noopener" aria-label="Community profile on Unify the Lit" title="Community profile on Unify the Lit"><app-icon name="community" /></a>
            </div>
          </div>
        </aside>
      </div>

      <blockquote class="quote">
        <p>&ldquo;{{ p.quote }}&rdquo;</p>
        <cite>{{ p.name }}</cite>
      </blockquote>
    </section>

    <!-- How it works -->
    <section class="wrap block how">
      <div class="block-head">
        <p class="eyebrow">How it works</p>
        <h2>Three simple steps</h2>
      </div>
      <ol>
        <li><strong>Fill the form.</strong> <span class="muted">It saves as you type. Leave and come back whenever you like.</span></li>
        <li><strong>Submit.</strong> <span class="muted">An email confirmation reaches you straight away. Creating an account is optional.</span></li>
        <li><strong>Hear back here.</strong> <span class="muted">Replies arrive in your private conversation, and we email you when one lands.</span></li>
      </ol>
      <div class="end-cta">
        <a class="btn btn-primary" routerLink="/join">Apply to join</a>
        <a class="btn btn-ghost" [href]="org.whatsapp" target="_blank" rel="noopener"><app-icon name="whatsapp" /> Follow on WhatsApp</a>
      </div>
    </section>
  `,
  styles: `
    .hero { min-height: calc(100svh - 69px); display: flex; align-items: center; padding: 40px 0; border-bottom: 1px solid var(--line); }
    .hero-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 72px; align-items: center; width: 100%; }
    h1 { font-size: clamp(2.3rem, 6vw, 4rem); line-height: 1.05; margin: 14px 0 18px; }
    .lead { font-size: 1.12rem; color: var(--ink-2); max-width: 520px; margin: 0; }
    .cta { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 30px; }
    .principle { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin: 30px 0 0; font: 600 .75rem var(--sans); letter-spacing: .18em; text-transform: uppercase; }
    .principle i { width: 4px; height: 4px; background: #000; border-radius: 50%; }
    .founder { margin: 0; border: 1px solid #000; background: #fff; }
    .photo { height: clamp(280px, 50svh, 400px); overflow: hidden; background: #000; }
    .photo img { width: 100%; height: 100%; object-fit: cover; object-position: center 18%; display: block; }
    figcaption { padding: 14px 18px 16px; display: grid; gap: 2px; border-top: 1px solid #000; }
    figcaption strong { font: 600 1.2rem var(--serif); }
    figcaption .muted { font-size: .84rem; line-height: 1.4; }
    .label { font-size: .72rem; letter-spacing: .16em; text-transform: uppercase; color: #000; font-weight: 700; }

    .actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid #000; margin-top: 56px; padding: 0; }
    .action { padding: 28px; text-decoration: none; color: #000; display: flex; flex-direction: column; gap: 6px; transition: background .15s, color .15s; min-width: 0; }
    .action + .action { border-left: 1px solid #000; }
    .action:hover { background: #000; color: #fff; }
    .action:hover .muted { color: #cfcfcf; }
    .action h3 { font-size: 1.25rem; margin: 0; }
    .action p { margin: 0 0 14px; flex: 1; }
    .num { font: 600 .9rem var(--serif); letter-spacing: .1em; }
    .go { font-weight: 600; font-size: .92rem; text-decoration: underline; text-underline-offset: 4px; }

    .block { margin-top: 88px; }
    .block-head { max-width: 760px; margin-bottom: 28px; }
    .block-head h2 { font-size: clamp(1.5rem, 3vw, 2.1rem); margin: 8px 0 0; }
    .sub { margin: 6px 0 0; }
    .two { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 56px; }
    .body { margin: 0 0 16px; font-size: 1.02rem; }
    .aims { margin: 12px 0 0; padding: 0; list-style: none; counter-reset: a; }
    .aims li { counter-increment: a; display: grid; grid-template-columns: 28px 1fr; gap: 8px; padding: 14px 0; border-bottom: 1px solid var(--line); }
    .aims li::before { content: counter(a) '.'; font: 600 1rem var(--serif); }

    .mission { margin-top: 88px; background: #000; color: #fff; }
    .mission blockquote { margin: 0; padding: 64px 0; max-width: 880px; }
    .mission p { font: 500 italic clamp(1.15rem, 2.6vw, 1.65rem)/1.5 var(--serif); margin: 0; }

    .sessions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; border-top: 1px solid #000; }
    .session { padding: 24px 24px 28px 0; border-bottom: 1px solid var(--line); display: grid; gap: 6px; align-content: start; min-width: 0; }
    .session:not(:nth-child(3n + 1)) { padding-left: 24px; border-left: 1px solid var(--line); }
    .when { font: 600 .72rem var(--sans); letter-spacing: .14em; text-transform: uppercase; }
    .session h3 { font-size: 1.12rem; margin: 2px 0 0; }
    .focus { font-size: .88rem; font-style: italic; font-family: var(--serif); }
    .session p { margin: 4px 0 0; font-size: .93rem; }

    .founder-grid { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 56px; }
    .courts { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 32px; }
    .courts span { border: 1px solid #000; padding: 4px 10px; font-size: .8rem; font-weight: 600; }
    .practice { list-style: none; padding: 0; margin: 12px 0 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid #000; }
    .practice li { padding: 14px 16px 14px 0; border-bottom: 1px solid var(--line); display: grid; gap: 2px; }
    .practice li:nth-child(even) { padding-left: 16px; border-left: 1px solid var(--line); }
    .practice strong { font: 600 1rem var(--serif); }
    .practice span { font-size: .86rem; }
    .founder-side { display: grid; gap: 32px; align-content: start; }
    .lines { list-style: none; padding: 0; margin: 10px 0 0; }
    .lines li { padding: 11px 0; border-bottom: 1px solid var(--line); font-size: .95rem; }
    .icons { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .icons a { width: 42px; height: 42px; display: grid; place-items: center; border: 1px solid #000; border-radius: 50%; color: #000; }
    .icons a:hover { background: #000; color: #fff; }
    .quote { margin: 48px 0 0; padding: 32px 0 0; border-top: 1px solid #000; max-width: 820px; }
    .quote p { font: 500 italic clamp(1.1rem, 2.2vw, 1.4rem)/1.5 var(--serif); margin: 0; }
    .quote cite { display: block; margin-top: 12px; font: 600 .75rem var(--sans); letter-spacing: .16em; text-transform: uppercase; font-style: normal; }

    .how ol { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; counter-reset: s; }
    .how li { counter-increment: s; padding-top: 16px; border-top: 1px solid #000; display: flex; flex-direction: column; gap: 4px; }
    .how li::before { content: counter(s); font: 600 2rem var(--serif); }
    .end-cta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 40px; }

    @media (max-width: 960px) {
      .sessions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .session:not(:nth-child(3n + 1)) { padding-left: 0; border-left: 0; }
      .session:nth-child(even) { padding-left: 24px; border-left: 1px solid var(--line); }
    }
    @media (max-width: 860px) {
      .hero { min-height: 0; padding: 32px 0 40px; }
      .hero-grid { grid-template-columns: 1fr; gap: 28px; }
      .founder { order: -1; display: grid; grid-template-columns: 104px minmax(0, 1fr); align-items: stretch; }
      .photo { height: auto; min-height: 128px; }
      figcaption { border-top: 0; border-left: 1px solid #000; align-content: center; }
      .actions, .two, .founder-grid, .how ol { grid-template-columns: 1fr; }
      .action + .action { border-left: 0; border-top: 1px solid #000; }
      .two, .founder-grid { gap: 32px; }
      .block { margin-top: 64px; }
      .mission { margin-top: 64px; }
      .mission blockquote { padding: 44px 0; }
    }
    @media (max-width: 560px) {
      .sessions, .practice { grid-template-columns: 1fr; }
      .session:nth-child(even), .practice li:nth-child(even) { padding-left: 0; border-left: 0; }
      .action { padding: 22px 18px; }
      .cta .btn, .end-cta .btn { flex: 1 1 100%; }
      .founder { grid-template-columns: 88px minmax(0, 1fr); }
      .photo { min-height: 112px; }
      figcaption { padding: 12px 14px; }
    }
  `,
})
export class HomePage {
  protected auth = inject(AuthService);
  protected p = PROFILE;
  protected org = ORG;
}
