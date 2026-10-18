/* GOOGLE BILAN KIRISH (TZ-31 A): POST /api/auth/google { credential, sessiya }.
 * GOOGLE_CLIENT_ID yo'q — 503. Email bazada bor → shu akkauntga kirish va google_sub bog'lanadi; yo'q → yangi oddiy foydalanuvchi
 * (parol ishlatib bo'lmaydigan tasodifiy xesh). Boshqa Google akkaunt bilan bog'langan email — rad (S3D-AUTH-018). */
import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '../lib/auth.js';
import { rateLimit } from '../lib/limit.js';
import { ah, fail } from '../lib/xato.js';
import { googleTokenTekshir } from '../lib/google.js';

export const googleClientId = () => (process.env.GOOGLE_CLIENT_ID || '').trim();

export default function authGoogleRouter({ db, jurnal, sendSession }) {
  const r = express.Router();
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });          // 20 xato urinish / 15 daq / IP
  const log = (req, code, status, msg) => jurnal.warn({ code, rid: req.rid, method: 'POST', path: '/api/auth/google', status, msg, meta: { ip: req.ip } });

  r.post('/api/auth/google', limiter.check, ah(async (req, res) => {
    const cid = googleClientId();
    if (!cid) return fail(res, 'S3D-AUTH-016');
    let p;
    try { p = await googleTokenTekshir((req.body || {}).credential, cid); }
    catch (e) {
      if (e.tarmoq) { jurnal.error({ code: 'S3D-AUTH-020', rid: req.rid, method: 'POST', path: req.path, status: 502, msg: e.message }); res.locals.logged = true; return fail(res, 'S3D-AUTH-020'); }
      limiter.hit(req); log(req, 'S3D-AUTH-017', 401, 'Google token rad: ' + e.message); res.locals.logged = true;
      return fail(res, 'S3D-AUTH-017');
    }
    if (p.email_verified !== true && p.email_verified !== 'true') { limiter.hit(req); log(req, 'S3D-AUTH-019', 403, 'Google email tasdiqlanmagan'); res.locals.logged = true; return fail(res, 'S3D-AUTH-019'); }
    const sub = String(p.sub), em = String(p.email).trim().toLowerCase();
    let u = db.prepare('SELECT * FROM users WHERE google_sub = ?').get(sub) || db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(em);
    let yangi = false;
    if (u && u.google_sub && u.google_sub !== sub) { limiter.hit(req); log(req, 'S3D-AUTH-018', 409, 'email boshqa Google akkauntga bog\'langan'); res.locals.logged = true; return fail(res, 'S3D-AUTH-018'); }
    if (u && !u.google_sub) db.prepare('UPDATE users SET google_sub = ? WHERE id = ?').run(sub, u.id);
    if (!u) {
      const name = String(p.name || em.split('@')[0]).replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 100) || em.split('@')[0];
      const hash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), BCRYPT_COST);
      const ins = db.prepare('INSERT INTO users (name, email, password_hash, role, google_sub) VALUES (?, ?, ?, ?, ?)').run(name, em, hash, 'user', sub);
      u = { id: Number(ins.lastInsertRowid), name, email: em, phone: '', shop: '', role: 'user', token_version: 0 };
      yangi = true;
    }
    sendSession(req, res, u, { user: { id: u.id, name: u.name, email: u.email, phone: u.phone || '', shop: u.shop || '', role: u.role }, yangi });
  }));

  return r;
}
