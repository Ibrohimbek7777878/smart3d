/* TELEFON + SMS KIRISH (TZ-07, qoida S1)
 * 6 xonali kod, 5 daqiqa, 5 urinish, qayta yuborish 60 soniyadan keyin. Kod bazada faqat HMAC ko'rinishida. SMS — Eskiz.uz (sms.js).
 * Eskiz sozlanmagan bo'lsa: production'da 503, dev/test'da kod javobda qaytadi (dev_code) — faqat o'z bazasida sinash uchun (S8). */
import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { smsConfigured, sendSms, SMS_TEXT } from '../sms.js';
import { BCRYPT_COST } from '../lib/auth.js';
import { rateLimit } from '../lib/limit.js';
import { ah, fail } from '../lib/xato.js';
import { str, plainText, phone } from '../lib/tekshir.js';

const CODE_TTL = 5 * 60 * 1000, RESEND_MS = 60 * 1000, MAX_ATTEMPTS = 5;

export default function authSmsRouter({ db, jurnal, cfg, sendSession }) {
  const r = express.Router();
  const { PROD, JWT_SECRET } = cfg;
  const smsSendLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });   // TZ-07: 10 SMS / soat / IP
  const smsVerifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }); // 20 xato kod / 15 daq / IP
  const codeHash = (p, code) => crypto.createHmac('sha256', JWT_SECRET).update(p + ':' + code).digest('hex');

  r.post('/api/auth/sms/send', smsSendLimiter.check, ah(async (req, res) => {
    const p = phone((req.body || {}).phone);
    const now = Date.now();
    const old = db.prepare('SELECT sent_at FROM sms_codes WHERE phone = ?').get(p);
    if (old && now - old.sent_at < RESEND_MS) {
      return fail(res, 'S3D-AUTH-012', null, { retry_after: Math.ceil((RESEND_MS - (now - old.sent_at)) / 1000) });
    }
    if (PROD && !smsConfigured()) return fail(res, 'S3D-AUTH-010');
    smsSendLimiter.hit(req);
    const code = String(crypto.randomInt(100000, 1000000));
    db.prepare(`INSERT INTO sms_codes (phone, code_hash, expires_at, attempts, sent_at) VALUES (?, ?, ?, 0, ?)
      ON CONFLICT(phone) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, sent_at = excluded.sent_at`)
      .run(p, codeHash(p, code), now + CODE_TTL, now);
    if (smsConfigured()) {
      try { await sendSms(p, SMS_TEXT(code)); }
      catch (e) {
        jurnal.error({ code: 'S3D-AUTH-011', rid: req.rid, method: req.method, path: req.path, status: 502, msg: 'SMS yuborilmadi: ' + e.message });
        res.locals.logged = true;
        db.prepare('DELETE FROM sms_codes WHERE phone = ?').run(p);
        return fail(res, 'S3D-AUTH-011');
      }
      return res.json({ ok: true, ttl: CODE_TTL / 1000 });
    }
    console.warn(`DEV: SMS sozlanmagan — ${p.slice(0, 5)}*****${p.slice(-2)} uchun kod: ${code}`);
    res.json({ ok: true, ttl: CODE_TTL / 1000, dev_code: code });
  }));

  r.post('/api/auth/sms/verify', smsVerifyLimiter.check, ah(async (req, res) => {
    const b = req.body || {};
    const p = phone(b.phone);
    const code = String(str(b.code, 'kod', { max: 10, required: true })).replace(/\D/g, '');
    const row = db.prepare('SELECT * FROM sms_codes WHERE phone = ?').get(p);
    if (!row || row.expires_at < Date.now()) return fail(res, 'S3D-AUTH-013');
    if (row.attempts >= MAX_ATTEMPTS) return fail(res, 'S3D-AUTH-014');
    const a = Buffer.from(codeHash(p, code)), e = Buffer.from(row.code_hash);
    if (a.length !== e.length || !crypto.timingSafeEqual(a, e)) {
      db.prepare('UPDATE sms_codes SET attempts = attempts + 1 WHERE phone = ?').run(p);
      smsVerifyLimiter.hit(req);
      return fail(res, 'S3D-AUTH-015');
    }
    db.prepare('DELETE FROM sms_codes WHERE phone = ?').run(p);
    let u = db.prepare("SELECT id, name, email, phone, role, token_version FROM users WHERE phone <> '' AND substr(phone, -9) = ?").get(p.slice(-9));
    let yangi = false;
    if (!u) {
      /* users jadvalida email va parol majburiy (eski sxema) — telefon foydalanuvchisi uchun
         ichki noyob email va ishlatib bo'lmaydigan tasodifiy parol xeshi */
      const name = plainText(b.name, 'ism', { max: 100 });
      const hash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), BCRYPT_COST);
      const ins = db.prepare('INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)')
        .run(name, `tel${p}@telefon.smart3d`, p, hash, 'user');
      u = { id: Number(ins.lastInsertRowid), name, email: `tel${p}@telefon.smart3d`, phone: p, role: 'user' };
      yangi = true;
    }
    sendSession(req, res, u, { user: { id: u.id, name: u.name, phone: u.phone, role: u.role }, yangi });
  }));

  /* TZ-23 C4: kirish usullari — sayt "Telefon orqali (SMS)" tugmasini faqat SMS ishlaganda ko'rsatadi
     (production'da — Eskiz sozlangan bo'lsa; dev/test — dev_code bilan, S8) */
  r.get('/api/auth/usullar', (req, res) => res.json({ email: true, sms: smsConfigured() || !PROD }));

  return r;
}
