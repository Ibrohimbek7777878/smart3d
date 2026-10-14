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
 *   NODE_ENV         — 'production' da xavfsizlik shartlari qat'iy
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
/** Async route'dagi xato Express 4 da ushlanmaydi — next(err) ga o'tkazamiz (aks holda server o'chadi). */
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ═══════════════════ RATE LIMIT (kutubxonasiz, xotirada) ═══════════════════
 * login — faqat MUVAFFAQIYATSIZ urinishlar sanaladi (bitta NAT ortidagi sex o'zini
 * bloklamaydi); register — alohida hisob. Nginx ortida TRUST_PROXY=1 shart. */
function rateLimit({ windowMs, max }) {
  const hits = new Map();                  // ip → {n, reset}
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
      const h = entry(req.ip);
      if (h.n >= max) {
        res.set('Retry-After', String(Math.ceil((h.reset - Date.now()) / 1000)));
        return res.status(429).json({ error: 'Urinishlar juda ko\'p — keyinroq qayta urinib ko\'ring' });
      }
      next();
    },
    hit: (req) => { entry(req.ip).n++; }
  };
}
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });   // 10 xato / 15 daq
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }); // 10 ro'yxat / soat

/* ── Express ── */
const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : false }));
app.use((req, res, next) => {             // xavfsizlik sarlavhalari (helmet'siz)
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=(self)'
  });
  next();
});
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '../app')));  // frontend

/* ── Auth middleware ── */
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Token yo\'q' });
  try {
    req.user = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    next();
  } catch (e) {
    res.status(401).json({ error: 'Token yaroqsiz' });
  }
}
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin kerak' });
  next();
}
const signToken = (u) => jwt.sign({ id: u.id, email: u.email, role: u.role }, JWT_SECRET,
  { expiresIn: JWT_EXPIRES, algorithm: 'HS256' });

/* ═══════════════════ AUTH API ═══════════════════ */
app.post('/api/register', registerLimiter.check, ah(async (req, res) => {
  registerLimiter.hit(req);
  const b = req.body || {};
  const em = email(b.email);
  const password = str(b.password, 'parol', { max: 128, required: true });
  if (password.length < 8) bad('parol kamida 8 belgi bo\'lishi kerak');
  const name = plainText(b.name, 'ism', { max: 100 });
  const phone = str(b.phone, 'telefon', { max: 32 });
  if (phone && !/^[0-9+()\-\s]+$/.test(phone)) bad('telefon formati noto\'g\'ri');
  const exists = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(em);
  if (exists) return res.status(409).json({ error: 'Email allaqachon bor' });
  const hash = await bcrypt.hash(password, 10);
  const r = db.prepare('INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)')
    .run(name, em, phone, hash, 'user');
  const user = { id: Number(r.lastInsertRowid), name, email: em, role: 'user' };
  res.json({ token: signToken(user), user });
}));

app.post('/api/login', loginLimiter.check, ah(async (req, res) => {
  const b = req.body || {};
  const em = email(b.email);
  const password = str(b.password, 'parol', { max: 128, required: true });
  /* lower(email) — eski kod emailni o'zgartirmasdan saqlagan (katta harflar bilan) */
  const u = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(em);
  if (!u || !(await bcrypt.compare(password, u.password_hash))) {
    loginLimiter.hit(req);
    return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
  }
  res.json({ token: signToken(u), user: { id: u.id, name: u.name, email: u.email, role: u.role } });
}));

app.get('/api/me', auth, (req, res) => {
  const u = db.prepare('SELECT id, name, email, phone, role FROM users WHERE id = ?').get(req.user.id);
  if (!u) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  res.json(u);
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
  if (!m) return res.status(404).json({ error: 'Topilmadi' });
  res.json(m);
});

