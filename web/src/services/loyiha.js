/* TZ-09: yangi frontend — loyiha (doc) bilan ishlash. Ekransiz, React'siz.
 *
 * Eski app/js/app.js dagi amallar SO'ZMA-SO'Z ko'chirilgan (freshRoom, freshKitchen, addPlacement, clampSize,
 * checkClamp, estimateFragment, applyRoom, openings/utilities, CAT_NAMES); farq — global `state` o'rniga parametr.
 * Dizayndagi yangi tugmalar (⧉ nusxa, ⟳ 90°, ◀ ▶ ±50 mm) — rules.js footprint() qoidasi bo'yicha (burilish (x,y) burchagi
 * atrofida, gradusda). Yo'llar NISBIY — Node testi ham shu modulni yuklaydi. */
import { footprint, roomBBox } from '../../../app/js/engine/rules.js';
import { cutlist, productionCost } from '../../../app/js/engine/cutlist.js';
import { USTKI_Z } from '../../../app/js/ai.js';
import { OYNA_SUKUT_Z } from '../../../app/js/engine/deraza3d.js';
import { devordanSur, devorChegara, yangiModulJoyi } from '../../../app/js/engine/devorOraliq.js';
import { almashtirishJoyi } from '../../../app/js/engine/almashtir.js';
import { projectSlots } from './hisob.js';
import { searchMaterial } from '../../../app/js/engine/search.js';
import { til } from '../i18n/index.js';

/* TZ-18: modul va material nomi tanlangan tilda (app/data/nomlar.{ru,en}.json); o'zbekcha — asl nom. Asl fayllar o'zgarmaydi. */
export function modulNomi(H, fr) {
  const n = H && H.nomlar && H.nomlar[til()];
  return (fr && n && n.modullar && n.modullar[fr.code]) || (fr && fr.name) || '';
}
export function materialNomi(H, code, asl) {
  const n = H && H.nomlar && H.nomlar[til()];
  return (n && n.materiallar && n.materiallar[code]) || asl || code;
}
/** joylashuv nomi: foydalanuvchi o'zgartirmagan bo'lsa (= modul nomi) — tanlangan tilda */
export const joyNomi = (H, p, fr) => (p && p.name && fr && p.name !== fr.name ? p.name : modulNomi(H, fr) || (p && p.name) || '');

/* scene.js DEFAULT_ROOM bilan bir xil (scene.js three.js'ni yuklaydi — bu modul esa Node'da ham ishlaydi) */
export const DEFAULT_ROOM = {
  outline: [[0, 0], [4200, 0], [4200, 3100], [0, 3100]],
  wall_height: 2700, wall_thickness: 100, openings: [], utilities: []
};

export function freshRoom() {
  return { ...DEFAULT_ROOM, outline: DEFAULT_ROOM.outline.map(p => p.slice()), openings: [], utilities: [] };
}

/* F2: oshxona sozlamalari (persist) — yangi loyiha: stoleshnitsa/sokol o'chirilgan */
export function freshKitchen() {
  return {
    stoleshnitsa: false, stolT: 26, sokol: false,
    dobor: false, doborH: 60,
    karniz: false, karnizH: 60,
    moyka: { on: false, offset: 600, fromBack: 100, size: 500 }
  };
}

export function newDoc(room) {
  return { v: 1, kind: 'smart3d', room: room || freshRoom(), placements: [], kitchen: freshKitchen() };
}

/** To'rtburchak xona (onboarding presetlari, "▣ To'rtburchak") */
export function rectOutline(w, d) { return [[0, 0], [w, 0], [w, d], [0, d]]; }
/** L shakl — eski app.js dagi tayyor nuqtalar ("◩ L shakl") */
export const L_OUTLINE = [[0, 0], [3600, 0], [3600, 2000], [2200, 2000], [2200, 3000], [0, 3000]];

/** Keyingi bo'sh id (eski setDoc: idSeq) */
export function nextId(doc) {
  const n = 1 + (doc.placements || []).reduce((m, p) => Math.max(m, parseInt(String(p.id).replace(/\D/g, ''), 10) || 0), 0);
  return 'p' + n;
}

/** Maydon rejimi (loyiha sozlamasi, doc.maydon): 'devorli' (standart) | 'erkin' — egasi #156 */
export const MAYDONLAR = ['devorli', 'erkin'];
export const maydonRejim = (doc) => (doc && doc.maydon === 'erkin' ? 'erkin' : 'devorli');
export function setMaydon(doc, rej) { doc.maydon = rej === 'erkin' ? 'erkin' : 'devorli'; return doc.maydon; }
/** xona devorlari bilan cheklash uchun: Erkin maydonda devor yo'q → bo'sh kontur */
export const cheklovXonasi = (doc) => (maydonRejim(doc) === 'erkin' ? { outline: [], wall_thickness: doc.room.wall_thickness } : doc.room);

