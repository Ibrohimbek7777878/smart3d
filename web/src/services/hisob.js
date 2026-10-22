/* TZ-09: yangi frontend uchun hisob ko'prigi — dvigatel (app/js/engine) bilan bog'lanish.
 *
 * Narx zanjiri eski app/js/app.js dagi funksiyalardan SO'ZMA-SO'Z ko'chirilgan (doRecalc, buildQuote,
 * buildPrices, projectSlots, baseForSheet, effectiveMaterials, viewPlacements, boot'dagi katalog yig'ish).
 * Farq faqat bitta: global `state` o'rniga parametr. Eski sayt olib tashlangach (TZ-09 Q7) shu yagona manba bo'ladi.
 * Ikkalasi bir xil natija berishi brauzer testi bilan tekshiriladi: tests/ui/hisob_teng.mjs.
 *
 * Yo'llar NISBIY (alias emas): modul Vite'da ham, eski sayt sahifasida ham, Node testida ham bir xil yuklanadi.
 * price.js — UMD: quyidagi SpPrice() izohiga qarang. */
import { validateDoc } from '../../../app/js/engine/rules.js';
import { deriveKitchen, moykaHole } from '../../../app/js/engine/kitchen.js';
import { cutlist, productionCost } from '../../../app/js/engine/cutlist.js';
import { nestProject } from '../../../app/js/engine/nesting.js';
import { applySexStandart } from '../../../app/js/engine/standart.js';
import { buildSearchIndex } from '../../../app/js/engine/search.js';
import * as PriceMod from '../../../app/js/engine/price.js';
import { asosiyIndeks } from '../../../app/js/engine/dekorAsosiy.js';
import { erpNarxQollash, materiallarQollash, katalogNomlar, katalogQollash, yashirinKodlar, korinadiKatalog } from '../../../app/js/engine/adminQatlam.js';
import { sukutErpQollash } from '../../../app/js/engine/narxStavka.js';
import { xizmatKatalog } from '../../../app/js/engine/xizmatKatalog.js';
import { stolKitchen, stolMaterialQollash } from '../../../app/js/engine/stoleshnitsa.js';
import { plitaFormati } from '../../../app/js/engine/plitaMoslash.js';
import { erpAsl, erpQatlamQoy, erpSukutQoy } from './erpQatlam.js';

/* price.js — UMD. Brauzerda (dev, eski sayt sahifasi) o'zi globalThis.SpPrice ga yoziladi; Vite build'i esa
   uni CommonJS deb o'qiydi (module.exports shoxobchasi) — u holda modulning default eksporti. Ikkalasi ham bir xil API. */
const SpPrice = () => globalThis.SpPrice || (PriceMod && (PriceMod.default || PriceMod.SpPrice)) || PriceMod;

/** Ma'lumot fayllari — eski boot() dagi ro'yxat va tartib bilan bir xil. */
export const DATA_FILES = {
  frags: 'fragments.json', mats: 'materials.json', nestDef: 'nesting-defaults.json',
  sheetCat: 'sheet-catalog.json', matIdx: 'materials-index.json', services: 'services.json',
  erpXizmatlar: 'erp-xizmatlar.json',                             // TZ-48: «Xizmat qo'shish» oynasi — ERP xizmatlar ro'yxati
  appliances: 'appliances.json', mcFrags: 'fragments-mc.json', frFrags: 'fragments-fr.json', sexStd: 'sex-standartlari.json',
  furnCat: 'furnitura-catalog.json',
  stolErp: 'stoleshnitsa-erp.json',                               // TZ-32 yakuniy: stoleshnitsa dekorlari — har biri o'z ERP narxi (egasi #222 Q1)
  dekorMashhur: 'dekor-mashhur.json',                             // #151: sexda eng ko'p ishlatiladigan dekorlar (material varag'ining boshi)
  dekorAsosiy: 'dekor-asosiy.json',                               // #182: Asosiy 100 dekor — namuna rangi bilan (3D va plitka)
  rasmlar: 'rasmlar.json',                                        // material va furnitura rasmlari (yo'llar; bo'lmasa — rang/oddiy ko'rinish)
  furnBoglash: 'furnitura-boglash.json',                          // TZ-20: furnitura kodi → ERP ID
  nomlarRu: 'nomlar.ru.json', nomlarEn: 'nomlar.en.json'          // TZ-18: modul va material nomlari (rus, ingliz)
};
const REQUIRED = new Set(['frags', 'mats']);   // eski boot(): qolganlari .catch(() => null)

