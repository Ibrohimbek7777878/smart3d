/* NARX STAVKALARI (TZ-20, 2026-10-17)
 * O'qish — hamma (hisob shundan); o'zgartirish — faqat admin. Shakl va tekshiruv — app/js/engine/narxStavka.js (bitta manba).
 * Boshlang'ich: materials.json dagi ish haqi va ustama (narxSukut). Har o'zgarish narx_history ga: kim, qachon, kalit, eski → yangi.
 * Sex xizmat jadvali brauzerda o'qiladi (fayl serverga yuklanmaydi) — bu yerga faqat tekshirilgan qatorlar keladi.
 * Pul harakati yo'q, ERP'ga yozilmaydi (qoida 2.10, 5.1). */
import express from 'express';
import { narxSukut, narxQollash, narxXatoMi } from '../../app/js/engine/narxStavka.js';
import { fail } from '../lib/xato.js';
import { num } from '../lib/tekshir.js';
import { readJsonData } from '../lib/malumot.js';

export default function narxlarRouter({ db, jurnal, auth, adminOnly }) {
  db.exec(`CREATE TABLE IF NOT EXISTS narx_history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, kalit TEXT NOT NULL,
    eski TEXT, yangi TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  const r = express.Router();
  function narxCurrent() {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'narx_stavkalari'").get();
    if (row) { try { return JSON.parse(row.value); } catch (e) { jurnal.error({ code: 'S3D-NARX-002', msg: 'narx_stavkalari buzilgan: ' + e.message }); } }
    return narxSukut(readJsonData('materials.json'));
  }

  r.get('/api/narxlar', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(narxCurrent());
  });
  r.put('/api/narxlar', auth, adminOnly, (req, res) => {
    const cur = narxCurrent();
    let q;
    try { q = narxQollash(cur, req.body || {}); }
    catch (e) { if (narxXatoMi(e)) return fail(res, 'S3D-NARX-001', e.message); throw e; }
    if (!q.ozgarish.length) return res.json({ ok: true, ozgarish: 0, narxlar: cur });
    q.next._meta = { ozgartirildi: `admin #${req.user.id}, ${new Date().toISOString().slice(0, 16).replace('T', ' ')}` };
    db.transaction(() => {
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('narx_stavkalari', ?, CURRENT_TIMESTAMP)").run(JSON.stringify(q.next));
      const ins = db.prepare('INSERT INTO narx_history (user_id, kalit, eski, yangi) VALUES (?, ?, ?, ?)');
      for (const o of q.ozgarish) ins.run(req.user.id, o.kalit, JSON.stringify(o.eski), JSON.stringify(o.yangi));
    })();
    jurnal.info({ code: 'S3D-NARX-100', rid: req.rid, uid: req.user.id, msg: `narx stavkalari: ${q.ozgarish.length} o'zgarish` });
    res.json({ ok: true, ozgarish: q.ozgarish.length, narxlar: q.next });
  });
  /** TZ-36 P7: sukut stavkalarga qaytarish (admin). Serverda admin avval saqlagan eski qiymat (masalan ish haqi) bazada qoladi —
   *  yangilashdan keyin shu endpoint uni materials.json dagi sukutga (ish haqi 0, "egasi" manbasi) qaytaradi.
   *  qamrov: 'ish_haqi' | 'ustama' | 'hammasi' (xizmatlar + tanlov + ish haqi + ustama). Har o'zgarish narx_history ga (kim, eski → yangi). */
  const QAMROV = { ish_haqi: ['ish_haqi'], ustama: ['ustama'], hammasi: ['xizmatlar', 'tanlov', 'ish_haqi', 'ustama'] };
  const yassi = (doc, bolimlar) => {
    const o = {};
    for (const b of bolimlar) {
      const v = (doc && doc[b]) || {};
      if (b === 'tanlov') { o['tanlov.raspil'] = v.raspil || null; for (const g of ['kromka', 'prisadka', 'bazis']) for (const [k, kod] of Object.entries(v[g] || {})) o[`tanlov.${g}.${k}`] = kod; }
      else for (const [k, x] of Object.entries(v)) o[`${b}.${k}`] = x;
    }
    return o;
  };
  r.post('/api/narxlar/sukut', auth, adminOnly, (req, res) => {
    const qamrov = String((req.body || {}).qamrov || '');
    if (!QAMROV[qamrov]) return fail(res, 'S3D-NARX-001', "qamrov: ish_haqi, ustama yoki hammasi bo'lishi kerak");
    const cur = narxCurrent();
    const sukut = narxSukut(readJsonData('materials.json'));
    const next = JSON.parse(JSON.stringify(cur));
    for (const b of QAMROV[qamrov]) next[b] = JSON.parse(JSON.stringify(sukut[b]));
    const a = yassi(cur, QAMROV[qamrov]), b = yassi(next, QAMROV[qamrov]);
    const ozgarish = [...new Set([...Object.keys(a), ...Object.keys(b)])]
      .filter(k => JSON.stringify(a[k] === undefined ? null : a[k]) !== JSON.stringify(b[k] === undefined ? null : b[k]))
      .map(k => ({ kalit: k, eski: a[k] === undefined ? null : a[k], yangi: b[k] === undefined ? null : b[k] }));
    if (!ozgarish.length) return res.json({ ok: true, ozgarish: 0, narxlar: cur });
    next._meta = { ozgartirildi: `admin #${req.user.id}, ${new Date().toISOString().slice(0, 16).replace('T', ' ')} (sukutga qaytarildi: ${qamrov})` };
    db.transaction(() => {
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('narx_stavkalari', ?, CURRENT_TIMESTAMP)").run(JSON.stringify(next));
      const ins = db.prepare('INSERT INTO narx_history (user_id, kalit, eski, yangi) VALUES (?, ?, ?, ?)');
      for (const o of ozgarish) ins.run(req.user.id, o.kalit, JSON.stringify(o.eski), JSON.stringify(o.yangi));
    })();
    jurnal.info({ code: 'S3D-NARX-101', rid: req.rid, uid: req.user.id, msg: `narx stavkalari sukutga qaytarildi (${qamrov}): ${ozgarish.length} o'zgarish` });
    res.json({ ok: true, ozgarish: ozgarish.length, narxlar: next });
  });
  /** o'zgarish tarixi (admin): oxirgi yozuvlar, yangisi birinchi */
  r.get('/api/narxlar/tarix', auth, adminOnly, (req, res) => {
    const limit = Math.min(num(req.query.limit, 'limit', { min: 1, max: 1e6 }) || 200, 1000);
    const js = (v) => { try { return JSON.parse(v); } catch (_) { return null; } };
    res.json(db.prepare(`SELECT h.id, h.kalit, h.eski, h.yangi, h.created_at, h.user_id, u.name AS kim, u.email FROM narx_history h
      LEFT JOIN users u ON u.id = h.user_id ORDER BY h.id DESC LIMIT ?`).all(Math.floor(limit))
      .map(x => ({ id: x.id, kalit: x.kalit, eski: js(x.eski), yangi: js(x.yangi), vaqt: x.created_at, kim: x.kim || x.email || ('#' + x.user_id) })));
  });

  return r;
}
