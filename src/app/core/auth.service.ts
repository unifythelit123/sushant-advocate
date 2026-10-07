import { Injectable, computed, inject, signal } from '@angular/core';
import {
  AuthCredential,
  AuthError,
  ConfirmationResult,
  EmailAuthProvider,
  GoogleAuthProvider,
  PhoneAuthProvider,
  RecaptchaVerifier,
  User,
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  linkWithCredential,
  linkWithPhoneNumber,
  linkWithPopup,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { ADMIN_EMAILS } from './firebase.config';
import { FirebaseService } from './firebase.service';

const LINK_EMAIL_KEY = 'alc.emailForSignIn';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private fb = inject(FirebaseService);

  readonly user = signal<User | null>(null);
  readonly ready = signal(false);

  /** A person with a real account (Google, email or phone), not a silent anonymous session. */
  readonly member = computed(() => {
    const u = this.user();
    return u && !u.isAnonymous ? u : null;
  });

  readonly isAdmin = computed(() => {
    const u = this.user();
    return !!u?.email && u.emailVerified && ADMIN_EMAILS.includes(u.email.toLowerCase());
  });

  private readyPromise: Promise<void>;
  private recaptcha?: RecaptchaVerifier;

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

  /** Quiet anonymous session so a draft or CV has an owner. Never required: returns null if unavailable. */
  async tryUser(): Promise<User | null> {
    await this.whenReady();
    const current = this.fb.auth.currentUser;
    if (current) return current;
    try {
      const cred = await signInAnonymously(this.fb.auth);
      this.user.set(cred.user);
      return cred.user;
    } catch (e) {
      console.warn('Anonymous session unavailable, continuing as guest', e);
      return null;
    }
  }

  /* ---------- Google ---------- */

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

  /* ---------- email and password ---------- */

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

  /* ---------- email link (no password) ---------- */

  async sendEmailLink(email: string): Promise<void> {
    await sendSignInLinkToEmail(this.fb.auth, email, {
      url: `${location.origin}/login?finish=1`,
      handleCodeInApp: true,
    });
    try {
      localStorage.setItem(LINK_EMAIL_KEY, email);
    } catch {
      /* ignore */
    }
  }

  isEmailLink(url: string): boolean {
    return isSignInWithEmailLink(this.fb.auth, url);
  }

  storedLinkEmail(): string {
    try {
      return localStorage.getItem(LINK_EMAIL_KEY) ?? '';
    } catch {
      return '';
    }
  }

  async completeEmailLink(email: string, url: string): Promise<void> {
    await this.whenReady();
    const cred = EmailAuthProvider.credentialWithLink(email, url);
    const current = this.fb.auth.currentUser;
    if (current?.isAnonymous) {
      try {
        await linkWithCredential(current, cred);
        await this.refresh();
      } catch (e) {
        if ((e as AuthError).code !== 'auth/credential-already-in-use' && (e as AuthError).code !== 'auth/email-already-in-use') throw e;
        await this.switchFromAnonymous(EmailAuthProvider.credentialWithLink(email, url));
      }
    } else {
      await signInWithCredential(this.fb.auth, cred);
    }
    try {
      localStorage.removeItem(LINK_EMAIL_KEY);
    } catch {
      /* ignore */
    }
  }

  /* ---------- phone OTP ---------- */

  /** Sends an SMS code. `buttonId` is the element the invisible reCAPTCHA attaches to. */
  async sendPhoneCode(phone: string, buttonId: string): Promise<ConfirmationResult> {
    this.recaptcha?.clear();
    this.recaptcha = new RecaptchaVerifier(this.fb.auth, buttonId, { size: 'invisible' });
    const current = this.fb.auth.currentUser;
    return current?.isAnonymous
      ? linkWithPhoneNumber(current, phone, this.recaptcha)
      : signInWithPhoneNumber(this.fb.auth, phone, this.recaptcha);
  }

  async confirmPhoneCode(result: ConfirmationResult, code: string): Promise<void> {
    try {
      await result.confirm(code);
      await this.refresh();
    } catch (e) {
      const cred = PhoneAuthProvider.credentialFromError(e as AuthError);
      if (!cred || (e as AuthError).code !== 'auth/credential-already-in-use') throw e;
      await this.switchFromAnonymous(cred);
    }
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
    const anonIdToken = anon?.isAnonymous ? await anon.getIdToken() : null;
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

/** Indian numbers typed as 10 digits get +91; anything else must already start with +. */
export function toE164(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '');
  if (/^\+\d{8,15}$/.test(digits)) return digits;
  const plain = digits.replace(/^0+/, '');
  if (/^\d{10}$/.test(plain)) return `+91${plain}`;
  if (/^91\d{10}$/.test(plain)) return `+${plain}`;
  return null;
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
    'auth/popup-blocked': 'Your browser blocked the sign in window. Allow pop ups and try again.',
    'auth/too-many-requests': 'Too many attempts. Please wait a minute and try again.',
    'auth/network-request-failed': 'Network problem. Check your connection and try again.',
    'auth/admin-restricted-operation': 'This sign in method is not switched on yet. Please try another.',
    'auth/operation-not-allowed': 'This sign in method is not switched on yet. Please try another.',
    'auth/unauthorized-domain': 'Sign in is not yet allowed on this web address.',
    'auth/invalid-phone-number': 'That phone number does not look right.',
    'auth/invalid-verification-code': 'That code is not correct. Please check the SMS.',
    'auth/code-expired': 'That code has expired. Send a new one.',
    'auth/invalid-action-code': 'This sign in link has expired or was already used. Request a new one.',
  };
  return map[code] ?? 'Something went wrong. Please try again.';
}
