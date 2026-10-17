/* AUTH API — email + parol: ro'yxat, kirish, chiqish, "men kimman".
 * X4: 5 xato parol → akkaunt 15 daqiqa yopiq; yo'q email ham shuncha vaqt oladi (DUMMY_HASH); X10: eski xesh kirishda yangilanadi. */
import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { SESS } from '../himoya.js';
import { BCRYPT_COST } from '../lib/auth.js';
import { rateLimit } from '../lib/limit.js';
import { ah, bad, fail } from '../lib/xato.js';
import { str, plainText, email, phone } from '../lib/tekshir.js';

const LOCK_AFTER = 5, LOCK_MS = 15 * 60 * 1000;           // X4: 5 xato → 15 daqiqa

export default function authRouter({ db, jurnal, cfg, auth, sendSession, cookieOpts }) {
  const r = express.Router();
  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });          // 10 xato / 15 daq
  const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: cfg.REGISTER_MAX });
  const DUMMY_HASH = bcrypt.hashSync('smart3d-dummy-' + crypto.randomBytes(8).toString('hex'), BCRYPT_COST);

  r.post('/api/register', registerLimiter.check, ah(async (req, res) => {
    registerLimiter.hit(req);
    const b = req.body || {};
    const em = email(b.email);
    const password = str(b.password, 'parol', { max: 128, required: true });
    if (password.length < 8) bad('parol kamida 8 belgi bo\'lishi kerak');
    const name = plainText(b.name, 'ism', { max: 100 });
    const shop = plainText(b.shop, 'sex nomi', { max: 100 });   // TZ-09: ixtiyoriy
    const tel = b.phone ? phone(b.phone) : '';        // S1: 998XXXXXXXXX
    if (tel && db.prepare("SELECT id FROM users WHERE phone <> '' AND substr(phone, -9) = ?").get(tel.slice(-9))) {
      return fail(res, 'S3D-AUTH-003');
    }
    const exists = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(em);
    if (exists) return fail(res, 'S3D-AUTH-002');
    const hash = await bcrypt.hash(password, BCRYPT_COST);
    const ins = db.prepare('INSERT INTO users (name, email, phone, shop, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)')
      .run(name, em, tel, shop, hash, 'user');
    const user = { id: Number(ins.lastInsertRowid), name, email: em, phone: tel, shop, role: 'user' };
    sendSession(req, res, user, { user });
  }));

  r.post('/api/login', loginLimiter.check, ah(async (req, res) => {
    const b = req.body || {};
    const em = email(b.email);
    const password = str(b.password, 'parol', { max: 128, required: true });
    /* lower(email) — eski kod emailni o'zgartirmasdan saqlagan (katta harflar bilan) */
    const u = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(em);
    const now = Date.now();
    if (u && u.locked_until > now) {                         // X4: bloklangan — to'g'ri parol ham kiritmaydi
      loginLimiter.hit(req);
      return fail(res, 'S3D-AUTH-008', null, { retry_after: Math.ceil((u.locked_until - now) / 1000) });
    }
    const ok = await bcrypt.compare(password, u ? u.password_hash : DUMMY_HASH);
    if (!u || !ok) {
      loginLimiter.hit(req);
      if (u) {
        const n = (u.failed_logins || 0) + 1;
        if (n >= LOCK_AFTER) {
          db.prepare('UPDATE users SET failed_logins = 0, locked_until = ? WHERE id = ?').run(now + LOCK_MS, u.id);
          jurnal.warn({ code: 'S3D-AUTH-008', rid: req.rid, uid: u.id, method: 'POST', path: '/api/login', status: 401, msg: 'akkaunt bloklandi: ' + LOCK_AFTER + ' ta xato parol', meta: { ip: req.ip } });
        } else db.prepare('UPDATE users SET failed_logins = ? WHERE id = ?').run(n, u.id);
      }
      return fail(res, 'S3D-AUTH-001');
    }
    if (u.failed_logins || u.locked_until) db.prepare('UPDATE users SET failed_logins = 0, locked_until = 0 WHERE id = ?').run(u.id);
    if (bcrypt.getRounds(u.password_hash) < BCRYPT_COST) {   // X10: eski (10) xesh — yangisiga
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await bcrypt.hash(password, BCRYPT_COST), u.id);
    }
    sendSession(req, res, u, { user: { id: u.id, name: u.name, email: u.email, phone: u.phone || '', shop: u.shop || '', role: u.role } });
  }));

  /* X3: "Chiqish" — shu kalit bekor (jti), cookie o'chiriladi; hammasi: true — barcha qurilmalarda (token_version) */
  r.post('/api/logout', auth, (req, res) => {
    if (req.user.jti) db.prepare('INSERT OR IGNORE INTO revoked_tokens (jti, exp) VALUES (?, ?)').run(req.user.jti, req.user.exp || Math.floor(Date.now() / 1000) + 86400);
    if ((req.body || {}).hammasi === true) db.prepare('UPDATE users SET token_version = token_version + 1 WHERE id = ?').run(req.user.id);
    res.clearCookie(SESS, cookieOpts);
    res.json({ ok: true });
  });

  r.get('/api/me', auth, (req, res) => {
    const u = db.prepare('SELECT id, name, email, phone, shop, role, telegram_id FROM users WHERE id = ?').get(req.user.id);
    if (!u) return fail(res, 'S3D-AUTH-007');
    const { telegram_id: tg, ...rest } = u;
    res.json({ ...rest, telegram: !!tg });
  });

  return r;
}
