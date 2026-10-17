import { baseForSheet } from './hisob.js';
import { dekorRang } from '../../../app/js/engine/rang.js';
import { asosiyRang, dekorKalit } from '../../../app/js/engine/dekorAsosiy.js';
import { dekorNomi } from '../features/editor/catalog/dekor.js';

/* TZ-23 E: ERP plitasi (1281 ta, materials-index.json) — alohida material kodi (ERP-…) bo'lib hisobga qo'shiladi:
 * har qism (korpus, fasad, orqa, stoleshnitsa) va har modul o'z dekorida bo'ladi, raskroy har dekorni alohida listda
 * hisoblaydi (sexdagidek). Narx — ERP'dagi narx; ERP'da narx yo'q bo'lsa — asos materialning narxi ("taxminiy" belgisi,
 * qoida 4.3 — o'ylab topilmaydi). Loyihada tanlangan plitalar doc.erpMat da saqlanadi — loyiha qayta ochilganda tiklanadi. */

/** ERP plitasining material kodi — barqaror (nom | SKU | qalinlik xeshi; katalogda ID yo'q, SKU takrorlanishi mumkin) */
export function erpKod(sh) {
  const str = String(sh.name || '') + '|' + String(sh.sku || '') + '|' + String(sh.th || '');
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return 'ERP-' + h.toString(36);
}

/** ERP plitasi → materials.json panel_materials shaklidagi yozuv */
export function erpMaterial(sh, mats) {
  const base = baseForSheet(sh);
  const asos = ((mats && mats.panel_materials) || []).find(m => m.code === base) || {};
  const narxBor = +sh.uzs > 0;
  return {
    code: erpKod(sh), name: String(sh.name || '').slice(0, 160), thickness: +sh.th || asos.thickness || 16,
    factor: asos.factor, sheet_price: narxBor ? +sh.uzs : asos.sheet_price,
    sheets: +sh.l > 100 && +sh.w > 100 ? [[+sh.l, +sh.w]] : (asos.sheets || [[2800, 2070]]),
    src: narxBor ? 'ERP' : 'ERP (narx yo\'q) — ' + base + ' narxi, taxminiy', taxminiy: !narxBor, asos: base,
    erp: { id: sh.id || '', sku: sh.sku || '', type: sh.type || '' }
  };
}

/** loyihadagi ERP materiallarini hisob bazasiga qo'shish (takrorsiz) */
export function erpUla(H, doc) {
  const pl = H && H.materials && (H.materials.panel_materials || (H.materials.panel_materials = []));
  if (!pl) return 0;
  let n = 0;
  for (const m of Object.values((doc && doc.erpMat) || {})) {
    if (!m || !/^ERP-/.test(m.code) || pl.some(x => x.code === m.code)) continue;
    pl.push(m); n++;
  }
  return n;
}

/** plitani loyihaga qo'shish: doc.erpMat + hisob bazasi; material kodi */
export function erpQosh(H, doc, sh) {
  const m = erpMaterial(sh, H.materials);
  doc.erpMat = doc.erpMat || {};
  doc.erpMat[m.code] = m;
  erpUla(H, doc);
  return m.code;
}

/** saqlashdan oldin: doc.erpMat — faqat loyihada ishlatilgan ERP materiallari (loyiha tanlovi + modullar) */
export function erpSaqla(H, doc, kodlar) {
  const used = new Set((kodlar || []).filter(c => /^ERP-/.test(c || '')));
  for (const p of (doc && doc.placements) || []) for (const c of Object.values(p.slots || {})) if (/^ERP-/.test(c || '')) used.add(c);
  for (const c of Object.values((doc && doc.bazis && doc.bazis.almash) || {})) if (/^ERP-/.test(c || '')) used.add(c);
  const pl = (H && H.materials && H.materials.panel_materials) || [], eski = (doc && doc.erpMat) || {}, yangi = {};
  for (const c of used) { const m = eski[c] || pl.find(x => x.code === c); if (m) yangi[c] = m; }
  if (Object.keys(yangi).length) doc.erpMat = yangi; else delete doc.erpMat;
  return doc;
}

