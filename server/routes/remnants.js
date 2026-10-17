/* REMNANTS API (Kamchilik 9) — sex ombori (delovoy qoldiqlar): o'qish — login bilan, yozish — faqat admin
 * (ro'yxatdan o'tish ochiq, oddiy foydalanuvchi omborni o'zgartira olmasligi kerak). */
import express from 'express';
import crypto from 'crypto';
import { bad, fail } from '../lib/xato.js';
import { str, num } from '../lib/tekshir.js';

export default function remnantsRouter({ db, auth, adminOnly }) {
  const r = express.Router();

  r.get('/api/remnants', auth, (req, res) => {
    const status = str(req.query.status, 'status', { max: 20 }) || 'available';
    const materialCode = str(req.query.material_code, 'material_code', { max: 40 });
    let sql = 'SELECT * FROM remnants WHERE status = ?';
    const params = [status];
    if (materialCode) { sql += ' AND material_code = ?'; params.push(materialCode); }
    sql += ' ORDER BY area_m2 DESC';
    res.json(db.prepare(sql).all(...params));
  });

  r.post('/api/remnants', auth, adminOnly, (req, res) => {
    const b = req.body || {};
    if (!Array.isArray(b.remnants) || b.remnants.length === 0) bad('Remnants ro\'yxati kerak');
    if (b.remnants.length > 1000) bad('Remnants juda ko\'p (max 1000)');
    const orderId = num(b.order_id, 'order_id', { min: 1, max: 1e12 });
    const list = b.remnants.map((x, i) => {
      if (!x || typeof x !== 'object') bad(`remnants[${i}] obyekt bo'lishi kerak`);
      return {
        id: str(x.id, `remnants[${i}].id`, { max: 64 }),
        material_code: str(x.material_code, `remnants[${i}].material_code`, { max: 40 }) || 'LDSP18',
        len: num(x.len, `remnants[${i}].len`, { min: 1, max: 10000, required: true }),
        width: num(x.width, `remnants[${i}].width`, { min: 1, max: 10000, required: true }),
        t: num(x.t, `remnants[${i}].t`, { min: 1, max: 100 }) || 18
      };
    });
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO remnants (remnant_id, material_code, length, width, thickness, area_m2, status, source_order_id)
      VALUES (?, ?, ?, ?, ?, ?, 'available', ?)
    `);
    db.transaction((rows) => {
      for (const x of rows) {
        const area = Math.round(((x.len * x.width) / 1e6) * 1000) / 1000;
        stmt.run(x.id || `rem-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
          x.material_code, x.len, x.width, x.t, area, orderId);
      }
    })(list);
    res.json({ ok: true, count: list.length });
  });

  r.put('/api/remnants/:id/use', auth, adminOnly, (req, res) => {
    const orderId = num((req.body || {}).order_id, 'order_id', { min: 1, max: 1e12 });
    const u = db.prepare('UPDATE remnants SET status = ?, used_order_id = ? WHERE remnant_id = ? OR id = ?')
      .run('used', orderId, req.params.id, req.params.id);
    if (u.changes === 0) return fail(res, 'S3D-DATA-001', 'Qoldiq topilmadi');
    res.json({ ok: true, id: req.params.id, status: 'used' });
  });

  return r;
}