/** Yangi BITTA modul — ochiq joyga (egasi #156): orqa devordan YANGI_MODUL_DEVORDAN mm, eni bo'yicha o'rtada; sig'masa — xona
 *  o'rtasida; band bo'lsa — eng yaqin bo'sh joyda. Erkin maydonda — maydon o'rtasi / modullar yonida. o.qator — devor bo'ylab
 *  eng chap bo'sh joy (eski xulq; avtomatik qatorlar uchun). → placement */
export function addPlacement(doc, frag, o = {}) {
  if (!o.qator) {
    const ustki0 = isUstki(frag);
    const z = frag.default_z != null ? +frag.default_z : (frag.category === 'window' ? OYNA_SUKUT_Z : ustki0 ? USTKI_Z : 0);   // egasi #236: oyna — pol'dan 900
    const p = { id: nextId(doc), frg: frag.code, name: frag.name, x: 0, y: 0, z, w: frag.w, d: frag.d, h: frag.h, rot: 0, qty: 1 };
    const j = yangiModulJoyi(doc.room, doc.placements, p, { erkin: maydonRejim(doc) === 'erkin' });
    p.x = j.x; p.y = j.y;
    doc.placements.push(p);
    return p;
  }
  const bb = roomBBox(doc.room.outline);
  const id = nextId(doc);
  const ustki = isUstki(frag);
  const z0 = frag.default_z != null ? +frag.default_z : (frag.category === 'window' ? OYNA_SUKUT_Z : ustki ? USTKI_Z : 0);
  const zKesishadi = (p) => { const pz = +p.z || 0; return pz < z0 + (+frag.h || 0) && z0 < pz + (+p.h || 0); };
  const row = doc.placements.filter(p => footprint(p).y0 < 300 + bb.minY && zKesishadi(p))
    .sort((a, b) => footprint(a).x0 - footprint(b).x0);
  /* egasi #152: devorga tiralmaydi — devor yuzasidan DEVOR_ORALIQ mm (kontur chizig'idan T = qalinlik/2 + oraliq), burchakda ikkalasidan */
  const T = devorChegara(doc.room);
  let x = bb.minX + T;
  for (const p of row) {
    const f = footprint(p);
    if (f.x0 - x >= frag.w) break;
    x = Math.max(x, f.x1);
  }
  if (x + frag.w > bb.maxX - T) x = Math.max(bb.minX + T, bb.maxX - T - frag.w);
  const p = {
    id, frg: frag.code, name: frag.name,
    x: Math.round(x), y: bb.minY + T, z: z0,
    w: frag.w, d: frag.d, h: frag.h, rot: 0, qty: 1
  };
  devordanSur(doc.room, p);
  p.x = Math.round(p.x); p.y = Math.round(p.y);
  doc.placements.push(p);
  return p;
}

/** egasi #152: modul devorga tiralmaydi — devor yuzasidan DEVOR_ORALIQ mm (devor ichiga kirgan bo'lsa — chiqariladi). → p */
export function devordan(doc, p) {
  devordanSur(cheklovXonasi(doc), p);
  p.x = Math.round(p.x); p.y = Math.round(p.y);
  return p;
}

export function removePlacement(doc, id) {
  const i = doc.placements.findIndex(x => x.id === id);
  if (i >= 0) doc.placements.splice(i, 1);
}

/* burilish: (x,y) — modul burchagi, rot gradus (rules.js footprint) */
const cs = (rot) => {
  const deg = (((+rot || 0) % 360) + 360) % 360;
  if (deg === 0) return [1, 0]; if (deg === 90) return [0, 1]; if (deg === 180) return [-1, 0]; if (deg === 270) return [0, -1];
  const a = deg * Math.PI / 180; return [Math.cos(a), Math.sin(a)];
};

/** ◀ ▶ — modul o'z yo'nalishi bo'ylab siljiydi (devor bo'ylab) */
export function moveAlong(p, delta) {
  const [c, s] = cs(p.rot);
  p.x = Math.round(p.x + c * delta); p.y = Math.round(p.y + s * delta);
}

