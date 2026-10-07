import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { SENDER, esc, layout, rows, sendMail } from './mail.js';

initializeApp();
const db = getFirestore();

// Strictly pay per use: nothing kept warm.
setGlobalOptions({ region: 'asia-south1', minInstances: 0, maxInstances: 3, memory: '256MiB' });

const GMAIL_CLIENT_ID = defineSecret('GMAIL_CLIENT_ID');
const GMAIL_CLIENT_SECRET = defineSecret('GMAIL_CLIENT_SECRET');
const GMAIL_REFRESH_TOKEN = defineSecret('GMAIL_REFRESH_TOKEN');
const SITE_URL = defineString('SITE_URL', { default: 'https://sushant-advocate.web.app' });
const ADMIN_INBOX = defineString('ADMIN_INBOX', { default: SENDER });

const secrets = [GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN];
const creds = () => ({
  clientId: GMAIL_CLIENT_ID.value(),
  clientSecret: GMAIL_CLIENT_SECRET.value(),
  refreshToken: GMAIL_REFRESH_TOKEN.value(),
});
const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || 'there';
const preview = (t, n = 140) => (t.length > n ? `${t.slice(0, n)}...` : t);

/** New application: email the coordinator, confirm to the applicant, open their conversation. */
export const onApplication = onDocumentCreated({ document: 'applications/{id}', secrets }, async (event) => {
  const a = event.data?.data();
  if (!a) return;
  const site = SITE_URL.value();
  const profession = a.profession === 'Other' ? a.professionOther : a.profession;

  await db.doc(`threads/${a.uid}`).set(
    {
      name: a.name,
      email: a.email,
      lastMessage: `Application submitted as ${profession}`,
      lastFrom: 'user',
      lastAt: FieldValue.serverTimestamp(),
      unreadForAdmin: true,
      unreadForUser: false,
    },
    { merge: true },
  );

  const jobs = [
    sendMail(creds(), {
      to: ADMIN_INBOX.value(),
      replyTo: a.email,
      subject: `New application: ${a.name} (${profession})`,
      html: layout(
        `New application from ${a.name}`,
        rows([
          ['Name', a.name],
          ['Email', a.email],
          ['Contact', a.contact],
          ['Profession', profession],
          ['Current city', a.currentCity],
          ['Home', `${a.homeCity}, ${a.homeState}`],
          ['Education', a.education],
          ['LinkedIn', a.linkedin],
          ['Statement of purpose', a.purpose],
          ['Expertise', a.expertise],
          ['Past experience', a.experience],
          ['Remarks', a.remarks],
          ['CV attached', a.cvPath ? 'Yes, open it in the console' : 'No'],
        ]),
        { label: 'Open the console', url: `${site}/console` },
      ),
    }),
    sendMail(creds(), {
      to: a.email,
      subject: 'We have received your application',
      html: layout(
        `Thank you, ${firstName(a.name)}`,
        `<p>Your application to join the Ambedkarite Lawyers Collective has reached us. Sushant reads every application personally, and you will hear back by email.</p>
         <p>If you would like to follow your application and write to Sushant directly, you can sign in with this email address at any time.</p>`,
        { label: 'Open my messages', url: `${site}/messages` },
      ),
    }),
  ];
  const results = await Promise.allSettled(jobs);
  results.forEach((r) => r.status === 'rejected' && logger.error('Application email failed', r.reason));
});

/** New message in a private conversation: update the summary and email the other side. */
export const onMessage = onDocumentCreated({ document: 'threads/{uid}/messages/{mid}', secrets }, async (event) => {
  const m = event.data?.data();
  if (!m || m.moved) return;
  const { uid } = event.params;
  const threadRef = db.doc(`threads/${uid}`);
  const site = SITE_URL.value();

  let thread = (await threadRef.get()).data() ?? {};
  if (!thread.email || !thread.name) {
    try {
      const user = await getAuth().getUser(uid);
      thread = { ...thread, email: thread.email || user.email || '', name: thread.name || user.displayName || user.email || 'Visitor' };
    } catch {
      /* anonymous visitor with no profile */
    }
  }

  await threadRef.set(
    {
      name: thread.name || 'Visitor',
      email: thread.email || '',
      lastMessage: preview(m.text),
      lastFrom: m.from,
      lastAt: FieldValue.serverTimestamp(),
      ...(m.from === 'user' ? { unreadForAdmin: true } : { unreadForUser: true }),
    },
    { merge: true },
  );

  try {
    if (m.from === 'user') {
      await sendMail(creds(), {
        to: ADMIN_INBOX.value(),
        subject: `New message from ${thread.name || 'a visitor'}`,
        html: layout(
          `${thread.name || 'A visitor'} wrote to you`,
          `<p style="white-space:pre-wrap;padding:14px 16px;background:#f6f4ef;border-radius:8px">${esc(m.text)}</p>
           <p style="color:#5d6578;font-size:13px">Reply in the console so the whole conversation stays in one place.</p>`,
          { label: 'Reply in the console', url: `${site}/console` },
        ),
      });
    } else if (thread.email) {
      await sendMail(creds(), {
        to: thread.email,
        subject: 'Sushant has replied to you',
        html: layout(
          `A reply from Sushant`,
          `<p>Hello ${esc(firstName(thread.name))},</p>
           <p style="white-space:pre-wrap;padding:14px 16px;background:#f6f4ef;border-radius:8px">${esc(m.text)}</p>
           <p style="color:#5d6578;font-size:13px">To reply, sign in with this email address and open your messages. Replies sent from this email are not read.</p>`,
          { label: 'Reply on the website', url: `${site}/messages` },
        ),
      });
    }
  } catch (err) {
    logger.error('Message email failed', err);
  }
});

/**
 * A visitor who applied anonymously later signs into an account that already exists.
 * Move everything the anonymous session owned onto that account.
 */
export const mergeAnonymous = onCall(async (req) => {
  const uid = req.auth?.uid;
  const token = req.data?.anonIdToken;
  if (!uid || req.auth.token.firebase?.sign_in_provider === 'anonymous') {
    throw new HttpsError('unauthenticated', 'Sign in first.');
  }
  if (typeof token !== 'string') throw new HttpsError('invalid-argument', 'Missing token.');

  let anon;
  try {
    anon = await getAuth().verifyIdToken(token);
  } catch {
    throw new HttpsError('permission-denied', 'That session has expired.');
  }
  if (anon.firebase?.sign_in_provider !== 'anonymous' || anon.uid === uid) {
    throw new HttpsError('permission-denied', 'Nothing to move.');
  }
  const from = anon.uid;
  const batch = db.batch();

  const apps = await db.collection('applications').where('uid', '==', from).get();
  apps.forEach((d) => batch.update(d.ref, { uid }));

  const msgs = await db.collection(`threads/${from}/messages`).get();
  msgs.forEach((d) => {
    batch.set(db.doc(`threads/${uid}/messages/${d.id}`), { ...d.data(), moved: true });
    batch.delete(d.ref);
  });
  const oldThread = await db.doc(`threads/${from}`).get();
  if (oldThread.exists) {
    batch.set(db.doc(`threads/${uid}`), oldThread.data(), { merge: true });
    batch.delete(oldThread.ref);
  }

  const draft = await db.doc(`drafts/${from}`).get();
  if (draft.exists) {
    const mine = await db.doc(`drafts/${uid}`).get();
    if (!mine.exists) batch.set(db.doc(`drafts/${uid}`), draft.data());
    batch.delete(draft.ref);
  }

  await batch.commit();
  await getAuth().deleteUser(from).catch(() => undefined);
  return { moved: apps.size };
});
