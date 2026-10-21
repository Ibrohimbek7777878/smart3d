/* ADMIN PANEL API (TZ-37, 1-faza) — shartnoma: loyiha-tz-lari/37-admin-panel.md "API shartnomasi".
 *   1) furnitura bog'lash: kod → ERP ID + koeffitsient (fayl app/data/furnitura-boglash.json ustiga baza), narxsiz ro'yxat
 *   2) tayyor promptlar (fayl app/data/promptlar.json + baza)    3) standart konstruksiya (settings.standart_konstruksiya)
 *   5) audit: har admin yozuvi admin_audit ga (eski/yangi), qaytarish.
 * Hamma /api/admin/* — faqat admin; admin bo'lmasa — 404 S3D-AUTH-006 (panel mavjudligi bildirilmaydi). Ochiq GET'lar:
 * /api/furnitura-boglash, /api/promptlar, /api/standart (autentifikatsiyasiz, hisob va kutubxona shuni o'qiydi).
 * Hamma yozuv — SQL parametrlar bilan, kirish matnlari tekshiriladi (tur, uzunlik, < >). ERP'ga yozilmaydi, pul harakati yo'q. */
import express from 'express';
import { fail, ah } from '../lib/xato.js';
import { rateLimit } from '../lib/limit.js';
import { readJsonData } from '../lib/malumot.js';
import { standartTekshir, STANDART_SUKUT } from '../../app/js/engine/konstruksiyaTili.js';
import { KATEGORIYALAR } from '../../app/js/engine/promptlar.js';
import adminMateriallar from './admin-materiallar.js';
import adminKatalog from './admin-katalog.js';
import adminFoydalanuvchilar from './admin-foydalanuvchilar.js';

const KOD_RE = /^[A-Za-z0-9][A-Za-z0-9_.\-]{0,79}$/;
const ID_RE = /^[a-z0-9][a-z0-9_-]{1,59}$/;
const js = (v) => { try { return JSON.parse(v); } catch (_) { return null; } };
const obj = (b) => (b && typeof b === 'object' && !Array.isArray(b) ? b : {});
const PROMPT_USTUN = ['id', 'kat', 'nom_uz', 'nom_ru', 'nom_en', 'matn_uz', 'matn_ru', 'matn_en', 'tartib', 'faol'];

