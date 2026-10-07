import { Injectable, inject } from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { Message, Thread } from './models';

/**
 * One private conversation per person: threads/{uid}/messages.
 * The thread summary (last message, unread flags) is maintained by a Cloud Function.
 */
@Injectable({ providedIn: 'root' })
export class ThreadService {
  private fb = inject(FirebaseService);

  watchMessages(uid: string, cb: (m: Message[]) => void, onError?: (e: unknown) => void) {
    return onSnapshot(
      query(collection(this.fb.db, 'threads', uid, 'messages'), orderBy('at', 'asc'), limit(500)),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Message)),
      onError,
    );
  }

  watchThread(uid: string, cb: (t: Thread | null) => void) {
    return onSnapshot(
      doc(this.fb.db, 'threads', uid),
      (snap) => cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Thread) : null),
      () => cb(null),
    );
  }

  watchAllThreads(cb: (t: Thread[]) => void, onError?: (e: unknown) => void) {
    return onSnapshot(
      query(collection(this.fb.db, 'threads'), orderBy('lastAt', 'desc'), limit(300)),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Thread)),
      onError,
    );
  }

  send(uid: string, from: 'user' | 'admin', text: string) {
    return addDoc(collection(this.fb.db, 'threads', uid, 'messages'), {
      from,
      text: text.trim(),
      at: serverTimestamp(),
    });
  }

  markRead(uid: string, side: 'user' | 'admin') {
    const field = side === 'admin' ? 'unreadForAdmin' : 'unreadForUser';
    return updateDoc(doc(this.fb.db, 'threads', uid), { [field]: false }).catch(() => undefined);
  }
}
