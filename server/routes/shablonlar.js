/* SHAXSIY SHABLONLAR (TZ-24 B)
 * Har foydalanuvchining o'z shablonlari: "prompt" (tayyor so'rov raqamlari yoki o'z matni), "loyiha" (xona va modullar) va
 * "modul" (TZ-24 A: qo'lda chizilgan modul, yassi chizma). Faqat o'zi ko'radi va o'chiradi; ko'pi bilan 100 ta;
 * ma'lumot — loyiha tekshiruvi bilan (himoya.js, 300 KB gacha). */
import express from 'express';
import { docXatosi } from '../himoya.js';
import { bad, fail } from '../lib/xato.js';
import { str, plainText } from '../lib/tekshir.js';

const SHABLON_TUR = ['prompt', 'loyiha', 'modul'], SHABLON_MAX = 100;

export default function shablonlarRouter({ db, auth }) {
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
  const r = express.Router();

  r.get('/api/shablonlar', auth, (req, res) => {
    const rows = db.prepare('SELECT id, tur, nom, data_json, created_at FROM user_items WHERE user_id = ? ORDER BY id DESC LIMIT ?').all(req.user.id, SHABLON_MAX);
    res.json(rows.map(x => { let data = null; try { data = JSON.parse(x.data_json); } catch (e) { data = null; } return { id: x.id, tur: x.tur, nom: x.nom, data, created_at: x.created_at }; }));
  });
  r.post('/api/shablonlar', auth, (req, res) => {
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
    const ins = db.prepare('INSERT INTO user_items (user_id, tur, nom, data_json) VALUES (?, ?, ?, ?)').run(req.user.id, tur, nom, json);
    res.json({ ok: true, id: Number(ins.lastInsertRowid) });
  });
  r.delete('/api/shablonlar/:id', auth, (req, res) => {
    const d = db.prepare('DELETE FROM user_items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (!d.changes) return fail(res, 'S3D-SHB-001');
    res.json({ ok: true });
  });

  return r;
}
