import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApplicationService } from '../core/application.service';
import { ThreadService } from '../core/thread.service';
import { ToastService } from '../core/toast.service';
import { Application, ApplicationStatus, STATUS_LABEL, Thread } from '../core/models';
import { Chat } from '../shared/chat';
import { FirebaseService } from '../core/firebase.service';
import { httpsCallable } from 'firebase/functions';

type Tab = 'applications' | 'users' | 'messages';

interface AppUser {
  uid: string;
  name: string;
  email: string;
  phone: string;
  providers: string[];
  created: string;
  lastSignIn: string;
  verified: boolean;
  disabled: boolean;
  applications: number;
  appName: string;
}
const STATUSES: ApplicationStatus[] = ['submitted', 'reviewing', 'accepted', 'declined'];

@Component({
  selector: 'app-console',
  imports: [DatePipe, FormsModule, Chat],
  template: `
    <section class="wrap page">
      <header class="top">
        <div class="tabs" role="tablist">
          <button role="tab" [class.on]="tab() === 'applications'" (click)="tab.set('applications')">
            Applications <span class="count">{{ apps().length }}</span>
          </button>
          <button role="tab" [class.on]="tab() === 'users'" (click)="showUsers()">
            Users @if (users().length) { <span class="count">{{ users().length }}</span> }
          </button>
          <button role="tab" [class.on]="tab() === 'messages'" (click)="tab.set('messages')">
            Messages @if (unread()) { <span class="count hot">{{ unread() }}</span> }
          </button>
        </div>
        @if (tab() === 'users') {
          <div class="tools">
            <input class="input search" type="search" placeholder="Search name, email, phone" [(ngModel)]="search" />
            <button class="btn btn-ghost btn-sm" type="button" (click)="loadUsers()" [disabled]="usersLoading()">Refresh</button>
          </div>
        }
        @if (tab() === 'applications') {
          <div class="tools">
            <input class="input search" type="search" placeholder="Search name, city, email" [(ngModel)]="search" />
            <button class="btn btn-ghost btn-sm" type="button" (click)="exportCsv()">Export CSV</button>
          </div>
        }
      </header>

      @if (error()) { <p class="error">{{ error() }}</p> }

      @if (tab() === 'applications') {
        <div class="filters">
          <button class="filter" [class.on]="!statusFilter()" (click)="statusFilter.set(null)">All {{ apps().length }}</button>
          @for (s of statuses; track s) {
            <button class="filter" [class.on]="statusFilter() === s" (click)="statusFilter.set(s)">{{ labels[s] }} {{ countBy(s) }}</button>
          }
        </div>
        <div class="card table-card">
          <table>
            <thead>
              <tr><th>Name</th><th class="hide-xs">Profession</th><th class="hide-sm">City</th><th class="hide-sm">Received</th><th>Status</th></tr>
            </thead>
            <tbody>
              @for (a of filtered(); track a.id) {
                <tr (click)="open(a)">
                  <td><strong>{{ a.name }}</strong><span class="sub">{{ a.email }}</span></td>
                  <td class="hide-xs">{{ prof(a) }}</td>
                  <td class="hide-sm">{{ a.currentCity }}</td>
                  <td class="hide-sm">{{ a.createdAt?.toDate() | date: 'd MMM y' }}</td>
                  <td><span [class]="'chip ' + a.status">{{ labels[a.status] }}</span></td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="muted empty">{{ loading() ? 'Loading...' : 'No applications here yet.' }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (tab() === 'users') {
        <p class="muted note">Everyone who has created an account by Google, email or phone. Visitors who only submitted the form without signing in are listed under Applications.</p>
        <div class="card table-card">
          <table>
            <thead>
              <tr><th>Name</th><th class="hide-xs">Signed in with</th><th class="hide-sm">Joined</th><th class="hide-sm">Last active</th><th>Applied</th></tr>
            </thead>
            <tbody>
              @for (u of filteredUsers(); track u.uid) {
                <tr (click)="openUser(u)">
                  <td><strong>{{ u.name || u.appName || 'No name' }}</strong><span class="sub">{{ u.email || u.phone || u.uid }}@if (u.email && u.phone) { &middot; {{ u.phone }} }</span></td>
                  <td class="hide-xs">{{ u.providers.join(', ') }}</td>
                  <td class="hide-sm">{{ u.created | date: 'd MMM y' }}</td>
                  <td class="hide-sm">{{ u.lastSignIn | date: 'd MMM, h:mm a' }}</td>
                  <td>{{ u.applications ? u.applications : 'No' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="muted empty">{{ usersLoading() ? 'Loading...' : 'No signed up users yet.' }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="inbox">
          <aside class="card threads">
            @for (t of threads(); track t.id) {
              <button class="thread" [class.on]="activeThread()?.id === t.id" (click)="activeThread.set(t)">
                <span class="t-top">
                  <strong>{{ t.name || t.email || 'Visitor' }}</strong>
                  @if (t.unreadForAdmin) { <span class="dot" aria-label="Unread"></span> }
                </span>
                <span class="t-last">{{ t.lastFrom === 'admin' ? 'You: ' : '' }}{{ t.lastMessage }}</span>
                <span class="t-time">{{ t.lastAt?.toDate() | date: 'd MMM, h:mm a' }}</span>
              </button>
            } @empty {
              <p class="muted pad">No conversations yet.</p>
            }
          </aside>
          <div class="card convo">
            @if (activeThread(); as t) {
              <div class="convo-head">
                <strong>{{ t.name || 'Visitor' }}</strong>
                <span class="muted small">{{ t.email }}</span>
              </div>
              <app-chat [uid]="t.id" side="admin" [otherName]="t.name || 'Visitor'" emptyText="No messages yet." />
            } @else {
              <p class="muted pad center">Choose a conversation on the left.</p>
            }
          </div>
        </div>
      }
    </section>

    <dialog class="sheet" #dlg (click)="backdrop($event)">
      @if (selected(); as a) {
        <div class="d-head">
          <div>
            <h2>{{ a.name }}</h2>
            <span class="muted small">Received {{ a.createdAt?.toDate() | date: 'd MMM y, h:mm a' }}</span>
          </div>
          <button class="x" type="button" aria-label="Close" (click)="close()">&times;</button>
        </div>
        <div class="d-actions">
          <label class="small">Status</label>
          <select class="input status-select" [ngModel]="a.status" (ngModelChange)="setStatus(a, $event)">
            @for (s of statuses; track s) { <option [value]="s">{{ labels[s] }}</option> }
          </select>
          @if (a.uid) {
            <button class="btn btn-primary btn-sm" type="button" (click)="message(a)">Message {{ a.name.split(' ')[0] }}</button>
          } @else {
            <a class="btn btn-primary btn-sm" [href]="'mailto:' + a.email">Reply by email</a>
          }
          @if (a.cvPath) {
            <button class="btn btn-ghost btn-sm" type="button" (click)="openCv(a)">Open CV</button>
          }
        </div>
        <div class="d-body">
          <dl class="facts">
            <div><dt>Email</dt><dd><a [href]="'mailto:' + a.email">{{ a.email }}</a></dd></div>
            <div><dt>Contact</dt><dd>{{ a.contact || '-' }}</dd></div>
            <div><dt>Profession</dt><dd>{{ prof(a) }}</dd></div>
            <div><dt>Caste</dt><dd>{{ a.caste === 'Other' ? a.casteOther : a.caste }}</dd></div>
            <div><dt>Current city</dt><dd>{{ a.currentCity }}</dd></div>
            <div><dt>Home</dt><dd>{{ a.homeCity }}, {{ a.homeState }}</dd></div>
            <div class="wide"><dt>Education</dt><dd>{{ a.education }}</dd></div>
            <div class="wide"><dt>LinkedIn</dt><dd>
              @if (a.linkedin) { <a [href]="a.linkedin" target="_blank" rel="noopener">{{ a.linkedin }}</a> } @else { - }
            </dd></div>
          </dl>
          <div class="long">
            <h3>Statement of purpose</h3><p>{{ a.purpose }}</p>
            <h3>Expertise</h3><p>{{ a.expertise || '-' }}</p>
            <h3>Past experience standing against discrimination</h3><p>{{ a.experience || '-' }}</p>
            <h3>Remarks</h3><p>{{ a.remarks || '-' }}</p>
          </div>
        </div>
      }
    </dialog>
  `,
  styles: `
    .page { padding-top: 32px; }
    .top { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
    .tabs { display: flex; gap: 4px; background: #fff; border: 1px solid var(--line); border-radius: 2px; padding: 4px; }
    .tabs button { border: 0; background: none; padding: 8px 16px; border-radius: 7px; font: 600 .92rem var(--sans); color: var(--ink-2); cursor: pointer; display: inline-flex; gap: 8px; align-items: center; }
    .tabs button.on { background: var(--blue-deep); color: #fff; }
    .count { font-size: .75rem; padding: 1px 7px; border-radius: 99px; background: var(--line); color: var(--ink-2); }
    .on .count { background: rgba(255,255,255,.2); color: #fff; }
    .count.hot { background: var(--bad); color: #fff; }
    .tools { display: flex; gap: 10px; align-items: center; }
    .note { font-size: .88rem; margin: 18px 0 12px; }
    .search { width: 280px; min-height: 36px; padding: 6px 12px; }
    .filters { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 12px; }
    .filter { border: 1px solid var(--line-strong); background: #fff; border-radius: 99px; padding: 5px 12px; font: 500 .85rem var(--sans); cursor: pointer; color: var(--ink-2); }
    .filter.on { border-color: var(--blue); background: var(--blue-soft); color: var(--blue-deep); }
    .table-card { overflow: hidden; }
    table { width: 100%; border-collapse: collapse; font-size: .92rem; }
    th { text-align: left; font-size: .75rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); font-weight: 600; padding: 12px 16px; border-bottom: 1px solid var(--line); background: #fbfaf7; }
    td { padding: 12px 16px; border-bottom: 1px solid var(--line); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; }
    tbody tr { cursor: pointer; }
    tbody tr:hover { background: #fbfaf7; }
    .sub { display: block; font-size: .8rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; }
    .empty { text-align: center; padding: 40px; }
    .inbox { display: grid; grid-template-columns: 320px 1fr; gap: 20px; margin-top: 18px; height: min(76vh, 720px); }
    .threads { overflow-y: auto; padding: 6px; }
    .thread { width: 100%; text-align: left; border: 0; background: none; padding: 12px; border-radius: 2px; cursor: pointer; display: grid; gap: 2px; font: inherit; color: inherit; }
    .thread:hover { background: var(--tint); }
    .thread.on { background: var(--blue-soft); }
    .t-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .t-last { font-size: .85rem; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .t-time { font-size: .74rem; color: var(--muted); }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--bad); flex: none; }
    .convo { padding: 16px; display: flex; flex-direction: column; min-height: 0; }
    .convo app-chat { flex: 1; min-height: 0; }
    .convo-head { display: flex; gap: 10px; align-items: baseline; padding: 4px 4px 12px; }
    .pad { padding: 16px; }
    .center { margin: auto; }
    .small { font-size: .82rem; }
    .d-head { display: flex; justify-content: space-between; align-items: flex-start; padding: 22px 26px 12px; }
    .d-head h2 { margin: 0; font-size: 1.5rem; }
    .x { border: 0; background: none; font-size: 1.8rem; line-height: 1; cursor: pointer; color: var(--muted); padding: 0 4px; }
    .d-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; padding: 0 26px 16px; border-bottom: 1px solid var(--line); }
    .status-select { width: auto; min-height: 34px; padding: 4px 10px; }
    .d-body { display: grid; grid-template-columns: 340px 1fr; gap: 28px; padding: 22px 26px 28px; overflow-y: auto; max-height: calc(88vh - 150px); }
    .facts { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px; align-content: start; }
    .facts .wide { grid-column: 1 / -1; }
    dt { font-size: .72rem; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
    dd { margin: 2px 0 0; word-break: break-word; font-size: .93rem; }
    .long h3 { font: 600 .78rem var(--sans); letter-spacing: .1em; text-transform: uppercase; color: var(--muted); margin: 0 0 4px; }
    .long p { margin: 0 0 18px; white-space: pre-wrap; }
    @media (max-width: 860px) {
      .search { width: 100%; }
      .tools { width: 100%; }
      .hide-sm { display: none; }
      .inbox { grid-template-columns: 1fr; height: auto; }
      .threads { max-height: 260px; }
      .convo { height: 70vh; }
      .d-body { grid-template-columns: 1fr; padding: 18px; }
      .d-head, .d-actions { padding-left: 18px; padding-right: 18px; }
    }
    @media (max-width: 560px) {
      .hide-xs { display: none; }
      table { table-layout: fixed; }
      td, th { padding: 10px 12px; }
      td:last-child, th:last-child { width: 118px; }
      .facts { grid-template-columns: 1fr; }
      dialog.sheet { width: 100vw; max-width: 100vw; max-height: 100svh; height: 100svh; margin: 0; }
    }
  `,
})
export class ConsolePage {
  private applications = inject(ApplicationService);
  private threadSvc = inject(ThreadService);
  private toast = inject(ToastService);
  private fb = inject(FirebaseService);
  private dlg = viewChild<ElementRef<HTMLDialogElement>>('dlg');

