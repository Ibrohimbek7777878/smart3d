/* ADMIN: MATERIALLAR (TZ-37, 2-faza, bo'lim 3) — "Asosiy 100" dekorlar (app/data/dekor-asosiy.json): rang, rasm, varaq narxi.
 *   rang  — dekor kaliti bo'yicha (#rrggbb): 3D va plitka rangi;   rasm — dekor kaliti bo'yicha (PNG/JPEG/WebP, 600 KB gacha, bazada);
 *   narx  — dekorning har bir ERP varag'i (kod = engine/erpKod.js) uchun so'm / varaq: hisobga darhol ta'sir qiladi (sheet.uzs).
 * Fayllar (dekor-asosiy.json, rasmlar.json, sheet-catalog.json, materials-index.json) O'ZGARMAYDI: admin qiymati bazada (mat_admin, mat_rasm,
 * mat_narx), brauzer ochiq GET /api/materiallar dan olib fayl ustiga qo'yadi (app/js/engine/adminQatlam.js). Qator o'chirilsa — fayldagi qiymatga
 * qaytadi. Hamma /api/admin/* — faqat admin (aks holda 404 S3D-AUTH-006); har yozuv admin_audit ga (bolim 'materiallar', kalit dekor:|rasm:|narx:). */
import express from 'express';
import crypto from 'crypto';
import { fail } from '../lib/xato.js';
import { readJsonData } from '../lib/malumot.js';
import { erpKod } from '../../app/js/engine/erpKod.js';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const RASM_MAX = 600 * 1024;                     // 600 KB (asl fayl; base64 ~800 KB — JSON chegarasi 2 MB ichida)
const NARX_MAX = 50e6;                           // varaq narxi: 50 mln so'mdan oshmaydi (xato kiritishdan himoya)
const B64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

