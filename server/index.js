/* Smart3D Server — API + Auth + Real-time narx (SQLite)
 *
 * Boshlash:  npm ci && ADMIN_PASSWORD='…' npm run init-db && npm start
 * Port: 3000 (PORT)
 *
 * Muhit o'zgaruvchilari (TZ-SAYT-BARQARORLIK-RESPONSIVE §6):
 *   JWT_SECRET       — majburiy (production). Dev rejimida yo'q bo'lsa tasodifiy kalit
 *                      yaratiladi (server qayta ishga tushsa tokenlar bekor bo'ladi).
 *   JWT_EXPIRES      — token muddati, standart '12h'
 *   ALLOWED_ORIGINS  — CORS ruxsat etilgan manzillar, vergul bilan. Bo'sh — faqat
 *                      shu serverning o'zi (frontend shu yerdan beriladi, CORS kerak emas)
 *   DB_PATH          — SQLite fayli, standart server/smart3d.db
 *   TRUST_PROXY      — nginx ortida bo'lsa 1 (rate limit haqiqiy IP bo'yicha ishlashi uchun)
 *   NODE_ENV         — 'production' da xavfsizlik shartlari qat'iy (HSTS, Secure cookie, upgrade-insecure-requests)
 *
 * TZ-19 §3 himoya: CSP, httpOnly sessiya cookie + CSRF (Origin), chiqishda kalit bekor (jti), parol o'zgarsa — hammasi
 * (token_version), akkaunt bloklash (5 xato → 15 daq), umumiy so'rov chegarasi, loyiha hujjatini chuqur tekshirish,
 * WebSocket (Origin, 5 ulanish/IP), bcrypt 12. Tafsilot — himoya.js.
 */
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseZamer, aiBuild } from '../app/js/ai.js';
import { smsConfigured, sendSms, SMS_TEXT } from './sms.js';
import { aiConfig, llmParse, llmKonstruksiya } from './ai-llm.js';
import { XATOLAR, KOD_RE } from '../app/js/xatolar.js';
import { createJurnal } from './jurnal.js';
import { securityHeaders, inlineScriptHashes, SESS, msOf, cookieOf, sameOrigin, docXatosi, wsGuard } from './himoya.js';
import { tgToken, initDataTekshir, webhookKontakt, hujjatYubor, tgApi, TG_EMAIL } from './telegram.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROD = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
const JWT_EXPIRES = process.env.JWT_EXPIRES || '12h';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'smart3d.db');

/* JWT kaliti hech qachon kodda turmaydi (AUDIT-2026-10-14 §5: standart kalit bilan
   har kim admin token yasay olardi). */
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  if (PROD) {
    console.error('XATO: JWT_SECRET (kamida 32 belgi) o\'rnatilmagan — production server ishga tushmaydi.');
    process.exit(1);
  }
  JWT_SECRET = crypto.randomBytes(48).toString('hex');
  console.warn('DIQQAT: JWT_SECRET yo\'q — vaqtinchalik tasodifiy kalit (dev). Qayta ishga tushsa tokenlar bekor bo\'ladi.');
}

/* ── DB ulanish ── */
if (!fs.existsSync(DB_PATH)) {
  console.error(`XATO: baza topilmadi (${DB_PATH}). Avval: ADMIN_PASSWORD='…' npm run init-db`);
  process.exit(1);
}
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
/* TZ-19: jurnal — JSON qatorlar + error_log jadvali (server/jurnal.js) */
const jurnal = createJurnal(db);

