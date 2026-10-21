/* ADMIN: MODULLAR KATALOGI (TZ-37, 2-faza, bo'lim 4) — har modul uchun: nom (uz/ru/en), ko'rinish (yashirish), o'lcham chegarasi
 * (min/max eni, chuqurligi, bo'yi), narx rejimi (unit | m2 | mm).
 * Katalog manbalari (app/data/fragments*.json, appliances.json) O'ZGARMAYDI: admin qiymati bazada (katalog_admin), brauzer ochiq GET /api/katalog
 * dan olib katalog ustiga qo'yadi (app/js/engine/adminQatlam.js). Ustunlik: modulga admin chegarasi > sex standarti (TZ-14) > fayl.
 * NULL maydon = fayldagidek; qator o'chirilsa — butunlay faylga qaytadi. Yashirish — faqat tanlash ro'yxatida va AI/konstruktor tanlovida
 * (2.7): ochiq loyihalardagi shu modullar va hisob-kitob o'zgarmaydi. "narx rejimi" hozirgi hisobda (detal + furnitura asosida) ishlatilmaydi —
 * faqat eski narx modulining ogohlantirishlariga ta'sir qiladi (UI shuni aytadi). */
import express from 'express';
import { fail } from '../lib/xato.js';
import { readJsonData } from '../lib/malumot.js';
import { applySexStandart } from '../../app/js/engine/standart.js';

const OLCHAM = ['min_w', 'max_w', 'min_d', 'max_d', 'min_h', 'max_h'];
const REJIM = ['unit', 'm2', 'mm'];
const NOM = ['nom_uz', 'nom_ru', 'nom_en'];
const USTUN = [...NOM, 'yashirin', ...OLCHAM, 'narx_rejim'];
const OLCHAM_MAX = 20000;                        // sex standartlari bilan bir xil (routes/sex-standartlari.js)
const FAYLLAR = [['fragments.json', 'fragments'], ['fragments-mc.json', 'fragments'], ['fragments-fr.json', 'fragments']];   // -fr: full base (bo'lmasa — o'tkazib yuboriladi)

