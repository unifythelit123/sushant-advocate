import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { FUNCTIONS_REGION, firebaseConfig } from './firebase.config';

/** Firebase is only ever touched in the browser. Server rendering never calls these getters. */
@Injectable({ providedIn: 'root' })
export class FirebaseService {
  readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private _app?: FirebaseApp;

  get app(): FirebaseApp {
    return (this._app ??= getApps()[0] ?? initializeApp(firebaseConfig));
  }
  get auth() {
    return getAuth(this.app);
  }
  get db() {
    return getFirestore(this.app);
  }
  get storage() {
    return getStorage(this.app);
  }
  get functions() {
    return getFunctions(this.app, FUNCTIONS_REGION);
  }
}