/* Remnants (Delovoy qoldiqlar) jadvali — Kamchilik 9 */
db.exec(`
  CREATE TABLE IF NOT EXISTS remnants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remnant_id TEXT UNIQUE,
    material_code TEXT,
    length REAL,
    width REAL,
    thickness REAL,
    area_m2 REAL,
    status TEXT DEFAULT 'available',
    source_order_id INTEGER,
    used_order_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

/* TZ-07: telefon + SMS kirish va loyihalar — mavjud bazaga ham qo'shiladi (IF NOT EXISTS) */
db.exec(`
  CREATE TABLE IF NOT EXISTS sms_codes (
    phone TEXT PRIMARY KEY,
    code_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    attempts INTEGER DEFAULT 0,
    sent_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT DEFAULT '',
    doc_json TEXT NOT NULL,
    total_price INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id, archived);
  CREATE TABLE IF NOT EXISTS sex_std_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    old_json TEXT,
    new_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS ai_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    text TEXT DEFAULT '',
    engine TEXT DEFAULT '',
    ok INTEGER DEFAULT 0,
    result_json TEXT DEFAULT '',
    error TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
/* TZ-09: yangi maydonlar — mavjud bazaga ham qo'shiladi (eski ma'lumot o'zgarmaydi) */
function addColumn(table, col, def) {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
}
addColumn('users', 'shop', "TEXT DEFAULT ''");   // ro'yxatdagi "Sex nomi" (ixtiyoriy)
addColumn('projects', 'client', "TEXT DEFAULT ''");   // loyiha kartasidagi mijoz ismi (dizayn: "Loyihalarim")
addColumn('users', 'settings_json', "TEXT DEFAULT ''");   // dizayndagi "Sozlamalar": ustama, stanok profili, sex logosi
/* TZ-19 §3: sessiya va bloklash */
addColumn('users', 'token_version', 'INTEGER DEFAULT 0');   // oshsa — shu foydalanuvchining barcha kalitlari bekor (parol almashdi)
addColumn('users', 'failed_logins', 'INTEGER DEFAULT 0');   // ketma-ket xato parol
addColumn('users', 'locked_until', 'INTEGER DEFAULT 0');    // shu vaqtgacha kirish yopiq (ms)
addColumn('users', 'telegram_id', 'INTEGER');                // TZ-16: Telegram Mini App (bitta Telegram — bitta akkaunt)
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tg ON users(telegram_id) WHERE telegram_id IS NOT NULL');
db.exec('CREATE TABLE IF NOT EXISTS revoked_tokens (jti TEXT PRIMARY KEY, exp INTEGER NOT NULL)');   // "Chiqish" qilingan kalitlar
setInterval(() => db.prepare('DELETE FROM revoked_tokens WHERE exp < ?').run(Math.floor(Date.now() / 1000)), 3600 * 1000).unref();
/* S1: bitta raqam — bitta akkaunt (oxirgi 9 raqam bo'yicha). Eski bazada takror bo'lsa — kodda ham tekshiriladi */
try { db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone9 ON users(substr(phone, -9)) WHERE phone <> ''"); }
catch (e) { console.warn('DIQQAT: telefon noyob indeksi yaratilmadi (bazada takror raqam bor):', e.message); }
/* MebelCity modullari (fragments-mc.json) — bazada bo'lmasa bir marta qo'shiladi */
{
  const has = db.prepare("SELECT COUNT(*) AS n FROM fragments WHERE code LIKE 'MC-%'").get().n;
  const mcPath = path.join(__dirname, '../app/data/fragments-mc.json');
  if (!has && fs.existsSync(mcPath)) {
    const ins = db.prepare(`INSERT OR REPLACE INTO fragments
      (code, name, category, grp, w, d, h, min_w, max_w, min_d, max_d, stretch_axis, price_mode, price, material_code, production, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const mc = JSON.parse(fs.readFileSync(mcPath, 'utf8')).fragments || [];
    db.transaction(() => { for (const f of mc) ins.run(f.code, f.name, f.category || '', f.group || '', f.w || 0, f.d || 0, f.h || 0,
      f.min_w || 0, f.max_w || 0, f.min_d || 0, f.max_d || 0, f.stretch_axis || 'xy', f.price_mode || 'unit', f.price || 0,
      f.material_code || 'LDSP16', f.production || 'panel', JSON.stringify(f)); })();
    console.log(`MebelCity modullari bazaga qo'shildi: ${mc.length} ta`);
  }
}

/* Standart admin paroli bilan ishlamaymiz */
{
  const admins = db.prepare("SELECT email, password_hash FROM users WHERE role = 'admin'").all();
  const weak = admins.filter(a => bcrypt.compareSync('admin123', a.password_hash)).map(a => a.email);
  if (weak.length) {
    const msg = `standart 'admin123' paroli: ${weak.join(', ')} — almashtiring: ADMIN_PASSWORD='…' npm run admin-password`;
    if (PROD) { console.error('XATO: ' + msg); process.exit(1); }
    console.warn('DIQQAT: ' + msg);
  }
}

/* ═══════════════════ KIRISH MA'LUMOTLARINI TEKSHIRISH ═══════════════════ */
class BadInput extends Error {}
const bad = (msg) => { throw new BadInput(msg); };

/** Matn: string bo'lishi, uzunlik chegarasi; boshqa tur kelsa — 400 (crash emas). */
function str(v, field, { max = 200, required = false } = {}) {
  if (v == null || v === '') { if (required) bad(`${field} kerak`); return ''; }
  if (typeof v !== 'string') bad(`${field} matn bo'lishi kerak`);
  const s = v.trim();
  if (s.length > max) bad(`${field} juda uzun (max ${max})`);
  return s;
}
/** Ism kabi ko'rinadigan matn: HTML belgilarisiz (saqlangan XSS'ga yo'l yo'q). */
function plainText(v, field, opts) {
  const s = str(v, field, opts);
  if (/[<>]/.test(s)) bad(`${field}: < va > belgilari mumkin emas`);
  return s;
}
function email(v) {
  const s = str(v, 'email', { max: 254, required: true }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) bad('email formati noto\'g\'ri');
  return s;
}
function num(v, field, { min = 0, max = 1e12, required = false } = {}) {
  if (v == null || v === '') { if (required) bad(`${field} kerak`); return null; }
  const n = typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
  if (!Number.isFinite(n) || n < min || n > max) bad(`${field} ${min}…${max} oralig'idagi son bo'lishi kerak`);
  return n;
}
/** S1: telefon → 998XXXXXXXXX ("+998 90 123 45 67", "901234567" ham qabul qilinadi) */
function phone(v) {
  const d = String(str(v, 'telefon', { max: 32, required: true })).replace(/\D/g, '');
  const p = d.length === 9 ? '998' + d : d;
  if (!/^998\d{9}$/.test(p)) bad('telefon formati: +998 XX XXX XX XX');
  return p;
}
/** Async route'dagi xato Express 4 da ushlanmaydi — next(err) ga o'tkazamiz (aks holda server o'chadi). */
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* TZ-19: xato javobi — doim { error, code, rid }. Kod va matn — app/js/xatolar.js (bitta manba); rid — jurnaldagi so'rov raqami. */
function fail(res, code, msg, extra) {
  const x = XATOLAR[code] || XATOLAR['S3D-SRV-001'];
  res.locals.code = code; res.locals.msg = msg || x.matn;
  return res.status(x.http).json({ error: msg || x.matn, code, rid: res.req.rid, ...(extra || {}) });
}

/* ═══════════════════ RATE LIMIT (kutubxonasiz, xotirada) ═══════════════════
 * login — faqat MUVAFFAQIYATSIZ urinishlar sanaladi (bitta NAT ortidagi sex o'zini
 * bloklamaydi); register — alohida hisob. Nginx ortida TRUST_PROXY=1 shart. */
function rateLimit({ windowMs, max, key = (req) => req.ip }) {
  const hits = new Map();                  // kalit (ip yoki foydalanuvchi) → {n, reset}
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs).unref();
  const entry = (key) => {
    const now = Date.now();
    let h = hits.get(key);
    if (!h || h.reset <= now) { h = { n: 0, reset: now + windowMs }; hits.set(key, h); }
    return h;
  };
  return {
    /** chegaradan oshgan bo'lsa 429 qaytaradi */
    check: (req, res, next) => {
      const h = entry(key(req));
      if (h.n >= max) {
        res.set('Retry-After', String(Math.ceil((h.reset - Date.now()) / 1000)));
        return fail(res, 'S3D-RATE-001');
      }
      next();
    },
    hit: (req) => { entry(key(req)).n++; },
    /** sanaydi va chegaradan oshsa 429 (har so'rov uchun) */
    take: (req, res, next) => {
      const h = entry(key(req));
      if (h.n >= max) { res.set('Retry-After', String(Math.ceil((h.reset - Date.now()) / 1000))); return fail(res, 'S3D-RATE-001'); }
      h.n++; next();
    }
  };
}
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });   // 10 xato / 15 daq
/* 10 ro'yxat / soat / IP. Brauzer testlari bitta serverda ko'p akkaunt ochadi — faqat production bo'lmaganda TEST_REGISTER_LIMIT */
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: (!PROD && +process.env.TEST_REGISTER_LIMIT) || 10 });
const smsSendLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });   // TZ-07: 10 SMS / soat / IP
const smsVerifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }); // 20 xato kod / 15 daq / IP
const aiLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 60 });         // TZ-12: 60 AI so'rov / soat / IP (pullik)
const logLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });             // TZ-19: 30 xato yozuvi / daqiqa / IP
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 300 });            // TZ-19 X5: hamma /api — 300 / daqiqa / IP
const writeLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, key: (req) => 'u' + req.user.id });   // yozish — 60 / daqiqa / foydalanuvchi

/* ── Express ── */
const app = express();
app.disable('x-powered-by');
/* TZ-19: har so'rovga raqam (rid) — javob sarlavhasida va jurnalda; xato javoblar jurnalga yoziladi
   (401/403/413/423/429 va 5xx — bazaga ham: hujum va nosozlikni keyin ko'rish uchun) */
app.use((req, res, next) => {
  req.rid = crypto.randomBytes(6).toString('hex');
  res.set('X-Request-Id', req.rid);
  const t0 = Date.now();
  res.on('finish', () => {
    const st = res.statusCode;
    if (st < 400 || res.locals.logged || !req.originalUrl.startsWith('/api')) return;
    const code = res.locals.code || (st === 404 ? 'S3D-SRV-002' : st >= 500 ? 'S3D-SRV-001' : 'S3D-VAL-001');
    const save = st === 401 || st === 403 || st === 413 || st === 423 || st === 429 || st >= 500;
    jurnal[st >= 500 ? 'error' : 'warn']({ code, rid: req.rid, uid: req.user && req.user.id, method: req.method, path: req.originalUrl.split('?')[0],
      status: st, msg: res.locals.msg || '', save, meta: { ms: Date.now() - t0, ip: req.ip } });
  });
  next();
});
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : false }));
/* xavfsizlik sarlavhalari (helmet'siz): CSP, HSTS (production), nosniff, ramka taqiqi — himoya.js */
app.use(securityHeaders({ prod: PROD, scriptHashes: inlineScriptHashes(path.join(__dirname, '../app/index.html')) }));
app.use('/api', apiLimiter.take);
app.use('/api/log', express.json({ limit: '4kb' }));   // brauzer xato yozuvi — kichik (TZ-19)
app.use('/api/telegram/fayl', express.json({ limit: '15mb' }));   // TZ-16: fayl (base64, 10 MB gacha) — bot chatiga
app.use(express.json({ limit: '2mb' }));
/* ── sahifalar (TZ-09 Q7): yangi sayt (web/dist) — "/" va "/app.html"; eski sayt — "/eski/" da 2 hafta zaxira.
   web/dist yo'q bo'lsa (build qilinmagan) — eski sayt avvalgidek "/" da. X11: assets/* — o'zgarmas (nomida xesh),
   sahifa, service worker, manifest va ma'lumot (narx) — har safar tekshiriladi. */
const WEB_DIST = path.join(__dirname, '../web/dist');
const ESKI = path.join(__dirname, '../app');
const HAS_WEB = fs.existsSync(path.join(WEB_DIST, 'index.html'));
const noCache = (f) => /\.(html|webmanifest)$/.test(f) || /[\/](sw|registerSW)\.js$/.test(f) || /[\/]data[\/][^\/]+\.json$/.test(f);
if (HAS_WEB) {
  app.use('/eski', express.static(ESKI, { setHeaders: (res, f) => { if (noCache(f)) res.set('Cache-Control', 'no-cache'); } }));
  app.use(express.static(WEB_DIST, {
    setHeaders: (res, f) => {
      if (/[\/]assets[\/]/.test(f)) res.set('Cache-Control', 'public, max-age=31536000, immutable');
      else if (noCache(f)) res.set('Cache-Control', 'no-cache');
      else res.set('Cache-Control', 'public, max-age=86400');
    }
  }));
} else {
  app.use(express.static(ESKI, { setHeaders: (res, f) => { if (noCache(f)) res.set('Cache-Control', 'no-cache'); } }));
}