/** rasm turi — fayl boshidagi baytlardan (mijoz aytgan turga ishonilmaydi); SVG qabul qilinmaydi */
export function rasmTuri(b) {
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export default function adminMateriallarRouter({ db, jurnal }, { guard, yoz, himoya, Kirish, qaytaruvchilar }) {
  const r = express.Router();
  const obj = (b) => (b && typeof b === 'object' && !Array.isArray(b) ? b : {});

  /* ── fayl ma'lumoti (bir marta o'qiladi) ── */
  let asosiyKesh = null, varaqKesh = null;
  const asosiy = () => {
    if (!asosiyKesh) {
      const items = ((readJsonData('dekor-asosiy.json') || {}).items) || [];
      asosiyKesh = { items, byKalit: new Map(items.map(e => [e.kalit, e])), kodlar: new Set(items.flatMap(e => e.kodlar || [])) };
    }
    return asosiyKesh;
  };
  /** ERP kodi → varaq (sheet-catalog.json); faqat Asosiy 100 kodlari (qolganini hisoblash shart emas) */
  const varaqlar = () => {
    if (!varaqKesh) {
      varaqKesh = new Map();
      const kodlar = asosiy().kodlar;
      for (const s of ((readJsonData('sheet-catalog.json') || {}).sheets) || []) { const k = erpKod(s); if (kodlar.has(k)) varaqKesh.set(k, s); }
    }
    return varaqKesh;
  };
  const faylRasm = (kalit) => {
    const v = ((readJsonData('rasmlar.json') || {}).materiallar || {})['dekor|' + kalit];
    const src = v && (typeof v === 'string' ? v : v.src);
    return typeof src === 'string' && src ? src : null;
  };
  const rasmYol = (kalit, sha) => 'api/materiallar/rasm/' + encodeURIComponent(kalit) + '?v=' + String(sha).slice(0, 12);

  /* ═══════════ OCHIQ: brauzer fayl ustiga qo'yadi ═══════════ */
  r.get('/api/materiallar', (req, res) => {
    const dekor = {}, narx = {};
    for (const m of db.prepare('SELECT kalit, rang_hex FROM mat_admin').all()) if (HEX_RE.test(m.rang_hex || '')) (dekor[m.kalit] = dekor[m.kalit] || {}).rang_hex = m.rang_hex.toLowerCase();
    for (const x of db.prepare('SELECT kalit, sha FROM mat_rasm').all()) (dekor[x.kalit] = dekor[x.kalit] || {}).rasm = rasmYol(x.kalit, x.sha);
    for (const n of db.prepare('SELECT kod, uzs FROM mat_narx').all()) if (n.uzs > 0) narx[n.kod] = n.uzs;
    res.set('Cache-Control', 'no-cache').json({ dekor, narx });
  });
  r.get('/api/materiallar/rasm/:kalit', (req, res) => {
    const x = db.prepare('SELECT mime, sha, data FROM mat_rasm WHERE kalit = ?').get(req.params.kalit);
    if (!x) return fail(res, 'S3D-ADM-011');
    const etag = '"' + x.sha + '"';
    res.set({ 'Content-Type': x.mime, ETag: etag, 'X-Content-Type-Options': 'nosniff',
      'Cache-Control': String(req.query.v || '') === x.sha.slice(0, 12) ? 'public, max-age=31536000, immutable' : 'no-cache' });
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    res.send(x.data);
  });

  /* ═══════════ ADMIN: ro'yxat ═══════════ */
  r.get('/api/admin/materiallar', guard, himoya((req, res) => {
    const bz = new Map(db.prepare('SELECT kalit, rang_hex FROM mat_admin').all().map(m => [m.kalit, m]));
    const rs = new Map(db.prepare('SELECT kalit, mime, hajm, sha FROM mat_rasm').all().map(m => [m.kalit, m]));
    const nr = new Map(db.prepare('SELECT kod, uzs FROM mat_narx').all().map(m => [m.kod, m.uzs]));
    const V = varaqlar();
    const dekorlar = asosiy().items.map(e => {
      const b = bz.get(e.kalit), rm = rs.get(e.kalit), fr = faylRasm(e.kalit);
      const rangBaza = !!(b && HEX_RE.test(b.rang_hex || ''));
      const variantlar = (e.kodlar || []).map(kod => {
        const s = V.get(kod) || {}, baza = nr.get(kod);
        return { kod, nom: s.name || '', sku: s.sku || '', tur: s.type || '', th: s.th || 0, l: s.l || 0, w: s.w || 0,
          narx_fayl: s.uzs || 0, narx: baza > 0 ? baza : (s.uzs || 0), narx_manba: baza > 0 ? 'baza' : 'fayl' };
      });
      return {
        o: e.o, kalit: e.kalit, dekor: e.dekor, guruh: e.guruh, yuza: e.yuza, tur: e.tur, qalinlik: e.qalinlik,
        rang_fayl: e.rang_hex, rang: rangBaza ? b.rang_hex.toLowerCase() : e.rang_hex, rang_manba: rangBaza ? 'baza' : 'fayl', rang_ishonch: rangBaza ? 'aniq' : e.rang_ishonch,
        rasm: rm ? { manba: 'baza', url: '/' + rasmYol(e.kalit, rm.sha), mime: rm.mime, hajm: rm.hajm } : fr ? { manba: 'fayl', url: '/' + fr } : null,
        variantlar, tahrir: rangBaza || !!rm || variantlar.some(v => v.narx_manba === 'baza')
      };
    });
    res.set('Cache-Control', 'no-store').json({ dekorlar });
  }));

  /* ═══════════ ADMIN: rang ═══════════ */
  const dekorTop = (kalit) => asosiy().byKalit.get(kalit) || null;
  r.put('/api/admin/materiallar/dekor/:kalit', guard, himoya((req, res) => {
    const kalit = req.params.kalit;
    if (!dekorTop(kalit)) return fail(res, 'S3D-ADM-011');
    const hex = obj(req.body).rang_hex;
    if (typeof hex !== 'string' || !HEX_RE.test(hex)) throw new Kirish('S3D-ADM-012', 'rang_hex: #rrggbb ko\'rinishida bo\'lishi kerak');
    const yangi = { rang_hex: hex.toLowerCase() };
    const eski = db.prepare('SELECT rang_hex FROM mat_admin WHERE kalit = ?').get(kalit) || null;
    db.transaction(() => {
      db.prepare(`INSERT INTO mat_admin (kalit, rang_hex, updated_by, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(kalit) DO UPDATE SET rang_hex = excluded.rang_hex, updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP`).run(kalit, yangi.rang_hex, req.user.id);
      yoz(req, 'materiallar', 'dekor:' + kalit, eski, yangi);
    })();
    res.json({ ok: true, kalit, ...yangi });
  }));
  r.delete('/api/admin/materiallar/dekor/:kalit', guard, himoya((req, res) => {
    const kalit = req.params.kalit;
    if (!dekorTop(kalit)) return fail(res, 'S3D-ADM-011');
    const eski = db.prepare('SELECT rang_hex FROM mat_admin WHERE kalit = ?').get(kalit);
    if (!eski) return fail(res, 'S3D-ADM-016');
    db.transaction(() => { db.prepare('DELETE FROM mat_admin WHERE kalit = ?').run(kalit); yoz(req, 'materiallar', 'dekor:' + kalit, eski, null); })();
    res.json({ ok: true, kalit, rang_fayl: dekorTop(kalit).rang_hex });
  }));

  /* ═══════════ ADMIN: rasm ═══════════ */
  r.put('/api/admin/materiallar/dekor/:kalit/rasm', guard, himoya((req, res) => {
    const kalit = req.params.kalit;
    if (!dekorTop(kalit)) return fail(res, 'S3D-ADM-011');
    let d = obj(req.body).data;
    if (typeof d !== 'string') throw new Kirish('S3D-ADM-013', 'data: base64 matn kerak');
    d = d.replace(/^data:[a-z/+.-]+;base64,/i, '');
    if (!d || d.length > Math.ceil(RASM_MAX * 4 / 3) + 8 || !B64_RE.test(d) || d.length % 4 === 1) throw new Kirish('S3D-ADM-013', 'rasm base64 emas yoki 600 KB dan katta');
    const buf = Buffer.from(d, 'base64');
    if (!buf.length || buf.length > RASM_MAX) throw new Kirish('S3D-ADM-013', 'rasm hajmi 1 bayt … 600 KB bo\'lishi kerak');
    const mime = rasmTuri(buf);
    if (!mime) throw new Kirish('S3D-ADM-013', 'faqat PNG, JPEG yoki WebP');
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    const eski = db.prepare('SELECT mime, hajm, sha FROM mat_rasm WHERE kalit = ?').get(kalit) || null;
    const yangi = { mime, hajm: buf.length, sha };
    db.transaction(() => {
      db.prepare(`INSERT INTO mat_rasm (kalit, mime, hajm, sha, data, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(kalit) DO UPDATE SET mime = excluded.mime, hajm = excluded.hajm, sha = excluded.sha, data = excluded.data, updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP`)
        .run(kalit, mime, buf.length, sha, buf, req.user.id);
      yoz(req, 'materiallar', 'rasm:' + kalit, eski, yangi);
    })();
    res.json({ ok: true, kalit, url: '/' + rasmYol(kalit, sha), mime, hajm: buf.length });
  }));
  r.delete('/api/admin/materiallar/dekor/:kalit/rasm', guard, himoya((req, res) => {
    const kalit = req.params.kalit;
    if (!dekorTop(kalit)) return fail(res, 'S3D-ADM-011');
    const eski = db.prepare('SELECT mime, hajm, sha FROM mat_rasm WHERE kalit = ?').get(kalit);
    if (!eski) return fail(res, 'S3D-ADM-016');
    db.transaction(() => { db.prepare('DELETE FROM mat_rasm WHERE kalit = ?').run(kalit); yoz(req, 'materiallar', 'rasm:' + kalit, eski, null); })();
    res.json({ ok: true, kalit });
  }));

  /* ═══════════ ADMIN: varaq narxi (ERP kodi bo'yicha) ═══════════ */
  const narxKod = (kod) => asosiy().kodlar.has(kod);
  r.put('/api/admin/materiallar/narx/:kod', guard, himoya((req, res) => {
    const kod = req.params.kod;
    if (!narxKod(kod)) return fail(res, 'S3D-ADM-011');
    const v = obj(req.body).uzs;
    const n = typeof v === 'number' ? v : (typeof v === 'string' && /^\d{1,9}$/.test(v.trim()) ? Number(v.trim()) : NaN);
    if (!Number.isInteger(n) || n < 1 || n > NARX_MAX) throw new Kirish('S3D-ADM-012', 'uzs: 1…' + NARX_MAX + ' oralig\'idagi butun son (so\'m / varaq)');
    const eski = db.prepare('SELECT uzs FROM mat_narx WHERE kod = ?').get(kod) || null;
    db.transaction(() => {
      db.prepare(`INSERT INTO mat_narx (kod, uzs, updated_by, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(kod) DO UPDATE SET uzs = excluded.uzs, updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP`).run(kod, n, req.user.id);
      yoz(req, 'materiallar', 'narx:' + kod, eski, { uzs: n });
    })();
    res.json({ ok: true, kod, uzs: n });
  }));
  r.delete('/api/admin/materiallar/narx/:kod', guard, himoya((req, res) => {
    const kod = req.params.kod;
    if (!narxKod(kod)) return fail(res, 'S3D-ADM-011');
    const eski = db.prepare('SELECT uzs FROM mat_narx WHERE kod = ?').get(kod);
    if (!eski) return fail(res, 'S3D-ADM-016');
    db.transaction(() => { db.prepare('DELETE FROM mat_narx WHERE kod = ?').run(kod); yoz(req, 'materiallar', 'narx:' + kod, eski, null); })();
    const s = varaqlar().get(kod);
    res.json({ ok: true, kod, narx_fayl: s ? s.uzs : 0 });
  }));

  /* ═══════════ TARIXDAN QAYTARISH ═══════════ */
  qaytaruvchilar.set('materiallar', (a, eski) => {
    const i = a.kalit.indexOf(':'), tur = a.kalit.slice(0, i), kalit = a.kalit.slice(i + 1);
    if (tur === 'dekor') {
      const hozir = db.prepare('SELECT rang_hex FROM mat_admin WHERE kalit = ?').get(kalit) || null;
      if (eski && HEX_RE.test(eski.rang_hex || '')) db.prepare(`INSERT INTO mat_admin (kalit, rang_hex, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(kalit) DO UPDATE SET rang_hex = excluded.rang_hex, updated_at = CURRENT_TIMESTAMP`).run(kalit, eski.rang_hex);
      else db.prepare('DELETE FROM mat_admin WHERE kalit = ?').run(kalit);
      return hozir;
    }
    if (tur === 'narx') {
      const hozir = db.prepare('SELECT uzs FROM mat_narx WHERE kod = ?').get(kalit) || null;
      if (eski && eski.uzs > 0) db.prepare(`INSERT INTO mat_narx (kod, uzs, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(kod) DO UPDATE SET uzs = excluded.uzs, updated_at = CURRENT_TIMESTAMP`).run(kalit, eski.uzs);
      else db.prepare('DELETE FROM mat_narx WHERE kod = ?').run(kalit);
      return hozir;
    }
    if (tur === 'rasm') {
      if (eski) throw new Kirish('S3D-ADM-007', 'oldingi rasmni qaytarib bo\'lmaydi (faqat yangi qo\'shilgan rasmni olib tashlash mumkin)');
      const hozir = db.prepare('SELECT mime, hajm, sha FROM mat_rasm WHERE kalit = ?').get(kalit) || null;
      db.prepare('DELETE FROM mat_rasm WHERE kalit = ?').run(kalit);
      return hozir;
    }
    jurnal.error({ code: 'S3D-ADM-102', msg: 'materiallar audit kaliti noma\'lum: ' + String(a.kalit).slice(0, 40) });
    throw new Kirish('S3D-ADM-007', 'noma\'lum yozuv');
  });

  return r;
}