app.put('/api/materials/:id/price', auth, adminOnly, (req, res) => {
  const b = req.body || {};
  const uzs = num(b.uzs, 'uzs', { min: 0, max: 1e12, required: true });
  const usd = num(b.usd, 'usd', { min: 0, max: 1e9 }) || 0;
  const old = db.prepare('SELECT uzs, usd FROM materials WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Material topilmadi' });
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
  if (!f) return res.status(404).json({ error: 'Topilmadi' });
  res.json(f);
});

/* ═══════════════════ ORDER API ═══════════════════ */
app.post('/api/orders', auth, (req, res) => {
  const b = req.body || {};
  const clientEmail = b.client_email ? email(b.client_email) : '';
  const room = b.room && typeof b.room === 'object' && !Array.isArray(b.room) ? b.room : {};
  const placements = Array.isArray(b.placements) ? b.placements : [];
  if (placements.length > 500) bad('placements juda ko\'p (max 500)');
  const r = db.prepare(`INSERT INTO orders (user_id, client_name, client_phone, client_email, room_json, placements_json, total_price, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(req.user.id, plainText(b.client_name, 'client_name', { max: 200 }), str(b.client_phone, 'client_phone', { max: 32 }),
      clientEmail, JSON.stringify(room), JSON.stringify(placements),
      Math.round(num(b.total_price, 'total_price', { min: 0, max: 1e13 }) || 0), str(b.notes, 'notes', { max: 4000 }));
  res.json({ id: Number(r.lastInsertRowid), ok: true });
});

app.get('/api/orders', auth, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(orders.map(o => ({
    ...o,
    room: JSON.parse(o.room_json || '{}'),
    placements: JSON.parse(o.placements_json || '[]')
  })));
});

app.get('/api/orders/:id', auth, (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!o) return res.status(404).json({ error: 'Topilmadi' });
  res.json({ ...o, room: JSON.parse(o.room_json || '{}'), placements: JSON.parse(o.placements_json || '[]') });
});

/* ═══════════════════ SERVICES API (Kamchilik 18) ═══════════════════ */
function readJsonData(name) {
  const p = path.join(__dirname, '../app/data', name);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}
app.get('/api/services', (req, res) => {
  res.json(readJsonData('services.json') || { services: [] });
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
  if (r.changes === 0) return res.status(404).json({ error: 'Qoldiq topilmadi' });
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

app.post('/api/ai/voice', auth, (req, res) => {
  const b = req.body || {};
  const text = str(b.text, 'text', { max: 2000 });
  if (text) return res.json({ ok: true, text, zamer: parseZamer(text), engine: 'client-speech' });
  /* Server STT (Yandex SpeechKit) hali ulanmagan — soxta matn qaytarilmaydi */
  if (b.audio_base64) return res.status(501).json({ error: 'Server ovoz tanish (STT) hali ulanmagan — brauzer ovozidan foydalaning' });
  bad('Audio yoki text kerak');
});

/* ═══════════════════ HEALTH ═══════════════════ */
app.get('/api/health', (req, res) => {
  db.prepare('SELECT 1').get();             // baza javob beradimi
  res.json({ ok: true, uptime: Math.round(process.uptime()) });
});

/* ═══════════════════ XATOLAR ═══════════════════ */
app.use('/api', (req, res) => res.status(404).json({ error: 'Topilmadi' }));
app.use((err, req, res, next) => {          // eslint-disable-line no-unused-vars
  if (err instanceof BadInput) return res.status(400).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON noto\'g\'ri' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'So\'rov juda katta' });
  console.error('Server xatosi:', req.method, req.path, err);
  res.status(500).json({ error: 'Server xatosi' });   // ichki tafsilot mijozga chiqmaydi
});
process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e));

/* ═══════════════════ WebSocket — real-time narx ═══════════════════ */
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });

function broadcastPrice(materialId, uzs, usd) {
  const msg = JSON.stringify({ type: 'price_update', material_id: materialId, uzs, usd, ts: Date.now() });
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}

wss.on('connection', (ws) => {
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