/* ── Auth middleware ── */
/* TZ-19 X2/X3: kalit — sarlavhada (Bearer, eski sayt) yoki httpOnly cookie'da (yangi sayt). Tekshiruv: imzo, muddat,
   "Chiqish" qilinmagan (jti), parol almashmagan (token_version). Cookie bilan yozuvchi so'rov — faqat shu saytdan (CSRF). */
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
const signToken = (u) => jwt.sign({ id: u.id, email: u.email, role: u.role, tv: u.token_version || 0, jti: crypto.randomBytes(12).toString('hex') },
  JWT_SECRET, { expiresIn: JWT_EXPIRES, algorithm: 'HS256' });
/** kirish javobi: kalit cookie'ga yoziladi; yangi sayt (sessiya: 'cookie') kalitni javobda olmaydi — JS uni hech qachon ko'rmaydi */
function sendSession(req, res, u, body, { cookie = true } = {}) {
  const token = signToken(u);
  if (cookie) res.cookie(SESS, token, { ...cookieOpts, maxAge: COOKIE_MS });
  res.json(cookie && req.body && req.body.sessiya === 'cookie' ? body : { token, ...body });
}
const BCRYPT_COST = 12;                                    // X10 (eski xeshlar kirishda yangilanadi)
const DUMMY_HASH = bcrypt.hashSync('smart3d-dummy-' + crypto.randomBytes(8).toString('hex'), BCRYPT_COST);   // yo'q email ham shuncha vaqt oladi
const LOCK_AFTER = 5, LOCK_MS = 15 * 60 * 1000;           // X4: 5 xato → 15 daqiqa

/* ═══════════════════ AUTH API ═══════════════════ */
app.post('/api/register', registerLimiter.check, ah(async (req, res) => {
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
  const r = db.prepare('INSERT INTO users (name, email, phone, shop, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name, em, tel, shop, hash, 'user');
  const user = { id: Number(r.lastInsertRowid), name, email: em, phone: tel, shop, role: 'user' };
  sendSession(req, res, user, { user });
}));

app.post('/api/login', loginLimiter.check, ah(async (req, res) => {
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
app.post('/api/logout', auth, (req, res) => {
  if (req.user.jti) db.prepare('INSERT OR IGNORE INTO revoked_tokens (jti, exp) VALUES (?, ?)').run(req.user.jti, req.user.exp || Math.floor(Date.now() / 1000) + 86400);
  if ((req.body || {}).hammasi === true) db.prepare('UPDATE users SET token_version = token_version + 1 WHERE id = ?').run(req.user.id);
  res.clearCookie(SESS, cookieOpts);
  res.json({ ok: true });
});

app.get('/api/me', auth, (req, res) => {
  const u = db.prepare('SELECT id, name, email, phone, shop, role, telegram_id FROM users WHERE id = ?').get(req.user.id);
  if (!u) return fail(res, 'S3D-AUTH-007');
  const { telegram_id: tg, ...rest } = u;
  res.json({ ...rest, telegram: !!tg });
});

/* ═══════════════════ TELEFON + SMS KIRISH (TZ-07, qoida S1) ═══════════════════
 * 6 xonali kod, 5 daqiqa, 5 urinish, qayta yuborish 60 soniyadan keyin. Kod bazada faqat HMAC
 * ko'rinishida. SMS — Eskiz.uz (sms.js). Eskiz sozlanmagan bo'lsa: production'da 503,
 * dev/test'da kod javobda qaytadi (dev_code) — faqat o'z bazasida sinash uchun (S8). */
const CODE_TTL = 5 * 60 * 1000, RESEND_MS = 60 * 1000, MAX_ATTEMPTS = 5;
const codeHash = (p, code) => crypto.createHmac('sha256', JWT_SECRET).update(p + ':' + code).digest('hex');

app.post('/api/auth/sms/send', smsSendLimiter.check, ah(async (req, res) => {
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

app.post('/api/auth/sms/verify', smsVerifyLimiter.check, ah(async (req, res) => {
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
    const r = db.prepare('INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)')
      .run(name, `tel${p}@telefon.smart3d`, p, hash, 'user');
    u = { id: Number(r.lastInsertRowid), name, email: `tel${p}@telefon.smart3d`, phone: p, role: 'user' };
    yangi = true;
  }
  sendSession(req, res, u, { user: { id: u.id, name: u.name, phone: u.phone, role: u.role }, yangi });
}));

/* TZ-23 C4: kirish usullari — sayt "Telefon orqali (SMS)" tugmasini faqat SMS ishlaganda ko'rsatadi
   (production'da — Eskiz sozlangan bo'lsa; dev/test — dev_code bilan, S8) */
app.get('/api/auth/usullar', (req, res) => res.json({ email: true, sms: smsConfigured() || !PROD }));

/* ═══════════════════ TELEGRAM MINI APP (TZ-16) ═══════════════════
 * Kirish — Telegram imzosi bilan (parol/SMS'siz). Kalit faqat javobda (cookie'siz): ilova uni xotirada saqlaydi va har
 * ochilishda qayta oladi (Telegram Web'da ilova ramka ichida — u yerda cookie ishlamaydi). Telefon — bot chatiga ulashilgan
 * kontakt (webhook, faqat o'z raqami). Saytdagi akkauntga avtomatik bog'lash — faqat SMS bilan tasdiqlangan raqamga;
 * email bilan ochilgan akkaunt — ilovada email+parol bilan kirib, keyin ulanadi (saytda telefon tasdiqlanmagan —
 * birovning raqami bilan oldindan ochilgan akkauntga Telegram loyihalari oqib ketmasin). TELEGRAM_BOT_TOKEN bo'lmasa — o'chiq. */
const tgLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });   // 30 xato urinish / daqiqa / IP
const TG_USER = 'SELECT id, name, email, phone, shop, role, token_version, telegram_id FROM users';
const ochiqUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone || '', shop: u.shop || '', role: u.role, telegram: true });
const smsAkkaunt = (u) => /^tel\d+@telefon\.smart3d$/.test(u.email || '');   // TZ-07 SMS kirish — raqam tasdiqlangan
/** Telegram akkauntini (placeholder) boshqa akkauntga ko'chirish: loyihalar o'tadi, eski kalitlar bekor */
const tgKochir = db.transaction((tgId, eski, yangi) => {
  if (eski && eski.id !== yangi.id) {
    db.prepare('UPDATE projects SET user_id = ? WHERE user_id = ?').run(yangi.id, eski.id);
    db.prepare('UPDATE users SET telegram_id = NULL, token_version = token_version + 1 WHERE id = ?').run(eski.id);
    if (eski.phone && !yangi.phone) {                    // raqam ham o'tadi (bitta raqam — bitta akkaunt, S1)
      db.prepare("UPDATE users SET phone = '' WHERE id = ?").run(eski.id);
      db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(eski.phone, yangi.id);
    }
  }
  db.prepare('UPDATE users SET telegram_id = ? WHERE id = ?').run(tgId, yangi.id);
});

app.post('/api/auth/telegram', tgLimiter.check, ah(async (req, res) => {
  const token = tgToken();
  if (!token) return fail(res, 'S3D-TG-001');
  const d = initDataTekshir((req.body || {}).initData, token);
  if (!d) { tgLimiter.hit(req); return fail(res, 'S3D-TG-002'); }
  let u = db.prepare(TG_USER + ' WHERE telegram_id = ?').get(d.tgId);
  let yangi = false;
  if (!u) {
    const hash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), BCRYPT_COST);   // parol bilan kirib bo'lmaydi
    const r = db.prepare('INSERT INTO users (name, email, password_hash, role, telegram_id) VALUES (?, ?, ?, ?, ?)')
      .run(d.ism, TG_EMAIL(d.tgId), hash, 'user', d.tgId);
    u = db.prepare(TG_USER + ' WHERE id = ?').get(Number(r.lastInsertRowid));
    yangi = true;
  }
  sendSession(req, res, u, { user: ochiqUser(u), yangi }, { cookie: false });
}));

