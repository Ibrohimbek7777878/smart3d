/* AI TOKEN TEJASH (TZ-40) — AI yo'li (/api/ai/parse, /api/ai/konstruksiya) Claude'ga IMKON QADAR KAM boradi.
 *
 * Tartib (har so'rov):
 *   1) tayyor   — matn tayyor promptlardan biriga mos (normallashtirilgan) va uning tuzilmasi (promptlar_admin.spec_json) saqlangan →
 *                 saqlangan tuzilma qaytadi, Claude chaqirilmaydi (0 token);
 *   2) kesh     — shu matn (+ til + model + ko'rsatma versiyasi) 30 kun ichida Claude'dan o'tgan (ai_kesh) → o'sha natija (0 token);
 *   3) qoida    — qoidali tahlilchi (app/js — brauzerdagi bilan bir xil) matnni to'liq tushundi → natija (0 token);
 *   4) claude   — faqat qoidali tahlilchi tushunmagan qoldiq yoki murakkab (uzun) matn; oylik byudjet va foydalanuvchi kunlik chegarasi
 *                 tekshiriladi — tugagan bo'lsa Claude chaqirilmaydi, qoida natijasi qaytadi + tushunarli ogohlantirish (S3D-AI-004/005).
 * Har so'rov ai_sarf ga yoziladi (manba + token). Natija keshga faqat Claude'dan kelganda yoziladi (qoida natijasi bepul — kesh kerak emas). */
import crypto from 'crypto';
import { matndanSpec, specTekshir, konstruksiyami } from '../../app/js/engine/konstruksiyaTili.js';
import { parseZamer } from '../../app/js/ai.js';
import { oshxonami } from '../../app/js/engine/oshxonaTili.js';
import { aiTur } from '../../app/js/engine/aiTur.js';
import { aiConfig, llmParse, llmKonstruksiya, KORSATMA_V } from '../ai-llm.js';

/** Qoidali tahlilchi (app/js/ai.js, konstruksiyaTili.js, aiTur.js) o'zgarsa — oshiring: qoida bilan hosil qilingan saqlangan tuzilmalar qayta hisoblanadi */
export const TAHLIL_V = 1;
/** shundan uzun matn "murakkab" — qoidali tahlilchi tushundi deb ishonmaymiz, Claude'ga boradi (belgi) */
export const MURAKKAB_UZUNLIK = 240;
export const KESH_KUN = () => Number(process.env.AI_KESH_KUN) > 0 ? Number(process.env.AI_KESH_KUN) : 30;
export const OYLIK_SUKUT = 2_000_000;         // token / oy (kirish + chiqish + kesh), AI_OYLIK_TOKEN
export const KUNLIK_SUKUT = 30;               // Claude so'rovi / foydalanuvchi / kun, AI_KUNLIK_SOROV
const sonEnv = (nom, sukut) => { const v = process.env[nom]; if (v === undefined || v === '') return sukut; const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.floor(n) : sukut; };
export const oylikChegara = () => sonEnv('AI_OYLIK_TOKEN', OYLIK_SUKUT);
export const kunlikChegara = () => sonEnv('AI_KUNLIK_SOROV', KUNLIK_SUKUT);

