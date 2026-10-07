import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { ApplicationService } from '../core/application.service';
import { CATEGORIES, CvRef, INDIAN_STATES, OTHER, PROFESSIONS, ApplicationForm } from '../core/models';
import { ToastService } from '../core/toast.service';

const req = Validators.required;

@Component({
  selector: 'app-join',
  imports: [ReactiveFormsModule],
  template: `
    <section class="wrap head">
      <p class="eyebrow">Membership application</p>
      <h1>Join the Ambedkarite Lawyers Collective</h1>
      <p class="muted lead">
        Justice Through Law. Membership for Advocates, Students, and Activists Dedicated to Eradicating Systemic Discrimination.
        Fields marked <span class="req">*</span> are required. Your answers save on this device as you type.
      </p>
      @if (restored()) {
        <div class="notice card">
          <span>We restored your saved draft{{ savedLabel() ? ' from ' + savedLabel() : '' }}.</span>
          <button class="btn-link btn" type="button" (click)="startOver()">Start over</button>
        </div>
      }
    </section>

    <form class="wrap layout" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="sections">
        <fieldset class="card">
          <legend><span>1</span> About you</legend>
          <div class="grid2">
            <div class="field full">
              <label for="name">Name<span class="req">*</span></label>
              <input id="name" class="input" formControlName="name" autocomplete="name" [class.invalid]="bad('name')" />
              @if (bad('name')) { <span class="error">Please enter your name.</span> }
            </div>
            <div class="field">
              <label for="currentCity">Current City<span class="req">*</span></label>
              <input id="currentCity" class="input" formControlName="currentCity" [class.invalid]="bad('currentCity')" />
              @if (bad('currentCity')) { <span class="error">Please enter your current city.</span> }
            </div>
            <div class="field">
              <label for="homeState">Home State<span class="req">*</span></label>
              <input id="homeState" class="input" formControlName="homeState" list="states" [class.invalid]="bad('homeState')" />
              <datalist id="states">
                @for (s of states; track s) { <option [value]="s"></option> }
              </datalist>
              @if (bad('homeState')) { <span class="error">Please enter your home state.</span> }
            </div>
            <div class="field">
              <label for="homeCity">Home City<span class="req">*</span></label>
              <input id="homeCity" class="input" formControlName="homeCity" [class.invalid]="bad('homeCity')" />
              @if (bad('homeCity')) { <span class="error">Please enter your home city.</span> }
            </div>
          </div>
        </fieldset>

        <fieldset class="card">
          <legend><span>2</span> Background</legend>
          <div class="field">
            <span class="label">Profession<span class="req">*</span></span>
            <div class="options" role="radiogroup">
              @for (p of professions; track p) {
                <label class="opt" [class.sel]="v().profession === p">
                  <input type="radio" formControlName="profession" [value]="p" /> {{ p }}
                </label>
              }
              <label class="opt" [class.sel]="v().profession === other">
                <input type="radio" formControlName="profession" [value]="other" /> Other
              </label>
            </div>
            @if (v().profession === other) {
              <input class="input" formControlName="professionOther" placeholder="Please specify" [class.invalid]="otherMissing('profession')" />
            }
            @if (bad('profession') || otherMissing('profession')) { <span class="error">Please choose your profession.</span> }
          </div>

          <div class="field">
            <label for="education">Education Details (please mention your college)<span class="req">*</span></label>
            <input id="education" class="input" formControlName="education" [class.invalid]="bad('education')" />
            @if (bad('education')) { <span class="error">Please add your education details.</span> }
          </div>

          <div class="field">
            <span class="label">Caste<span class="req">*</span></span>
            <span class="hint">Seen only by the Collective's coordinator. Never shown publicly.</span>
            <div class="options" role="radiogroup">
              @for (c of categories; track c) {
                <label class="opt" [class.sel]="v().caste === c">
                  <input type="radio" formControlName="caste" [value]="c" /> {{ c }}
                </label>
              }
              <label class="opt" [class.sel]="v().caste === other">
                <input type="radio" formControlName="caste" [value]="other" /> Other
              </label>
            </div>
            @if (v().caste === other) {
              <input class="input" formControlName="casteOther" placeholder="Please specify" [class.invalid]="otherMissing('caste')" />
            }
            @if (bad('caste') || otherMissing('caste')) { <span class="error">Please choose an option.</span> }
          </div>

          <div class="field">
            <label for="linkedin">LinkedIn profile link</label>
            <input id="linkedin" class="input" formControlName="linkedin" inputmode="url" placeholder="https://www.linkedin.com/in/..." [class.invalid]="bad('linkedin')" />
            @if (bad('linkedin')) { <span class="error">Please paste a full link starting with https://</span> }
          </div>
        </fieldset>

        <fieldset class="card">
          <legend><span>3</span> Your intent</legend>
          <div class="field">
            <label for="purpose">Statement of purpose: why do you want to be a part of this initiative?<span class="req">*</span></label>
            <textarea id="purpose" class="input" formControlName="purpose" rows="5" [class.invalid]="bad('purpose')"></textarea>
            <span class="hint">{{ v().purpose.length || 0 }} / 3000</span>
            @if (bad('purpose')) { <span class="error">Please share why you want to join.</span> }
          </div>
          <div class="field">
            <label for="expertise">Your expertise: how can you help us in our fight against discrimination?</label>
            <textarea id="expertise" class="input" formControlName="expertise" rows="4"></textarea>
          </div>
          <div class="field">
            <label for="experience">Your past experience standing against discrimination</label>
            <textarea id="experience" class="input" formControlName="experience" rows="4"></textarea>
          </div>
          <div class="field">
            <span class="label">Upload your CV</span>
            <span class="hint">One PDF, up to 10 MB.</span>
            @if (cv(); as file) {
              <div class="file">
                <span class="file-name">{{ file.cvName }}</span>
                <button type="button" class="btn btn-ghost btn-sm" (click)="removeCv()">Remove</button>
              </div>
            } @else {
              <label class="drop" [class.busy]="uploading()">
                <input type="file" accept="application/pdf" (change)="pickCv($event)" [disabled]="uploading()" />
                {{ uploading() ? 'Uploading...' : 'Choose a PDF' }}
              </label>
            }
            @if (cvError()) { <span class="error">{{ cvError() }}</span> }
          </div>
        </fieldset>

        <fieldset class="card">
          <legend><span>4</span> Contact</legend>
          <div class="grid2">
            <div class="field">
              <label for="email">Email id<span class="req">*</span></label>
              <input id="email" class="input" type="email" formControlName="email" autocomplete="email" [class.invalid]="bad('email')" />
              <span class="hint">We send your confirmation and replies here.</span>
              @if (bad('email')) { <span class="error">Please enter a valid email.</span> }
            </div>
            <div class="field">
              <label for="contact">Contact Details</label>
              <input id="contact" class="input" formControlName="contact" autocomplete="tel" placeholder="Phone number" />
            </div>
          </div>
          <div class="field">
            <label for="remarks">Remarks</label>
            <textarea id="remarks" class="input" formControlName="remarks" rows="3"></textarea>
          </div>
        </fieldset>
      </div>

      <aside class="side">
        <div class="card status">
          <span class="label">Progress</span>
          <div class="meter"><div [style.width.%]="progress()"></div></div>
          <span class="muted small">{{ doneCount() }} of {{ requiredCount }} required answers</span>
          <span class="muted small saved">{{ saveState() }}</span>
          <button type="button" class="btn btn-ghost btn-block" (click)="saveDraft()" [disabled]="busy()">Save draft</button>
          <button type="submit" class="btn btn-primary btn-block" [disabled]="busy() || uploading()">
            {{ busy() ? 'Submitting...' : 'Submit application' }}
          </button>
          @if (submitError()) { <span class="error">{{ submitError() }}</span> }
        </div>
      </aside>
    </form>
  `,
  styles: `
    .head { padding-top: 44px; }
    h1 { font-size: clamp(1.8rem, 3.4vw, 2.5rem); margin: 8px 0 10px; }
    .lead { max-width: 760px; }
    .notice { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px; margin-top: 16px; background: var(--blue-soft); border-color: transparent; box-shadow: none; }
    .layout { display: grid; grid-template-columns: 1fr 300px; gap: 28px; margin-top: 28px; align-items: start; }
    .sections { display: grid; gap: 20px; }
    fieldset { margin: 0; padding: 26px; display: grid; gap: 20px; min-width: 0; }
    legend { float: left; width: 100%; padding: 0; font: 600 1.2rem var(--serif); display: flex; align-items: center; gap: 12px; }
    legend span { width: 28px; height: 28px; border-radius: 50%; background: var(--blue-soft); color: var(--blue-deep); display: grid; place-items: center; font: 700 .8rem var(--sans); }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .full { grid-column: 1 / -1; }
    .options { display: flex; flex-wrap: wrap; gap: 10px; }
    .opt { display: inline-flex; align-items: center; gap: 8px; padding: 10px 14px; border: 1px solid var(--line-strong); border-radius: 2px; cursor: pointer; font-size: .93rem; background: #fff; }
    .opt.sel { border-color: var(--blue); background: var(--blue-soft); }
    .opt input { accent-color: var(--blue); margin: 0; }
    .drop { display: flex; align-items: center; justify-content: center; height: 64px; border: 1px dashed var(--line-strong); border-radius: 2px; cursor: pointer; color: #000; font-weight: 600; background: var(--tint); }
    .drop input { display: none; }
    .drop.busy { color: var(--muted); cursor: progress; }
    .file { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 2px; background: var(--tint); }
    .file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .93rem; }
    .side { position: sticky; top: 92px; }
    .status { padding: 22px; display: grid; gap: 10px; }
    .label { font-size: .75rem; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
    .meter { height: 6px; background: var(--line); border-radius: 99px; overflow: hidden; }
    .meter div { height: 100%; background: var(--blue); transition: width .3s; }
    .small { font-size: .85rem; }
    .saved { min-height: 1.2em; }
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      .side { position: sticky; bottom: 0; top: auto; order: 2; }
      .status { grid-template-columns: 1fr 1fr; border-radius: 0; }
      .status .label, .status .meter, .status .small { display: none; }
      .grid2 { grid-template-columns: 1fr; }
      fieldset { padding: 20px; }
    }
  `,
})
export class JoinPage {
  private apps = inject(ApplicationService);
  private toast = inject(ToastService);
  private router = inject(Router);

