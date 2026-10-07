import { Injectable, computed, inject, signal } from '@angular/core';
import {
  AuthCredential,
  AuthError,
  EmailAuthProvider,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { ADMIN_EMAILS } from './firebase.config';
import { FirebaseService } from './firebase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private fb = inject(FirebaseService);

  readonly user = signal<User | null>(null);
  readonly ready = signal(false);

  /** A person with a real account (Google or email), not a silent anonymous session. */
  readonly member = computed(() => {
    const u = this.user();
    return u && !u.isAnonymous ? u : null;
  });

  readonly isAdmin = computed(() => {
    const u = this.user();
    return !!u?.email && u.emailVerified && ADMIN_EMAILS.includes(u.email.toLowerCase());
  });

  private readyPromise: Promise<void>;

  constructor() {
    if (!this.fb.isBrowser) {
      this.ready.set(true);
      this.readyPromise = Promise.resolve();
      return;
    }
    this.readyPromise = new Promise((resolve) => {
      onAuthStateChanged(this.fb.auth, (u) => {
        this.user.set(u);
        this.ready.set(true);
        resolve();
      });
    });
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  /** Every visitor gets a quiet anonymous session the moment they save or submit, so their work has an owner. */
  async ensureUser(): Promise<User> {
    await this.whenReady();
    const current = this.fb.auth.currentUser;
    if (current) return current;
    const cred = await signInAnonymously(this.fb.auth);
    this.user.set(cred.user);
    return cred.user;
  }

  async google(): Promise<void> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const current = this.fb.auth.currentUser;
    if (current?.isAnonymous) {
      try {
        await linkWithPopup(current, provider);
        await this.refresh();
        return;
      } catch (e) {
        const cred = GoogleAuthProvider.credentialFromError(e as AuthError);
        if (!cred || (e as AuthError).code !== 'auth/credential-already-in-use') throw e;
        await this.switchFromAnonymous(cred);
        return;
      }
    }
    await signInWithPopup(this.fb.auth, provider);
  }

  async createAccount(email: string, password: string): Promise<void> {
    const current = this.fb.auth.currentUser;
    const cred = EmailAuthProvider.credential(email, password);
    const result = current?.isAnonymous
      ? await linkWithCredential(current, cred)
      : await createUserWithEmailAndPassword(this.fb.auth, email, password);
    await sendEmailVerification(result.user);
    await this.refresh();
  }

  async emailSignIn(email: string, password: string): Promise<void> {
    const current = this.fb.auth.currentUser;
    if (current?.isAnonymous) {
      await this.switchFromAnonymous(EmailAuthProvider.credential(email, password));
      return;
    }
    await signInWithEmailAndPassword(this.fb.auth, email, password);
  }

  resetPassword(email: string): Promise<void> {
    return sendPasswordResetEmail(this.fb.auth, email);
  }

  signOut(): Promise<void> {
    return signOut(this.fb.auth);
  }

  /**
   * The visitor already has an account. Sign into it, then ask the server to move
   * everything the anonymous session created (applications, drafts, messages) across.
   */
  private async switchFromAnonymous(cred: AuthCredential): Promise<void> {
    const anon = this.fb.auth.currentUser;
    const anonIdToken = anon ? await anon.getIdToken() : null;
    await signInWithCredential(this.fb.auth, cred);
    if (anonIdToken) {
      try {
        await httpsCallable(this.fb.functions, 'mergeAnonymous')({ anonIdToken });
      } catch (err) {
        console.error('Could not move anonymous data', err);
      }
    }
  }

  private async refresh(): Promise<void> {
    const u = this.fb.auth.currentUser;
    if (!u) return;
    await u.reload();
    await u.getIdToken(true);
    this.user.set(null);
    this.user.set(this.fb.auth.currentUser);
  }
}

export function authErrorMessage(e: unknown): string {
  const code = (e as AuthError)?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'That email and password do not match.',
    'auth/wrong-password': 'That email and password do not match.',
    'auth/user-not-found': 'No account uses that email yet.',
    'auth/email-already-in-use': 'An account already uses this email. Sign in instead.',
    'auth/weak-password': 'Use at least 8 characters for the password.',
    'auth/invalid-email': 'That email address does not look right.',
    'auth/popup-closed-by-user': 'The sign in window was closed before finishing.',
    'auth/too-many-requests': 'Too many attempts. Please wait a minute and try again.',
    'auth/network-request-failed': 'Network problem. Check your connection and try again.',
  };
  return map[code] ?? 'Something went wrong. Please try again.';
}