/** Ma'lumotni yuklash. read(nom) → Promise<obyekt>; standart — fetch('/data/' + nom): absolyut yo'l — chuqur manzilda
 *  (/loyiha/5) ham sayt ildizidan (TZ-30) */
export async function loadData(read, api) {
  /* TZ-37: brauzerda (read berilmagan) admin panel ma'lumoti serverdan: furnitura bog'lash (+ koeffitsient) va standart konstruksiya.
     Server yo'q yoki xato — jim: furnitura — statik data/furnitura-boglash.json, standart — qattiq sukutlar. Sinovda (read berilgan) — faqat fayllar. */
  if (!read) {
    read = (n) => fetch('/data/' + n).then(r => r.json());
    api = api || ((yol) => fetch(yol).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }));
  }
  const keys = Object.keys(DATA_FILES);
  const vals = await Promise.all(keys.map(k => {
    const p = read(DATA_FILES[k]);
    return REQUIRED.has(k) ? p : p.catch(() => (k === 'nestDef' ? {} : null));
  }));
  const out = Object.fromEntries(keys.map((k, i) => [k, vals[i]]));
  if (api) {
    const [fb, st] = await Promise.all([api('/api/furnitura-boglash').catch(() => null), api('/api/standart').catch(() => null)]);
    if (fb && fb.links && typeof fb.links === 'object') out.furnBoglash = { links: Object.assign({}, (out.furnBoglash && out.furnBoglash.links) || {}, fb.links), koef: fb.koef || {} };
    if (st && typeof st === 'object' && !st.error) out.standart = st;
    /* TZ-37 (2-faza): admin "Materiallar" (Asosiy 100: rang, rasm, varaq narxi) va "Modullar katalogi" (nom, yashirish, chegara, narx rejimi) — fayl ustiga;
       server yo'q yoki xato — jim (fayldagi qiymatlar). Narx/rang/rasm shu yerda, chegara va yashirish — createHisob'da (katalog yig'ilgach) */
    const [mv, kv, ev] = await Promise.all([api('/api/materiallar').catch(() => null), api('/api/katalog').catch(() => null), api('/api/erp-narx').catch(() => null)]);
    out.erpAsl = erpAsl(out);                                         // TZ-44: fayl narxlari (qatlam qo'yilishidan oldin) — jonli yangilanishda tiklash uchun
    out.erpEv = ev || null; out.adminMv = mv || null;                 // TZ-44: oxirgi javoblar (versiya, jonli holat; admin qatlami qayta qo'yilishi uchun)
    if (ev) erpNarxQollash(out, ev);                                  // TZ-37 (3-faza): ERP sinxron qatlami — fayl ustiga, admin qo'lda narxidan PASTDA
    if (mv) materiallarQollash(out, mv);
    if (kv && kv.modullar) { out.katalogAdmin = kv; katalogNomlar(out, kv); }
  }
  return out;
}