export default function adminPanelRouter(ctx) {
  const { db, jurnal, auth, readToken, verifyToken, tejash } = ctx;
  const r = express.Router();

  /* ── umumiy ── */
  /** admin bo'lmasa (kirmagan, usta) — 404 S3D-AUTH-006; admin bo'lsa — odatdagi auth (CSRF, yozish chegarasi) */
  const adminOnly404 = (req, res, next) => {
    const t = readToken(req), p = t && verifyToken(t.token);
    if (!p || p.role !== 'admin') {
      res.locals.code = 'S3D-AUTH-006'; res.locals.msg = 'Topilmadi';
      return res.status(404).json({ error: 'Topilmadi', code: 'S3D-AUTH-006', rid: req.rid });
    }
    auth(req, res, next);
  };
  const adminLimit = rateLimit({ windowMs: 60 * 1000, max: 240, key: (req) => 'adm' + (req.user ? req.user.id : req.ip) });
  const guard = [adminOnly404, adminLimit.take];
  const qaytaruvchilar = new Map();                     // TZ-37 (2-faza): bo'lim → (audit yozuvi, eski, req) => hozirgi qiymat; /api/admin/qaytar shuni chaqiradi

  let katalog = null;                                   // furnitura-catalog.json: id → element (bir marta o'qiladi)
  const furnKatalog = () => {
    if (!katalog) {
      katalog = new Map();
      const d = readJsonData('furnitura-catalog.json');
      for (const it of (d && d.items) || []) if (it.id) katalog.set(String(it.id), it);
    }
    return katalog;
  };
  const faylBoglash = () => {
    const d = readJsonData('furnitura-boglash.json') || {};
    return { links: d.links || {}, savol: Object.keys((d._meta && d._meta.savol) || {}) };
  };
  const audit = db.prepare('INSERT INTO admin_audit (user_id, bolim, kalit, eski, yangi) VALUES (?, ?, ?, ?, ?)');
  const yoz = (req, bolim, kalit, eski, yangi) => {
    audit.run(req.user.id, bolim, String(kalit), eski == null ? null : JSON.stringify(eski), yangi == null ? null : JSON.stringify(yangi));
    jurnal.info({ code: 'S3D-ADM-100', rid: req.rid, uid: req.user.id, msg: `admin: ${bolim} ${kalit} o'zgardi` });
  };
  /** matn maydoni: tur, uzunlik, HTML belgilarisiz; undefined — berilmagan */
  const matn = (v, nom, { max, required = false, kod }) => {
    if (v == null || v === '') { if (required) throw new Kirish(kod, `${nom} kerak`); return ''; }
    if (typeof v !== 'string') throw new Kirish(kod, `${nom} matn bo'lishi kerak`);
    const s = v.trim();
    if (s.length > max) throw new Kirish(kod, `${nom} juda uzun (max ${max})`);
    if (/[<>]/.test(s)) throw new Kirish(kod, `${nom}: < va > belgilari mumkin emas`);
    return s;
  };
  class Kirish extends Error { constructor(kod, msg) { super(msg); this.kod = kod; } }
  /** Kirish xatosi → 400 o'z kodi bilan; boshqasi — tashqariga (500) */
  const himoya = (fn) => ah(async (req, res, next) => {
    try { return await fn(req, res, next); }
    catch (e) { if (e instanceof Kirish) return fail(res, e.kod, e.message); throw e; }
  });

  /* ═══════════ 1) FURNITURA BOG'LASH ═══════════ */
  const bazaBoglash = () => db.prepare('SELECT kod, erp_id, koef, izoh FROM furn_boglash').all();
  let fragKodlar = null;                                // modullardagi furnitura kodlari (narxsiz aniqlash uchun; bir marta)
  const modulFurnKodlari = () => {
    if (!fragKodlar) {
      fragKodlar = new Map();
      for (const f of ['fragments.json', 'fragments-mc.json', 'fragments-fr.json']) {
        const d = readJsonData(f);
        for (const x of (Array.isArray(d) ? d : (d && d.fragments) || [])) for (const h of x.hardware || []) if (h && h.code) fragKodlar.set(h.code, h.id || null);
      }
    }
    return fragKodlar;
  };
  /** hisob dvigateli narxsiz deb topadigan furnitura kodlari: bog'lanmagan va materials.hardware da narxi yo'q (modullar + egasi savollari) yoki
   *  bog'langan, lekin katalogda narxi yo'q */
  function narxsizlar(links) {
    const mats = readJsonData('materials.json') || {};
    const narxi = new Map((mats.hardware || []).map(h => [h.code, h.price]));
    const kat = furnKatalog();
    const bor = (id) => { const f = kat.get(String(id)); return !!(f && f.uzs > 0 && !f.no_price); };
    const out = new Set();
    for (const [kod, id] of modulFurnKodlari()) {
      const hid = id || links[kod];
      if (hid ? !bor(hid) : !(narxi.get(kod) > 0)) out.add(kod);
    }
    for (const kod of faylBoglash().savol) if (!links[kod]) out.add(kod);
    for (const [kod, id] of Object.entries(links)) if (!bor(id)) out.add(kod);
    return [...out].sort();
  }
  /** fayl + baza birlashtirilgan (baza ustun): kod → { erp_id, koef, izoh, manba } */
  function birlashgan() {
    const m = new Map();
    for (const [kod, id] of Object.entries(faylBoglash().links)) m.set(kod, { kod, erp_id: String(id), koef: 1, izoh: '', manba: 'fayl' });
    for (const b of bazaBoglash()) m.set(b.kod, { kod: b.kod, erp_id: b.erp_id, koef: b.koef, izoh: b.izoh, manba: 'baza' });
    return m;
  }

  r.get('/api/furnitura-boglash', (req, res) => {
    const links = {}, koef = {};
    for (const x of birlashgan().values()) { links[x.kod] = x.erp_id; if (x.koef !== 1) koef[x.kod] = x.koef; }
    res.set('Cache-Control', 'no-cache').json({ links, koef });
  });
  r.get('/api/admin/furnitura-boglash', guard, (req, res) => {
    const kat = furnKatalog(), m = birlashgan(), links = {};
    for (const x of m.values()) links[x.kod] = x.erp_id;
    res.set('Cache-Control', 'no-store').json({
      links: [...m.values()].sort((a, b) => a.kod.localeCompare(b.kod)).map(x => {
        const f = kat.get(x.erp_id);
        return { kod: x.kod, erp_id: x.erp_id, koef: x.koef, izoh: x.izoh, nom: f ? f.name : '', narx: f && f.uzs > 0 ? f.uzs : 0, manba: x.manba };
      }),
      narxsiz: narxsizlar(links)
    });
  });
  r.put('/api/admin/furnitura-boglash/:kod', guard, himoya((req, res) => {
    const kod = req.params.kod;
    if (!KOD_RE.test(kod)) throw new Kirish('S3D-ADM-001', "kod noto'g'ri (harf, raqam, _ . -; 80 gacha)");
    const b = obj(req.body);
    if (typeof b.erp_id !== 'string' && typeof b.erp_id !== 'number') throw new Kirish('S3D-ADM-001', 'erp_id kerak');
    const erp = String(b.erp_id).trim();
    if (!/^\d{4,12}$/.test(erp) || !furnKatalog().has(erp)) throw new Kirish('S3D-ADM-002', `erp_id ${erp.slice(0, 20)} katalogda yo'q`);
    let koef = 1;
    if (b.koef != null && b.koef !== '') {
      koef = typeof b.koef === 'number' ? b.koef : (typeof b.koef === 'string' && b.koef.trim() !== '' ? Number(b.koef) : NaN);
      if (!Number.isFinite(koef) || koef <= 0 || koef > 1000) throw new Kirish('S3D-ADM-001', 'koef: 0 dan katta, 1000 gacha son');
    }
    const izoh = matn(b.izoh, 'izoh', { max: 300, kod: 'S3D-ADM-001' });
    const eski = db.prepare('SELECT erp_id, koef, izoh FROM furn_boglash WHERE kod = ?').get(kod) || null;
    const yangi = { erp_id: erp, koef, izoh };
    db.transaction(() => {
      db.prepare(`INSERT INTO furn_boglash (kod, erp_id, koef, izoh, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(kod) DO UPDATE SET erp_id = excluded.erp_id, koef = excluded.koef, izoh = excluded.izoh, updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP`)
        .run(kod, erp, koef, izoh, req.user.id);
      yoz(req, 'furnitura', kod, eski, yangi);
    })();
    res.json({ ok: true, kod, ...yangi });
  }));
  r.delete('/api/admin/furnitura-boglash/:kod', guard, himoya((req, res) => {
    const kod = req.params.kod;
    const eski = KOD_RE.test(kod) ? db.prepare('SELECT erp_id, koef, izoh FROM furn_boglash WHERE kod = ?').get(kod) : null;
    if (!eski) return fail(res, 'S3D-ADM-008');
    db.transaction(() => { db.prepare('DELETE FROM furn_boglash WHERE kod = ?').run(kod); yoz(req, 'furnitura', kod, eski, null); })();
    const f = faylBoglash().links[kod];
    res.json({ ok: true, kod, fayl: f ? String(f) : null });
  }));

  /* ═══════════ 2) TAYYOR PROMPTLAR ═══════════ */
  const faylPromptlar = () => ((readJsonData('promptlar.json') || {}).promptlar || []);
  const bazaPrompt = (id) => db.prepare('SELECT * FROM promptlar_admin WHERE id = ?').get(id) || null;
  /** admin ro'yxati: fayldagilar (tartib 10, 20 …) va baza (baza ustun) */
  function promptRoyxat() {
    const m = new Map();
    faylPromptlar().forEach((p, i) => m.set(p.id, { id: p.id, kat: p.kat, nom_uz: p.nom.uz || '', nom_ru: p.nom.ru || '', nom_en: p.nom.en || '',
      matn_uz: (p.izoh && p.izoh.uz) || '', matn_ru: (p.izoh && p.izoh.ru) || '', matn_en: (p.izoh && p.izoh.en) || '', tartib: (i + 1) * 10, faol: 1, manba: 'fayl' }));
    for (const b of db.prepare('SELECT * FROM promptlar_admin').all()) m.set(b.id, { ...pick(b), manba: 'baza', ...specMeta(b) });
    return [...m.values()].sort((a, b) => a.tartib - b.tartib || a.id.localeCompare(b.id));
  }
  const pick = (b) => Object.fromEntries(PROMPT_USTUN.map(k => [k, b[k]]));
  /** TZ-40: tayyor promptning AI tuzilmasi holati (tuzilmaning o'zi — GET /api/admin/promptlar/:id/spec) */
  const specMeta = (b) => ({ spec: !!b.spec_json, spec_manba: b.spec_manba || '', spec_sana: b.spec_sana || '', spec_tasdiq: !!b.spec_tasdiq });
  /** kirish tekshiruvi: asos — mavjud qator (PUT: qisman yangilash) */
  function promptMaydon(b, asos, { yangi }) {
    const o = { ...asos };
    const t = (k, max, req) => { if (b[k] !== undefined) o[k] = matn(b[k], k, { max, required: req, kod: 'S3D-ADM-003' }); };
    t('nom_uz', 120, true); t('nom_ru', 120); t('nom_en', 120);
    t('matn_uz', 2000, true); t('matn_ru', 2000); t('matn_en', 2000);
    if (yangi && !o.nom_uz) throw new Kirish('S3D-ADM-003', 'nom_uz kerak');
    if (yangi && !o.matn_uz) throw new Kirish('S3D-ADM-003', 'matn_uz kerak');
    if (b.kat !== undefined) {
      if (typeof b.kat !== 'string' || !KATEGORIYALAR.includes(b.kat)) throw new Kirish('S3D-ADM-003', 'kat: ' + KATEGORIYALAR.join(', '));
      o.kat = b.kat;
    }
    if (!o.kat) throw new Kirish('S3D-ADM-003', 'kat kerak');
    if (b.tartib !== undefined) {
      const n = typeof b.tartib === 'number' ? b.tartib : (typeof b.tartib === 'string' && b.tartib.trim() !== '' ? Number(b.tartib) : NaN);
      if (!Number.isInteger(n) || n < 0 || n > 1e6) throw new Kirish('S3D-ADM-003', 'tartib: 0…1000000 butun son');
      o.tartib = n;
    }
    if (b.faol !== undefined) {
      if (![0, 1, true, false].includes(b.faol)) throw new Kirish('S3D-ADM-003', 'faol: 0 yoki 1');
      o.faol = b.faol ? 1 : 0;
    }
    return o;
  }
  const bazaYoz = db.prepare(`INSERT INTO promptlar_admin (id, kat, nom_uz, nom_ru, nom_en, matn_uz, matn_ru, matn_en, tartib, faol, updated_by, updated_at)
    VALUES (@id, @kat, @nom_uz, @nom_ru, @nom_en, @matn_uz, @matn_ru, @matn_en, @tartib, @faol, @by, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET kat = excluded.kat, nom_uz = excluded.nom_uz, nom_ru = excluded.nom_ru, nom_en = excluded.nom_en,
      matn_uz = excluded.matn_uz, matn_ru = excluded.matn_ru, matn_en = excluded.matn_en, tartib = excluded.tartib, faol = excluded.faol,
      updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP`);

  r.get('/api/promptlar', (req, res) => {
    const fayl = new Map(faylPromptlar().map(p => [p.id, p]));
    const uch = (uz, ru, en) => ({ uz, ru: ru || uz, en: en || uz });
    const out = [];
    faylPromptlar().forEach((p, i) => {
      const b = bazaPrompt(p.id);
      if (b) {
        if (!b.faol) return;
        out.push({ ...p, kat: b.kat || p.kat, nom: uch(b.nom_uz || p.nom.uz, b.nom_ru || p.nom.ru, b.nom_en || p.nom.en),
          izoh: b.matn_uz ? uch(b.matn_uz, b.matn_ru, b.matn_en) : p.izoh, tartib: b.tartib });
      } else out.push({ ...p, tartib: (i + 1) * 10 });
    });
    for (const b of db.prepare('SELECT * FROM promptlar_admin WHERE faol = 1').all()) {
      if (fayl.has(b.id)) continue;
      const matnlar = uch(b.matn_uz, b.matn_ru, b.matn_en);
      out.push({ id: b.id, kat: b.kat, tur: 'matn', nom: uch(b.nom_uz, b.nom_ru, b.nom_en), izoh: matnlar, matn: matnlar, tartib: b.tartib });
    }
    out.sort((a, b) => a.tartib - b.tartib);
    res.set('Cache-Control', 'no-cache').json({ promptlar: out });
  });
  r.get('/api/admin/promptlar', guard, (req, res) => res.set('Cache-Control', 'no-store').json(promptRoyxat()));
  r.post('/api/admin/promptlar', guard, himoya(async (req, res) => {
    const b = obj(req.body);
    const mavjud = promptRoyxat();
    let id = b.id;
    if (id === undefined || id === '') {
      const asos = String(b.nom_uz || 'prompt').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'prompt';
      id = asos.length >= 2 ? asos : 'prompt-' + asos;
      for (let n = 2; mavjud.some(x => x.id === id); n++) id = `${asos.slice(0, 36)}-${n}`;
    } else if (typeof id !== 'string' || !ID_RE.test(id)) throw new Kirish('S3D-ADM-003', "id: kichik lotin harf, raqam, - _ (2…60 belgi)");
    if (mavjud.some(x => x.id === id)) return fail(res, 'S3D-ADM-009');
    const tartib = mavjud.reduce((a, x) => Math.max(a, x.tartib), 0) + 10;
    const o = promptMaydon(b, { id, kat: '', nom_uz: '', nom_ru: '', nom_en: '', matn_uz: '', matn_ru: '', matn_en: '', tartib, faol: 1 }, { yangi: true });
    db.transaction(() => { bazaYoz.run({ ...o, by: req.user.id }); yoz(req, 'promptlar', id, null, pick(o)); })();
    const sp = await tejash.promptSpec(id, { userId: req.user.id });          // TZ-40: tuzilma bir marta (qoidali; qoldiq bo'lsa — Claude bir marta)
    res.status(201).json({ ok: true, prompt: { ...pick(o), manba: 'baza', ...specMeta(bazaPrompt(id)) }, spec: sp });
  }));
  r.put('/api/admin/promptlar/:id', guard, himoya(async (req, res) => {
    const id = req.params.id;
    const hozir = ID_RE.test(id) ? promptRoyxat().find(x => x.id === id) : null;
    if (!hozir) return fail(res, 'S3D-ADM-004');
    const o = promptMaydon(obj(req.body), pick(hozir), { yangi: false });
    o.id = id;
    const eski = bazaPrompt(id);
    db.transaction(() => { bazaYoz.run({ ...o, by: req.user.id }); yoz(req, 'promptlar', id, eski && pick(eski), pick(o)); })();
    const sp = await tejash.promptSpec(id, { userId: req.user.id });          // matn o'zgargan bo'lsagina hosil qilinadi
    res.json({ ok: true, prompt: { ...pick(o), manba: 'baza', ...specMeta(bazaPrompt(id)) }, spec: sp });
  }));
  /** tayyor promptning saqlangan tuzilmasi (admin ko'radi) */
  r.get('/api/admin/promptlar/:id/spec', guard, himoya((req, res) => {
    const b = ID_RE.test(req.params.id) ? bazaPrompt(req.params.id) : null;
    if (!b) return fail(res, 'S3D-ADM-004');
    if (!b.spec_json) return fail(res, 'S3D-ADM-010');
    res.set('Cache-Control', 'no-store').json({ id: b.id, ...specMeta(b), spec: js(b.spec_json) });
  }));
  /** tuzilmani qayta hosil qilish (qoidali; claude: true bo'lsa va qoldiq bo'lsa — Claude bir marta) */
  r.post('/api/admin/promptlar/:id/spec-qayta', guard, himoya(async (req, res) => {
    const id = req.params.id;
    if (!ID_RE.test(id) || !bazaPrompt(id)) return fail(res, 'S3D-ADM-004');
    const sp = await tejash.promptSpec(id, { force: true, claude: obj(req.body).claude === true, userId: req.user.id });
    jurnal.info({ code: 'S3D-ADM-100', rid: req.rid, uid: req.user.id, msg: `admin: promptlar ${id} tuzilmasi qayta hosil qilindi (${sp && sp.manba})` });
    res.json({ ok: true, ...specMeta(bazaPrompt(id)), spec: sp });
  }));
  /** admin tuzilmani ko'rdi va tasdiqladi (Claude hosil qilgan tuzilma shundan keyin foydalanuvchilarga beriladi) */
  r.post('/api/admin/promptlar/:id/spec-tasdiq', guard, himoya((req, res) => {
    const id = req.params.id;
    if (!ID_RE.test(id) || !bazaPrompt(id)) return fail(res, 'S3D-ADM-004');
    if (!tejash.tasdiqla(id, obj(req.body).tasdiq === false ? 0 : 1)) return fail(res, 'S3D-ADM-010');
    jurnal.info({ code: 'S3D-ADM-100', rid: req.rid, uid: req.user.id, msg: `admin: promptlar ${id} tuzilmasi ${obj(req.body).tasdiq === false ? 'tasdig\'i olindi' : 'tasdiqlandi'}` });
    res.json({ ok: true, ...specMeta(bazaPrompt(id)) });
  }));
  /** AI sarfi kartasi: bugun/oy so'rovlar, token, kesh va tayyor ulushi, byudjet qoldig'i */
  r.get('/api/admin/ai-sarf', guard, himoya((req, res) => res.set('Cache-Control', 'no-store').json(tejash.statistika())));
  r.delete('/api/admin/promptlar/:id', guard, himoya((req, res) => {
    const id = req.params.id;
    const eski = ID_RE.test(id) ? bazaPrompt(id) : null;
    if (!eski) return fail(res, 'S3D-ADM-004');
    db.transaction(() => { db.prepare('DELETE FROM promptlar_admin WHERE id = ?').run(id); yoz(req, 'promptlar', id, pick(eski), null); })();
    res.json({ ok: true, id });
  }));

  /* ═══════════ 3) STANDART KONSTRUKSIYA ═══════════ */
  const stdOl = () => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'standart_konstruksiya'").get();
    const v = row && js(row.value);
    const t = v && standartTekshir(v);
    if (row && !(t && t.std)) jurnal.error({ code: 'S3D-ADM-102', msg: 'standart_konstruksiya bazada buzilgan — sukut ishlatildi' });
    return (t && t.std) || standartTekshir(STANDART_SUKUT).std;
  };
  const stdBazadami = () => !!db.prepare("SELECT 1 FROM settings WHERE key = 'standart_konstruksiya'").get();
  r.get('/api/standart', (req, res) => res.set('Cache-Control', 'no-cache').json(stdOl()));
  r.get('/api/admin/standart', guard, (req, res) => res.set('Cache-Control', 'no-store').json(stdOl()));
  r.put('/api/admin/standart', guard, himoya((req, res) => {
    const t = standartTekshir(req.body);
    if (!t.std) throw new Kirish('S3D-ADM-005', t.xato);
    const eski = stdBazadami() ? stdOl() : null;
    db.transaction(() => {
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('standart_konstruksiya', ?, CURRENT_TIMESTAMP)").run(JSON.stringify(t.std));
      yoz(req, 'standart', 'standart', eski, t.std);
    })();
    res.json(t.std);
  }));

  /* ═══════════ 5) AUDIT ═══════════ */
  r.get('/api/admin/audit', guard, himoya((req, res) => {
    const bolim = req.query.bolim === undefined ? '' : req.query.bolim;
    if (typeof bolim !== 'string' || bolim.length > 30 || !/^[a-z_]*$/.test(bolim)) throw new Kirish('S3D-ADM-001', 'bolim noto\'g\'ri');
    let limit = 100;
    if (req.query.limit !== undefined) {
      limit = Number(req.query.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Kirish('S3D-ADM-001', 'limit: 1…1000');
    }
    const rows = db.prepare(`SELECT a.id, a.bolim, a.kalit, a.eski, a.yangi, a.qaytarilgan, a.created_at, a.user_id, u.name AS kim, u.email
      FROM admin_audit a LEFT JOIN users u ON u.id = a.user_id WHERE (? = '' OR a.bolim = ?) ORDER BY a.id DESC LIMIT ?`).all(bolim, bolim, limit);
    res.set('Cache-Control', 'no-store').json(rows.map(x => ({ id: x.id, bolim: x.bolim, kalit: x.kalit, eski: js(x.eski), yangi: js(x.yangi),
      qaytarilgan: !!x.qaytarilgan, vaqt: x.created_at, kim: x.kim || x.email || ('#' + x.user_id) })));
  }));
  /** shu o'zgarishni eski qiymatga qaytaradi (eski yo'q edi — o'chiradi). Qaytarish ham yangi audit yozuvi; bir yozuv bir marta qaytariladi. */
  r.post('/api/admin/qaytar/:auditId', guard, himoya(async (req, res) => {
    const id = Number(req.params.auditId);
    const a = Number.isInteger(id) && id > 0 ? db.prepare('SELECT * FROM admin_audit WHERE id = ?').get(id) : null;
    if (!a) return fail(res, 'S3D-ADM-006');
    if (a.qaytarilgan) return fail(res, 'S3D-ADM-007');
    const eski = js(a.eski);
    db.transaction(() => {
      let hozir = null;
      if (a.bolim === 'furnitura') {
        hozir = db.prepare('SELECT erp_id, koef, izoh FROM furn_boglash WHERE kod = ?').get(a.kalit) || null;
        if (eski) db.prepare(`INSERT INTO furn_boglash (kod, erp_id, koef, izoh, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(kod) DO UPDATE SET erp_id = excluded.erp_id, koef = excluded.koef, izoh = excluded.izoh, updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP`)
          .run(a.kalit, String(eski.erp_id), eski.koef, eski.izoh || '', req.user.id);
        else db.prepare('DELETE FROM furn_boglash WHERE kod = ?').run(a.kalit);
      } else if (a.bolim === 'promptlar') {
        const h = bazaPrompt(a.kalit); hozir = h && pick(h);
        if (eski) bazaYoz.run({ ...eski, id: a.kalit, by: req.user.id });
        else db.prepare('DELETE FROM promptlar_admin WHERE id = ?').run(a.kalit);
      } else if (a.bolim === 'standart') {
        hozir = stdBazadami() ? stdOl() : null;
        if (eski) db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('standart_konstruksiya', ?, CURRENT_TIMESTAMP)").run(JSON.stringify(eski));
        else db.prepare("DELETE FROM settings WHERE key = 'standart_konstruksiya'").run();
      } else if (qaytaruvchilar.has(a.bolim)) hozir = qaytaruvchilar.get(a.bolim)(a, eski, req);
      else throw new Kirish('S3D-ADM-007', 'bu bo\'limni qaytarib bo\'lmaydi');
      db.prepare('UPDATE admin_audit SET qaytarilgan = 1 WHERE id = ?').run(id);
      yoz(req, a.bolim, a.kalit, hozir, eski);
    })();
    if (a.bolim === 'promptlar' && bazaPrompt(a.kalit)) await tejash.promptSpec(a.kalit, { claude: false, userId: req.user.id });   // matn qaytdi — tuzilma ham (bepul)
    res.json({ ok: true, qaytarildi: id, bolim: a.bolim, kalit: a.kalit });
  }));

  /* ═══════════ 2-FAZA: materiallar, modullar katalogi, foydalanuvchilar — o'z fayllarida; umumiy yordamchilar shu yerdan ═══════════ */
  const yordam = { guard, yoz, matn, himoya, Kirish, qaytaruvchilar };
  for (const f of [adminMateriallar, adminKatalog, adminFoydalanuvchilar]) r.use(f(ctx, yordam));

  return r;
}
