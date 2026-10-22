import { baseForSheet } from './hisob.js';
import { dekorRang } from '../../../app/js/engine/rang.js';
import { asosiyRang, dekorKalit } from '../../../app/js/engine/dekorAsosiy.js';
import { dekorNomi } from '../features/editor/catalog/dekor.js';
import { erpKod } from '../../../app/js/engine/erpKod.js';
import { plitaFormati, bazisMoslashHammasi } from '../../../app/js/engine/plitaMoslash.js';
import { dekorYonalishi } from '../../../app/js/engine/bazis/loyiha.js';

/* TZ-23 E: ERP plitasi (1281 ta, materials-index.json) — alohida material kodi (ERP-…) bo'lib hisobga qo'shiladi:
 * har qism (korpus, fasad, orqa, stoleshnitsa) va har modul o'z dekorida bo'ladi, raskroy har dekorni alohida listda
 * hisoblaydi (sexdagidek). Narx — ERP'dagi narx; ERP'da narx yo'q bo'lsa — asos materialning narxi ("taxminiy" belgisi,
 * qoida 4.3 — o'ylab topilmaydi). Loyihada tanlangan plitalar doc.erpMat da saqlanadi — loyiha qayta ochilganda tiklanadi. */

/** ERP plitasining material kodi — barqaror (nom | SKU | qalinlik xeshi; katalogda ID yo'q, SKU takrorlanishi mumkin).
 *  Funksiya app/js/engine/erpKod.js da (server admin "Materiallar" ham shuni ishlatadi) */
export { erpKod };

/** ERP plitasi → materials.json panel_materials shaklidagi yozuv */
export function erpMaterial(sh, mats) {
  const base = baseForSheet(sh);
  const asos = ((mats && mats.panel_materials) || []).find(m => m.code === base) || {};
  const narxBor = +sh.uzs > 0;
  return {
    code: erpKod(sh), name: String(sh.name || '').slice(0, 160), thickness: +sh.th || asos.thickness || 16,
    factor: asos.factor, sheet_price: narxBor ? +sh.uzs : asos.sheet_price,
    sheets: ((f) => (f ? [f] : (asos.sheets || [[2800, 2070]])))(plitaFormati(sh.name, sh.l, sh.w).f),   // TZ-42: nomdagi maydon (4,575 → 2500×1830) — katalogda sukut 2800×2070 bo'lishi mumkin
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

/** TZ-42: Bazis materiali → ERP plitasi. Bir qiymatli moslik avtomatik (doc.bazis.almash + doc.erpMat; narx — ERP'dan, "ERP" manba);
 *  noaniq (bir nechta nomzod) — O'YLAB TOPILMAYDI: foydalanuvchi "Almashtirish" oynasida nomzodlardan tanlaydi. → { aniq, nomzod } */
export function bazisMoslash(doc, H) {
  const b = doc && doc.bazis, sheets = H && H.sheetCatalog && H.sheetCatalog.sheets;
  if (!b || !sheets || !b.materiallar) return { aniq: 0, nomzod: 0 };
  let aniq = 0, nomzod = 0;
  for (const [kod, x] of Object.entries(bazisMoslashHammasi(b.materiallar.panel, sheets, b.almash))) {
    if (x.holat === 'aniq') { b.almash = Object.assign({}, b.almash, { [kod]: erpQosh(H, doc, x.sheet) }); aniq++; }
    else if (x.holat === 'nomzod') nomzod++;
  }
  return { aniq, nomzod };
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

/** Material rasmi (rasmlar.json.materiallar): kalit — ERP kodi, bo'lmasa dekor nomi kaliti; qiymat — yo'l yoki { src, mm: [eni, bo'yi] }.
 *  Natija { src: 'data/…', mm: [eni, bo'yi] } | null. mm — rasmdagi haqiqiy o'lcham (3D da takrorlanish shu masshtabda; sukut — butun plita 2800×2070) */
export function materialRasm(H, code, name) {
  const R = H && H.rasmlar && H.rasmlar.materiallar;
  if (!R || !Object.keys(R).length) return null;
  const k = (code && R[code]) ? code : (name ? 'dekor|' + dekorKalit(dekorNomi(String(name).split(/[\r\n]/)[0], '').nom) : null);
  const v = k && R[k];
  if (!v) return null;
  const src = typeof v === 'string' ? v : v.src, mm = (v && v.mm) || [2800, 2070];
  return src ? { src, mm } : null;
}

/** material kodi → nomi va dekor rangi (3D va ro'yxat uchun); rasm bo'lsa — rang obyektiga rasm/rasmMm qo'shiladi (3D tekstura) */
export function materialRang(H, code) {
  const m = ((H && H.materials && H.materials.panel_materials) || []).find(x => x.code === code);
  if (!m) return null;
  const e = /^ERP-/.test(code) ? asosiyYozuv(H, code, m.name) : null;
  const rang = e ? asosiyRang(e) : dekorRang(m.name), ras = materialRasm(H, code, m.name);
  return ras ? Object.assign({ rang: 0xffffff }, rang, { rasm: ras.src, rasmMm: ras.mm }) : rang;
}

/** TZ-23 E: Bazis materialini almashtirish — fragment nusxasi, detallar yangi materialda (asl fragment o'zgarmaydi).
 *  almash — { 'BZM-…': 'ERP-…' | 'LDSP16' … } (doc.bazis.almash).
 *  TZ-47 (A): panelMats (materials.panel_materials) berilsa — almashtirilgan detalning TEKSTURASI yangi material nomiga qarab qayta aniqlanadi
 *  (import vaqtida u Bazis nomidan qo'yilgan edi): oddiy dekor (Белый гладкий, Кашемир, Каштан pearl …) → 'erkin' (aylantiriladi),
 *  yog'och/tosh naqshi (LDSP/Kashtan) → yo'nalishli ('en' — lokal X qisqa bo'lsa, aks holda 'uzunlik'); nomi aytmaydigan material (LDSP16 …), yupqa ЛМДФ/МДФ/akril naqshi yoki HDF —
 *  tekstura o'zgarmaydi (o'ylab topilmaydi). Stoleshnitsa (stol_birga) tegilmaydi. */
export function bazisAlmash(frag, almash, panelMats) {
  if (!frag || !almash || !Object.keys(almash).length) return frag;
  const nomi = (kod) => { const m = (panelMats || []).find(x => x.code === kod); return m ? String(m.name || '') : ''; };
  const tekstura = (p, kod) => {
    if (!panelMats || p.stol_birga) return p.tekstura;
    const nom = nomi(kod);
    if (/^HDF/.test(kod) || /лхдф|хдф|\bhdf\b/i.test(nom)) return p.tekstura;
    const y = dekorYonalishi(nom);
    if (y === 'oddiy') return 'erkin';
    /* naqshli dekor — yo'nalishli faqat LDSP/Kashtan kabi plitada; yupqa ЛМДФ/МДФ/akril (masalan "ЛМДФ 0.55 ДУБ ВОТАН", 3978) sexda ham txt=false — tegilmaydi */
    return y === 'naqsh' && !/лмдф|мдф|lmdf|\bmdf\b|акрил|akril/i.test(nom) ? (+p.len < +p.width ? 'en' : 'uzunlik') : p.tekstura;
  };
  return Object.assign({}, frag, { parts: (frag.parts || []).map(p => {
    const kod = almash[p.material_code];
    if (!kod) return p;
    const t = tekstura(p, kod);
    return Object.assign({}, p, { material_code: kod }, t !== undefined ? { tekstura: t } : {});
  }) });
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