/* saytdagi akkauntni (email+parol bilan kirilgan) shu Telegram'ga ulash — ikkala egalik ham isbotlangan */
app.post('/api/telegram/ulash', auth, ah(async (req, res) => {
  const token = tgToken();
  if (!token) return fail(res, 'S3D-TG-001');
  const d = initDataTekshir((req.body || {}).initData, token);
  if (!d) return fail(res, 'S3D-TG-002');
  const men = db.prepare(TG_USER + ' WHERE id = ?').get(req.user.id);
  if (!men) return fail(res, 'S3D-AUTH-007');
  if (men.telegram_id && men.telegram_id !== d.tgId) return fail(res, 'S3D-TG-006');
  tgKochir(d.tgId, db.prepare(TG_USER + ' WHERE telegram_id = ?').get(d.tgId), men);
  sendSession(req, res, db.prepare(TG_USER + ' WHERE id = ?').get(men.id), { user: ochiqUser(men) }, { cookie: false });
}));

/* bot webhook'i (setWebhook secret_token bilan): kontakt → telefon, /start → ilova tugmasi */
app.post('/api/telegram/webhook', ah(async (req, res) => {
  const sir = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
  const got = String(req.headers['x-telegram-bot-api-secret-token'] || '');
  if (!tgToken() || sir.length < 16 || got.length !== sir.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(sir))) return fail(res, 'S3D-TG-003');
  const up = req.body || {}, m = up.message || {};
  const javob = (text, extra) => tgApi('sendMessage', { chat_id: m.chat && m.chat.id, text, ...(extra || {}) })
    .catch(e => jurnal.warn({ code: 'S3D-TG-005', rid: req.rid, method: 'POST', path: req.path, status: 200, msg: 'bot javobi yuborilmadi: ' + e.message }));
  const k = webhookKontakt(up);
  if (k) {
    const p = k.phone.length === 9 ? '998' + k.phone : k.phone;
    if (!/^998\d{9}$/.test(p)) { await javob('Faqat O\'zbekiston raqami (+998) qabul qilinadi.'); return res.json({ ok: true }); }
    let u = db.prepare(TG_USER + ' WHERE telegram_id = ?').get(k.tgId);
    const egasi = db.prepare(TG_USER + " WHERE phone <> '' AND substr(phone, -9) = ?").get(p.slice(-9));
    if (egasi && (!u || egasi.id !== u.id)) {
      if (egasi.telegram_id && egasi.telegram_id !== k.tgId) await javob('Bu raqam boshqa Telegram akkauntga ulangan.');
      else if (smsAkkaunt(egasi)) { tgKochir(k.tgId, u, egasi); await javob('Raqam saytdagi akkauntingizga ulandi. Ilovani qayta oching.'); }
      else await javob('Bu raqam bilan saytda akkaunt bor. Ilovada email va parol bilan bir marta kiring — akkaunt Telegram\'ga ulanadi.');
    } else if (u) {
      db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(p, u.id);
      await javob('Raqam saqlandi: +' + p);
    } else await javob('Avval Smart3D ilovasini oching, keyin raqamni ulashing.');
    return res.json({ ok: true });
  }
  if (/^\/start\b/.test(m.text || '')) {
    const url = (process.env.TELEGRAM_WEBAPP_URL || '').trim();
    await javob('Smart3D — mebel loyihasi, smeta va stanok fayllari. Boshlash uchun tugmani bosing.',
      /^https:\/\//.test(url) ? { reply_markup: { inline_keyboard: [[{ text: 'Smart3D', web_app: { url } }]] } } : undefined);
  }
  res.json({ ok: true });
}));

/* faylni bot orqali foydalanuvchining o'z chatiga (Telegram ichida brauzer yuklab olishi ishlamasa) */
const TG_FAYL = /^[\p{L}\p{N} _.()'-]{1,120}\.(pdf|xlsx|csv|dxf|nc|xnc|ptp|tap|gcode|bpj|json|glb|obj|mtl|zip|png|jpg|project|xml|txt|mpr|cix|bpp)$/iu;
app.post('/api/telegram/fayl', auth, ah(async (req, res) => {
  if (!tgToken()) return fail(res, 'S3D-TG-001');
  const men = db.prepare('SELECT telegram_id FROM users WHERE id = ?').get(req.user.id);
  if (!men || !men.telegram_id) return fail(res, 'S3D-TG-004');
  const b = req.body || {};
  const nom = String(b.nom || '').trim();
  if (!TG_FAYL.test(nom) || typeof b.base64 !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(b.base64)) return fail(res, 'S3D-TG-007');
  const bytes = Buffer.from(b.base64, 'base64');
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) return fail(res, 'S3D-TG-007');
  try { await hujjatYubor(men.telegram_id, { nom, bytes, mime: typeof b.mime === 'string' ? b.mime.slice(0, 100) : '' }); }
  catch (e) {
    jurnal.error({ code: 'S3D-TG-005', rid: req.rid, uid: req.user.id, method: 'POST', path: req.path, status: 502, msg: String(e.message || e).slice(0, 200) });
    return fail(res, 'S3D-TG-005');
  }
  res.json({ ok: true });
}));

/* ═══════════════════ LOYIHALAR (TZ-07) ═══════════════════
 * Har foydalanuvchi faqat o'z loyihasini ko'radi. O'chirish — faqat yashirish (archived), qoida 2.7. */