/** Katalog va ma'lumotlar — eski boot() dagi yig'ish bilan bir xil. */
export function createHisob(data) {
  const { frags, mats, nestDef, sheetCat, matIdx, services, erpXizmatlar, appliances, mcFrags, frFrags, sexStd, furnCat, stolErp, dekorMashhur, dekorAsosiy, furnBoglash, nomlarRu, nomlarEn, rasmlar } = data;
  const furnById = {};
  for (const it of (furnCat && furnCat.items) || []) if (it.id) furnById[it.id] = it;
  const furnituraBoglash = (furnBoglash && furnBoglash.links) || {};
  const furnituraKoef = (furnBoglash && furnBoglash.koef) || {};          // TZ-37: admin koeffitsienti (kod → koef; yo'q = 1)
  sukutErpQollash(mats);                                          // TZ-32 A1: egasi bog'lagan sukut plita → ERP narxi (bo'lmasa o'zgarmaydi)
  erpSukutQoy(data, mats, data.erpEv);                            // TZ-44: sukut plitaning jonli narxi (server ev.sukut bergan bo'lsa); asl narx jonli yangilanishda tiklash uchun saqlanadi
  const catalog = {};
  for (const f of frags) catalog[f.code] = f;
  for (const f of (mcFrags && mcFrags.fragments) || []) catalog[f.code] = f;
  for (const f of (frFrags && frFrags.fragments) || []) catalog[f.code] = f;      // TZ-37: full base.zip modullari (MC-FB-…)
  for (const f of Object.values(catalog)) applySexStandart(f, sexStd);
  /* F2: o'rnatma texnika — nishon (bo'sh korpusli) katalog yozuvlari */
  for (const a of (appliances && appliances.appliances) || []) {
    catalog[a.code] = {
      code: a.code, name: a.name, category: 'appliance', group: 'texnika',
      w: a.w, d: a.d, h: a.h, min_w: 200, max_w: 1200,
      price_mode: 'unit', price: 0, production: 'none',
      parts: [], holes: [], hardware: [], edge: [],
      default_z: a.z || 0, note: a.note
    };
  }
  katalogQollash(catalog, data.katalogAdmin);                     // TZ-37 (2-faza): admin chegarasi va narx rejimi (sex standartidan ustun)
  const searchIndex = matIdx && matIdx.items ? buildSearchIndex(matIdx.items) : null;
  const nestDefaults = Object.assign({}, nestDef);
  delete nestDefaults._meta;

  const H = {
    catalog, materials: mats, sheetCatalog: sheetCat, stolErp, dekorMashhur, dekorAsosiy: asosiyIndeks(dekorAsosiy), rasmlar: rasmlar || null, services, sexStd, furnById, furnituraBoglash, furnituraKoef, standart: data.standart || null, searchIndex, nestDefaults,
    nomlar: { ru: nomlarRu || null, en: nomlarEn || null },     // TZ-18: modul/material nomi tanlangan tilda (L.modulNomi)

    /** Serverdagi sex standartlari (admin o'zgartiradi, TZ-14) — eski applyStandards bilan bir xil */
    applyStandards(std) {
      if (!std || !std.modullar) return false;
      for (const f of Object.values(catalog)) applySexStandart(f, std);
      H.sexStd = std;
      return true;
    },

    /** TZ-44: jonli ERP narxlari — GET /api/erp-narx javobi (versiya, jonli holat); yangi javob kelsa erpYangila() qatlamni qayta qo'yadi (services/erpQatlam.js) */
    erpEv: data.erpEv || null,
    erpYangila(ev, doc) { return erpQatlamQoy(data, mats, ev, doc); },

    /** TZ-20: narx stavkalari (server /api/narxlar — admin "Narxlar" bo'limi). Berilmasa — materials.json ("taxmin"). */
    narxlar: null,
    applyNarxlar(n) {
      if (!n || typeof n !== 'object' || !n.tanlov) return false;
      H.narxlar = n;
      return true;
    },

    /** Korpus/fasad kodi materials.json da bormi (eski boot: noma'lum bo'lsa LDSP16 / MDF16). */
    knownMaterial(code) { return (mats.panel_materials || []).some(m => m.code === code); },

    /** F2: foydalanuvchi placements + synthetic oshxona elementlari (auto, persist emas). */
    viewPlacements(doc) {
      const user = (doc && doc.placements) || [];
      H.stolK = doc && doc.kitchen;                               // effectiveMaterials shu oshxona dekorining narxini qo'llaydi
      if (!catalog || !doc || !doc.kitchen) return user;
      try { return user.concat(deriveKitchen(Object.assign({}, doc, { kitchen: stolKitchen(doc.kitchen, stolErp) }), catalog)); }
      catch (e) { console.warn('deriveKitchen:', e); return user; }
    },

    /** Tanlangan real mahsulot bo'yicha materiallar nusxasi: haqiqiy narx + varaq o'lchami. */
    effectiveMaterials(sheet) {
      const sh = sheet;
      if (mats) stolMaterialQollash(mats, stolErp, H.stolK);   // tanlangan stoleshnitsa dekori: narx/nom/uzunlik (ERP m2 narxi x bo'lak maydoni)
      if (!sh || !mats) return mats;
      const base = baseForSheet(sh);
      const m2 = JSON.parse(JSON.stringify(mats));
      const pm = (m2.panel_materials || []).find(x => x.code === base);
      if (!pm) return mats;
      if (sh.uzs > 0) {   // TZ-32 A1: tanlangan ERP mahsulotining narxi — tasdiqlangan
        pm.sheet_price = sh.uzs; delete pm.taxminiy;
        pm.src = 'ERP'; if (sh.lst > 0) pm.sheet_lst = sh.lst; else delete pm.sheet_lst;   // TZ-48: ERP narxi — «sotuv» rejimida ro'yxat narxi − chegirma (engine/narxStavka.js plitaNarxi)
        if (sh.qolda) pm.qolda = true; else delete pm.qolda;
      }
      const fm = plitaFormati(sh.name, sh.l, sh.w).f;   // TZ-42: list formati nomdagi maydondan (4,575 → 2500×1830) — katalogdagi eni/bo'yi ko'pincha sukut 2800×2070
      if (fm) pm.sheets = [fm];
      return m2;
    },

    /** TZ-48: «Xizmat qo'shish» katalogi — ERP xizmatlar ro'yxati + narx hujjati (admin/jonli narx ustun) + Smart3D xizmatlar katalogi (taxmin) */
    xizmatKatalog() { return xizmatKatalog({ erp: erpXizmatlar, services, narxlar: H.narxlar }); },

    /** Butun hisob — eski doRecalc() bilan bir xil tartib.
     *  opt: { materialCode, fasadCode, orqaCode, stolCode, sheet, nestCfg, markupPct } → { priceRes, val, cutlists, prod, nest, placements } */
    recalc(doc, opt = {}) {
      const prices = buildPrices(catalog);
      H.stolK = doc.kitchen;
      const m = H.effectiveMaterials(opt.sheet || null);
      /* 1) o'lcham ogohlantirishlari (katalog min/max) */
      const sizeCheck = SpPrice().calc(doc, prices, {});
      /* 2) validatsiya */
      const val = validateDoc(doc, { catalog });
      /* 3) cutlist + ishlab chiqarish xarajati */
      const cutlists = [];
      const allParts = [];
      const slots = projectSlots(opt.materialCode, opt.fasadCode, opt.orqaCode, opt.stolCode, opt.polkaCode);
      const mkHole = moykaHole(doc);
      const placements = H.viewPlacements(doc);
      for (const p of placements) {
        const fr = catalog[p.frg];
        if (!fr) continue;
        const cl = cutlist(fr, p.w, p.d, p.h, m, { projectSlots: slots, placementSlots: p.slots, hinge: p.hinge, ruchkasiz: p.ruchkasiz, yonaltiruvchi: p.yonaltiruvchi });   // D6: petlya tomoni; egasi #166: Gola, Tandem
        cl.placementId = p.id;
        /* egasi #162: stoleshnitsa sig'masdan bo'lingan joyga 1 ta styajka (burchak butt-ulanishiga yo'q) */
        if (p.frg === 'SP-ST-001' && p.styajka > 0) cl.hardware.push({ fragment: fr.code, code: 'STYAJKA-STOL', qty: p.styajka, _auto: true });
        /* egasi #166: Gola profil (ruchkasiz oshxona) — konstruktor hisoblagan uzunlik, metr (butun, S2); narx bog'lanmagan — taklif */
        const gola = doc.kitchen && doc.kitchen.gola;
        if (gola && p.frg === 'SP-ST-001' && p.runIdx === 0 && p.segIdx === 0) {
          const mm = (+gola.gorizontal || 0) + (+gola.vertikal || 0);
          if (mm > 0) cl.hardware.push({ fragment: fr.code, code: 'GOLA-PROFIL', name: 'Gola profil (gorizontal ' + gola.gorizontal + ' mm, vertikal ' + (gola.vertikal || 0) + ' mm)', qty: Math.ceil(mm / 1000), unit: 'm', _auto: true });
        }
        if (mkHole && p.frg === 'SP-ST-001' && p.runIdx === 0 && p.segIdx === 0) {
          cl.holes.push(Object.assign({}, mkHole));
        }
        cutlists.push(cl);
        for (const x of cl.parts) allParts.push(Object.assign({}, x, { id: p.id + ':' + x.ref }));
      }
      /* 4) raskroy */
      const nest = nestProject(allParts, m, opt.nestCfg || nestDefaults);
      /* 5) ishlab chiqarish tannarxi (haqiqiy varaqlar soni bilan) */
      /* TZ-09: usta ustamasi (Sozlamalar) — berilmasa materials.json standarti (eski sayt bilan bir xil) */
      /* TZ-48: ustama — sukutda 0%; usta narx panelida yoqadi va foizini o'zgartiradi (doc.ustama = { yoqilgan, foiz }) — loyiha bilan saqlanadi va Sozlamalardagi
         qiymatdan ustun. doc.ustama yo'q — avvalgidek: Sozlamalar (opt.markupPct) → admin stavkasi → materials.json (0) */
      const mp = markupPctOl(doc, opt.markupPct);
      const prod = productionCost(cutlists, m, Object.assign({ nestResult: nest, furnituraById: furnById, furnituraBoglash, furnituraKoef, xizmatlar: doc.xizmatlar || {}, stavka: H.narxlar, mijozMat: doc.mijozMat || {},
        qoshXizmat: doc.qoshXizmat || [] }, mp != null ? { markupPct: mp } : {}));
      /* 6) mijoz kotirovkasi — tannarx × (1 + ustama), modullarga taqsimlangan */
      const priceRes = buildQuote(placements, catalog, cutlists, prod, sizeCheck.warnings);
      return { priceRes, val, cutlists, prod, nest, placements, materials: m };
    }
  };
  /* TZ-37 (2-faza): o'zbekcha modul nomi (admin), yashirilgan modullar va tanlash/AI uchun katalog (yashirinlarsiz; yashirin yo'q — H.catalog'ning o'zi) */
  if (data.nomlarUz) H.nomlar.uz = data.nomlarUz;
  H.yashirin = yashirinKodlar(data.katalogAdmin);
  Object.defineProperty(H, 'korinadiKatalog', { get: () => korinadiKatalog(H.catalog, H.yashirin) });
  return H;
}