  protected readonly statuses = STATUSES;
  protected readonly labels = STATUS_LABEL;
  protected tab = signal<Tab>('applications');
  protected apps = signal<Application[]>([]);
  protected threads = signal<Thread[]>([]);
  protected loading = signal(true);
  protected error = signal<string | null>(null);
  protected statusFilter = signal<ApplicationStatus | null>(null);
  protected selected = signal<Application | null>(null);
  protected activeThread = signal<Thread | null>(null);
  private searchTerm = signal('');
  protected users = signal<AppUser[]>([]);
  protected usersLoading = signal(false);
  private usersLoaded = false;

  protected filteredUsers = computed(() => {
    const q = this.searchTerm().trim().toLowerCase();
    return this.users().filter(
      (u) => !q || [u.name, u.appName, u.email, u.phone].some((x) => x?.toLowerCase().includes(q)),
    );
  });

  protected showUsers() {
    this.tab.set('users');
    if (!this.usersLoaded) this.loadUsers();
  }

  protected async loadUsers() {
    this.usersLoading.set(true);
    try {
      const res = await httpsCallable<unknown, { users: AppUser[] }>(this.fb.functions, 'listUsers')({});
      this.users.set(res.data.users);
      this.usersLoaded = true;
    } catch (e) {
      console.error(e);
      this.toast.show('Could not load users.');
    } finally {
      this.usersLoading.set(false);
    }
  }

