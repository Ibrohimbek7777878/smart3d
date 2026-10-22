/* ADMIN: O'ZGARISHLAR TARIXI — KENGAYTMA (TZ-37, 3-faza). 1-fazadagi GET /api/admin/audit (oddiy ro'yxat) va POST /api/admin/qaytar/:auditId O'ZGARMAGAN;
 * bu fayl ustiga quyidagilarni qo'shadi:
 *   GET  /api/admin/tarix?bolim=&kim=&dan=&gacha=&holat=&q=&limit=&offset=
 *        → { jami, limit, offset, items:[{ id, manba, bolim, kalit, eski, yangi, qaytarilgan, qaytariladi, vaqt, kim, kim_id }], bolimlar:[{ bolim, soni }], kimlar:[{ id, nom, soni }] }
 *        Ikki manba BITTA ro'yxatda: admin_audit (furnitura, promptlar, standart, materiallar, katalog, foydalanuvchilar, erp) va narx_history
 *        (bo'lim "narxlar" — routes/narxlar.js yozadi). id: "a<son>" (audit) | "n<son>" (narx tarixi).
 *        Filtr: bo'lim, kim (foydalanuvchi id), sana oralig'i (dan/gacha, YYYY-MM-DD, UTC, ikkalasi ham kiradi), holat (faol | qaytarilgan),
 *        q (kalit ichida qidiruv); sahifalash: limit 1…200 (sukut 50) + offset. bolimlar/kimlar — filtr uchun hisoblar (bo'limlar sonida bo'lim filtri hisobga olinmaydi).
 *   POST /api/admin/narx-qaytar/:id   narx_history yozuvini qaytaradi (id — narx_history raqami; tarixdagi "n12" → 12): hujjatda shu kalit eski qiymatga qaytadi,
 *        qaytarish ham narx_history ga yoziladi (kim, eski → yangi) va yozuv "qaytarilgan" bo'ladi. Audit yozuvlari — avvalgidek POST /api/admin/qaytar/:auditId.
 * Hamma /api/admin/* — faqat admin (aks holda 404 S3D-AUTH-006). Qaytarish — pul harakati emas: narx stavkalari hujjati (settings) yoziladi, ERP'ga hech narsa yozilmaydi. */
import express from 'express';
import { fail } from '../lib/xato.js';
import { narxQollash } from '../../app/js/engine/narxStavka.js';
import { narxCurrent, narxSaqla } from '../lib/narx-hujjat.js';

const js = (v) => { try { return JSON.parse(v); } catch (_) { return null; } };
/** POST /api/admin/qaytar/:auditId qaytara oladigan bo'limlar (admin-panel.js: furnitura, promptlar, standart + qaytaruvchilar registri) */
export const QAYTARILADIGAN = new Set(['furnitura', 'promptlar', 'standart', 'materiallar', 'katalog', 'foydalanuvchilar', 'erp']);
const TANLOV_GURUH = ['kromka', 'prisadka', 'bazis'];

/** narx_history kaliti shakli → qaytarish mumkinmi (eski qiymat bilan) */
export function narxKalitTuri(kalit, eski) {
  const p = String(kalit).split('.');
  if (p[0] === 'xizmatlar' && p.length >= 2) return 'xizmat';
  if (p[0] === 'tanlov' && (p[1] === 'raspil' || p[1] === 'raspil_yupqa') && p.length === 2) return 'tanlov';
  if (p[0] === 'tanlov' && TANLOV_GURUH.includes(p[1]) && p.length >= 3) return 'tanlov_guruh';
  if (((p[0] === 'ish_haqi' && ['yoqilgan', 'detal', 'modul'].includes(p[1])) || (p[0] === 'ustama' && p[1] === 'foiz')) && p.length === 2) return eski && typeof eski === 'object' ? 'qiymat' : null;
  return null;
}

