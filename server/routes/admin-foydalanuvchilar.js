/* ADMIN: FOYDALANUVCHILAR, LOYIHALAR, BUYURTMALAR (TZ-37, 2-faza, bo'lim 7) — ko'rish, qidirish, bloklash.
 *   GET  /api/admin/foydalanuvchilar?q=&rol=&holat=&limit=&offset=     ro'yxat (loyiha va buyurtma soni bilan)
 *   GET  /api/admin/foydalanuvchilar/:id                               bitta foydalanuvchi + uning loyihalari va buyurtmalari
 *   PUT  /api/admin/foydalanuvchilar/:id/blok  { bloklangan, sabab }   bloklash / ochish (users.bloklangan; kalitlar bekor, kirish yopiq — lib/auth.js)
 *   GET  /api/admin/loyihalar?q=&user=&arxiv=&limit=&offset=           barcha loyihalar (hujjatsiz)
 *   GET  /api/admin/buyurtmalar?q=&holat=&limit=&offset=               barcha buyurtmalar (hujjatsiz)
 * Telefon bazada 998XXXXXXXXX (qoida S1) — ekranda +998 XX XXX XX XX qilib chiqarish brauzer ishi. Parol xeshi, token_version, loyiha hujjati
 * (doc_json) javobga KIRMAYDI. Hamma /api/admin/* — faqat admin (aks holda 404 S3D-AUTH-006); bloklash admin_audit ga yoziladi va qaytariladi.
 * Pul/to'lov amali yo'q: buyurtma holatini o'zgartirish mavjud PUT /api/admin/orders/:id da (routes/orders.js), bu yerda faqat ko'rish. */
import express from 'express';
import { fail } from '../lib/xato.js';

const BUYURTMA_HOLAT = ['yangi', 'qabul', 'ishlab', 'tayyor', 'bekor'];
const ROLLAR = ['user', 'admin'];

