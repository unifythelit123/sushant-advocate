import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ApplicationService } from '../core/application.service';
import { Application, STATUS_LABEL } from '../core/models';
import { Chat } from '../shared/chat';
import { PROFILE } from '../core/profile';

@Component({
  selector: 'app-messages',
  imports: [Chat, DatePipe, RouterLink],
  template: `
    <section class="wrap page">
      <header class="head">
        <div>
          <p class="eyebrow">Your conversation</p>
          <h1>Messages with {{ firstName }}</h1>
          <p class="muted">One private channel. Only you and {{ firstName }} can read it. We email you when a reply arrives.</p>
        </div>
      </header>

      <div class="grid">
        <aside class="card apps">
          <h2>Your applications</h2>
          @if (loading()) {
            <p class="muted">Loading...</p>
          } @else if (!apps().length) {
            <p class="muted">You have not applied yet.</p>
            <a class="btn btn-primary btn-sm" routerLink="/join">Apply to join</a>
          } @else {
            <ul>
              @for (a of apps(); track a.id) {
                <li>
                  <div class="row">
                    <strong>{{ a.profession === 'Other' ? a.professionOther : a.profession }}</strong>
                    <span class="chip" [class]="'chip ' + a.status">{{ label(a) }}</span>
                  </div>
                  <span class="muted small">Sent {{ a.createdAt?.toDate() | date: 'd MMM y' }}</span>
                </li>
              }
            </ul>
          }
          <p class="muted small signed">Signed in as {{ email() }}</p>
        </aside>

        <div class="card convo">
          @if (uid(); as id) {
            <app-chat [uid]="id" side="user" [otherName]="firstName"
              [emptyText]="'Write your first message to ' + firstName + '. Questions about your application, a matter you need help with, or anything else.'" />
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .page { padding-top: 40px; }
    h1 { font-size: clamp(1.7rem, 3vw, 2.3rem); margin: 6px 0 6px; }
    .head p.muted { margin: 0; }
    .grid { display: grid; grid-template-columns: 300px 1fr; gap: 20px; margin-top: 24px; align-items: start; }
    .apps { padding: 22px; display: grid; gap: 12px; }
    .apps h2 { font-size: 1.1rem; margin: 0; }
    ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
    li { padding: 12px; border: 1px solid var(--line); border-radius: 2px; display: grid; gap: 4px; }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .small { font-size: .82rem; }
    .signed { margin: 8px 0 0; word-break: break-all; }
    .convo { padding: 16px; height: min(72vh, 680px); }
    @media (max-width: 860px) {
      .grid { grid-template-columns: 1fr; }
      .convo { order: -1; height: 70vh; }
    }
  `,
})
export class MessagesPage {
  private auth = inject(AuthService);
  private applications = inject(ApplicationService);

  protected uid = computed(() => this.auth.member()?.uid ?? null);
  protected email = computed(() => this.auth.member()?.email ?? '');
  protected apps = signal<Application[]>([]);
  protected loading = signal(true);
  protected firstName = PROFILE.first;

  constructor() {
    this.applications
      .mine()
      .then((a) => this.apps.set(a))
      .catch((e) => console.error(e))
      .finally(() => this.loading.set(false));
  }

  protected label(a: Application) {
    return STATUS_LABEL[a.status] ?? a.status;
  }
}
