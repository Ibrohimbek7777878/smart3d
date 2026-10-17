/* Kirish (auth) qatlami — TZ-19 X2/X3: kalit sarlavhada (Bearer, eski sayt) yoki httpOnly cookie'da (yangi sayt).
 * Tekshiruv: imzo, muddat, "Chiqish" qilinmagan (jti), parol almashmagan (token_version). Cookie bilan yozuvchi so'rov —
 * faqat shu saytdan (CSRF). Yozish — 60 / daqiqa / foydalanuvchi (X5). */
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { SESS, msOf, cookieOf, sameOrigin } from '../himoya.js';
import { fail } from './xato.js';
import { rateLimit } from './limit.js';

export const BCRYPT_COST = 12;                                    // X10 (eski xeshlar kirishda yangilanadi)

/** Standart admin paroli bilan ishlamaymiz: production'da — to'xtaydi, dev'da — ogohlantirish */
export function zaifAdminTekshir(db, prod) {
  const admins = db.prepare("SELECT email, password_hash FROM users WHERE role = 'admin'").all();
  const weak = admins.filter(a => bcrypt.compareSync('admin123', a.password_hash)).map(a => a.email);
  if (weak.length) {
    const msg = `standart 'admin123' paroli: ${weak.join(', ')} — almashtiring: ADMIN_PASSWORD='…' npm run admin-password`;
    if (prod) { console.error('XATO: ' + msg); process.exit(1); }
    console.warn('DIQQAT: ' + msg);
  }
}

/** → { auth, adminOnly, readToken, verifyToken, optUser, sendSession, cookieOpts } */
export function createAuth({ db, cfg }) {
  const { JWT_SECRET, JWT_EXPIRES, PROD, ALLOWED_ORIGINS } = cfg;
  const writeLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, key: (req) => 'u' + req.user.id });   // yozish — 60 / daqiqa / foydalanuvchi
  const COOKIE_MS = msOf(JWT_EXPIRES);
  const cookieOpts = { httpOnly: true, secure: PROD, sameSite: 'strict', path: '/' };
  const isRevoked = db.prepare('SELECT 1 FROM revoked_tokens WHERE jti = ?');
  const userTv = db.prepare('SELECT token_version FROM users WHERE id = ?');

  function readToken(req) {
    const h = req.headers.authorization || '';
    if (h.startsWith('Bearer ')) return { token: h.slice(7), via: 'bearer' };
    const c = cookieOf(req, SESS);
    return c ? { token: c, via: 'cookie' } : null;
  }
  function verifyToken(token) {
    try {
      const p = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      if (p.jti && isRevoked.get(p.jti)) return null;
      const u = userTv.get(p.id);
      if (!u || (u.token_version || 0) !== (p.tv || 0)) return null;
      return p;
    } catch (e) { return null; }
  }
  function auth(req, res, next) {
    const t = readToken(req);
    if (!t) return fail(res, 'S3D-AUTH-004');
    const p = verifyToken(t.token);
    if (!p) { if (t.via === 'cookie') res.clearCookie(SESS, cookieOpts); return fail(res, 'S3D-AUTH-005'); }
    if (t.via === 'cookie' && !sameOrigin(req, ALLOWED_ORIGINS)) return fail(res, 'S3D-AUTH-009');
    req.user = p; req.authVia = t.via;
    if (req.method !== 'GET' && req.method !== 'HEAD') return writeLimiter.take(req, res, next);   // X5
    next();
  }
  function adminOnly(req, res, next) {
    if (req.user?.role !== 'admin') return fail(res, 'S3D-AUTH-006');
    next();
  }
  /** kirgan bo'lsa — foydalanuvchi, aks holda null (kirish shart bo'lmagan yo'llar uchun: /api/log) */
  const optUser = (req) => { const t = readToken(req); return t ? verifyToken(t.token) : null; };
  const signToken = (u) => jwt.sign({ id: u.id, email: u.email, role: u.role, tv: u.token_version || 0, jti: crypto.randomBytes(12).toString('hex') },
    JWT_SECRET, { expiresIn: JWT_EXPIRES, algorithm: 'HS256' });
  /** kirish javobi: kalit cookie'ga yoziladi; yangi sayt (sessiya: 'cookie') kalitni javobda olmaydi — JS uni hech qachon ko'rmaydi */
  function sendSession(req, res, u, body, { cookie = true } = {}) {
    const token = signToken(u);
    if (cookie) res.cookie(SESS, token, { ...cookieOpts, maxAge: COOKIE_MS });
    res.json(cookie && req.body && req.body.sessiya === 'cookie' ? body : { token, ...body });
  }
  return { auth, adminOnly, readToken, verifyToken, optUser, sendSession, cookieOpts };
}