/** hujjatda bitta kalitni eski qiymatiga qaytaradi → { next, hozir, ozgarish } (ozgarish — bog'liq tozalashlar bilan; narx_history ga yoziladi) */
export function narxQaytarish(cur, kalit, eski) {
  const tur = narxKalitTuri(kalit, eski);
  if (!tur) return null;
  const next = JSON.parse(JSON.stringify(cur));
  const p = kalit.split('.');
  let hozir;
  if (tur === 'xizmat') {
    const kod = p.slice(1).join('.');
    if (eski != null && (typeof eski !== 'object' || typeof eski.qiymat !== 'number')) return null;
    hozir = next.xizmatlar[kod] === undefined ? null : next.xizmatlar[kod];
    if (eski == null) delete next.xizmatlar[kod]; else next.xizmatlar[kod] = eski;
  } else if (tur === 'tanlov') {
    hozir = next.tanlov[p[1]] === undefined ? null : next.tanlov[p[1]];
    if (eski == null) { if (p[1] === 'raspil') next.tanlov.raspil = null; else delete next.tanlov.raspil_yupqa; } else next.tanlov[p[1]] = eski;
  } else if (tur === 'tanlov_guruh') {
    const k = p.slice(2).join('.');
    next.tanlov[p[1]] = next.tanlov[p[1]] || {};
    hozir = next.tanlov[p[1]][k] === undefined ? null : next.tanlov[p[1]][k];
    if (eski == null) delete next.tanlov[p[1]][k]; else next.tanlov[p[1]][k] = eski;
  } else {
    hozir = next[p[0]][p[1]] === undefined ? null : next[p[0]][p[1]];
    next[p[0]][p[1]] = eski;
  }
  /* bog'liq tozalash (xizmat o'chsa — unga bog'langan tanlov ham bo'shaydi) — narxQollash'ning o'z qoidasi */
  const t = narxQollash(next, {});
  return { next: t.next, hozir, ozgarish: [{ kalit, eski: hozir, yangi: eski == null ? null : eski }, ...t.ozgarish] };
}