function projectPayload(b) {
  const doc = b.doc;
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) bad('doc kerak');
  const inner = doc.doc && typeof doc.doc === 'object' ? doc.doc : doc;     // {app, v, name, doc:{room, placements}} yoki to'g'ridan-to'g'ri doc
  if (!inner.room || typeof inner.room !== 'object' || !Array.isArray(inner.placements)) bad('doc tuzilmasi noto\'g\'ri (room, placements)');
  if (inner.placements.length > 500) bad('placements juda ko\'p (max 500)');
  const xe = docXatosi(doc);                                // X7: tur, o'lcham, chuqurlik, HTML
  if (xe) bad(xe);
  return {
    name: plainText(b.name, 'nom', { max: 200 }) || 'Loyiha',
    client: plainText(b.client, 'mijoz', { max: 200 }),
    doc_json: JSON.stringify(doc),
    total_price: Math.round(num(b.total_price, 'total_price', { min: 0, max: 1e13 }) || 0)
  };
}
app.get('/api/projects', auth, (req, res) => {
  /* TZ-09: kartada mijoz va modul soni (saqlangan loyihadan; eski yozuvlarda mijoz bo'sh) */
  res.json(db.prepare(`SELECT id, name, client, total_price, created_at, updated_at,
      COALESCE(json_array_length(doc_json, '$.doc.placements'), json_array_length(doc_json, '$.placements'), 0) AS modules
    FROM projects WHERE user_id = ? AND archived = 0 ORDER BY updated_at DESC, id DESC`).all(req.user.id));
});
app.post('/api/projects', auth, (req, res) => {
  const v = projectPayload(req.body || {});
  const r = db.prepare('INSERT INTO projects (user_id, name, client, doc_json, total_price) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.id, v.name, v.client, v.doc_json, v.total_price);
  res.json({ id: Number(r.lastInsertRowid), ok: true });
});
app.get('/api/projects/:id', auth, (req, res) => {
  const pr = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ? AND archived = 0').get(req.params.id, req.user.id);
  if (!pr) return fail(res, 'S3D-PROJ-001', 'Topilmadi');
  res.json({ id: pr.id, name: pr.name, client: pr.client || '', total_price: pr.total_price, updated_at: pr.updated_at, doc: JSON.parse(pr.doc_json) });
});
app.put('/api/projects/:id', auth, (req, res) => {
  const pr = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ? AND archived = 0').get(req.params.id, req.user.id);
  if (!pr) return fail(res, 'S3D-PROJ-001', 'Topilmadi');
  const v = projectPayload(req.body || {});
  db.prepare('UPDATE projects SET name = ?, client = ?, doc_json = ?, total_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(v.name, v.client, v.doc_json, v.total_price, pr.id);
  res.json({ ok: true });
});
app.delete('/api/projects/:id', auth, (req, res) => {
  const r = db.prepare('UPDATE projects SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND archived = 0')
    .run(req.params.id, req.user.id);
  if (!r.changes) return fail(res, 'S3D-PROJ-001', 'Topilmadi');
  res.json({ ok: true });
});

/* ═══════════════════ SHAXSIY SHABLONLAR (TZ-24 B) ═══════════════════
 * Har foydalanuvchining o'z shablonlari: "prompt" (tayyor so'rov raqamlari yoki o'z matni) va "loyiha" (xona va modullar).
 * Faqat o'zi ko'radi va o'chiradi; ko'pi bilan 100 ta; ma'lumot — loyiha tekshiruvi bilan (himoya.js, 300 KB gacha). */
db.exec(`
  CREATE TABLE IF NOT EXISTS user_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tur TEXT NOT NULL,
    nom TEXT NOT NULL,
    data_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_user_items_user ON user_items(user_id);
`);
const SHABLON_TUR = ['prompt', 'loyiha', 'modul'], SHABLON_MAX = 100;   // modul — TZ-24 A: qo'lda chizilgan modul (yassi chizma)
app.get('/api/shablonlar', auth, (req, res) => {
  const rows = db.prepare('SELECT id, tur, nom, data_json, created_at FROM user_items WHERE user_id = ? ORDER BY id DESC LIMIT ?').all(req.user.id, SHABLON_MAX);
  res.json(rows.map(r => { let data = null; try { data = JSON.parse(r.data_json); } catch (e) { data = null; } return { id: r.id, tur: r.tur, nom: r.nom, data, created_at: r.created_at }; }));
});
app.post('/api/shablonlar', auth, (req, res) => {
  const b = req.body || {};
  const tur = str(b.tur, 'tur', { max: 10, required: true });
  if (!SHABLON_TUR.includes(tur)) bad('tur: prompt, loyiha yoki modul');
  const nom = plainText(b.nom, 'nom', { max: 80, required: true });
  const data = b.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) bad('data kerak');
  if (tur === 'loyiha' && (!data.doc || !data.doc.room || !Array.isArray(data.doc.placements))) bad('loyiha shabloni: doc (room, placements) kerak');
  if (tur === 'modul' && (!data.ch || !Array.isArray(data.ch.tugun) || data.ch.tugun.length > 200)) bad('modul shabloni: chizma (tugun ro\'yxati, 200 gacha) kerak');
  const xe = docXatosi(data);
  if (xe) bad(xe);
  const json = JSON.stringify(data);
  if (json.length > 300000) bad('shablon juda katta (300 KB gacha)');
  const n = db.prepare('SELECT COUNT(*) AS n FROM user_items WHERE user_id = ?').get(req.user.id).n;
  if (n >= SHABLON_MAX) return fail(res, 'S3D-SHB-002');
  const r = db.prepare('INSERT INTO user_items (user_id, tur, nom, data_json) VALUES (?, ?, ?, ?)').run(req.user.id, tur, nom, json);
  res.json({ ok: true, id: Number(r.lastInsertRowid) });
});
app.delete('/api/shablonlar/:id', auth, (req, res) => {
  const r = db.prepare('DELETE FROM user_items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!r.changes) return fail(res, 'S3D-SHB-001');
  res.json({ ok: true });
});

/* ═══════════════════ MATERIAL API ═══════════════════ */
app.get('/api/materials', (req, res) => {
  const q = str(req.query.q, 'q', { max: 100 });
  const catCode = str(req.query.cat_code, 'cat_code', { max: 20 });
  const type = str(req.query.type, 'type', { max: 20 });
  const limit = Math.min(num(req.query.limit, 'limit', { min: 1, max: 1e6 }) || 100, 500);
  let sql = 'SELECT * FROM materials WHERE 1=1';
  const params = [];
  if (catCode) { sql += ' AND cat_code = ?'; params.push(catCode); }
  if (type) { sql += ' AND type = ?'; params.push(type); }
  if (q) {
    sql += ' AND (id = ? OR sku LIKE ? OR name LIKE ? OR search_text LIKE ?)';
    params.push(q, `%${q}%`, `%${q}%`, `%${q.toLowerCase()}%`);
  }
  sql += ' ORDER BY uzs DESC LIMIT ?';
  params.push(Math.floor(limit));
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/materials/:id', (req, res) => {
  const m = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
  if (!m) return fail(res, 'S3D-DATA-001');
  res.json(m);
});

app.put('/api/materials/:id/price', auth, adminOnly, (req, res) => {
  const b = req.body || {};
  const uzs = num(b.uzs, 'uzs', { min: 0, max: 1e12, required: true });
  const usd = num(b.usd, 'usd', { min: 0, max: 1e9 }) || 0;
  const old = db.prepare('SELECT uzs, usd FROM materials WHERE id = ?').get(req.params.id);
  if (!old) return fail(res, 'S3D-DATA-001', 'Material topilmadi');
  db.prepare('UPDATE materials SET uzs = ?, usd = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(uzs, usd, req.params.id);
  db.prepare('INSERT INTO price_history (material_id, old_uzs, new_uzs, old_usd, new_usd, changed_by) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.params.id, old.uzs, uzs, old.usd, usd, req.user.id);
  broadcastPrice(req.params.id, uzs, usd);
  res.json({ ok: true, old: old.uzs, new: uzs });
});

/* ═══════════════════ FRAGMENT API ═══════════════════ */
app.get('/api/fragments', (req, res) => {
  res.json(db.prepare('SELECT * FROM fragments ORDER BY code').all());
});

app.get('/api/fragments/:code', (req, res) => {
  const f = db.prepare('SELECT * FROM fragments WHERE code = ?').get(req.params.code);
  if (!f) return fail(res, 'S3D-DATA-001');
  res.json(f);
});

/* ═══════════════════ BUYURTMALAR (TZ-23 C1, egasi #138) ═══════════════════
 * Usta loyihani sexga buyurtma qiladi: mijoz ismi, telefon (S1), izoh, loyiha (to'liq hujjat — sex shu bilan ishlaydi), summa.
 * Holat: yangi → qabul → ishlab → tayyor (yoki bekor) — faqat admin o'zgartiradi. Pul harakati yo'q (qoida 5.1): summa — ma'lumot.
 * Admin Telegram'i ulangan bo'lsa (TZ-16) — yangi buyurtma xabari (xato bo'lsa — buyurtma baribir saqlanadi). */
const BUYURTMA_HOLAT = ['yangi', 'qabul', 'ishlab', 'tayyor', 'bekor'];
db.exec(`CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, client_name TEXT DEFAULT '', client_phone TEXT DEFAULT '',
  client_email TEXT DEFAULT '', room_json TEXT DEFAULT '{}', placements_json TEXT DEFAULT '[]', total_price INTEGER DEFAULT 0,
  notes TEXT DEFAULT '', status TEXT DEFAULT 'draft', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
addColumn('orders', 'project_id', 'INTEGER');
addColumn('orders', 'project_name', "TEXT DEFAULT ''");
addColumn('orders', 'doc_json', "TEXT DEFAULT ''");
addColumn('orders', 'updated_at', 'DATETIME');
const buyurtmaQisqa = (o) => ({ id: o.id, project_id: o.project_id, project_name: o.project_name || '', client_name: o.client_name, client_phone: o.client_phone,
  total_price: o.total_price, notes: o.notes, status: BUYURTMA_HOLAT.includes(o.status) ? o.status : 'yangi', created_at: o.created_at, updated_at: o.updated_at || o.created_at,
  modules: (() => { try { return JSON.parse(o.placements_json || '[]').length; } catch (_) { return 0; } })() });

app.post('/api/orders', auth, (req, res) => {
  const b = req.body || {};
  const clientName = plainText(b.client_name, 'client_name', { max: 200 });
  if (!clientName) bad('mijoz ismi kerak');
  const tel = phone(b.client_phone);                       // S1: 998XXXXXXXXX
  const clientEmail = b.client_email ? email(b.client_email) : '';
  let room = {}, placements = [], docJson = '';
  if (b.doc) {                                             // to'liq loyiha (yangi sayt) — loyiha saqlashdagi tekshiruv bilan
    const v = projectPayload({ doc: b.doc, name: b.project_name, total_price: b.total_price });
    const inner = b.doc.doc && typeof b.doc.doc === 'object' ? b.doc.doc : b.doc;
    room = inner.room; placements = inner.placements; docJson = v.doc_json;
  } else {
    room = b.room && typeof b.room === 'object' && !Array.isArray(b.room) ? b.room : {};
    placements = Array.isArray(b.placements) ? b.placements : [];
    if (placements.length > 500) bad('placements juda ko\'p (max 500)');
  }
  if (!placements.length) bad('loyihada mebel yo\'q');
  let pid = Number.isInteger(+b.project_id) && +b.project_id > 0 ? +b.project_id : null;
  if (pid && !db.prepare('SELECT 1 FROM projects WHERE id = ? AND user_id = ?').get(pid, req.user.id)) pid = null;   // faqat o'z loyihasi
  const total = Math.round(num(b.total_price, 'total_price', { min: 0, max: 1e13 }) || 0);
  const r = db.prepare(`INSERT INTO orders (user_id, client_name, client_phone, client_email, room_json, placements_json, total_price, notes, status,
      project_id, project_name, doc_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'yangi', ?, ?, ?, CURRENT_TIMESTAMP)`)
    .run(req.user.id, clientName, tel, clientEmail, JSON.stringify(room), JSON.stringify(placements), total,
      str(b.notes, 'notes', { max: 4000 }), pid,   /* izoh — oddiy matn: < > rad etilmaydi (ekranda matn sifatida chiqadi) */
       plainText(b.project_name, 'project_name', { max: 200 }), docJson);
  const id = Number(r.lastInsertRowid);
  jurnal.info({ code: 'S3D-ORD-100', rid: req.rid, uid: req.user.id, msg: 'yangi buyurtma №' + id });
  /* admin Telegram'iga xabar (bot ulangan bo'lsa) */
  if (tgToken()) {
    const u = db.prepare('SELECT name, phone FROM users WHERE id = ?').get(req.user.id) || {};
    const matn = `Yangi buyurtma №${id}\nUsta: ${u.name || '—'}${u.phone ? ' (+' + u.phone + ')' : ''}\nMijoz: ${clientName}, +${tel}\nModul: ${placements.length} · ${total.toLocaleString('ru-RU')} so'm`;
    for (const a of db.prepare("SELECT telegram_id FROM users WHERE role = 'admin' AND telegram_id IS NOT NULL").all())
      tgApi('sendMessage', { chat_id: a.telegram_id, text: matn }).catch(() => {});
  }
  res.json({ id, ok: true, status: 'yangi' });
});

/** o'z buyurtmalari ("Buyurtmalarim") — qisqa */
app.get('/api/orders', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.user.id).map(buyurtmaQisqa));
});
app.get('/api/orders/:id', auth, (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!o) return fail(res, 'S3D-DATA-001');
  res.json({ ...buyurtmaQisqa(o), room: JSON.parse(o.room_json || '{}'), placements: JSON.parse(o.placements_json || '[]'), doc: o.doc_json ? JSON.parse(o.doc_json) : null });
});
/** admin: hamma buyurtmalar (usta bilan) va holatni o'zgartirish */
app.get('/api/admin/orders', auth, adminOnly, (req, res) => {
  res.json(db.prepare(`SELECT o.*, u.name AS usta_name, u.email AS usta_email, u.phone AS usta_phone FROM orders o LEFT JOIN users u ON u.id = o.user_id
    ORDER BY o.id DESC LIMIT 500`).all().map(o => ({ ...buyurtmaQisqa(o), usta: { name: o.usta_name || '', email: o.usta_email || '', phone: o.usta_phone || '' } })));
});
app.put('/api/admin/orders/:id', auth, adminOnly, (req, res) => {
  const status = String((req.body || {}).status || '');
  if (!BUYURTMA_HOLAT.includes(status)) return fail(res, 'S3D-ORD-001');
  const r = db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
  if (!r.changes) return fail(res, 'S3D-DATA-001');
  jurnal.info({ code: 'S3D-ORD-102', rid: req.rid, uid: req.user.id, msg: `buyurtma №${req.params.id} → ${status}` });
  res.json({ ok: true, status });
});