/** ⟳ — markazi joyida qolib 90° buriladi */
export function rotate90(p) {
  const [c, s] = cs(p.rot);
  const cx = p.x + (c * p.w - s * p.d) / 2, cy = p.y + (s * p.w + c * p.d) / 2;   // markaz
  p.rot = (((+p.rot || 0) + 90) % 360 + 360) % 360;
  const [c2, s2] = cs(p.rot);
  p.x = Math.round(cx - (c2 * p.w - s2 * p.d) / 2); p.y = Math.round(cy - (s2 * p.w + c2 * p.d) / 2);
}

/** ⧉ — nusxa, aslining yonida (o'z yo'nalishi bo'ylab) */
export function duplicatePlacement(doc, id) {
  const src = doc.placements.find(x => x.id === id);
  if (!src) return null;
  const c = JSON.parse(JSON.stringify(src));
  c.id = nextId(doc);
  const j = yangiModulJoyi(doc.room, doc.placements, c, { erkin: maydonRejim(doc) === 'erkin' });   // #156: ochiq joyga
  c.x = j.x; c.y = j.y;
  const i = doc.placements.indexOf(src);
  doc.placements.splice(i + 1, 0, c);
  return c;
}

/** Modulni almashtirish (egasi #239–#241): YANGI modul eskisining joyiga (burilish va devorga bog'lanish saqlanadi), ESKI modul esa
 *  ustma-ust tushmasdan eng yaqin bo'sh joyga suriladi (o'chirilmaydi). Hujjat faqat joy topilsa o'zgaradi.
 *  eskiFrag — eski modul katalog yozuvi (balandlik turi: pol/ustki/oyna — bir xil tur bo'lsa eski z saqlanadi).
 *  @returns {null | { yangi: placement, eski: placement, eskiJoyi, ogoh }} null — hech qayerga sig'madi (hujjat o'zgarmaydi) */
export function almashtir(doc, eskiId, frag, eskiFrag) {
  const E = doc.placements.find(x => x.id === eskiId && !x.auto);
  if (!E || !frag) return null;
  const tur = (f) => (f && f.category === 'window') ? 'oyna' : (f && isUstki(f)) ? 'ustki' : 'pol';
  const z0 = frag.default_z != null ? +frag.default_z : (frag.category === 'window' ? OYNA_SUKUT_Z : isUstki(frag) ? USTKI_Z : 0);
  const z = eskiFrag && tur(eskiFrag) === tur(frag) ? (+E.z || 0) : z0;
  const j = almashtirishJoyi(doc.room, doc.placements, E.id, { w: frag.w, d: frag.d, h: frag.h, z }, { erkin: maydonRejim(doc) === 'erkin' });
  if (!j) return null;
  const p = { id: nextId(doc), frg: frag.code, name: frag.name, x: j.yangi.x, y: j.yangi.y, z, w: frag.w, d: frag.d, h: frag.h, rot: j.yangi.rot, qty: 1 };
  if (j.eski) { E.x = j.eski.x; E.y = j.eski.y; E.rot = j.eski.rot; }
  doc.placements.splice(doc.placements.indexOf(E) + 1, 0, p);
  return { yangi: p, eski: E, eskiJoyi: j.eskiJoyi, ogoh: j.ogoh };
}

/** Eski clampSize: katalog chegarasiga keltirish (o'zgargan kalitlar) */
export function clampSize(p, frag) {
  const out = {};
  if (frag.min_w) out.w = Math.max(p.w, frag.min_w);
  if (frag.max_w) out.w = Math.min(out.w || p.w, frag.max_w);
  if (frag.min_d) out.d = Math.max(p.d, frag.min_d);
  if (frag.max_d) out.d = Math.min(out.d || p.d, frag.max_d);
  if (frag.min_h) out.h = Math.max(p.h, frag.min_h);
  if (frag.max_h) out.h = Math.min(out.h || p.h, frag.max_h);
  return out;
}

const NOM = { w: 'eni', d: 'chuqurligi', h: "bo'yi" };
/** Eski checkClamp matni (dizayndagi bilan bir xil): "eni 1200 mm > max 1070 → 1070 ga siqildi" */
export function clampWarnings(want, frag, siqildi = false) {
  const w = [];
  for (const k of ['w', 'd', 'h']) {
    const lo = frag['min_' + k], hi = frag['max_' + k];
    if (lo && want[k] < lo) w.push(`${NOM[k]} ${want[k]} mm < min ${lo}` + (siqildi ? ` → ${lo} ga siqildi` : ''));
    if (hi && want[k] > hi) w.push(`${NOM[k]} ${want[k]} mm > max ${hi}` + (siqildi ? ` → ${hi} ga siqildi` : ''));
  }
  return w.join(' · ');
}

