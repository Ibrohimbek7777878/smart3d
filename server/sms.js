/* Smart3D — SMS yuborish: Eskiz.uz (TZ-07).
 *
 * API (notify.eskiz.uz; ochiq Eskiz mijoz kutubxonalari manbasi bilan tekshirilgan, 2026-10-15):
 *   POST {BASE}/api/auth/login          { email, password }            → data.token (JWT, ~30 kun)
 *   POST {BASE}/api/message/sms/send    { mobile_phone, message, from } Authorization: Bearer <token>
 *   401 → token eskirgan: qayta login.
 *
 * Muhit (faqat serverda, gitga kirmaydi):
 *   ESKIZ_EMAIL, ESKIZ_PASSWORD   — Eskiz akkaunti
 *   ESKIZ_FROM                    — jo'natuvchi nomi (standart '4546')
 *   ESKIZ_BASE_URL                — standart https://notify.eskiz.uz
 * Eslatma: Eskiz'da SMS matni shablon sifatida moderatsiyadan o'tishi talab qilinishi mumkin —
 * akkaunt ochilganda tekshiriladi (matn: SMS_TEXT quyida).
 */
const BASE = () => (process.env.ESKIZ_BASE_URL || 'https://notify.eskiz.uz').replace(/\/+$/, '');
let token = null;

export const SMS_TEXT = (code) => `Smart3D kirish kodi: ${code}. Kodni hech kimga bermang.`;

export function smsConfigured() {
  return !!(process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD);
}

async function post(path, body, auth) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 10000);
  try {
    return await fetch(BASE() + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(auth ? { authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify(body),
      signal: ctl.signal
    });
  } finally {
    clearTimeout(t);
  }
}

async function login() {
  const r = await post('/api/auth/login', { email: process.env.ESKIZ_EMAIL, password: process.env.ESKIZ_PASSWORD });
  if (!r.ok) throw new Error('Eskiz login: HTTP ' + r.status);
  const j = await r.json().catch(() => ({}));
  token = j && j.data && j.data.token;
  if (!token) throw new Error('Eskiz login: token kelmadi');
}

/** phone: 998XXXXXXXXX. Xato bo'lsa — Error (matn mijozga chiqmaydi, faqat logga). */
export async function sendSms(phone, text) {
  if (!token) await login();
  const body = { mobile_phone: phone, message: text, from: process.env.ESKIZ_FROM || '4546' };
  let r = await post('/api/message/sms/send', body, true);
  if (r.status === 401) { await login(); r = await post('/api/message/sms/send', body, true); }
  if (!r.ok) throw new Error('Eskiz SMS: HTTP ' + r.status);
  return r.json().catch(() => ({}));
}
