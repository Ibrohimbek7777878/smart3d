/* MATERIAL API: ro'yxat va qidiruv — hamma; narxni o'zgartirish — faqat admin (tarixga yoziladi, WebSocket orqali hammaga). */
import express from 'express';
import { fail } from '../lib/xato.js';
import { str, num } from '../lib/tekshir.js';

export default function materialsRouter({ db, auth, adminOnly, broadcastPrice }) {
  const r = express.Router();

  r.get('/api/materials', (req, res) => {
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

  r.get('/api/materials/:id', (req, res) => {
    const m = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
    if (!m) return fail(res, 'S3D-DATA-001');
    res.json(m);
  });

  r.put('/api/materials/:id/price', auth, adminOnly, (req, res) => {
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

  return r;
}