/** Modul kartasidagi o'lcham: usta kiritgan qiymat → chegaraga siqiladi, ogohlantirish matni qaytadi */
export function setSize(p, frag, key, value) {
  p[key] = Math.round(+value || 0);
  const want = { w: p.w, d: p.d, h: p.h };
  Object.assign(p, clampSize(p, frag));
  return clampWarnings(want, frag, true);
}

/** Katalog kartasi narxi — kotirovka bilan bir xil model (tannarx × ustama), standart o'lchamda, kroysiz.
 *  Eski estimateFragment; kesh — material/varaq/xizmat o'zgarmaguncha. */
export function createEstimator(H) {
  const cache = { key: '', map: {}, mats: null };
  return function estimate(f, opt) {
    const sh = opt.sheet;
    const xz = opt.xizmatlar || {};
    const key = opt.materialCode + '|' + opt.fasadCode + '|' + (sh ? sh.sku + sh.name + '@' + sh.uzs : '') + '|xz' + (xz.teshik ? 1 : 0);
    if (cache.key !== key || cache.stavka !== H.narxlar) { cache.key = key; cache.map = {}; cache.mats = null; cache.stavka = H.narxlar; }   // TZ-20: stavka o'zgarsa ham
    if (cache.map[f.code] == null) {
      const mats = cache.mats || (cache.mats = H.effectiveMaterials(sh));
      const cl = cutlist(f, f.w, f.d, f.h, mats, { projectSlots: projectSlots(opt.materialCode, opt.fasadCode) });
      cache.map[f.code] = productionCost([cl], mats, { areaEstimate: true, furnituraById: H.furnById, furnituraBoglash: H.furnituraBoglash, furnituraKoef: H.furnituraKoef, xizmatlar: xz, stavka: H.narxlar }).clientTotal;
    }
    return cache.map[f.code];
  };
}

export const CAT_NAMES = {
  cabinet: 'Shkaf', wardrobe: 'Garderob', kitchen: 'Oshxona', bathroom: 'Hammom',
  sofa: 'Divan', table: 'Stol', chair: 'Stul', bed: 'Karavot',
  shelf: 'Javon', door: 'Eshik', window: 'Deraza',
  tall_cabinet: 'Penal', drawer_base: 'Tortmali tumba', wall_cabinet: 'Osma shkaf',
  cargo_base: 'Kargo tumba', wall_corner: 'Burchak osma', desk: 'Yozuv stoli',
  mobile_pedestal: "G'ildirakli tumba", coat_hanger: 'Kiyim ilgich', appliance: "O'rnatma texnika",
  vanity: 'Rakovina tumbasi', mirror_cabinet: "Ko'zguli shkaf", countertop: "Oshxona qo'shimcha", other: 'Boshqa'
};

/** Ustki (osma) modulmi — rang va balandlik uchun (eski addPlacement bilan bir xil shart) */
export function isUstki(f) {
  return /^(wall_cabinet|wall_corner)$/.test(f.category) || /^kuxnya-(ustki|antresol)$/.test(f.group || '');
}

/** Dizayndagi katalog chiplari → bizning modul guruhlari (dizayn o'zgarmaydi; qolganlari "Barchasi" va qidiruvda) */
export const DIZAYN_KATEGORIYA = [
  ['all', 'Barchasi', () => true],
  ['kp', 'Oshxona pastki', f => /^kuxnya-(pastki|pec|deraza|burchak)$/.test(f.group || '') && !isUstki(f)],
  ['ku', 'Oshxona ustki', f => isUstki(f)],
  ['penal', 'Penal', f => f.category === 'tall_cabinet' || /^kuxnya-(kolonna|muz)$/.test(f.group || '')],
  ['shkaf', 'Shkaf', f => f.category === 'wardrobe' || /^(entresol|peshxona)$/.test(f.group || '')],
  ['krovat', 'Krovat', f => f.category === 'bed'],
  ['stol', 'Stol', f => /^(table|desk)$/.test(f.category)]
];

/* ── xona (eski applyRoom, openings, utilities) ── */

/** Xona: to'rtburchak w×d (yoki tayyor nuqtalar) va balandlik */
export function applyRoom(doc, { w, d, h, outline }) {
  const cur = doc.room.outline || [];
  let pts = outline;
  if (!pts) {
    const bb = roomBBox(cur);
    pts = (w && d && (Math.round(bb.w) !== w || Math.round(bb.h) !== d)) ? rectOutline(w, d) : cur;
  }
  doc.room.outline = pts;
  if (h) doc.room.wall_height = h;
}

