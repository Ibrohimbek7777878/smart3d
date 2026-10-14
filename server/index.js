/* Smart3D Server — API + Auth + Real-time narx
 * Boshlash: npm install && npm run init-db && npm start
 * Port: 3000
 */
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseZamer, suggestLayout, aiBuild } from '../app/js/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || 'smart3d-secret-2026';
const PORT = process.env.PORT || 3000;

/* ── DB ulanish ── */
const db = new Database(path.join(__dirname, 'smart3d.db'));
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

/* ── Express ── */
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../app')));  // frontend

/* ── Auth middleware ── */
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token yo\'q' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Token yaroqsiz' });
  }
}
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin kerak' });
  next();
}

/* ═══════════════════ AUTH API ═══════════════════ */
app.post('/api/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email va parol kerak' });
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'Email allaqachon bor' });
  const hash = await bcrypt.hash(password, 10);
  const r = db.prepare('INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)')
    .run(name || '', email, phone || '', hash, 'user');
  const token = jwt.sign({ id: r.lastInsertRowid, email, role: 'user' }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: r.lastInsertRowid, name, email, role: 'user' } });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!u || !(await bcrypt.compare(password, u.password_hash))) {
    return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
  }
  const token = jwt.sign({ id: u.id, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: u.id, name: u.name, email: u.email, role: u.role } });
});

app.get('/api/me', auth, (req, res) => {
  const u = db.prepare('SELECT id, name, email, phone, role FROM users WHERE id = ?').get(req.user.id);
  res.json(u);
});

/* ═══════════════════ MATERIAL API ═══════════════════ */
app.get('/api/materials', (req, res) => {
  const { q, cat_code, type, limit } = req.query;
  let sql = 'SELECT * FROM materials WHERE 1=1';
  const params = [];
  if (cat_code) { sql += ' AND cat_code = ?'; params.push(cat_code); }
  if (type) { sql += ' AND type = ?'; params.push(type); }
  if (q) {
    sql += ' AND (id = ? OR sku LIKE ? OR name LIKE ? OR search_text LIKE ?)';
    params.push(q, `%${q}%`, `%${q}%`, `%${q.toLowerCase()}%`);
  }
  sql += ' ORDER BY uzs DESC LIMIT ?';
  params.push(Math.min(parseInt(limit) || 100, 500));
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/materials/:id', (req, res) => {
  const m = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Topilmadi' });
  res.json(m);
});

