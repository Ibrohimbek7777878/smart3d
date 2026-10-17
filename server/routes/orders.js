/* BUYURTMALAR (TZ-23 C1, egasi #138)
 * Usta loyihani sexga buyurtma qiladi: mijoz ismi, telefon (S1), izoh, loyiha (to'liq hujjat — sex shu bilan ishlaydi), summa.
 * Holat: yangi → qabul → ishlab → tayyor (yoki bekor) — faqat admin o'zgartiradi. Pul harakati yo'q (qoida 5.1): summa — ma'lumot.
 * Admin Telegram'i ulangan bo'lsa (TZ-16) — yangi buyurtma xabari (xato bo'lsa — buyurtma baribir saqlanadi). */
import express from 'express';
import { tgToken, tgApi } from '../telegram.js';
import { addColumn } from '../lib/db.js';
import { bad, fail } from '../lib/xato.js';
import { str, plainText, email, num, phone, projectPayload } from '../lib/tekshir.js';

const BUYURTMA_HOLAT = ['yangi', 'qabul', 'ishlab', 'tayyor', 'bekor'];
const buyurtmaQisqa = (o) => ({ id: o.id, project_id: o.project_id, project_name: o.project_name || '', client_name: o.client_name, client_phone: o.client_phone,
  total_price: o.total_price, notes: o.notes, status: BUYURTMA_HOLAT.includes(o.status) ? o.status : 'yangi', created_at: o.created_at, updated_at: o.updated_at || o.created_at,
  modules: (() => { try { return JSON.parse(o.placements_json || '[]').length; } catch (_) { return 0; } })() });

export default function ordersRouter({ db, jurnal, auth, adminOnly }) {
  db.exec(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, client_name TEXT DEFAULT '', client_phone TEXT DEFAULT '',
    client_email TEXT DEFAULT '', room_json TEXT DEFAULT '{}', placements_json TEXT DEFAULT '[]', total_price INTEGER DEFAULT 0,
    notes TEXT DEFAULT '', status TEXT DEFAULT 'draft', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  addColumn(db, 'orders', 'project_id', 'INTEGER');
  addColumn(db, 'orders', 'project_name', "TEXT DEFAULT ''");
  addColumn(db, 'orders', 'doc_json', "TEXT DEFAULT ''");
  addColumn(db, 'orders', 'updated_at', 'DATETIME');
  const r = express.Router();

  r.post('/api/orders', auth, (req, res) => {
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
    const ins = db.prepare(`INSERT INTO orders (user_id, client_name, client_phone, client_email, room_json, placements_json, total_price, notes, status,
        project_id, project_name, doc_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'yangi', ?, ?, ?, CURRENT_TIMESTAMP)`)
      .run(req.user.id, clientName, tel, clientEmail, JSON.stringify(room), JSON.stringify(placements), total,
        str(b.notes, 'notes', { max: 4000 }), pid,   /* izoh — oddiy matn: < > rad etilmaydi (ekranda matn sifatida chiqadi) */
        plainText(b.project_name, 'project_name', { max: 200 }), docJson);
    const id = Number(ins.lastInsertRowid);
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
  r.get('/api/orders', auth, (req, res) => {
    res.json(db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.user.id).map(buyurtmaQisqa));
  });
  r.get('/api/orders/:id', auth, (req, res) => {
    const o = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!o) return fail(res, 'S3D-DATA-001');
    res.json({ ...buyurtmaQisqa(o), room: JSON.parse(o.room_json || '{}'), placements: JSON.parse(o.placements_json || '[]'), doc: o.doc_json ? JSON.parse(o.doc_json) : null });
  });
  /** admin: hamma buyurtmalar (usta bilan) va holatni o'zgartirish */
  r.get('/api/admin/orders', auth, adminOnly, (req, res) => {
    res.json(db.prepare(`SELECT o.*, u.name AS usta_name, u.email AS usta_email, u.phone AS usta_phone FROM orders o LEFT JOIN users u ON u.id = o.user_id
      ORDER BY o.id DESC LIMIT 500`).all().map(o => ({ ...buyurtmaQisqa(o), usta: { name: o.usta_name || '', email: o.usta_email || '', phone: o.usta_phone || '' } })));
  });
  r.put('/api/admin/orders/:id', auth, adminOnly, (req, res) => {
    const status = String((req.body || {}).status || '');
    if (!BUYURTMA_HOLAT.includes(status)) return fail(res, 'S3D-ORD-001');
    const u = db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
    if (!u.changes) return fail(res, 'S3D-DATA-001');
    jurnal.info({ code: 'S3D-ORD-102', rid: req.rid, uid: req.user.id, msg: `buyurtma №${req.params.id} → ${status}` });
    res.json({ ok: true, status });
  });

  return r;
}