  protected readonly professions = PROFESSIONS;
  protected readonly categories = CATEGORIES;
  protected readonly states = INDIAN_STATES;
  protected readonly other = OTHER;

  protected form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [req, Validators.maxLength(120)] }),
    currentCity: new FormControl('', { nonNullable: true, validators: [req, Validators.maxLength(80)] }),
    homeState: new FormControl('', { nonNullable: true, validators: [req, Validators.maxLength(80)] }),
    homeCity: new FormControl('', { nonNullable: true, validators: [req, Validators.maxLength(80)] }),
    profession: new FormControl('', { nonNullable: true, validators: [req] }),
    professionOther: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(80)] }),
    education: new FormControl('', { nonNullable: true, validators: [req, Validators.maxLength(300)] }),
    caste: new FormControl('', { nonNullable: true, validators: [req] }),
    casteOther: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(80)] }),
    linkedin: new FormControl('', { nonNullable: true, validators: [Validators.pattern(/^\s*(https?:\/\/\S+)?\s*$/i)] }),
    purpose: new FormControl('', { nonNullable: true, validators: [req, Validators.maxLength(3000)] }),
    expertise: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(3000)] }),
    experience: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(3000)] }),
    contact: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(120)] }),
    email: new FormControl('', { nonNullable: true, validators: [req, Validators.email, Validators.maxLength(160)] }),
    remarks: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
  });

  protected v = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() }) as () => ApplicationForm;
  protected readonly requiredKeys = ['name', 'currentCity', 'homeState', 'homeCity', 'profession', 'education', 'caste', 'purpose', 'email'] as const;
  protected readonly requiredCount = this.requiredKeys.length;
  protected doneCount = computed(() => {
    this.v();
    return this.requiredKeys.filter((k) => this.form.controls[k].valid && !this.otherMissing(k)).length;
  });
  protected progress = computed(() => Math.round((this.doneCount() / this.requiredCount) * 100));

  protected cv = signal<CvRef | null>(null);
  protected cvError = signal<string | null>(null);
  protected uploading = signal(false);
  protected busy = signal(false);
  protected submitError = signal<string | null>(null);
  protected restored = signal(false);
  protected savedAt = signal<number | null>(null);
  protected savedLabel = computed(() => {
    const t = this.savedAt();
    return t ? new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
  });
  protected saveState = computed(() => (this.savedAt() ? `Saved ${this.savedLabel()}` : 'Not saved yet'));

  private submitted = signal(false);

  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(async () => {
      const draft = await this.apps.loadDraft();
      if (draft && Object.values(draft.form ?? {}).some((x) => !!x)) {
        this.form.patchValue(draft.form);
        this.cv.set(draft.cv ?? null);
        this.savedAt.set(draft.savedAt);
        this.restored.set(true);
      }
      const sub = this.form.valueChanges.pipe(debounceTime(600)).subscribe(() => {
        const now = Date.now();
        this.apps.writeLocalDraft({ form: this.form.getRawValue(), cv: this.cv(), savedAt: now });
        this.savedAt.set(now);
      });
      destroy.onDestroy(() => sub.unsubscribe());
    });
  }

  protected bad(key: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[key];
    return c.invalid && (c.touched || this.submitted());
  }

  protected otherMissing(key: string): boolean {
    if (key !== 'profession' && key !== 'caste') return false;
    const value = this.form.controls[key].value;
    const other = key === 'profession' ? this.form.controls.professionOther : this.form.controls.casteOther;
    return value === OTHER && !other.value.trim() && (other.touched || this.submitted());
  }

  protected async pickCv(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const problem = this.apps.validateCv(file);
    this.cvError.set(problem);
    if (problem) return;
    this.uploading.set(true);
    try {
      const ref = await this.apps.uploadCv(file);
      this.cv.set(ref);
      await this.saveDraft(true);
    } catch (e) {
      console.error(e);
      this.cvError.set('Upload failed. Please try again.');
    } finally {
      this.uploading.set(false);
    }
  }

  protected async removeCv() {
    const current = this.cv();
    this.cv.set(null);
    if (current) await this.apps.removeCv(current);
    await this.saveDraft(true);
  }

  protected async saveDraft(silent = false) {
    const now = Date.now();
    try {
      await this.apps.saveDraft({ form: this.form.getRawValue(), cv: this.cv(), savedAt: now });
      this.savedAt.set(now);
      if (!silent) this.toast.show('Draft saved. You can come back to it any time on this device.');
    } catch (e) {
      console.error(e);
      this.apps.writeLocalDraft({ form: this.form.getRawValue(), cv: this.cv(), savedAt: now });
      this.savedAt.set(now);
      if (!silent) this.toast.show('Draft saved on this device.');
    }
  }

  protected async startOver() {
    const current = this.cv();
    if (current) await this.apps.removeCv(current);
    await this.apps.discardDraft();
    this.form.reset();
    this.cv.set(null);
    this.savedAt.set(null);
    this.restored.set(false);
    this.submitted.set(false);
  }

  protected async submit() {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    this.submitError.set(null);
    if (this.form.invalid || this.otherMissing('profession') || this.otherMissing('caste')) {
      this.submitError.set('Please complete the highlighted answers.');
      setTimeout(() => document.querySelector('.invalid, .error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }
    this.busy.set(true);
    try {
      const id = await this.apps.submit(this.form.getRawValue(), this.cv());
      this.router.navigate(['/join/submitted'], { queryParams: { ref: id } });
    } catch (e) {
      console.error(e);
      this.submitError.set('We could not submit just now. Your draft is safe. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
