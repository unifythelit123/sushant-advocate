import { Component, ElementRef, effect, inject, input, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThreadService } from '../core/thread.service';
import { Message } from '../core/models';

@Component({
  selector: 'app-chat',
  imports: [FormsModule, DatePipe],
  template: `
    <div class="log" #log>
      @if (loading()) {
        <p class="muted empty">Loading conversation...</p>
      } @else if (!messages().length) {
        <p class="muted empty">{{ emptyText() }}</p>
      }
      @for (m of messages(); track m.id) {
        <div class="msg" [class.mine]="m.from === side()">
          <div class="bubble">{{ m.text }}</div>
          <span class="meta">{{ m.from === side() ? 'You' : otherName() }} &middot; {{ m.at?.toDate() | date: 'd MMM, h:mm a' }}</span>
        </div>
      }
    </div>
    <form class="compose" (ngSubmit)="send()">
      <textarea class="input" name="text" [(ngModel)]="text" rows="2" maxlength="4000"
        [placeholder]="'Write to ' + otherName() + '...'" (keydown.enter)="enter($any($event))"></textarea>
      <button class="btn btn-primary" type="submit" [disabled]="sending() || !text.trim()">Send</button>
    </form>
    <p class="hint">Press Enter to send, Shift + Enter for a new line.</p>
    @if (error()) { <p class="error">{{ error() }}</p> }
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 0; height: 100%; }
    .log { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; background: var(--tint); border-radius: 2px; min-height: 260px; border: 1px solid var(--line); }
    .empty { margin: auto; text-align: center; max-width: 340px; }
    .msg { display: flex; flex-direction: column; align-items: flex-start; max-width: 78%; }
    .msg.mine { align-self: flex-end; align-items: flex-end; }
    .bubble { padding: 10px 14px; border-radius: 2px; background: #fff; border: 1px solid var(--line); white-space: pre-wrap; word-break: break-word; font-size: .95rem; }
    .mine .bubble { background: var(--blue); color: #fff; border-color: var(--blue); }
    .meta { font-size: .74rem; color: var(--muted); margin-top: 4px; }
    .compose { display: flex; gap: 10px; align-items: flex-end; margin-top: 12px; }
    .compose textarea { min-height: 48px; }
    .hint { margin: 6px 0 0; }
    .error { margin: 6px 0 0; }
  `,
})
export class Chat {
  private threads = inject(ThreadService);

  readonly uid = input.required<string>();
  readonly side = input.required<'user' | 'admin'>();
  readonly otherName = input('Sushant');
  readonly emptyText = input('No messages yet. Say hello.');

  protected messages = signal<Message[]>([]);
  protected loading = signal(true);
  protected sending = signal(false);
  protected error = signal<string | null>(null);
  protected text = '';
  private log = viewChild<ElementRef<HTMLDivElement>>('log');

  constructor() {
    effect((onCleanup) => {
      const uid = this.uid();
      const side = this.side();
      this.loading.set(true);
      this.messages.set([]);
      const stop = this.threads.watchMessages(
        uid,
        (m) => {
          this.messages.set(m);
          this.loading.set(false);
          this.threads.markRead(uid, side);
          queueMicrotask(() => setTimeout(() => this.scroll(), 0));
        },
        () => this.loading.set(false),
      );
      onCleanup(stop);
    });
  }

  protected enter(e: KeyboardEvent) {
    if (e.shiftKey) return;
    e.preventDefault();
    this.send();
  }

  protected async send() {
    const text = this.text.trim();
    if (!text || this.sending()) return;
    this.sending.set(true);
    this.error.set(null);
    try {
      await this.threads.send(this.uid(), this.side(), text);
      this.text = '';
    } catch (e) {
      console.error(e);
      this.error.set('Message not sent. Please try again.');
    } finally {
      this.sending.set(false);
    }
  }

  private scroll() {
    const el = this.log()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