/* ─────────── eski app.js dan so'zma-so'z (global state o'rniga parametr) ─────────── */

/** TZ-48: loyihadagi ustama tanlovi (doc.ustama = { yoqilgan, foiz (%) }) → kasr (0.35) yoki null (tanlov yo'q — boshqa manba) */
export function markupPctOl(doc, sozlama) {
  const u = doc && doc.ustama;
  if (u && typeof u === 'object' && typeof u.yoqilgan === 'boolean') {
    const f = Number(u.foiz);
    return u.yoqilgan && Number.isFinite(f) && f > 0 && f <= 300 ? Math.round(f * 10) / 1000 : 0;
  }
  return sozlama != null ? sozlama : null;
}

/** Loyiha slotlari (TZ §5 3.1): usta tanlagan korpus va fasad hamma modulga qo'llanadi.
 *  TZ-23 E: orqa devor va stoleshnitsa ham (tanlansa; tanlanmasa — modul/standart materiali, avvalgidek);
 *  polka — alohida (yangi loyihada LDSP 16 — egasi #120; tanlanmagan eski loyihada korpus bilan bir xil). */
export function projectSlots(materialCode, fasadCode, orqaCode, stolCode, polkaCode) {
  return Object.assign({ korpus: materialCode, polka: polkaCode || materialCode, fasad: fasadCode }, orqaCode ? { orqa: orqaCode } : {}, stolCode ? { stoleshnitsa: stolCode } : {});
}