/* ═══════════════════ SERVICES API (Kamchilik 18) ═══════════════════ */
function readJsonData(name) {
  const p = path.join(__dirname, '../app/data', name);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}
app.get('/api/services', (req, res) => {
  res.json(readJsonData('services.json') || { services: [] });
});

/* ═══════════════════ SEX STANDARTLARI (TZ-14) ═══════════════════
 * O'qish — hamma; o'zgartirish — faqat admin. Boshlang'ich qiymat app/data/sex-standartlari.json dan,
 * o'zgargani settings jadvalida. Har o'zgarish tarixga yoziladi (eski → yangi), qaytarish mumkin. */
const STD_DIMS = ['w', 'd', 'h', 'uzunlik', 'eni'];
function sexStdCurrent() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'sex_standartlari'").get();
  return row ? JSON.parse(row.value) : readJsonData('sex-standartlari.json');
}
/* ═══════════════════ FOYDALANUVCHI SOZLAMALARI (TZ-09: dizayndagi "Sozlamalar") ═══════════════════
 * markup_pct — usta ustamasi (0…3, ya'ni 0–300%; bo'sh bo'lsa materials.json standarti);
 * stanoklar — "Stanokka" bo'limida ko'rsatiladigan fayllar; logo — sex logosi (PNG/JPEG/WEBP data URL, ≤ ~300 KB),
 * hisobotda Bittada belgisidan kichikroq (qoida S4). Har usta faqat o'zinikini ko'radi va o'zgartiradi. */
const STANOKLAR = ['dxf', 'gcode', 'ptp', 'nc', 'xnc', 'altendorf'];
function settingsPayload(b) {
  const out = { markup_pct: num(b.markup_pct, 'ustama', { min: 0, max: 3 }), stanoklar: null, logo: null, til: null };
  if (b.til != null && b.til !== '') { if (!['uz', 'ru', 'en'].includes(b.til)) bad('til: uz, ru yoki en'); out.til = b.til; }   // TZ-18
  if (b.stanoklar != null) {
    if (!Array.isArray(b.stanoklar) || b.stanoklar.some(x => !STANOKLAR.includes(x))) bad('stanok profili noto\'g\'ri');
    out.stanoklar = [...new Set(b.stanoklar)];
  }
  if (b.logo) {
    if (typeof b.logo !== 'string' || b.logo.length > 400000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(b.logo)) bad('logo: PNG, JPEG yoki WEBP, 300 KB gacha');
    out.logo = b.logo;
  }
  return out;
}
app.get('/api/settings', auth, (req, res) => {
  const u = db.prepare('SELECT settings_json FROM users WHERE id = ?').get(req.user.id);
  let v = {};
  try { v = JSON.parse((u && u.settings_json) || '{}') || {}; } catch (e) { v = {}; }
  res.json({ markup_pct: v.markup_pct ?? null, stanoklar: v.stanoklar ?? null, logo: v.logo ?? null, til: v.til ?? null });
});
app.put('/api/settings', auth, (req, res) => {
  const v = settingsPayload(req.body || {});
  db.prepare('UPDATE users SET settings_json = ? WHERE id = ?').run(JSON.stringify(v), req.user.id);
  res.json({ ok: true, ...v });
});