  protected openUser(u: AppUser) {
    const app = this.apps().find((a) => a.uid === u.uid);
    if (app) {
      this.open(app);
      return;
    }
    const existing = this.threads().find((t) => t.id === u.uid);
    this.activeThread.set(
      existing ?? {
        id: u.uid,
        name: u.name || u.email || u.phone,
        email: u.email,
        lastMessage: '',
        lastFrom: 'admin',
        lastAt: null,
        unreadForAdmin: false,
        unreadForUser: false,
      },
    );
    this.tab.set('messages');
  }

  get search() {
    return this.searchTerm();
  }
  set search(v: string) {
    this.searchTerm.set(v);
  }

  protected unread = computed(() => this.threads().filter((t) => t.unreadForAdmin).length);

  protected filtered = computed(() => {
    const s = this.statusFilter();
    const q = this.searchTerm().trim().toLowerCase();
    return this.apps().filter(
      (a) =>
        (!s || a.status === s) &&
        (!q || [a.name, a.email, a.currentCity, a.homeCity, a.homeState].some((x) => x?.toLowerCase().includes(q))),
    );
  });

  constructor() {
    const destroy = inject(DestroyRef);
    const stopApps = this.applications.watchAll(
      (rows) => {
        this.apps.set(rows);
        this.loading.set(false);
        const sel = this.selected();
        if (sel) this.selected.set(rows.find((r) => r.id === sel.id) ?? sel);
      },
      (e) => {
        console.error(e);
        this.error.set('Could not load applications. Check that you are signed in with the coordinator account.');
        this.loading.set(false);
      },
    );
    const stopThreads = this.threadSvc.watchAllThreads((t) => {
      this.threads.set(t);
      const active = this.activeThread();
      if (active) this.activeThread.set(t.find((x) => x.id === active.id) ?? active);
    });
    destroy.onDestroy(() => {
      stopApps();
      stopThreads();
    });
  }