/** ERP varag'i qaysi slotga tegishli: LDSP/LMDF/OSB → korpus, HDF → orqa, MDF (va akril) → fasad. */
export function slotForBase(base) {
  if (/^HDF/.test(base)) return 'orqa';
  if (/^(LDSP|LMDF|OSB)/.test(base)) return 'korpus';
  if (/^MDF/.test(base)) return 'fasad';
  return null;
}

/* ERP katalogidagi real mahsulot → hisoblash bazasi (kod) */
export function baseForSheet(sh) {
  const table = {
    LDSP: { 18: 'LDSP18', 16: 'LDSP16' },
    LMDF: { 16: 'LMDF16', 18: 'LDSP18' },
    AKRIL: { 18: 'MDF18', 16: 'MDF16', 8: 'MDF8' },
    MDF: { 18: 'MDF18', 16: 'MDF16', 8: 'MDF8' },
    HDF: { 3: 'HDF3', 2: 'HDF3' },
    OYNA: { 4: 'OYNA' }
  }[sh.type] || {};
  const th = Math.round(sh.th || 0);
  if (table[th]) return table[th];
  let best = null, bd = 1e9;
  for (const k in table) {
    const d = Math.abs(+k - th);
    if (d < bd) { bd = d; best = table[k]; }
  }
  return best || 'MDF16';
}