/** Devor uzunligi (mm) */
export function wallLen(doc, i) {
  const w = doc.room.outline || [];
  const a = w[i], b = w[(i + 1) % w.length];
  return a && b ? Math.hypot(b[0] - a[0], b[1] - a[1]) : 0;
}

/** Deraza/eshik — devor markaziga (eski #oAdd) */
export function addOpening(doc, { wall, type, width }) {
  const seg = wallLen(doc, wall);
  const wid = Math.min(+width || 1000, seg - 800);
  if (!(wid > 0)) return null;
  const o = {
    wall, type, offset: Math.max(100, Math.round((seg - wid) / 2)),
    width: wid, sill: type === 'window' ? 900 : 0,
    height: type === 'window' ? 1400 : 2100
  };
  (doc.room.openings = doc.room.openings || []).push(o);
  return o;
}

/** Quvur/rozetka (eski #uAdd) */
export function addUtility(doc, { wall, type, offset, z }) {
  const seg = wallLen(doc, wall);
  if (!seg) return null;
  const u = { type, wall, offset: Math.round(Math.max(0, Math.min(seg, +offset || 0))), z: Math.max(50, +z || 1000) };
  (doc.room.utilities = doc.room.utilities || []).push(u);
  return u;
}

/* ── ERP plita tanlash (eski renderSheetSel, so'zma-so'z — DOM o'rniga ro'yxat qaytaradi) ── */
const TRANSLIT = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const normQ = (s) => String(s || '').toLowerCase().replace(/[а-яё]/g, c => TRANSLIT[c] || c);
/** → [{ s (plita), idx }] — qidiruv: ID + fuzzy + ko'p til; bo'sh qidiruvda — tanlangan material turi va qalinligi */
export function plitaRoyxati(H, q, materialCode) {
  const all = (H.sheetCatalog && H.sheetCatalog.sheets) || [];
  q = String(q || '').trim();
  let items;
  if (q && H.searchIndex) items = searchMaterial(q, H.searchIndex, { limit: 150 }).map(h => h.item);
  else if (q) { const nq = normQ(q); items = all.filter(s => normQ(s.name + ' ' + s.sku + ' ' + s.cat).includes(nq)).slice(0, 200); }
  else {
    const base = (H.materials.panel_materials || []).find(m => m.code === materialCode);
    const typeOf = { LDSP18: 'LDSP', LDSP16: 'LDSP', LMDF16: 'LMDF', MDF18: 'MDF', MDF16: 'MDF', MDF8: 'MDF', HDF3: 'HDF', OYNA: 'OYNA' }[materialCode];
    const th = base ? base.thickness : 16;
    items = all.filter(s => s.uzs > 0 && s.type === typeOf && Math.abs((s.th || 0) - th) < 0.6).slice(0, 120);
    if (!items.length) items = all.filter(s => s.uzs > 0 && s.type === typeOf).slice(0, 120);
    if (!items.length) items = all.filter(s => s.uzs > 0).slice(0, 60);
  }
  return items.map(s => ({ s, idx: all.findIndex(x => (x.sku && x.sku === s.sku && x.name === s.name) || (x.name === s.name && x.type === s.type)) }))
    .filter(x => x.idx >= 0);
}

/* egasi #236: joylashtirish — qaraydigan tomon, erkin burchak, balandlik. Markaz joyida qoladi. */
export const TOMON_ROT = { old: 0, orqa: 180, chap: 90, ong: 270 };
export function setRot(p, deg) {
  const [c, s] = cs(p.rot);
  const cx = p.x + (c * p.w - s * p.d) / 2, cy = p.y + (s * p.w + c * p.d) / 2;
  p.rot = ((Math.round(+deg || 0) % 360) + 360) % 360;
  const [c2, s2] = cs(p.rot);
  p.x = Math.round(cx - (c2 * p.w - s2 * p.d) / 2); p.y = Math.round(cy - (s2 * p.w + c2 * p.d) / 2);
  return p.rot;
}
/** Balandlik (p.z, mm): 0..xona balandligi − modul balandligi; → qo'llangan z */
export function setZ(p, z, xonaH) {
  const maks = Math.max(0, Math.round((+xonaH || 2700) - (+p.h || 0)));
  p.z = Math.min(maks, Math.max(0, Math.round(+z || 0)));
  return p.z;
}