app.get('/api/sex-standartlari', (req, res) => {
  const cur = sexStdCurrent();
  if (!cur) return fail(res, 'S3D-STD-001');
  res.json(cur);
});
app.put('/api/sex-standartlari', auth, adminOnly, (req, res) => {
  const cur = sexStdCurrent();
  const inc = (req.body || {}).modullar;
  if (!cur || !inc || typeof inc !== 'object' || Array.isArray(inc)) bad('modullar kerak');
  const next = JSON.parse(JSON.stringify(cur));
  for (const [tur, v] of Object.entries(inc)) {
    if (!next.modullar[tur]) bad(`noma'lum tur: ${tur}`);
    if (!v || typeof v !== 'object') bad(`${tur}: qiymat kerak`);
    for (const k of STD_DIMS) {
      if (!(k in v)) continue;
      if (!next.modullar[tur][k]) bad(`${tur}.${k}: bu tur uchun bunday o'lcham yo'q`);
      const r = v[k] || {};
      const min = r.min == null || r.min === '' ? null : Math.round(num(r.min, `${tur}.${k}.min`, { min: 1, max: 20000 }));
      const max = r.max == null || r.max === '' ? null : Math.round(num(r.max, `${tur}.${k}.max`, { min: 1, max: 20000 }));
      if (min != null && max != null && min >= max) bad(`${tur}.${k}: min max dan kichik bo'lishi kerak`);
      const out = Object.assign({}, next.modullar[tur][k]);
      if (min == null) delete out.min; else out.min = min;
      if (max == null) delete out.max; else out.max = max;
      if (r.std !== undefined) {
        if (!Array.isArray(r.std) || r.std.length > 20) bad(`${tur}.${k}.std: ro'yxat (20 tagacha) bo'lishi kerak`);
        const std = r.std.map((x, i) => Math.round(num(x, `${tur}.${k}.std[${i}]`, { min: 1, max: 20000, required: true })));
        if (std.some(x => (min != null && x < min) || (max != null && x > max))) bad(`${tur}.${k}: standart qiymat chegaradan tashqarida`);
        if (std.length) out.std = std; else delete out.std;
      }
      next.modullar[tur][k] = out;
    }
  }
  next._meta = Object.assign({}, next._meta, { ozgartirildi: `admin #${req.user.id}, ${new Date().toISOString().slice(0, 16).replace('T', ' ')}` });
  db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('sex_standartlari', ?, CURRENT_TIMESTAMP)").run(JSON.stringify(next));
  db.prepare('INSERT INTO sex_std_history (user_id, old_json, new_json) VALUES (?, ?, ?)').run(req.user.id, JSON.stringify(cur), JSON.stringify(next));
  res.json({ ok: true, standartlar: next });
});

/* ═══════════════════ FURNITURA API (Kamchilik 17) ═══════════════════ */
app.get('/api/furnitura', (req, res) => {
  const data = readJsonData('furnitura-catalog.json');
  if (!data) return res.json({ items: [] });
  const q = str(req.query.q, 'q', { max: 100 }).toLowerCase();
  let items = data.items || [];
  if (q) {
    items = items.filter(it => (it.name || '').toLowerCase().includes(q) || (it.sku || '').toLowerCase().includes(q));
  }
  res.json({ _meta: data._meta, total: items.length, items: items.slice(0, 100) });
});

/* ═══════════════════ REMNANTS API (Kamchilik 9) ═══════════════════
 * Sex ombori: o'qish — login bilan, yozish — faqat admin (ro'yxatdan o'tish ochiq,
 * oddiy foydalanuvchi omborni o'zgartira olmasligi kerak). */
app.get('/api/remnants', auth, (req, res) => {
  const status = str(req.query.status, 'status', { max: 20 }) || 'available';
  const materialCode = str(req.query.material_code, 'material_code', { max: 40 });
  let sql = 'SELECT * FROM remnants WHERE status = ?';
  const params = [status];
  if (materialCode) { sql += ' AND material_code = ?'; params.push(materialCode); }
  sql += ' ORDER BY area_m2 DESC';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/remnants', auth, adminOnly, (req, res) => {
  const b = req.body || {};
  if (!Array.isArray(b.remnants) || b.remnants.length === 0) bad('Remnants ro\'yxati kerak');
  if (b.remnants.length > 1000) bad('Remnants juda ko\'p (max 1000)');
  const orderId = num(b.order_id, 'order_id', { min: 1, max: 1e12 });
  const list = b.remnants.map((r, i) => {
    if (!r || typeof r !== 'object') bad(`remnants[${i}] obyekt bo'lishi kerak`);
    return {
      id: str(r.id, `remnants[${i}].id`, { max: 64 }),
      material_code: str(r.material_code, `remnants[${i}].material_code`, { max: 40 }) || 'LDSP18',
      len: num(r.len, `remnants[${i}].len`, { min: 1, max: 10000, required: true }),
      width: num(r.width, `remnants[${i}].width`, { min: 1, max: 10000, required: true }),
      t: num(r.t, `remnants[${i}].t`, { min: 1, max: 100 }) || 18
    };
  });
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO remnants (remnant_id, material_code, length, width, thickness, area_m2, status, source_order_id)
    VALUES (?, ?, ?, ?, ?, ?, 'available', ?)
  `);
  db.transaction((rows) => {
    for (const r of rows) {
      const area = Math.round(((r.len * r.width) / 1e6) * 1000) / 1000;
      stmt.run(r.id || `rem-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        r.material_code, r.len, r.width, r.t, area, orderId);
    }
  })(list);
  res.json({ ok: true, count: list.length });
});

app.put('/api/remnants/:id/use', auth, adminOnly, (req, res) => {
  const orderId = num((req.body || {}).order_id, 'order_id', { min: 1, max: 1e12 });
  const r = db.prepare('UPDATE remnants SET status = ?, used_order_id = ? WHERE remnant_id = ? OR id = ?')
    .run('used', orderId, req.params.id, req.params.id);
  if (r.changes === 0) return fail(res, 'S3D-DATA-001', 'Qoldiq topilmadi');
  res.json({ ok: true, id: req.params.id, status: 'used' });
});

/* ═══════════════════ AI BUILD & VOICE API (Kamchilik 25, 26) — faqat login bilan ═══════════════════ */
app.post('/api/ai/build', auth, ah(async (req, res) => {
  const b = req.body || {};
  const inputText = str(b.prompt || b.text, 'prompt', { max: 2000 });
  if (!inputText) bad('AI uchun matn (prompt) kerak');
  /* to'liq fragment (o'lcham, min/max, detallar) — data_json ustunidan */
  const catalog = {};
  for (const f of db.prepare('SELECT code, data_json FROM fragments').all()) {
    try { catalog[f.code] = JSON.parse(f.data_json || '{}'); } catch (e) { /* buzilgan qator — o'tkazamiz */ }
  }
  const result = await aiBuild(inputText, catalog);
  res.json({ ok: true, ...result });
}));

/* ═══════════════════ AI — istalgan provayder (TZ-12) ═══════════════════
 * Kalit faqat serverda. Til modeli matnni tuzilmaga o'giradi, joylashtirishni sayt dvigateli qiladi.
 * Har so'rov jurnalga yoziladi (A6): matn, natija, xato — "usta nima dedi → AI nima tushundi". */
app.get('/api/ai/status', (req, res) => {
  const c = aiConfig();
  res.json({ enabled: c.enabled, provider: c.provider, model: c.model });
});
app.post('/api/ai/parse', auth, aiLimiter.check, ah(async (req, res) => {
  const text = str((req.body || {}).text, 'text', { max: 2000, required: true });
  if (!aiConfig().enabled) return fail(res, 'S3D-AI-001');
  aiLimiter.hit(req);
  const log = db.prepare('INSERT INTO ai_log (user_id, text, engine, ok, result_json, error) VALUES (?, ?, ?, ?, ?, ?)');
  try {
    const r = await llmParse(text);
    log.run(req.user.id, text, r.engine, 1, JSON.stringify(r.parsed), '');
    res.json({ ok: true, engine: r.engine, parsed: r.parsed });
  } catch (e) {
    log.run(req.user.id, text, aiConfig().provider || '', 0, '', String(e.message || e).slice(0, 300));
    jurnal.error({ code: 'S3D-AI-002', rid: req.rid, uid: req.user.id, method: req.method, path: req.path, status: 502, msg: 'AI xatosi: ' + (e.message || e) });
    res.locals.logged = true;
    fail(res, 'S3D-AI-002');
  }
}));