/** price.js uchun katalog jadvali — faqat o'lcham ogohlantirishlari (W_SIZE_CLAMP) uchun. */
function buildPrices(catalog) {
  const prices = {};
  for (const code in catalog) {
    const fr = catalog[code];
    prices[code] = {
      mode: fr.price_mode || 'unit',
      price: fr.price || 0,
      name: fr.name, base_w: fr.w,
      min_w: fr.min_w, max_w: fr.max_w, min_d: fr.min_d, max_d: fr.max_d,
      stretch_axis: fr.stretch_axis
    };
  }
  return prices;
}

/** Kotirovka: har modul = uning tannarx ulushi × (1 + ustama). Satrlar yig'indisi = jami. */
function buildQuote(placements, catalog, cutlists, prod, sizeWarnings) {
  const byId = {};
  for (const p of placements) byId[p.id] = p;
  const lines = cutlists.map((cl, i) => {
    const p = byId[cl.placementId] || {};
    const frag = catalog[cl.fragment] || {};
    const amount = (prod.perModule[i] || {}).client || 0;
    return { code: cl.fragment, name: p.name || frag.name || cl.fragment, w: p.w, d: p.d, h: p.h,
             qty: 1, unit_price: amount, amount, amountFurnsiz: (prod.perModule[i] || {}).clientFurnsiz || 0 };   // TZ-48: «Furniturasiz» ko'rinish
  });
  return {
    lines,
    subtotal: prod.clientTotal,
    discount: 0,
    total: prod.clientTotal,
    totalFurnsiz: prod.clientFurnsiz,
    markupPct: prod.markupPct,
    missing: prod.missing,
    incomplete: prod.missing.length > 0,
    warnings: (sizeWarnings || []).filter(w => w.code !== 'W_NO_PRICE')
  };
}
