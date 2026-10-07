import { Injectable, inject } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { Application, ApplicationForm, ApplicationStatus, CvRef, Draft } from './models';

const LOCAL_KEY = 'alc.join.draft';
const MAX_CV = 10 * 1024 * 1024;

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private fb = inject(FirebaseService);
  private auth = inject(AuthService);

  /* ---------- drafts ---------- */

  readLocalDraft(): Draft | null {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? (JSON.parse(raw) as Draft) : null;
    } catch {
      return null;
    }
  }

  writeLocalDraft(draft: Draft): void {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(draft));
    } catch {
      /* storage blocked: the cloud draft still works */
    }
  }

  clearLocalDraft(): void {
    try {
      localStorage.removeItem(LOCAL_KEY);
    } catch {
      /* ignore */
    }
  }

  /** Saves to this device and to the visitor's account, so a draft can be resumed later. */
  async saveDraft(draft: Draft): Promise<void> {
    this.writeLocalDraft(draft);
    const user = await this.auth.ensureUser();
    await setDoc(doc(this.fb.db, 'drafts', user.uid), draft);
  }

  /** Returns whichever draft is newer: this device or the account. */
  async loadDraft(): Promise<Draft | null> {
    const local = this.readLocalDraft();
    await this.auth.whenReady();
    const user = this.fb.auth.currentUser;
    if (!user) return local;
    try {
      const snap = await getDoc(doc(this.fb.db, 'drafts', user.uid));
      const cloud = snap.exists() ? (snap.data() as Draft) : null;
      if (!cloud) return local;
      if (!local) return cloud;
      return cloud.savedAt > local.savedAt ? cloud : local;
    } catch {
      return local;
    }
  }

  async discardDraft(): Promise<void> {
    this.clearLocalDraft();
    const user = this.fb.auth.currentUser;
    if (user) await deleteDoc(doc(this.fb.db, 'drafts', user.uid)).catch(() => undefined);
  }

  /* ---------- CV ---------- */

  validateCv(file: File): string | null {
    if (file.type !== 'application/pdf') return 'Please choose a PDF file.';
    if (file.size > MAX_CV) return 'The PDF must be 10 MB or smaller.';
    return null;
  }

  async uploadCv(file: File): Promise<CvRef> {
    const user = await this.auth.ensureUser();
    const safe = file.name.replace(/[^\w.\- ]+/g, '').slice(-80) || 'cv.pdf';
    const path = `cv/${user.uid}/${Date.now()}-${safe}`;
    await uploadBytes(ref(this.fb.storage, path), file, { contentType: 'application/pdf' });
    return { cvPath: path, cvName: file.name };
  }

  async removeCv(cv: CvRef): Promise<void> {
    await deleteObject(ref(this.fb.storage, cv.cvPath)).catch(() => undefined);
  }

  cvUrl(path: string): Promise<string> {
    return getDownloadURL(ref(this.fb.storage, path));
  }

  /* ---------- applications ---------- */

  async submit(form: ApplicationForm, cv: CvRef | null): Promise<string> {
    const user = await this.auth.ensureUser();
    const clean = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),
    ) as unknown as ApplicationForm;
    const docRef = await addDoc(collection(this.fb.db, 'applications'), {
      ...clean,
      email: clean.email.toLowerCase(),
      cvPath: cv?.cvPath ?? '',
      cvName: cv?.cvName ?? '',
      uid: user.uid,
      status: 'submitted',
      createdAt: serverTimestamp(),
    });
    await this.discardDraft();
    return docRef.id;
  }

  async mine(): Promise<Application[]> {
    const user = this.fb.auth.currentUser;
    if (!user) return [];
    const snap = await getDocs(
      query(collection(this.fb.db, 'applications'), where('uid', '==', user.uid)),
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Application)
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  }

  /** Coordinator only: live list of every application, newest first. */
  watchAll(cb: (rows: Application[]) => void, onError: (e: unknown) => void): () => void {
    return onSnapshot(
      query(collection(this.fb.db, 'applications'), orderBy('createdAt', 'desc')),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application)),
      onError,
    );
  }

  setStatus(id: string, status: ApplicationStatus): Promise<void> {
    return updateDoc(doc(this.fb.db, 'applications', id), {
      status,
      updatedAt: serverTimestamp(),
    });
  }
}
