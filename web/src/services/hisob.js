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

/* price.js — UMD. Brauzerda (dev, eski sayt sahifasi) o'zi globalThis.SpPrice ga yoziladi; Vite build'i esa
   uni CommonJS deb o'qiydi (module.exports shoxobchasi) — u holda modulning default eksporti. Ikkalasi ham bir xil API. */
const SpPrice = () => globalThis.SpPrice || (PriceMod && (PriceMod.default || PriceMod.SpPrice)) || PriceMod;

/** Ma'lumot fayllari — eski boot() dagi ro'yxat va tartib bilan bir xil. */
export const DATA_FILES = {
  frags: 'fragments.json', mats: 'materials.json', nestDef: 'nesting-defaults.json',
  sheetCat: 'sheet-catalog.json', matIdx: 'materials-index.json', services: 'services.json',
  appliances: 'appliances.json', mcFrags: 'fragments-mc.json', sexStd: 'sex-standartlari.json',
  furnCat: 'furnitura-catalog.json',
  nomlarRu: 'nomlar.ru.json', nomlarEn: 'nomlar.en.json'          // TZ-18: modul va material nomlari (rus, ingliz)
};
const REQUIRED = new Set(['frags', 'mats']);   // eski boot(): qolganlari .catch(() => null)

/** Ma'lumotni yuklash. read(nom) → Promise<obyekt>; standart — fetch(base + nom). */
export async function loadData(read = (n) => fetch('data/' + n).then(r => r.json())) {
  const keys = Object.keys(DATA_FILES);
  const vals = await Promise.all(keys.map(k => {
    const p = read(DATA_FILES[k]);
    return REQUIRED.has(k) ? p : p.catch(() => (k === 'nestDef' ? {} : null));
  }));
  return Object.fromEntries(keys.map((k, i) => [k, vals[i]]));
}

/** Katalog va ma'lumotlar — eski boot() dagi yig'ish bilan bir xil. */
export function createHisob(data) {
  const { frags, mats, nestDef, sheetCat, matIdx, services, appliances, mcFrags, sexStd, furnCat, nomlarRu, nomlarEn } = data;
  const furnById = {};
  for (const it of (furnCat && furnCat.items) || []) if (it.id) furnById[it.id] = it;
  const catalog = {};
  for (const f of frags) catalog[f.code] = f;
  for (const f of (mcFrags && mcFrags.fragments) || []) catalog[f.code] = f;
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
  const searchIndex = matIdx && matIdx.items ? buildSearchIndex(matIdx.items) : null;
  const nestDefaults = Object.assign({}, nestDef);
  delete nestDefaults._meta;

  const H = {
    catalog, materials: mats, sheetCatalog: sheetCat, services, sexStd, furnById, searchIndex, nestDefaults,
    nomlar: { ru: nomlarRu || null, en: nomlarEn || null },     // TZ-18: modul/material nomi tanlangan tilda (L.modulNomi)

    /** Serverdagi sex standartlari (admin o'zgartiradi, TZ-14) — eski applyStandards bilan bir xil */
    applyStandards(std) {
      if (!std || !std.modullar) return false;
      for (const f of Object.values(catalog)) applySexStandart(f, std);
      H.sexStd = std;
      return true;
    },

    /** Korpus/fasad kodi materials.json da bormi (eski boot: noma'lum bo'lsa LDSP18 / MDF16). */
    knownMaterial(code) { return (mats.panel_materials || []).some(m => m.code === code); },

    /** F2: foydalanuvchi placements + synthetic oshxona elementlari (auto, persist emas). */
    viewPlacements(doc) {
      const user = (doc && doc.placements) || [];
      if (!catalog || !doc || !doc.kitchen) return user;
      try { return user.concat(deriveKitchen(doc, catalog)); }
      catch (e) { console.warn('deriveKitchen:', e); return user; }
    },

    /** Tanlangan real mahsulot bo'yicha materiallar nusxasi: haqiqiy narx + varaq o'lchami. */
    effectiveMaterials(sheet) {
      const sh = sheet;
      if (!sh || !mats) return mats;
      const base = baseForSheet(sh);
      const m2 = JSON.parse(JSON.stringify(mats));
      const pm = (m2.panel_materials || []).find(x => x.code === base);
      if (!pm) return mats;
      if (sh.uzs > 0) pm.sheet_price = sh.uzs;
      if (sh.l > 100 && sh.w > 100) pm.sheets = [[sh.l, sh.w]];
      return m2;
    },

    /** Butun hisob — eski doRecalc() bilan bir xil tartib.
     *  opt: { materialCode, fasadCode, orqaCode, stolCode, sheet, nestCfg, markupPct } → { priceRes, val, cutlists, prod, nest, placements } */
    recalc(doc, opt = {}) {
      const prices = buildPrices(catalog);
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
        const cl = cutlist(fr, p.w, p.d, p.h, m, { projectSlots: slots, placementSlots: p.slots });
        cl.placementId = p.id;
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
      const prod = productionCost(cutlists, m, Object.assign({ nestResult: nest, furnituraById: furnById, xizmatlar: doc.xizmatlar || {} },
        opt.markupPct != null ? { markupPct: opt.markupPct } : {}));
      /* 6) mijoz kotirovkasi — tannarx × (1 + ustama), modullarga taqsimlangan */
      const priceRes = buildQuote(placements, catalog, cutlists, prod, sizeCheck.warnings);
      return { priceRes, val, cutlists, prod, nest, placements, materials: m };
    }
  };
  return H;
}

/* ─────────── eski app.js dan so'zma-so'z (global state o'rniga parametr) ─────────── */

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
             qty: 1, unit_price: amount, amount };
  });
  return {
    lines,
    subtotal: prod.clientTotal,
    discount: 0,
    total: prod.clientTotal,
    markupPct: prod.markupPct,
    missing: prod.missing,
    incomplete: prod.missing.length > 0,
    warnings: (sizeWarnings || []).filter(w => w.code !== 'W_NO_PRICE')
  };
}