export default function adminKatalogRouter({ db }, { guard, yoz, matn, himoya, Kirish, qaytaruvchilar }) {
  const r = express.Router();
  const obj = (b) => (b && typeof b === 'object' && !Array.isArray(b) ? b : {});

  /* ── fayl katalogi (bir marta): kod → { kod, nom, kategoriya, guruh, w, d, h, raw, texnika } ── */
  let kesh = null;
  const katalog = () => {
    if (kesh) return kesh;
    kesh = new Map();
    for (const [fayl, kalit] of FAYLLAR) {
      const d = readJsonData(fayl);
      const list = Array.isArray(d) ? d : (d && d[kalit]) || [];
      for (const f of list) if (f && f.code) kesh.set(f.code, { kod: f.code, nom: f.name || f.code, kategoriya: f.category || '', guruh: f.group || '', w: f.w || 0, d: f.d || 0, h: f.h || 0, raw: f, texnika: false });
    }
    for (const a of ((readJsonData('appliances.json') || {}).appliances) || [])
      if (a && a.code) kesh.set(a.code, { kod: a.code, nom: a.name || a.code, kategoriya: 'appliance', guruh: 'texnika', w: a.w || 0, d: a.d || 0, h: a.h || 0, raw: { price_mode: 'unit' }, texnika: true });
    return kesh;
  };
  const sexStd = () => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'sex_standartlari'").get();
    try { return row ? JSON.parse(row.value) : readJsonData('sex-standartlari.json'); } catch (_) { return readJsonData('sex-standartlari.json'); }
  };
  /** faylga ko'ra chegara: fragment + sex standarti (brauzer ham shunday qo'llaydi) */
  const faylChegara = (m, std) => {
    const f = applySexStandart({ ...m.raw }, std), o = {};
    for (const k of OLCHAM) if (Number.isFinite(f[k]) && f[k] > 0) o[k] = f[k];
    return o;
  };
  const qator = (kod) => db.prepare('SELECT * FROM katalog_admin WHERE kod = ?').get(kod) || null;
  const toza = (q) => { if (!q) return null; const o = {}; for (const k of USTUN) if (q[k] != null) o[k] = q[k]; return o; };   // updated_* siz (audit uchun)

  /* ═══════════ OCHIQ: brauzer katalog ustiga qo'yadi ═══════════ */
  r.get('/api/katalog', (req, res) => {
    const modullar = {};
    for (const q of db.prepare('SELECT * FROM katalog_admin').all()) {
      const o = {};
      for (const k of NOM) if (q[k]) o[k] = q[k];
      if (q.yashirin) o.yashirin = true;
      for (const k of OLCHAM) if (q[k] > 0) o[k] = q[k];
      if (q.narx_rejim) o.price_mode = q.narx_rejim;
      if (Object.keys(o).length) modullar[q.kod] = o;
    }
    res.set('Cache-Control', 'no-cache').json({ modullar });
  });

  /* ═══════════ ADMIN: ro'yxat ═══════════ */
  r.get('/api/admin/katalog', guard, himoya((req, res) => {
    const std = sexStd(), bz = new Map(db.prepare('SELECT * FROM katalog_admin').all().map(q => [q.kod, q]));
    const modullar = [...katalog().values()].map(m => {
      const q = bz.get(m.kod) || {}, fayl = faylChegara(m, std), chegara = { ...fayl };
      for (const k of OLCHAM) if (q[k] > 0) chegara[k] = q[k];
      const rejimFayl = m.raw.price_mode || 'unit';
      return {
        kod: m.kod, kategoriya: m.kategoriya, guruh: m.guruh, w: m.w, d: m.d, h: m.h, standart: m.raw.standart || null, texnika: m.texnika,
        nom_fayl: m.nom, nom: { uz: q.nom_uz || '', ru: q.nom_ru || '', en: q.nom_en || '' },
        yashirin: !!q.yashirin, chegara_fayl: fayl, chegara, chegara_baza: Object.fromEntries(OLCHAM.filter(k => q[k] > 0).map(k => [k, q[k]])),
        narx_rejim_fayl: rejimFayl, narx_rejim: q.narx_rejim || rejimFayl, tahrir: !!bz.get(m.kod)
      };
    });
    res.set('Cache-Control', 'no-store').json({ modullar });
  }));

  /* ═══════════ ADMIN: yozish ═══════════ */
  /** qisman yangilash: berilgan maydon yangilanadi; null — shu maydon fayldagidek; berilmagan maydon o'zgarmaydi */
  r.put('/api/admin/katalog/:kod', guard, himoya((req, res) => {
    const m = katalog().get(req.params.kod);
    if (!m) return fail(res, 'S3D-ADM-014');
    const b = obj(req.body), eskiQ = qator(m.kod), q = { ...(eskiQ || {}) };
    const bor = Object.keys(b).filter(k => USTUN.includes(k));
    if (!bor.length) throw new Kirish('S3D-ADM-015', 'o\'zgartiriladigan maydon yo\'q (' + USTUN.join(', ') + ')');
    for (const k of Object.keys(b)) if (!USTUN.includes(k)) throw new Kirish('S3D-ADM-015', 'noma\'lum maydon: ' + String(k).slice(0, 30));
    for (const k of bor) {
      const v = b[k];
      if (NOM.includes(k)) q[k] = v == null ? null : (matn(v, k, { max: 120, kod: 'S3D-ADM-015' }) || null);
      else if (k === 'yashirin') {
        if (v !== null && typeof v !== 'boolean') throw new Kirish('S3D-ADM-015', 'yashirin: true, false yoki null');
        q.yashirin = v === null ? null : (v ? 1 : 0);
      } else if (k === 'narx_rejim') {
        if (v !== null && !REJIM.includes(v)) throw new Kirish('S3D-ADM-015', 'narx_rejim: ' + REJIM.join(' | '));
        if (v !== null && m.texnika) throw new Kirish('S3D-ADM-015', 'o\'rnatma texnika uchun narx rejimi o\'zgarmaydi');
        q.narx_rejim = v;
      } else {                                     // o'lcham chegarasi: butun son (S2), 1…20000 mm
        if (v !== null && (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > OLCHAM_MAX)) throw new Kirish('S3D-ADM-015', `${k}: 1…${OLCHAM_MAX} mm oralig'idagi butun son yoki null`);
        if (v !== null && m.texnika) throw new Kirish('S3D-ADM-015', 'o\'rnatma texnika uchun o\'lcham chegarasi o\'zgarmaydi');
        q[k] = v;
      }
    }
    /* min <= max (har o'q): yakuniy qiymat = admin yoki fayl/sex standarti */
    const fayl = faylChegara(m, sexStd());
    for (const o of ['w', 'd', 'h']) {
      const lo = q['min_' + o] > 0 ? q['min_' + o] : fayl['min_' + o], hi = q['max_' + o] > 0 ? q['max_' + o] : fayl['max_' + o];
      if (lo > 0 && hi > 0 && lo > hi) throw new Kirish('S3D-ADM-015', `${o}: min (${lo}) max (${hi}) dan katta bo'lmasin`);
    }
    const bosh = USTUN.every(k => q[k] == null);
    const eski = toza(eskiQ), yangi = bosh ? null : toza(q);
    db.transaction(() => {
      if (bosh) db.prepare('DELETE FROM katalog_admin WHERE kod = ?').run(m.kod);
      else db.prepare(`INSERT INTO katalog_admin (kod, ${USTUN.join(', ')}, updated_by, updated_at) VALUES (?, ${USTUN.map(() => '?').join(', ')}, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(kod) DO UPDATE SET ${USTUN.map(k => `${k} = excluded.${k}`).join(', ')}, updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP`)
        .run(m.kod, ...USTUN.map(k => (q[k] === undefined ? null : q[k])), req.user.id);
      if (JSON.stringify(eski) !== JSON.stringify(yangi)) yoz(req, 'katalog', m.kod, eski, yangi);
    })();
    res.json({ ok: true, kod: m.kod, baza: yangi });
  }));
  /** butunlay faylga qaytarish ("sukutga qaytarish") */
  r.delete('/api/admin/katalog/:kod', guard, himoya((req, res) => {
    const m = katalog().get(req.params.kod);
    if (!m) return fail(res, 'S3D-ADM-014');
    const eski = qator(m.kod);
    if (!eski) return fail(res, 'S3D-ADM-016');
    db.transaction(() => { db.prepare('DELETE FROM katalog_admin WHERE kod = ?').run(m.kod); yoz(req, 'katalog', m.kod, toza(eski), null); })();
    res.json({ ok: true, kod: m.kod });
  }));

  /* ═══════════ TARIXDAN QAYTARISH ═══════════ */
  qaytaruvchilar.set('katalog', (a, eski) => {
    const hozir = toza(qator(a.kalit));
    const q = eski && typeof eski === 'object' ? eski : null;
    if (q && katalog().has(a.kalit)) {
      db.prepare(`INSERT INTO katalog_admin (kod, ${USTUN.join(', ')}, updated_at) VALUES (?, ${USTUN.map(() => '?').join(', ')}, CURRENT_TIMESTAMP)
        ON CONFLICT(kod) DO UPDATE SET ${USTUN.map(k => `${k} = excluded.${k}`).join(', ')}, updated_at = CURRENT_TIMESTAMP`)
        .run(a.kalit, ...USTUN.map(k => (q[k] === undefined ? null : q[k])));
    } else db.prepare('DELETE FROM katalog_admin WHERE kod = ?').run(a.kalit);
    return hozir;
  });

  return r;
}