/* TZ-26: bitta mebel konstruksiyasi — AI matnni konstruksiya tiliga o'giradi, server tekshiradi va to'g'rilaydi
   (app/js/engine/konstruksiyaTili.js); chizma, narx — saytda. Natija { spec, tuzatish, tushunilmadi } yoki { xona: true } */
app.post('/api/ai/konstruksiya', auth, aiLimiter.check, ah(async (req, res) => {
  const text = str((req.body || {}).text, 'text', { max: 2000, required: true });
  if (!aiConfig().enabled) return fail(res, 'S3D-AI-001');
  aiLimiter.hit(req);
  const log = db.prepare('INSERT INTO ai_log (user_id, text, engine, ok, result_json, error) VALUES (?, ?, ?, ?, ?, ?)');
  try {
    const r = await llmKonstruksiya(text);
    log.run(req.user.id, text, r.engine + ' konstruksiya', 1, JSON.stringify(r.natija), '');
    res.json({ ok: true, engine: r.engine, ...r.natija });
  } catch (e) {
    log.run(req.user.id, text, (aiConfig().provider || '') + ' konstruksiya', 0, '', String(e.message || e).slice(0, 300));
    jurnal.error({ code: 'S3D-AI-002', rid: req.rid, uid: req.user.id, method: req.method, path: req.path, status: 502, msg: 'AI konstruksiya xatosi: ' + (e.message || e) });
    res.locals.logged = true;
    fail(res, 'S3D-AI-002');
  }
}));

app.post('/api/ai/voice', auth, (req, res) => {
  const b = req.body || {};
  const text = str(b.text, 'text', { max: 2000 });
  if (text) return res.json({ ok: true, text, zamer: parseZamer(text), engine: 'client-speech' });
  /* Server STT (Yandex SpeechKit) hali ulanmagan — soxta matn qaytarilmaydi */
  if (b.audio_base64) return fail(res, 'S3D-AI-003');
  bad('Audio yoki text kerak');
});

/* ═══════════════════ XATOLAR JURNALI (TZ-19 §2) ═══════════════════
 * Brauzerdagi xato serverga keladi (kod, bo'lim, sahifa, qisqa matn) — kirmagan foydalanuvchidan ham.
 * Faqat ruxsat etilgan maydonlar, 4 KB gacha, 30 ta/daqiqa/IP; parol, token, email, telefon yuborilmaydi (niqoblanadi ham). */
const optUser = (req) => { const t = readToken(req); return t ? verifyToken(t.token) : null; };
const logField = (v, field, max, re) => {
  const s = str(v, field, { max });
  if (s && re && !re.test(s)) bad(`${field} formati noto'g'ri`);
  return s;
};
app.post('/api/log', logLimiter.check, (req, res) => {
  logLimiter.hit(req);
  const b = req.body;
  if (!b || typeof b !== 'object' || Array.isArray(b)) return fail(res, 'S3D-LOG-001');
  const extra = Object.keys(b).filter(k => !['code', 'modul', 'sahifa', 'xabar', 'stack'].includes(k));
  if (extra.length) return fail(res, 'S3D-LOG-001', 'Ruxsat etilmagan maydon: ' + extra.slice(0, 3).join(', '));
  let e;
  try {
    const code = logField(b.code, 'code', 20, KOD_RE);
    if (!code) bad('code kerak');
    e = { source: 'web', code, rid: req.rid, path: logField(b.sahifa, 'sahifa', 80, /^[\w./#?=&-]*$/), msg: logField(b.xabar, 'xabar', 300),
      meta: { modul: logField(b.modul, 'modul', 40, /^[\w/-]*$/), stack: str(b.stack, 'stack', { max: 1000 }), ua: String(req.headers['user-agent'] || '').slice(0, 160) } };
  } catch (err) { if (err instanceof BadInput) return fail(res, 'S3D-LOG-001', err.message); throw err; }
  const u = optUser(req);
  jurnal.warn({ ...e, uid: u && u.id });
  res.status(204).end();
});
/* admin: Sozlamalar → "Xatolar jurnali" — kod bo'yicha guruh va oxirgi yozuvlar; rid yoki kod bo'yicha qidiruv */
app.get('/api/admin/xatolar', auth, adminOnly, (req, res) => {
  const rid = logField(req.query.rid, 'rid', 24, /^[a-f0-9]*$/);
  const kod = logField(req.query.kod, 'kod', 20, /^(S3D-[A-Z]{2,6}-\d{3})?$/);
  res.json(jurnal.royxat({ rid, kod }));
});

/* ═══════════════════ HEALTH ═══════════════════ */
app.get('/api/health', (req, res) => {
  db.prepare('SELECT 1').get();             // baza javob beradimi
  res.json({ ok: true, uptime: Math.round(process.uptime()) });
});

/* ═══════════════════ XATOLAR ═══════════════════ */
app.use('/api', (req, res) => fail(res, 'S3D-SRV-002'));
/* noma'lum sahifa — 404 (dizayndagi sahifa, web/dist/404.html) */
app.use((req, res, next) => {
  if ((req.method !== 'GET' && req.method !== 'HEAD') || !HAS_WEB) return next();
  res.status(404).set('Cache-Control', 'no-cache').sendFile(path.join(WEB_DIST, '404.html'), (e) => { if (e) next(); });
});
app.use((err, req, res, next) => {          // eslint-disable-line no-unused-vars
  if (err instanceof BadInput) return fail(res, 'S3D-VAL-001', err.message);
  if (err.type === 'entity.parse.failed') return fail(res, 'S3D-VAL-002');
  if (err.type === 'entity.too.large') return fail(res, 'S3D-VAL-003');
  /* ichki tafsilot (stack) faqat jurnalda; mijozga — kod va rid */
  jurnal.error({ code: 'S3D-SRV-001', rid: req.rid, uid: req.user && req.user.id, method: req.method, path: req.path, status: 500,
    msg: String(err && err.message || err), meta: { stack: String(err && err.stack || '').slice(0, 1200) } });
  res.locals.logged = true;
  fail(res, 'S3D-SRV-001');
});
process.on('unhandledRejection', (e) => jurnal.error({ code: 'S3D-SRV-001', msg: 'unhandledRejection: ' + (e && e.message || e), meta: { stack: String(e && e.stack || '').slice(0, 1200) } }));
process.on('uncaughtException', (e) => {
  jurnal.error({ code: 'S3D-SRV-001', msg: 'uncaughtException: ' + (e && e.message || e), meta: { stack: String(e && e.stack || '').slice(0, 1200) } });
  process.exit(1);   // holati noma'lum jarayon davom etmaydi — pm2/systemd qayta ishga tushiradi
});

/* ═══════════════════ WebSocket — real-time narx ═══════════════════ */
const server = http.createServer(app);
/* X6: begona sayt ulana olmaydi (Origin), IP bo'yicha 5 ulanish; kiruvchi xabarlardan faqat ping */
/* proksi (nginx) ortida haqiqiy IP — X-Forwarded-For; u yo'q bo'lsa IP noma'lum (hamma 127.0.0.1 bo'lib qolmasin) — chegara qo'llanmaydi */
const wsg = wsGuard({ allowed: ALLOWED_ORIGINS, maxPerIp: 5, ipOf: (req) => app.get('trust proxy') ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : req.socket.remoteAddress });
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096, verifyClient: wsg.verifyClient });

function broadcastPrice(materialId, uzs, usd) {
  const msg = JSON.stringify({ type: 'price_update', material_id: materialId, uzs, usd, ts: Date.now() });
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}

wss.on('connection', (ws, req) => {
  wsg.track(ws, req);
  ws.on('error', () => {});
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
    } catch (e) { /* ignore */ }
  });
  ws.send(JSON.stringify({ type: 'connected', ts: Date.now() }));
});

/* ═══════════════════ START ═══════════════════ */
server.listen(PORT, () => {
  console.log(`Smart3D server: http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`API: http://localhost:${PORT}/api/health`);
});