export default function adminFoydalanuvchilarRouter({ db }, { guard, yoz, matn, himoya, Kirish, qaytaruvchilar }) {
  const r = express.Router();
  const obj = (b) => (b && typeof b === 'object' && !Array.isArray(b) ? b : {});

  /** LIKE uchun: % _ \ belgilari oddiy matn sifatida qidiriladi */
  const like = (s) => '%' + s.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
  /** ?limit= ?offset= ?q= — tur va chegara tekshiruvi (xato — 400 S3D-ADM-001) */
  function sahifa(q) {
    const son = (v, nom, min, max, bosh) => {
      if (v === undefined) return bosh;
      const n = typeof v === 'string' && /^\d{1,7}$/.test(v) ? Number(v) : NaN;
      if (!Number.isInteger(n) || n < min || n > max) throw new Kirish('S3D-ADM-001', `${nom}: ${min}…${max}`);
      return n;
    };
    const s = q.q === undefined ? '' : q.q;
    if (typeof s !== 'string' || s.length > 100 || /[\u0000-\u001f]/.test(s)) throw new Kirish('S3D-ADM-001', 'q: 100 belgigacha oddiy matn');
    return { q: s.trim(), limit: son(q.limit, 'limit', 1, 200, 50), offset: son(q.offset, 'offset', 0, 1e6, 0) };
  }
  const idParam = (v) => (/^\d{1,9}$/.test(String(v)) ? Number(v) : 0);

  /* ═══════════ FOYDALANUVCHILAR ═══════════ */
  const FOYD_USTUN = `u.id, u.name, u.email, u.phone, u.shop, u.role, u.bloklangan, u.blok_sabab, u.blok_vaqt, u.created_at,
    (u.telegram_id IS NOT NULL) AS telegram, (u.google_sub IS NOT NULL) AS google,
    (SELECT COUNT(*) FROM projects p WHERE p.user_id = u.id AND p.archived = 0) AS loyihalar,
    (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS buyurtmalar`;
  const foyd = (u) => ({ id: u.id, name: u.name || '', email: u.email || '', phone: u.phone || '', shop: u.shop || '', role: u.role, bloklangan: !!u.bloklangan,
    blok_sabab: u.blok_sabab || '', blok_vaqt: u.blok_vaqt || null, created_at: u.created_at, telegram: !!u.telegram, google: !!u.google,
    loyihalar: u.loyihalar || 0, buyurtmalar: u.buyurtmalar || 0 });

  r.get('/api/admin/foydalanuvchilar', guard, himoya((req, res) => {
    const { q, limit, offset } = sahifa(req.query);
    const rol = req.query.rol === undefined ? '' : req.query.rol, holat = req.query.holat === undefined ? '' : req.query.holat;
    if (rol !== '' && !ROLLAR.includes(rol)) throw new Kirish('S3D-ADM-001', 'rol: ' + ROLLAR.join(' | '));
    if (holat !== '' && !['faol', 'bloklangan'].includes(holat)) throw new Kirish('S3D-ADM-001', 'holat: faol | bloklangan');
    const sh = [], p = [];
    if (q) {
      const raqam = q.replace(/\D/g, ''), idQ = /^#?\d{1,9}$/.test(q) ? Number(q.replace('#', '')) : 0;
      const parts = ["u.name LIKE ? ESCAPE '\\'", "u.email LIKE ? ESCAPE '\\'", "u.shop LIKE ? ESCAPE '\\'"];
      p.push(like(q), like(q), like(q));
      if (raqam.length >= 3) { parts.push('u.phone LIKE ?'); p.push('%' + raqam + '%'); }
      if (idQ) { parts.push('u.id = ?'); p.push(idQ); }
      sh.push('(' + parts.join(' OR ') + ')');
    }
    if (rol) { sh.push('u.role = ?'); p.push(rol); }
    if (holat) sh.push(holat === 'bloklangan' ? 'u.bloklangan = 1' : 'u.bloklangan = 0');
    const where = sh.length ? 'WHERE ' + sh.join(' AND ') : '';
    const jami = db.prepare(`SELECT COUNT(*) AS n FROM users u ${where}`).get(...p).n;
    const items = db.prepare(`SELECT ${FOYD_USTUN} FROM users u ${where} ORDER BY u.id DESC LIMIT ? OFFSET ?`).all(...p, limit, offset).map(foyd);
    res.set('Cache-Control', 'no-store').json({ jami, items, limit, offset });
  }));

  r.get('/api/admin/foydalanuvchilar/:id', guard, himoya((req, res) => {
    const id = idParam(req.params.id);
    const u = id ? db.prepare(`SELECT ${FOYD_USTUN} FROM users u WHERE u.id = ?`).get(id) : null;
    if (!u) return fail(res, 'S3D-AUTH-007');
    const loyihalar = db.prepare(`SELECT p.id, p.name, p.client, p.total_price, p.archived, p.created_at, p.updated_at,
        COALESCE(json_array_length(p.doc_json, '$.doc.placements'), json_array_length(p.doc_json, '$.placements'), 0) AS modullar
      FROM projects p WHERE p.user_id = ? ORDER BY p.updated_at DESC, p.id DESC LIMIT 100`).all(id).map(x => ({ ...x, archived: !!x.archived }));
    const buyurtmalar = db.prepare(`SELECT o.id, o.project_id, o.project_name, o.client_name, o.client_phone, o.total_price, o.status, o.created_at,
        COALESCE(json_array_length(o.placements_json), 0) AS modullar FROM orders o WHERE o.user_id = ? ORDER BY o.id DESC LIMIT 100`).all(id)
      .map(o => ({ ...o, status: BUYURTMA_HOLAT.includes(o.status) ? o.status : 'yangi' }));
    res.set('Cache-Control', 'no-store').json({ ...foyd(u), loyihalar_royxat: loyihalar, buyurtmalar_royxat: buyurtmalar });
  }));

  /** bloklash/ochish. Bloklanganda ham, ochilganda ham token_version oshadi: eski kalitlar qaytib yaroqli bo'lmaydi (qayta kirish kerak). */
  const blokYoz = (id, bloklangan, sabab) => db.prepare(`UPDATE users SET bloklangan = ?, blok_sabab = ?, blok_vaqt = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END,
    token_version = COALESCE(token_version, 0) + 1 WHERE id = ?`).run(bloklangan ? 1 : 0, bloklangan ? sabab : '', bloklangan ? 1 : 0, id);
  r.put('/api/admin/foydalanuvchilar/:id/blok', guard, himoya((req, res) => {
    const id = idParam(req.params.id);
    const u = id ? db.prepare('SELECT id, role, bloklangan, blok_sabab FROM users WHERE id = ?').get(id) : null;
    if (!u) return fail(res, 'S3D-AUTH-007');
    const b = obj(req.body);
    if (typeof b.bloklangan !== 'boolean') throw new Kirish('S3D-ADM-001', 'bloklangan: true yoki false');
    const sabab = matn(b.sabab, 'sabab', { max: 200, kod: 'S3D-ADM-001' });
    if (b.bloklangan && (u.id === req.user.id || u.role === 'admin')) return fail(res, 'S3D-ADM-017');   // o'zini va adminni bloklab bo'lmaydi (panelga kirish yo'qolmasin)
    const eski = { bloklangan: !!u.bloklangan, sabab: u.blok_sabab || '' }, yangi = { bloklangan: b.bloklangan, sabab: b.bloklangan ? sabab : '' };
    if (eski.bloklangan === yangi.bloklangan && eski.sabab === yangi.sabab) return res.json({ ok: true, id, ...yangi, ozgarmadi: true });
    db.transaction(() => { blokYoz(id, yangi.bloklangan, yangi.sabab); yoz(req, 'foydalanuvchilar', String(id), eski, yangi); })();
    res.json({ ok: true, id, ...yangi });
  }));
  qaytaruvchilar.set('foydalanuvchilar', (a, eski, req) => {
    const id = idParam(a.kalit);
    const u = id ? db.prepare('SELECT id, role, bloklangan, blok_sabab FROM users WHERE id = ?').get(id) : null;
    if (!u) throw new Kirish('S3D-AUTH-007', 'foydalanuvchi topilmadi');
    if (!eski || typeof eski.bloklangan !== 'boolean') throw new Kirish('S3D-ADM-007', 'qaytariladigan qiymat yo\'q');
    if (eski.bloklangan && (u.id === req.user.id || u.role === 'admin')) throw new Kirish('S3D-ADM-017', 'bloklab bo\'lmaydi');
    blokYoz(id, eski.bloklangan, String(eski.sabab || ''));
    return { bloklangan: !!u.bloklangan, sabab: u.blok_sabab || '' };
  });

  /* ═══════════ LOYIHALAR ═══════════ */
  r.get('/api/admin/loyihalar', guard, himoya((req, res) => {
    const { q, limit, offset } = sahifa(req.query);
    const sh = [], p = [];
    const usr = req.query.user === undefined ? 0 : idParam(req.query.user);
    if (req.query.user !== undefined && !usr) throw new Kirish('S3D-ADM-001', 'user: foydalanuvchi raqami');
    if (usr) { sh.push('p.user_id = ?'); p.push(usr); }
    const arxiv = req.query.arxiv === undefined ? '' : req.query.arxiv;
    if (arxiv !== '' && !['0', '1'].includes(arxiv)) throw new Kirish('S3D-ADM-001', 'arxiv: 0 | 1');
    if (arxiv !== '') { sh.push('p.archived = ?'); p.push(Number(arxiv)); }
    if (q) {
      const parts = ["p.name LIKE ? ESCAPE '\\'", "p.client LIKE ? ESCAPE '\\'", "u.name LIKE ? ESCAPE '\\'", "u.email LIKE ? ESCAPE '\\'"];
      p.push(like(q), like(q), like(q), like(q));
      const idQ = /^#?\d{1,9}$/.test(q) ? Number(q.replace('#', '')) : 0;
      if (idQ) { parts.push('p.id = ?'); p.push(idQ); }
      sh.push('(' + parts.join(' OR ') + ')');
    }
    const where = sh.length ? 'WHERE ' + sh.join(' AND ') : '';
    const jami = db.prepare(`SELECT COUNT(*) AS n FROM projects p LEFT JOIN users u ON u.id = p.user_id ${where}`).get(...p).n;
    const items = db.prepare(`SELECT p.id, p.name, p.client, p.total_price, p.archived, p.created_at, p.updated_at, p.user_id,
        u.name AS usta, u.email AS usta_email, u.phone AS usta_phone,
        COALESCE(json_array_length(p.doc_json, '$.doc.placements'), json_array_length(p.doc_json, '$.placements'), 0) AS modullar
      FROM projects p LEFT JOIN users u ON u.id = p.user_id ${where} ORDER BY p.updated_at DESC, p.id DESC LIMIT ? OFFSET ?`).all(...p, limit, offset)
      .map(x => ({ ...x, archived: !!x.archived, name: x.name || '', client: x.client || '', usta: x.usta || '', usta_email: x.usta_email || '', usta_phone: x.usta_phone || '' }));
    res.set('Cache-Control', 'no-store').json({ jami, items, limit, offset });
  }));

  /* ═══════════ BUYURTMALAR ═══════════ */
  r.get('/api/admin/buyurtmalar', guard, himoya((req, res) => {
    const { q, limit, offset } = sahifa(req.query);
    const holat = req.query.holat === undefined ? '' : req.query.holat;
    if (holat !== '' && !BUYURTMA_HOLAT.includes(holat)) throw new Kirish('S3D-ADM-001', 'holat: ' + BUYURTMA_HOLAT.join(' | '));
    const sh = [], p = [];
    if (holat) { sh.push('o.status = ?'); p.push(holat); }
    if (q) {
      const raqam = q.replace(/\D/g, ''), idQ = /^#?\d{1,9}$/.test(q) ? Number(q.replace('#', '')) : 0;
      const parts = ["o.client_name LIKE ? ESCAPE '\\'", "o.project_name LIKE ? ESCAPE '\\'", "u.name LIKE ? ESCAPE '\\'", "u.email LIKE ? ESCAPE '\\'"];
      p.push(like(q), like(q), like(q), like(q));
      if (raqam.length >= 3) { parts.push('o.client_phone LIKE ?', 'u.phone LIKE ?'); p.push('%' + raqam + '%', '%' + raqam + '%'); }
      if (idQ) { parts.push('o.id = ?'); p.push(idQ); }
      sh.push('(' + parts.join(' OR ') + ')');
    }
    const where = sh.length ? 'WHERE ' + sh.join(' AND ') : '';
    const jami = db.prepare(`SELECT COUNT(*) AS n FROM orders o LEFT JOIN users u ON u.id = o.user_id ${where}`).get(...p).n;
    const items = db.prepare(`SELECT o.id, o.user_id, o.project_id, o.project_name, o.client_name, o.client_phone, o.total_price, o.status, o.created_at, o.updated_at,
        COALESCE(json_array_length(o.placements_json), 0) AS modullar, u.name AS usta, u.email AS usta_email, u.phone AS usta_phone
      FROM orders o LEFT JOIN users u ON u.id = o.user_id ${where} ORDER BY o.id DESC LIMIT ? OFFSET ?`).all(...p, limit, offset)
      .map(o => ({ ...o, status: BUYURTMA_HOLAT.includes(o.status) ? o.status : 'yangi', project_name: o.project_name || '', client_name: o.client_name || '',
        client_phone: o.client_phone || '', usta: o.usta || '', usta_email: o.usta_email || '', usta_phone: o.usta_phone || '' }));
    res.set('Cache-Control', 'no-store').json({ jami, items, limit, offset });
  }));

  return r;
}