/** #182: Asosiy 100 dekor yozuvi — ERP kodi bo'yicha, bo'lmasa dekor nomi kaliti bo'yicha (boshqa ishlab chiqaruvchi/qalinlik) */
function asosiyYozuv(H, code, name) {
  const A = H && H.dekorAsosiy;
  if (!A) return null;
  return (code && A.kod.get(code)) || (name && A.kalit.get(dekorKalit(dekorNomi(String(name).split(/[\r\n]/)[0], '').nom))) || null;
}

/** ERP plitasi → dekor rangi: Asosiy 100 namunasi (plitka va 3D bir xil), bo'lmasa nomidan (taxminiy) */
export function plitaRangi(H, sh) {
  const e = asosiyYozuv(H, erpKod(sh), sh.name);
  return e ? asosiyRang(e) : dekorRang(sh.name);
}

/** material kodi → nomi va dekor rangi (3D va ro'yxat uchun) */
export function materialRang(H, code) {
  const m = ((H && H.materials && H.materials.panel_materials) || []).find(x => x.code === code);
  if (!m) return null;
  const e = /^ERP-/.test(code) ? asosiyYozuv(H, code, m.name) : null;
  return e ? asosiyRang(e) : dekorRang(m.name);
}

/** TZ-23 E: Bazis materialini almashtirish — fragment nusxasi, detallar yangi materialda (asl fragment o'zgarmaydi).
 *  almash — { 'BZM-…': 'ERP-…' | 'LDSP16' … } (doc.bazis.almash) */
export function bazisAlmash(frag, almash) {
  if (!frag || !almash || !Object.keys(almash).length) return frag;
  return Object.assign({}, frag, { parts: (frag.parts || []).map(p => (almash[p.material_code] ? Object.assign({}, p, { material_code: almash[p.material_code] }) : p)) });
}

const QISM_SLOT = { korpus: 'korpus', polka: 'polka', fasad: 'fasad', orqa: 'orqa', stol: 'stoleshnitsa' };
/** 3D uchun: joylashuvlar nusxasi + _rang { korpus, polka, fasad, orqa, stol } (modul tanlovi, bo'lmasa loyihadagi;
 *  nomi rangni aytmaydigan material — yo'q, dizayndagi standart ko'rinish). pj — { matCode, polkaCode, fasadCode, orqaCode, stolCode }.
 *  bazis (doc.bazis) — almashtirilgan Bazis materiallari: _rang.bazis { [bazisMat indeksi]: rang } */
export function joyRanglari(H, placements, pj, bazis) {
  const kesh = new Map(), rangi = (c) => { if (!c) return null; if (!kesh.has(c)) kesh.set(c, materialRang(H, c)); return kesh.get(c); };
  const loyiha = { korpus: pj.matCode, polka: pj.polkaCode || pj.matCode, fasad: pj.fasadCode, orqa: pj.orqaCode, stol: pj.stolCode };
  let bz = null;
  if (bazis && bazis.fragment && bazis.almash) {
    (bazis.fragment.bazisMat || []).forEach(([, kod], i) => { const v = kod && bazis.almash[kod] && rangi(bazis.almash[kod]); if (v) (bz || (bz = {}))[i] = v; });
  }
  return (placements || []).map(p => {
    let r = null;
    for (const [q, s] of Object.entries(QISM_SLOT)) {
      const v = rangi((p.slots && p.slots[s]) || loyiha[q]);
      if (v) (r || (r = {}))[q] = v;
    }
    if (bz && bazis.fragment.code === p.frg) (r || (r = {})).bazis = bz;
    return r ? Object.assign({}, p, { _rang: r }) : p;
  });
}