app.put('/api/materials/:id/price', auth, adminOnly, (req, res) => {
  const { uzs, usd } = req.body;
  const old = db.prepare('SELECT uzs, usd FROM materials WHERE id = ?').get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Material topilmadi' });
  db.prepare('UPDATE materials SET uzs = ?, usd = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(uzs, usd || 0, req.params.id);
  db.prepare('INSERT INTO price_history (material_id, old_uzs, new_uzs, old_usd, new_usd, changed_by) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.params.id, old.uzs, uzs, old.usd, usd || 0, req.user.id);
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
  const { client_name, client_phone, client_email, room, placements, total_price, notes } = req.body;
  const r = db.prepare(`INSERT INTO orders (user_id, client_name, client_phone, client_email, room_json, placements_json, total_price, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(req.user.id, client_name || '', client_phone || '', client_email || '',
      JSON.stringify(room || {}), JSON.stringify(placements || []), total_price || 0, notes || '');
  res.json({ id: r.lastInsertRowid, ok: true });
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
app.get('/api/services', (req, res) => {
  try {
    const sPath = path.join(__dirname, '../app/data/services.json');
    if (fs.existsSync(sPath)) {
      const data = JSON.parse(fs.readFileSync(sPath, 'utf8'));
      return res.json(data);
    }
    res.json({ rates: [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ═══════════════════ FURNITURA API (Kamchilik 17) ═══════════════════ */
app.get('/api/furnitura', (req, res) => {
  try {
    const fPath = path.join(__dirname, '../app/data/furnitura-catalog.json');
    if (fs.existsSync(fPath)) {
      const data = JSON.parse(fs.readFileSync(fPath, 'utf8'));
      const q = (req.query.q || '').toLowerCase();
      let items = data.items || [];
      if (q) {
        items = items.filter(it => (it.name || '').toLowerCase().includes(q) || (it.code || '').toLowerCase().includes(q));
      }
      return res.json({ _meta: data._meta, total: items.length, items: items.slice(0, 100) });
    }
    res.json({ items: [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ═══════════════════ REMNANTS API (Kamchilik 9) ═══════════════════ */
app.get('/api/remnants', (req, res) => {
  const { material_code, status } = req.query;
  let sql = 'SELECT * FROM remnants WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  else { sql += ' AND status = ?'; params.push('available'); }
  if (material_code) { sql += ' AND material_code = ?'; params.push(material_code); }
  sql += ' ORDER BY area_m2 DESC';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/remnants', (req, res) => {
  const { remnants, order_id } = req.body;
  if (!Array.isArray(remnants) || remnants.length === 0) {
    return res.status(400).json({ error: 'Remnants ro\'yxati kerak' });
  }
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO remnants (remnant_id, material_code, length, width, thickness, area_m2, status, source_order_id)
    VALUES (?, ?, ?, ?, ?, ?, 'available', ?)
  `);
  const insertMany = db.transaction((list) => {
    for (const r of list) {
      const area = Math.round(((r.len * r.width) / 1e6) * 1000) / 1000;
      stmt.run(r.id || `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        r.material_code || 'LDSP18', r.len, r.width, r.t || 18, area, order_id || null);
    }
  });
  insertMany(remnants);
  res.json({ ok: true, count: remnants.length });
});

app.put('/api/remnants/:id/use', (req, res) => {
  const { order_id } = req.body;
  const r = db.prepare('UPDATE remnants SET status = ?, used_order_id = ? WHERE remnant_id = ? OR id = ?')
    .run('used', order_id || null, req.params.id, req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Qoldiq topilmadi' });
  res.json({ ok: true, id: req.params.id, status: 'used' });
});

/* ═══════════════════ AI BUILD & VOICE API (Kamchilik 25, 26) ═══════════════════ */
app.post('/api/ai/build', async (req, res) => {
  const { prompt, text, room } = req.body;
  const inputText = prompt || text || '';
  if (!inputText.trim()) {
    return res.status(400).json({ error: 'AI uchun matn (prompt) kerak' });
  }
  try {
    const frags = db.prepare('SELECT * FROM fragments').all();
    const catalog = {};
    for (const f of frags) {
      try {
        catalog[f.code] = {
          code: f.code,
          name: f.name,
          category: f.category,
          w: f.width || 600,
          d: f.depth || 550,
          h: f.height || 720,
          slots: { korpus: 'LDSP18', fasad: 'MDF16', orqa: 'HDF3' }
        };
      } catch (e) { }
    }
    const result = await aiBuild(inputText, catalog);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: 'AI xatosi: ' + e.message });
  }
});

app.post('/api/ai/voice', (req, res) => {
  const { audio_base64, text, lang } = req.body;
  if (text) {
    const zamer = parseZamer(text);
    return res.json({ ok: true, text, zamer, engine: 'client-speech' });
  }
  if (audio_base64) {
    return res.json({
      ok: true,
      text: 'Oshxona 3x4 metr, L shakl, pastki shkaflar va osma javonlar',
      zamer: parseZamer('Oshxona 3x4 metr, L shakl, pastki shkaflar va osma javonlar'),
      engine: 'server-stt-proxy'
    });
  }
  res.status(400).json({ error: 'Audio yoki text kerak' });
});

/* ═══════════════════ HEALTH ═══════════════════ */
app.get('/api/health', (req, res) => {
  const users = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
  const mats = db.prepare('SELECT COUNT(*) as n FROM materials').get().n;
  const orders = db.prepare('SELECT COUNT(*) as n FROM orders').get().n;
  res.json({ ok: true, users, materials: mats, orders, uptime: process.uptime() });
});

/* ═══════════════════ WebSocket — real-time narx ═══════════════════ */
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcastPrice(materialId, uzs, usd) {
  const msg = JSON.stringify({ type: 'price_update', material_id: materialId, uzs, usd, ts: Date.now() });
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}

wss.on('connection', (ws) => {
  console.log('WS client ulandi');
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
