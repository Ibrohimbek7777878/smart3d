/* PLITA MOSLASH XOTIRASI (TZ-57, 1-qadam): foydalanuvchi "Bazis plitasi → ERP plitasi" ni bir marta tanlaydi — keyingi loyihalarda shu tanlov
 * avtomatik qo'llanadi. Har foydalanuvchining o'z xotirasi (bir kishining noto'g'ri tanlovi boshqalarga ta'sir qilmaydi).
 * Faqat TANLANGAN narsa saqlanadi (taxmin yo'q, qoida 4.3); narx bu yerda saqlanmaydi — narx doim katalog/ERP qatlamidan.
 * GET /api/plita-moslash → { items: { kalit: { kod, nom } } };  PUT /api/plita-moslash { kalit, kod, nom } — saqlash;  DELETE ?kalit= — olib tashlash. */
import express from 'express';
import { str } from '../lib/tekshir.js';

export default function plitaMoslashRouter({ db, jurnal, auth }) {
  db.exec(`CREATE TABLE IF NOT EXISTS plita_moslash (
    user_id INTEGER NOT NULL, kalit TEXT NOT NULL, kod TEXT NOT NULL, nom TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, kalit))`);
  const r = express.Router();

  r.get('/api/plita-moslash', auth, (req, res) => {
    res.set('Cache-Control', 'no-store');
    const items = {};
    for (const x of db.prepare('SELECT kalit, kod, nom FROM plita_moslash WHERE user_id = ?').all(req.user.id)) items[x.kalit] = { kod: x.kod, nom: x.nom || '' };
    res.json({ items });
  });

  r.put('/api/plita-moslash', auth, (req, res) => {
    const b = req.body || {};
    const kalit = str(b.kalit, 'kalit', { max: 160, required: true });
    const kod = str(b.kod, 'kod', { max: 40, required: true });
    if (!/^ERP-[0-9a-z]{1,12}$/.test(kod)) { res.status(400).json({ ok: false, error: "kod ERP-… ko'rinishida bo'lishi kerak" }); return; }
    const nom = str(b.nom, 'nom', { max: 200 });
    db.prepare(`INSERT INTO plita_moslash (user_id, kalit, kod, nom) VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, kalit) DO UPDATE SET kod = excluded.kod, nom = excluded.nom, updated_at = CURRENT_TIMESTAMP`).run(req.user.id, kalit, kod, nom);
    jurnal.info({ code: 'S3D-MOS-100', rid: req.rid, uid: req.user.id, msg: 'plita moslash saqlandi' });
    res.json({ ok: true });
  });

  r.delete('/api/plita-moslash', auth, (req, res) => {
    const kalit = str(req.query.kalit, 'kalit', { max: 160, required: true });
    const n = db.prepare('DELETE FROM plita_moslash WHERE user_id = ? AND kalit = ?').run(req.user.id, kalit).changes;
    res.json({ ok: true, ochirildi: n });
  });
  return r;
}