  protected countBy(s: ApplicationStatus) {
    return this.apps().filter((a) => a.status === s).length;
  }

  protected prof(a: Application) {
    return a.profession === 'Other' ? a.professionOther || 'Other' : a.profession;
  }

  protected open(a: Application) {
    this.selected.set(a);
    this.dlg()?.nativeElement.showModal();
  }

  protected close() {
    this.dlg()?.nativeElement.close();
  }

  protected backdrop(e: MouseEvent) {
    if (e.target === this.dlg()?.nativeElement) this.close();
  }

  protected async setStatus(a: Application, status: ApplicationStatus) {
    if (!confirm(`Mark ${a.name} as "${STATUS_LABEL[status]}"?`)) {
      this.selected.set({ ...a });
      return;
    }
    try {
      await this.applications.setStatus(a.id, status);
      this.toast.show(`Status set to ${STATUS_LABEL[status]}.`);
    } catch (e) {
      console.error(e);
      this.toast.show('Could not update the status.');
    }
  }

  protected message(a: Application) {
    const existing = this.threads().find((t) => t.id === a.uid);
    this.activeThread.set(
      existing ?? {
        id: a.uid,
        name: a.name,
        email: a.email,
        lastMessage: '',
        lastFrom: 'admin',
        lastAt: null,
        unreadForAdmin: false,
        unreadForUser: false,
      },
    );
    this.close();
    this.tab.set('messages');
  }

  protected async openCv(a: Application) {
    try {
      const url = await this.applications.cvUrl(a.cvPath!);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      console.error(e);
      this.toast.show('Could not open the CV.');
    }
  }

  protected exportCsv() {
    const cols: (keyof Application)[] = [
      'name', 'email', 'contact', 'profession', 'professionOther', 'education', 'caste', 'casteOther',
      'currentCity', 'homeCity', 'homeState', 'linkedin', 'purpose', 'expertise', 'experience', 'remarks', 'status',
    ];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = this.filtered().map((a) =>
      [...cols.map((c) => esc(a[c])), esc(a.createdAt?.toDate().toISOString() ?? '')].join(','),
    );
    const csv = [[...cols, 'createdAt'].join(','), ...rows].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `alc-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
