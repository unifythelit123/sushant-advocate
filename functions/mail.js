/**
 * Sends email as connectwithalc@gmail.com through the Gmail API.
 * Credentials come from an OAuth client in the separate Gmail GCP project,
 * with a refresh token issued for connectwithalc@gmail.com (scope gmail.send).
 */
export const SENDER = 'connectwithalc@gmail.com';
export const SENDER_NAME = 'Ambedkarite Lawyers Collective';

let cached = { token: '', expires: 0 };

async function accessToken({ clientId, clientSecret, refreshToken }) {
  if (cached.token && Date.now() < cached.expires - 60_000) return cached.token;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Gmail token error ${res.status}: ${JSON.stringify(json)}`);
  cached = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return cached.token;
}

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const wrap = (s) => s.replace(/.{1,76}/g, '$&\r\n');
const header = (s) => `=?UTF-8?B?${b64(s)}?=`;

export async function sendMail(creds, { to, subject, html, replyTo }) {
  const lines = [
    `From: ${header(SENDER_NAME)} <${SENDER}>`,
    `To: ${to}`,
    `Subject: ${header(subject)}`,
    ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap(b64(html)),
  ];
  const raw = Buffer.from(lines.join('\r\n'), 'utf8').toString('base64url');
  const token = await accessToken(creds);
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) throw new Error(`Gmail send error ${res.status}: ${await res.text()}`);
}

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function layout(title, bodyHtml, cta) {
  const button = cta
    ? `<p style="margin:28px 0 8px"><a href="${esc(cta.url)}" style="background:#000000;color:#fff;text-decoration:none;padding:12px 20px;border-radius:2px;font-weight:600;display:inline-block">${esc(cta.label)}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Inter,Segoe UI,Arial,sans-serif;color:#000000">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid #000000;border-radius:0">
  <tr><td style="padding:22px 28px;background:#000000;border-radius:0;color:#fff;font-family:Georgia,serif;font-size:18px;font-weight:600">Ambedkarite Lawyers Collective</td></tr>
  <tr><td style="padding:28px;font-size:15px;line-height:1.6">
  <h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 14px">${esc(title)}</h1>
  ${bodyHtml}${button}
  </td></tr>
  <tr><td style="padding:16px 28px;border-top:1px solid #e4e4e4;font-size:12px;color:#555555">Justice Through Law. You received this because you contacted the Ambedkarite Lawyers Collective.</td></tr>
  </table></td></tr></table></body></html>`;
}

export function rows(pairs) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px">${pairs
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px 8px 0;color:#555555;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:8px 0;white-space:pre-wrap">${esc(v)}</td></tr>`,
    )
    .join('')}</table>`;
}