export default function adminTarixRouter({ db, jurnal }, { guard, himoya, Kirish }) {
  const r = express.Router();
  const like = (s) => '%' + s.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
  const sanaTek = (v, nom) => {
    if (v === undefined || v === '') return '';
    const d = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T00:00:00Z') : null;
    if (!d || isNaN(d) || d.toISOString().slice(0, 10) !== v) throw new Kirish('S3D-ADM-001', `${nom}: YYYY-MM-DD`);
    return v;
  };
  const sonTek = (v, nom, min, max, bosh) => {
    if (v === undefined) return bosh;
    const n = typeof v === 'string' && /^\d{1,7}$/.test(v) ? Number(v) : NaN;
    if (!Number.isInteger(n) || n < min || n > max) throw new Kirish('S3D-ADM-001', `${nom}: ${min}…${max}`);
    return n;
  };

  /** ikki jadval — bitta ko'rinish (so'rov ichida) */
  const BIRLASH = `WITH t AS (
      SELECT 'a' AS src, a.id AS rid, a.user_id, a.bolim, a.kalit, a.eski, a.yangi, a.qaytarilgan, a.created_at FROM admin_audit a
      UNION ALL
      SELECT 'n', h.id, h.user_id, 'narxlar', h.kalit, h.eski, h.yangi, (SELECT COUNT(*) FROM narx_qaytar q WHERE q.history_id = h.id), h.created_at FROM narx_history h
    )`;

  function suzgich(q, { bolimSiz = false } = {}) {
    const bolim = q.bolim === undefined ? '' : q.bolim;
    if (typeof bolim !== 'string' || bolim.length > 30 || !/^[a-z_]*$/.test(bolim)) throw new Kirish('S3D-ADM-001', 'bolim noto\'g\'ri');
    const kim = q.kim === undefined || q.kim === '' ? 0 : sonTek(q.kim, 'kim', 1, 1e9, 0);
    const dan = sanaTek(q.dan, 'dan'), gacha = sanaTek(q.gacha, 'gacha');
    if (dan && gacha && dan > gacha) throw new Kirish('S3D-ADM-001', 'dan gacha dan keyin bo\'lmasin');
    const holat = q.holat === undefined ? '' : q.holat;
    if (!['', 'faol', 'qaytarilgan'].includes(holat)) throw new Kirish('S3D-ADM-001', 'holat: faol | qaytarilgan');
    const s = q.q === undefined ? '' : q.q;
    if (typeof s !== 'string' || s.length > 100 || /[\u0000-\u001f]/.test(s)) throw new Kirish('S3D-ADM-001', 'q: 100 belgigacha oddiy matn');
    const sh = [], p = [];
    if (bolim && !bolimSiz) { sh.push('t.bolim = ?'); p.push(bolim); }
    if (kim) { sh.push('t.user_id = ?'); p.push(kim); }
    if (dan) { sh.push('date(t.created_at) >= ?'); p.push(dan); }
    if (gacha) { sh.push('date(t.created_at) <= ?'); p.push(gacha); }
    if (holat) sh.push(holat === 'qaytarilgan' ? 't.qaytarilgan > 0' : 't.qaytarilgan = 0');
    if (s.trim()) { sh.push("t.kalit LIKE ? ESCAPE '\\'"); p.push(like(s.trim())); }
    return { where: sh.length ? 'WHERE ' + sh.join(' AND ') : '', p };
  }

  r.get('/api/admin/tarix', guard, himoya((req, res) => {
    const limit = sonTek(req.query.limit, 'limit', 1, 200, 50), offset = sonTek(req.query.offset, 'offset', 0, 1e6, 0);
    const f = suzgich(req.query), fb = suzgich(req.query, { bolimSiz: true });
    const jami = db.prepare(`${BIRLASH} SELECT COUNT(*) AS n FROM t ${f.where}`).get(...f.p).n;
    const rows = db.prepare(`${BIRLASH} SELECT t.*, u.name AS kim, u.email FROM t LEFT JOIN users u ON u.id = t.user_id ${f.where}
      ORDER BY t.created_at DESC, t.src DESC, t.rid DESC LIMIT ? OFFSET ?`).all(...f.p, limit, offset);
    const bolimlar = db.prepare(`${BIRLASH} SELECT bolim, COUNT(*) AS soni FROM t ${fb.where} GROUP BY bolim ORDER BY bolim`).all(...fb.p);
    const kimlar = db.prepare(`${BIRLASH} SELECT t.user_id AS id, COALESCE(NULLIF(u.name, ''), u.email, '#' || t.user_id, 'tizim') AS nom, COUNT(*) AS soni
      FROM t LEFT JOIN users u ON u.id = t.user_id GROUP BY t.user_id ORDER BY soni DESC`).all();
    res.set('Cache-Control', 'no-store').json({
      jami, limit, offset,
      items: rows.map(x => {
        const eski = js(x.eski), yangi = js(x.yangi);
        const qayt = x.qaytarilgan > 0;
        return { id: x.src + x.rid, manba: x.src === 'a' ? 'audit' : 'narx', bolim: x.bolim, kalit: x.kalit, eski, yangi, qaytarilgan: qayt,
          qaytariladi: !qayt && (x.src === 'a' ? QAYTARILADIGAN.has(x.bolim) : !!narxKalitTuri(x.kalit, eski)),
          vaqt: x.created_at, kim: x.kim || x.email || (x.user_id ? '#' + x.user_id : x.bolim === 'erp' ? 'tizim: ERP jonli' : 'tizim'), kim_id: x.user_id };
      }),
      bolimlar, kimlar
    });
  }));

  r.post('/api/admin/narx-qaytar/:id', guard, himoya((req, res) => {
    const id = /^\d{1,9}$/.test(req.params.id) ? Number(req.params.id) : 0;
    const h = id ? db.prepare('SELECT * FROM narx_history WHERE id = ?').get(id) : null;
    if (!h) return fail(res, 'S3D-ADM-006');
    if (db.prepare('SELECT 1 FROM narx_qaytar WHERE history_id = ?').get(id)) return fail(res, 'S3D-ADM-007');
    const q = narxQaytarish(narxCurrent(db, jurnal), h.kalit, js(h.eski));
    if (!q) return fail(res, 'S3D-ADM-007');
    db.transaction(() => {
      narxSaqla(db, req.user.id, q.next, q.ozgarish, '(tarixdan qaytarildi)');
      db.prepare('INSERT INTO narx_qaytar (history_id, user_id) VALUES (?, ?)').run(id, req.user.id);
    })();
    jurnal.info({ code: 'S3D-ADM-100', rid: req.rid, uid: req.user.id, msg: `admin: narxlar ${h.kalit} tarixdan qaytarildi (#${id})` });
    res.json({ ok: true, qaytarildi: 'n' + id, bolim: 'narxlar', kalit: h.kalit });
  }));

  return r;
}
