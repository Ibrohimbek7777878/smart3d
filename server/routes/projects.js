/* LOYIHALAR (TZ-07): har foydalanuvchi faqat o'z loyihasini ko'radi. O'chirish — faqat yashirish (archived), qoida 2.7.
 * Tekshiruv (projectPayload) — lib/tekshir.js (buyurtma ham shu bilan). */
import express from 'express';
import { fail } from '../lib/xato.js';
import { projectPayload } from '../lib/tekshir.js';

export default function projectsRouter({ db, auth }) {
  const r = express.Router();

  r.get('/api/projects', auth, (req, res) => {
    /* TZ-09: kartada mijoz va modul soni (saqlangan loyihadan; eski yozuvlarda mijoz bo'sh) */
    res.json(db.prepare(`SELECT id, name, client, total_price, created_at, updated_at,
        COALESCE(json_array_length(doc_json, '$.doc.placements'), json_array_length(doc_json, '$.placements'), 0) AS modules
      FROM projects WHERE user_id = ? AND archived = 0 ORDER BY updated_at DESC, id DESC`).all(req.user.id));
  });
  r.post('/api/projects', auth, (req, res) => {
    const v = projectPayload(req.body || {});
    const ins = db.prepare('INSERT INTO projects (user_id, name, client, doc_json, total_price) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, v.name, v.client, v.doc_json, v.total_price);
    res.json({ id: Number(ins.lastInsertRowid), ok: true });
  });
  r.get('/api/projects/:id', auth, (req, res) => {
    const pr = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ? AND archived = 0').get(req.params.id, req.user.id);
    if (!pr) return fail(res, 'S3D-PROJ-001', 'Topilmadi');
    res.json({ id: pr.id, name: pr.name, client: pr.client || '', total_price: pr.total_price, updated_at: pr.updated_at, doc: JSON.parse(pr.doc_json) });
  });
  r.put('/api/projects/:id', auth, (req, res) => {
    const pr = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ? AND archived = 0').get(req.params.id, req.user.id);
    if (!pr) return fail(res, 'S3D-PROJ-001', 'Topilmadi');
    const v = projectPayload(req.body || {});
    db.prepare('UPDATE projects SET name = ?, client = ?, doc_json = ?, total_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(v.name, v.client, v.doc_json, v.total_price, pr.id);
    res.json({ ok: true });
  });
  r.delete('/api/projects/:id', auth, (req, res) => {
    const u = db.prepare('UPDATE projects SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND archived = 0')
      .run(req.params.id, req.user.id);
    if (!u.changes) return fail(res, 'S3D-PROJ-001', 'Topilmadi');
    res.json({ ok: true });
  });

  return r;
}
