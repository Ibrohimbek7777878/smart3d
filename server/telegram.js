/* TZ-16: Telegram Mini App — server tomoni (core.telegram.org/bots/webapps).
 *   • initData imzosi: secret = HMAC_SHA256(key = "WebAppData", bot_token); hash = hex(HMAC_SHA256(secret, data_check_string)),
 *     data_check_string — olingan maydonlar "kalit=qiymat", kalit bo'yicha alifbo tartibida, "\n" bilan (hash'siz).
 *     Bot API 8.0 dan `signature` (Ed25519, uchinchi tomon uchun) ham keladi — hujjat uni HMAC satriga kiritish-kiritmaslikni
 *     aniq aytmaydi, shuning uchun ikkala satr ham tekshiriladi (ikkalasi ham bot kalitini talab qiladi — soxtalashtirib bo'lmaydi).
 *     Taqqoslash — vaqtga chidamli (timingSafeEqual); eskirgan (auth_date) ma'lumot rad etiladi.
 *   • telefon: requestContact callback'i faqat true/false beradi (imzolangan javob hujjatlashtirilmagan) — raqam bot chatiga
 *     xabar bo'lib keladi, server uni webhook orqali oladi (maxfiy sarlavha bilan; faqat o'z raqami: contact.user_id = from.id).
 *   • faylni bot orqali foydalanuvchining o'z chatiga yuborish (sendDocument).
 * Bot kaliti faqat server muhitida (TELEGRAM_BOT_TOKEN) — kodda yo'q, javobda qaytmaydi, jurnalga yozilmaydi. */
import crypto from 'crypto';

export const TG_API = () => (process.env.TELEGRAM_API_URL || 'https://api.telegram.org').replace(/\/+$/, '');
export const tgToken = () => (process.env.TELEGRAM_BOT_TOKEN || '').trim();
export const TG_EMAIL = (id) => `tg${id}@telegram.smart3d`;        // Telegram akkaunti belgisi (email majburiy; SMS'dagi tel…@telefon.smart3d kabi)

/** imzolangan satr (query string) → Map yoki null (imzo noto'g'ri / eskirgan / buzuq) */
export function tgImzo(raw, token, { maxAgeSec = 86400, now = Date.now() } = {}) {
  if (typeof raw !== 'string' || !raw || raw.length > 8192 || !token) return null;
  let p;
  try { p = new URLSearchParams(raw); } catch (e) { return null; }
  const hash = p.get('hash') || '';
  if (!/^[a-f0-9]{64}$/.test(hash)) return null;
  const qator = (tashqari) => [...p.entries()].filter(([k]) => !tashqari.includes(k)).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => k + '=' + v).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const mos = (q) => crypto.timingSafeEqual(crypto.createHmac('sha256', secret).update(q).digest(), Buffer.from(hash, 'hex'));
  if (!mos(qator(['hash'])) && !(p.has('signature') && mos(qator(['hash', 'signature'])))) return null;
  const sana = Number(p.get('auth_date'));
  const t = now / 1000;
  if (!Number.isFinite(sana) || sana <= 0 || t - sana > maxAgeSec || sana - t > 300) return null;   // eskirgan yoki kelajakdan
  return p;
}

const json = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };

/** initData → { tgId, ism } | null */
export function initDataTekshir(raw, token, opt) {
  const p = tgImzo(raw, token, opt);
  if (!p) return null;
  const u = json(p.get('user') || '');
  if (!u || !Number.isSafeInteger(u.id) || u.id <= 0) return null;
  const ism = [u.first_name, u.last_name].filter(x => typeof x === 'string').join(' ').replace(/[<>]/g, '').trim().slice(0, 100);
  return { tgId: u.id, ism, lang: typeof u.language_code === 'string' ? u.language_code.slice(0, 5) : '' };
}

/** Bot webhook'idan kelgan kontakt → { tgId, phone } | null: faqat foydalanuvchi o'z raqamini ulashgan bo'lsa (contact.user_id = from.id) */
export function webhookKontakt(update) {
  const m = update && update.message;
  const c = m && m.contact;
  if (!c || !m.from || !Number.isSafeInteger(m.from.id) || c.user_id !== m.from.id || typeof c.phone_number !== 'string') return null;
  return { tgId: m.from.id, phone: c.phone_number.replace(/\D/g, '') };
}

/** Bot API chaqiruvi (kalit faqat URL ichida, xato matniga kirmaydi) */
export async function tgApi(metod, body) {
  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), 30000);
  try {
    const r = await fetch(`${TG_API()}/bot${tgToken()}/${metod}`, body instanceof FormData ? { method: 'POST', body, signal: ctl.signal }
      : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}), signal: ctl.signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error('Telegram ' + metod + ': ' + (j.description || r.status));
    return j.result;
  } finally { clearTimeout(tm); }
}

/** Bot orqali hujjat: faqat chat_id = foydalanuvchining Telegram ID'si (server tanlaydi, so'rov emas) */
export async function hujjatYubor(chatId, { nom, bytes, mime }) {
  const fd = new FormData();
  fd.set('chat_id', String(chatId));
  fd.set('document', new Blob([bytes], { type: mime || 'application/octet-stream' }), nom);
  await tgApi('sendDocument', fd);
  return true;
}