/** matnni solishtirish uchun: kichik harf, tinish belgilari yo'q (raqamlardagi nuqta qoladi: "3.6"), bo'shliqlar bitta */
export function normMatn(text) {
  return String(text == null ? '' : text).normalize('NFKC').toLowerCase()
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[‘’ʻʼ`´']/g, '')
    .replace(/[^\p{L}\p{N}.]+/gu, ' ')
    .replace(/(^|\s)\.+|\.+(?=\s|$)/g, '$1')
    .replace(/\s+/g, ' ').trim();
}
const tilAniq = (text) => (/[а-яё]/i.test(text) ? 'ru' : 'lat');
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
/** Toshkent kuni (UTC+5) — kunlik va oylik hisob shu bo'yicha */
export const bugun = (now = Date.now()) => new Date(now + 5 * 3600 * 1000).toISOString().slice(0, 10);
const js = (v) => { try { return JSON.parse(v); } catch (_) { return null; } };

/* ═══ qoidali tahlil (bepul) ═══ */

/** matn → { tur, kons, parse, qoldiq: { kons, parse } }. kons — faqat bitta mebel konstruksiyasi matnida (aks holda null) */
export function qoidaTahlil(text) {
  const t = String(text || '');
  const uzun = t.length > MURAKKAB_UZUNLIK;
  const yo = aiTur(t);
  const parse = parseZamer(t);
  const parseQoldiq = uzun || parse.unknown.length > 0 || (!parse.room.outline && !parse.orders.length && !oshxonami(t));
  let kons = null, konsQoldiq = false;
  if (konstruksiyami(t)) {
    const n = specTekshir(matndanSpec(t));
    kons = n.xona ? { xona: true } : { spec: n.spec, tuzatish: n.tuzatish, tushunilmadi: n.tushunilmadi };
    konsQoldiq = uzun || (n.tushunilmadi || []).length > 0;
  }
  return { tur: yo.tur, kons, parse: { room: parse.room, orders: parse.orders, unknown: parse.unknown, ...(parse.oshxona ? { oshxona: parse.oshxona } : {}) }, qoldiq: { kons: konsQoldiq, parse: parseQoldiq } };
}

/** saqlangan tuzilma yaroqlimi (specTekshir bilan qayta tekshiriladi) */
export function specYaroqli(sp) {
  if (!sp || typeof sp !== 'object' || sp.v !== TAHLIL_V) return false;
  const p = sp.parse;
  if (!p || typeof p !== 'object' || !p.room || typeof p.room !== 'object' || !Array.isArray(p.orders) || !Array.isArray(p.unknown)) return false;
  const k = sp.kons;
  if (k == null || k.xona === true) return true;
  if (!k.spec || typeof k.spec !== 'object') return false;
  const n = specTekshir(k.spec);
  return !n.xona && !!n.spec;
}

/** matn → saqlanadigan tuzilma (qoida bilan, bepul) */
export function specHosilQil(text) {
  const q = qoidaTahlil(text);
  return { v: TAHLIL_V, tur: q.tur, kons: q.kons, parse: q.parse };
}

const matnHash = (row) => hash([row.matn_uz, row.matn_ru, row.matn_en].map(normMatn).join('|'));

/* ═══ modul ═══ */
export function aiTejash({ db, jurnal, claude, yoqilgan, model, now = () => Date.now() }) {
  const C = claude || { parse: llmParse, konstruksiya: llmKonstruksiya };
  const yoq = yoqilgan || (() => aiConfig().enabled);
  const modelNomi = model || (() => aiConfig().model || '');
  const log = (lvl, o) => { try { jurnal && jurnal[lvl] && jurnal[lvl](o); } catch (_) { /* jurnal xatosi AI yo'lini to'xtatmasin */ } };

  const sarfYoz = db.prepare(`INSERT INTO ai_sarf (sana, vaqt, user_id, yol, manba, model, kirish, chiqish, kesh_yozildi, kesh_oqildi, tejaldi, ok, sabab)
    VALUES (@sana, @vaqt, @user_id, @yol, @manba, @model, @kirish, @chiqish, @kesh_yozildi, @kesh_oqildi, @tejaldi, @ok, @sabab)`);
  const yozSarf = (o) => {
    try {
      sarfYoz.run({ sana: bugun(now()), vaqt: new Date(now()).toISOString().slice(0, 19).replace('T', ' '), user_id: null, yol: '', model: '', kirish: 0, chiqish: 0, kesh_yozildi: 0, kesh_oqildi: 0, tejaldi: 0, ok: 1, sabab: '', ...o });
    } catch (e) { log('error', { code: 'S3D-SRV-001', msg: 'ai_sarf yozilmadi: ' + e.message }); }
  };

  /* ── byudjet va chegaralar ── */
  const oyIshlatilgan = () => db.prepare(`SELECT COALESCE(SUM(kirish + chiqish + kesh_yozildi + kesh_oqildi), 0) AS n FROM ai_sarf
    WHERE manba = 'claude' AND sana >= ? AND sana <= ?`).get(bugun(now()).slice(0, 7) + '-01', bugun(now()).slice(0, 7) + '-31').n;
  const kunlikUser = (uid) => db.prepare("SELECT COUNT(*) AS n FROM ai_sarf WHERE manba = 'claude' AND user_id = ? AND sana = ?").get(uid, bugun(now())).n;
  /** Claude chaqirsa bo'ladimi: null — bo'ladi, aks holda ogohlantirish kodi */
  const ruxsat = (uid, adminMi) => {
    if (oyIshlatilgan() >= oylikChegara()) return 'S3D-AI-004';
    if (!adminMi && kunlikUser(uid) >= kunlikChegara()) return 'S3D-AI-005';
    return null;
  };

  /* ── kesh ── */
  const keshKalit = (yol, til, nm) => hash([yol, til, modelNomi(), KORSATMA_V, nm].join('|'));
  const keshOl = db.prepare('SELECT * FROM ai_kesh WHERE kalit = ? AND muddat > ?');
  const keshUr = db.prepare('UPDATE ai_kesh SET urilgan = urilgan + 1 WHERE kalit = ?');
  const keshYoz = db.prepare(`INSERT OR REPLACE INTO ai_kesh (kalit, yol, til, model, versiya, natija_json, engine, kirish, chiqish, yaratildi, muddat, urilgan)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`);
  const keshTozala = () => db.prepare('DELETE FROM ai_kesh WHERE muddat <= ?').run(Math.floor(now() / 1000)).changes;

  /* ── tayyor prompt: matn mos kelsa saqlangan tuzilma ── */
  const tayyorlar = db.prepare("SELECT id, matn_uz, matn_ru, matn_en, spec_json, spec_manba, spec_hash, spec_tasdiq FROM promptlar_admin WHERE faol = 1 AND spec_json <> ''");
  function tayyorTop(nm) {
    for (const p of tayyorlar.all()) {
      if (![p.matn_uz, p.matn_ru, p.matn_en].some(m => m && normMatn(m) === nm)) continue;
      if (p.spec_hash !== matnHash(p)) continue;                      // matn tahrirlangan, tuzilma eski — ishlatilmaydi (qayta hosil bo'lguncha)
      if (p.spec_manba !== 'qoida' && !p.spec_tasdiq) continue;       // Claude tuzilmasi — faqat admin tasdiqlagandan keyin
      const sp = js(p.spec_json);
      if (specYaroqli(sp)) return { id: p.id, spec: sp };
    }
    return null;
  }

  /** Prompt caching foydali bo'ladimi (o'lchov: 3127 token kesh; yozish +15%, o'qish -63% — 5 daqiqa ichida takror chaqiruv bo'lsagina o'zini oqlaydi):
   *  oxirgi 5 daqiqada Claude chaqirilgan (kesh tirik) yoki oxirgi soatda >= 3 ta chaqiruv (doimiy yuk) */
  const keshKerak = () => {
    const t = (ms) => new Date(now() - ms).toISOString().slice(0, 19).replace('T', ' ');
    const n = (dan) => db.prepare("SELECT COUNT(*) AS n FROM ai_sarf WHERE manba = 'claude' AND vaqt >= ?").get(t(dan)).n;
    return n(5 * 60 * 1000) >= 1 || n(60 * 60 * 1000) >= 3;
  };
  /** Claude'ga bitta chaqiruv (ruxsat tekshirilgan). → { natija, engine, sarf } yoki xato (e.sarf bilan) */
  async function claudeChaqir(yol, text) {
    const o = { kesh: keshKerak() };
    const x = yol === 'parse' ? await C.parse(text, o) : await C.konstruksiya(text, o);
    return { natija: yol === 'parse' ? x.parsed : x.natija, engine: x.engine, sarf: x.sarf || {} };
  }

  /**
   * Asosiy yo'l. yol: 'parse' | 'konstruksiya'. → { manba, engine, natija, ogohlantirish? }; Claude xato bersa — Error (marshrut 502 beradi)
   * Chaqiruvchi AI sozlanganini (yoq()) o'zi tekshiradi.
   */
  async function yech({ yol, text, userId = null, admin = false }) {
    const nm = normMatn(text), til = tilAniq(text), mdl = modelNomi();
    const asos = { sana: bugun(now()), user_id: userId, yol, model: mdl };
    /* 1) tayyor */
    const ty = tayyorTop(nm);
    if (ty) {
      const natija = yol === 'parse' ? ty.spec.parse : ty.spec.kons;
      if (natija) { yozSarf({ ...asos, manba: 'tayyor', sabab: ty.id }); return { manba: 'tayyor', engine: 'tayyor:' + ty.id, natija }; }
    }
    /* 2) kesh */
    const kalit = keshKalit(yol, til, nm);
    const k = keshOl.get(kalit, Math.floor(now() / 1000));
    if (k) {
      const natija = js(k.natija_json);
      if (natija) { keshUr.run(kalit); yozSarf({ ...asos, manba: 'kesh', tejaldi: k.kirish + k.chiqish }); return { manba: 'kesh', engine: k.engine, natija }; }
    }
    /* 3) qoida */
    const q = qoidaTahlil(text);
    const qNatija = yol === 'parse' ? q.parse : q.kons;
    const qoldiq = yol === 'parse' ? q.qoldiq.parse : q.qoldiq.kons;
    if (qNatija && !qoldiq) { yozSarf({ ...asos, manba: 'qoida' }); return { manba: 'qoida', engine: 'qoida', natija: qNatija }; }
    /* konstruksiya yo'lida matn konstruksiya emas (kons null) — Claude kerak (xona/konstruksiya farqi) */
    /* 4) claude (byudjet va chegaralar) */
    const man = ruxsat(userId, admin);
    if (man) {
      yozSarf({ ...asos, manba: 'qoida', sabab: man });
      const fallback = qNatija || (yol === 'parse' ? q.parse : { xona: true });
      return { manba: 'qoida', engine: 'qoida', natija: fallback, ogohlantirish: man };
    }
    try {
      const c = await claudeChaqir(yol, text);
      const s = c.sarf;
      keshYoz.run(kalit, yol, til, mdl, KORSATMA_V, JSON.stringify(c.natija), c.engine, (s.kirish | 0) + (s.kesh_yozildi | 0) + (s.kesh_oqildi | 0), s.chiqish | 0,
        Math.floor(now() / 1000), Math.floor(now() / 1000) + KESH_KUN() * 86400);
      yozSarf({ ...asos, manba: 'claude', kirish: s.kirish | 0, chiqish: s.chiqish | 0, kesh_yozildi: s.kesh_yozildi | 0, kesh_oqildi: s.kesh_oqildi | 0 });
      return { manba: 'claude', engine: c.engine, natija: c.natija };
    } catch (e) {
      const s = e.sarf || {};
      yozSarf({ ...asos, manba: 'claude', ok: 0, sabab: String(e.message || e).slice(0, 200), kirish: s.kirish | 0, chiqish: s.chiqish | 0, kesh_yozildi: s.kesh_yozildi | 0, kesh_oqildi: s.kesh_oqildi | 0 });
      throw e;
    }
  }

  /* ═══ tayyor prompt tuzilmasi (admin) ═══ */
  const promptOl = db.prepare('SELECT * FROM promptlar_admin WHERE id = ?');
  const specYoz = db.prepare(`UPDATE promptlar_admin SET spec_json = @spec_json, spec_manba = @spec_manba, spec_sana = @spec_sana, spec_versiya = @spec_versiya,
    spec_hash = @spec_hash, spec_tasdiq = @spec_tasdiq WHERE id = @id`);

  /**
   * Bitta promptning tuzilmasini hosil qilish: avval qoidali (bepul); qoldiq bo'lsagina va ruxsat bo'lsa Claude (bir marta, faqat matn_uz).
   * Matnlar o'zgarmagan va tuzilma bor bo'lsa — hech narsa qilinmaydi (force bilan qayta). → { id, manba, yangilandi, ogohlantirish? } | null (prompt yo'q)
   */
  async function promptSpec(id, { claude: claudeIst = true, force = false, userId = null } = {}) {
    const row = promptOl.get(id);
    if (!row) return null;
    const h = matnHash(row);
    if (!force && row.spec_json && row.spec_hash === h && row.spec_versiya === TAHLIL_V) return { id, manba: row.spec_manba, yangilandi: false };
    const text = row.matn_uz;
    const q = qoidaTahlil(text);
    let spec = { v: TAHLIL_V, tur: q.tur, kons: q.kons, parse: q.parse }, manba = 'qoida', ogoh = null;
    const kons = q.kons != null;
    const qoldiq = kons ? q.qoldiq.kons : q.qoldiq.parse;
    if (qoldiq && claudeIst && yoq()) {
      const man = ruxsat(userId, true);
      if (man) ogoh = man;
      else {
        const yol = kons ? 'konstruksiya' : 'parse';
        const asos = { sana: bugun(now()), user_id: userId, yol, model: modelNomi(), sabab: 'admin:' + id };
        try {
          const c = await claudeChaqir(yol, text);
          const s = c.sarf;
          yozSarf({ ...asos, manba: 'claude', kirish: s.kirish | 0, chiqish: s.chiqish | 0, kesh_yozildi: s.kesh_yozildi | 0, kesh_oqildi: s.kesh_oqildi | 0 });
          if (kons) spec.kons = c.natija; else spec.parse = c.natija;
          manba = 'claude';
        } catch (e) {
          const s = e.sarf || {};
          yozSarf({ ...asos, manba: 'claude', ok: 0, sabab: ('admin:' + id + ' ' + (e.message || e)).slice(0, 200), kirish: s.kirish | 0, chiqish: s.chiqish | 0, kesh_yozildi: s.kesh_yozildi | 0, kesh_oqildi: s.kesh_oqildi | 0 });
          ogoh = 'S3D-AI-006';
          log('error', { code: 'S3D-AI-006', uid: userId, msg: `prompt ${id} tuzilmasi: AI xatosi: ${e.message || e}` });
        }
      }
    }
    if (!specYaroqli(spec)) { spec = { v: TAHLIL_V, tur: q.tur, kons: q.kons, parse: q.parse }; manba = 'qoida'; }   // Claude javobi yaroqsiz bo'lsa — qoida
    specYoz.run({ id, spec_json: JSON.stringify(spec), spec_manba: manba, spec_sana: new Date(now()).toISOString(), spec_versiya: TAHLIL_V, spec_hash: h, spec_tasdiq: 0 });
    return { id, manba, yangilandi: true, ...(ogoh ? { ogohlantirish: ogoh } : {}) };
  }

  /** qoida bilan (bepul, sinxron) — boshlang'ich to'plam va eskirgan qoida tuzilmalari uchun. → yangilangan soni */
  function royxatToldir() {
    const qatorlar = db.prepare("SELECT id FROM promptlar_admin WHERE spec_json = '' OR (spec_manba = 'qoida' AND spec_versiya <> ?)").all(TAHLIL_V);
    const stm = db.prepare('SELECT * FROM promptlar_admin WHERE id = ?');
    let n = 0;
    db.transaction(() => {
      for (const { id } of qatorlar) {
        const row = stm.get(id);
        try {
          specYoz.run({ id, spec_json: JSON.stringify(specHosilQil(row.matn_uz)), spec_manba: 'qoida', spec_sana: new Date(now()).toISOString(), spec_versiya: TAHLIL_V, spec_hash: matnHash(row), spec_tasdiq: 0 });
          n++;
        } catch (e) { log('error', { code: 'S3D-SRV-001', msg: `prompt ${id} tuzilmasi hosil bo'lmadi: ${e.message}` }); }
      }
    })();
    return n;
  }

  const tasdiqla = (id, qiymat = 1) => {
    const row = promptOl.get(id);
    if (!row || !row.spec_json) return false;
    db.prepare('UPDATE promptlar_admin SET spec_tasdiq = ? WHERE id = ?').run(qiymat ? 1 : 0, id);
    return true;
  };

  /* ═══ statistika (admin kartasi) ═══ */
  function statistika() {
    const kun = bugun(now()), oy = kun.slice(0, 7);
    const guruh = (dan, gacha) => {
      const o = { jami: 0, tayyor: 0, kesh: 0, qoida: 0, claude: 0, kirish: 0, chiqish: 0, kesh_yozildi: 0, kesh_oqildi: 0, tejaldi: 0, xato: 0 };
      for (const r of db.prepare(`SELECT manba, COUNT(*) AS n, SUM(kirish) AS ki, SUM(chiqish) AS ch, SUM(kesh_yozildi) AS ky, SUM(kesh_oqildi) AS ko,
        SUM(tejaldi) AS tj, SUM(CASE WHEN ok = 0 THEN 1 ELSE 0 END) AS xt FROM ai_sarf WHERE sana >= ? AND sana <= ? GROUP BY manba`).all(dan, gacha)) {
        o[r.manba] = (o[r.manba] || 0) + r.n; o.jami += r.n;
        o.kirish += r.ki || 0; o.chiqish += r.ch || 0; o.kesh_yozildi += r.ky || 0; o.kesh_oqildi += r.ko || 0; o.tejaldi += r.tj || 0; o.xato += r.xt || 0;
      }
      o.token = o.kirish + o.chiqish + o.kesh_yozildi + o.kesh_oqildi;
      return o;
    };
    const bugunG = guruh(kun, kun), oyG = guruh(oy + '-01', oy + '-31');
    const chegara = oylikChegara(), ishlatilgan = oyIshlatilgan();
    const kirishJami = oyG.kirish + oyG.kesh_yozildi + oyG.kesh_oqildi;
    const ulush = (g) => (g.jami ? Math.round(((g.tayyor + g.kesh) / g.jami) * 1000) / 10 : 0);
    const tayyorSoni = db.prepare("SELECT COUNT(*) AS n FROM promptlar_admin WHERE faol = 1 AND spec_json <> ''").get().n;
    const tasdiqsiz = db.prepare("SELECT id FROM promptlar_admin WHERE spec_manba = 'claude' AND spec_tasdiq = 0 ORDER BY id").all().map(x => x.id);
    return {
      sana: kun, oy,
      bugun: { ...bugunG, tayyor_kesh_foiz: ulush(bugunG) },
      oy_jami: { ...oyG, tayyor_kesh_foiz: ulush(oyG), kesh_urildi_foiz: kirishJami ? Math.round((oyG.kesh_oqildi / kirishJami) * 1000) / 10 : 0 },
      byudjet: { chegara, ishlatilgan, qoldiq: Math.max(0, chegara - ishlatilgan), foiz: chegara ? Math.min(100, Math.round((ishlatilgan / chegara) * 1000) / 10) : 100 },
      kunlik_chegara: kunlikChegara(),
      kesh: { yozuv: db.prepare('SELECT COUNT(*) AS n FROM ai_kesh WHERE muddat > ?').get(Math.floor(now() / 1000)).n, kun: KESH_KUN() },
      promptlar: { tuzilmali: tayyorSoni, tasdiqsiz },
      ai: { yoqilgan: !!yoq(), model: modelNomi() || null }
    };
  }

  return { yech, promptSpec, royxatToldir, tasdiqla, statistika, keshTozala, ruxsat, oyIshlatilgan, kunlikUser };
}
