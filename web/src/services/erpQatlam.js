import { erpNarxQollash, materiallarQollash } from '../../../app/js/engine/adminQatlam.js';
import { erpKod } from '../../../app/js/engine/erpKod.js';

/* TZ-44 (7): ERP narx qatlamini ILOVA ISHLAB TURGANDA qayta qo'yish (jonli yangilanish).
 * Qatlam tartibi o'zgarmaydi: fayl narxi < ERP qatlami (GET /api/erp-narx) < admin qo'lda narxi (GET /api/materiallar).
 * erpNarxQollash() faqat QO'YADI (olib tashlamaydi) — shuning uchun har yangilanishda avval fayl narxlari tiklanadi (erpAsl — loadData
 * qatlam qo'yilishidan OLDIN olgan nusxa), keyin ERP, keyin admin qatlami qayta qo'yiladi: admin ERP qatlamini bekor qilsa ("Sukutga qaytarish")
 * yoki narx ERP javobidan tushib qolsa — xotiradagi narx ham fayldagiga qaytadi, eski narx qolib ketmaydi.
 * Dvigatel formulalari va adminQatlam.js O'ZGARMAGAN — faqat shu tartibni qayta chaqiradi. */

const FURN = ['uzs', 'no_price', 'price_src'];
const bor = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const nusxa = (o, kalitlar) => kalitlar.map(k => (bor(o, k) ? [k, o[k]] : [k]));

const SUKUT = ['sheet_price', 'price_src', 'taxminiy'];
/** Sukut plitalar (materials.json sukut_erp bilan bog'langan panel_materials) — ERP qatlami qo'yilishidan oldingi narxi. Sukut plita ERP katalogida (sheet-catalog)
 *  bo'lmasligi mumkin (nom bo'yicha moslik yo'q) — shuning uchun uning jonli narxi ERP-kod bilan emas, ev.sukut = { <panel kodi>: so'm } bilan keladi (server beradigan bo'lsa;
 *  bo'lmasa — hech narsa o'zgarmaydi: egasi tanlagan ERP narxi, materials.json sukut_erp). */
function sukutAsl(mats) {
  const asl = [];
  for (const [code, v] of Object.entries((mats && mats.sukut_erp) || {})) {
    if (code[0] === '_' || !v || typeof v !== 'object') continue;
    const pm = ((mats && mats.panel_materials) || []).find(m => m.code === code);
    if (pm) asl.push([pm, nusxa(pm, SUKUT)]);
  }
  return asl;
}
/** ev.sukut ni sukut plitalarga qo'yish (avval asl narx tiklanadi). → narxi o'zgargan plitalar soni */
export function erpSukutQoy(out, mats, ev) {
  const asl = out.sukutAsl || (out.sukutAsl = sukutAsl(mats));
  const oldin = asl.map(([pm]) => pm.sheet_price);
  tikla(asl);
  const sk = ev && ev.sukut && typeof ev.sukut === 'object' ? ev.sukut : {};
  for (const [pm] of asl) {
    const v = sk[pm.code];
    if (Number.isInteger(v) && v > 0) { pm.sheet_price = v; pm.price_src = 'ERP, ' + String((ev && ev.sana) || '').slice(0, 10); delete pm.taxminiy; }
  }
  return asl.reduce((n, [pm], i) => n + (pm.sheet_price !== oldin[i] ? 1 : 0), 0);
}

/** Qatlam qo'yilishidan oldingi (fayl) narxlari: { plita: [[tugun, [[kalit, qiymat?]]]], matIdx: [...], furn: [...] } */
export function erpAsl(out) {
  const asl = { plita: [], matIdx: [], furn: [] };
  for (const s of (out.sheetCat && out.sheetCat.sheets) || []) asl.plita.push([s, nusxa(s, ['uzs'])]);
  for (const s of (out.matIdx && out.matIdx.items) || []) asl.matIdx.push([s, nusxa(s, ['uzs'])]);
  for (const it of (out.furnCat && out.furnCat.items) || []) asl.furn.push([it, nusxa(it, FURN)]);
  return asl;
}

function tikla(royxat) {
  for (const [o, ps] of royxat) for (const p of ps) { if (p.length > 1) o[p[0]] = p[1]; else delete o[p[0]]; }
}

/** ERP qatlamini yangi javob (ev) bilan qayta qo'yish. out — loadData natijasi (sheetCat, matIdx, furnCat, erpAsl, adminMv); mats — H.materials;
 *  doc — ochiq loyiha (doc.erpMat: tanlangan ERP plitalarining narxi shu yerda saqlanadi).
 *  → { n: narxi o'zgargan plita (ERP kodi bo'yicha, takrorsiz), furnitura va sukut plita soni, plita: Map(ERP kodi → yangi narx) }
 *  Loyihada tanlangan ERP plitasi (panel_materials ERP-…, doc.erpMat) — FAQAT shu yangilanishda narxi o'zgargan bo'lsa yangilanadi:
 *  qolganlari (saqlangan loyihadagi eski narxlar) tegilmaydi. */
export function erpQatlamQoy(out, mats, ev, doc) {
  const asl = out.erpAsl || (out.erpAsl = erpAsl(out));
  const oldin = [asl.plita, asl.matIdx, asl.furn].map(r => r.map(([o]) => o.uzs));
  tikla(asl.plita); tikla(asl.matIdx); tikla(asl.furn);
  erpNarxQollash(out, ev);
  if (out.adminMv) materiallarQollash(out, out.adminMv);
  const ozgargan = new Map();                                     // ERP kodi → yangi narx (plita; sheetCat ham, matIdx ham)
  for (const [ri, r] of [asl.plita, asl.matIdx].entries()) {
    r.forEach(([s], i) => { if (s.uzs !== oldin[ri][i]) ozgargan.set(erpKod(s), s.uzs); });
  }
  let furn = 0;
  asl.furn.forEach(([it], i) => { if (it.uzs !== oldin[2][i]) furn++; });
  const narx = new Map([...ozgargan].filter(([, v]) => Number.isInteger(v) && v > 0));
  if (narx.size) {
    const yoz = (m) => { if (m && /^ERP-/.test(m.code || '') && narx.has(m.code)) { m.sheet_price = narx.get(m.code); m.src = 'ERP'; delete m.taxminiy; } };
    for (const m of (mats && mats.panel_materials) || []) yoz(m);
    for (const m of Object.values((doc && doc.erpMat) || {})) yoz(m);
  }
  const sukut = erpSukutQoy(out, mats, ev);
  return { n: ozgargan.size + furn + sukut, plita: narx };
}
