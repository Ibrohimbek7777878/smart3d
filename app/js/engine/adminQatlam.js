/* Smart3D engine/adminQatlam.js — admin panel o'zgartirishlarini fayl ma'lumoti ustiga qo'yish (TZ-37, 2-faza). Sof funksiyalar (Node va brauzer).
 * Manba: server ochiq GET /api/materiallar (Asosiy 100: rang, rasm, varaq narxi) va GET /api/katalog (modul nomi, yashirish, o'lcham chegarasi,
 * narx rejimi). Fayllar (app/data/*.json) O'ZGARMAYDI — baza ustun; admin qatorni o'chirsa server uni bermaydi va fayldagi qiymat qoladi.
 * Server yo'q yoki xato — chaqirilmaydi: fayldagi qiymatlar ishlatiladi (web/src/services/hisob.js loadData). */
import { erpKod } from './erpKod.js';

const HEX = /^#[0-9a-f]{6}$/;
const OLCHAM = ['min_w', 'max_w', 'min_d', 'max_d', 'min_h', 'max_h'];
export const NARX_REJIMLAR = ['unit', 'm2', 'mm'];
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

/** Asosiy 100 (dekor-asosiy.json) rangi, rasmi va ERP varaqlarining narxi. out — loadData natijasi (dekorAsosiy, rasmlar, sheetCat, matIdx);
 *  o'zgartiriladi va qaytariladi. Rang admin tomonidan berilgan bo'lsa — "aniq" (taxminiy belgisi chiqmaydi). */
export function materiallarQollash(out, mv) {
  if (!out || !mv || typeof mv !== 'object') return out;
  const dekor = obj(mv.dekor);
  for (const e of (out.dekorAsosiy && out.dekorAsosiy.items) || []) {
    const d = obj(dekor[e.kalit]);
    if (typeof d.rang_hex === 'string' && HEX.test(d.rang_hex)) { e.rang_hex = d.rang_hex; e.rang_ishonch = 'aniq'; }
    if (typeof d.rasm === 'string' && d.rasm && !/^[a-z]+:|^\/\//i.test(d.rasm)) {            // faqat sayt ichidagi yo'l (api/materiallar/rasm/…)
      out.rasmlar = out.rasmlar || {};
      const R = (out.rasmlar.materiallar = out.rasmlar.materiallar || {});
      R['dekor|' + e.kalit] = d.rasm;
      for (const kod of e.kodlar || []) delete R[kod];                                        // ERP-kod bo'yicha eski rasm admin rasmidan ustun turmasin
    }
  }
  const narx = new Map(Object.entries(obj(mv.narx)).filter(([k, v]) => /^ERP-/.test(k) && Number.isInteger(v) && v > 0));
  if (narx.size) {
    for (const royxat of [out.sheetCat && out.sheetCat.sheets, out.matIdx && out.matIdx.items]) {
      for (const s of royxat || []) { const v = narx.get(erpKod(s)); if (v) { s.uzs = v; s.qolda = true; } }   // TZ-48: admin qo'lda narxi — plita «sotuv» koeffitsientiga tushmaydi
    }
  }
  return out;
}

/** ERP sinxron qatlami (TZ-37, 3-faza; server ochiq GET /api/erp-narx): admin tasdiqlab qo'llagan ERP narxlari fayl narxi USTIGA qo'yiladi:
 *  plita (varaq narxi, kalit — engine/erpKod.js) → sheetCat.sheets va matIdx.items .uzs; furnitura (katalog ID) → furnCat.items .uzs (narx qo'yilgani uchun
 *  no_price olinadi, price_src 'erp_sinxron'). Admin qo'lda narxi (materiallarQollash) bundan KEYIN qo'llanadi va ustun. Fayllar o'zgarmaydi — faqat xotiradagi nusxa.
 *  → { plita, furnitura } — qo'llangan yozuvlar soni */
export function erpNarxQollash(out, ev) {
  const natija = { plita: 0, furnitura: 0 };
  if (!out || !ev || typeof ev !== 'object') return natija;
  const butun = (v) => Number.isInteger(v) && v > 0;
  const plita = new Map(Object.entries(obj(ev.plita)).filter(([k, v]) => /^ERP-/.test(k) && butun(v)));
  if (plita.size) {
    for (const royxat of [out.sheetCat && out.sheetCat.sheets, out.matIdx && out.matIdx.items]) {
      for (const s of royxat || []) { const v = plita.get(erpKod(s)); if (v) { s.uzs = v; natija.plita++; } }
    }
  }
  const furn = obj(ev.furnitura);
  for (const it of (out.furnCat && out.furnCat.items) || []) {
    const v = it.id != null ? furn[it.id] : undefined;
    if (butun(v)) { it.uzs = v; delete it.no_price; it.price_src = 'erp_sinxron'; natija.furnitura++; }
  }
  return natija;
}

/** Modul nomlari (uz/ru/en). out.nomlarRu/nomlarEn ({ modullar: {kod: nom} }) to'ldiriladi; o'zbekcha nom out.nomlarUz da (H.nomlar.uz — modulNomi). */
export function katalogNomlar(out, kv) {
  const M = obj(obj(kv).modullar);
  for (const [kod, o] of Object.entries(M)) {
    for (const [til, kalit] of [['ru', 'nomlarRu'], ['en', 'nomlarEn'], ['uz', 'nomlarUz']]) {
      const nom = obj(o)['nom_' + til];
      if (typeof nom !== 'string' || !nom.trim()) continue;
      out[kalit] = out[kalit] || {};
      (out[kalit].modullar = out[kalit].modullar || {})[kod] = nom.trim();
    }
  }
  return out;
}

/** Katalog yozuvlariga o'lcham chegarasi va narx rejimi. catalog — { kod: fragment } (applySexStandart'dan KEYIN): modulga admin chegarasi sex
 *  standartidan ustun; fragment.admin_lim saqlanadi — applySexStandart keyingi chaqirilishda (server sex standartlari) uni qayta qo'yadi. → o'zgargan modullar soni */
export function katalogQollash(catalog, kv) {
  let n = 0;
  for (const [kod, o] of Object.entries(obj(obj(kv).modullar))) {
    const f = catalog && catalog[kod];
    if (!f || !o || typeof o !== 'object') continue;
    const lim = {};
    for (const k of OLCHAM) if (Number.isInteger(o[k]) && o[k] > 0) lim[k] = o[k];
    if (Object.keys(lim).length) { Object.assign(f, lim); f.admin_lim = lim; n++; }
    if (NARX_REJIMLAR.includes(o.price_mode)) { f.price_mode = o.price_mode; n++; }
  }
  return n;
}

/** admin yashirgan modul kodlari */
export const yashirinKodlar = (kv) => new Set(Object.entries(obj(obj(kv).modullar)).filter(([, o]) => obj(o).yashirin === true).map(([k]) => k));

/** tanlash ro'yxati va AI/konstruktor uchun katalog: yashirinlarsiz. Yashirin yo'q — katalogning o'zi (bir xil obyekt: hech narsa o'zgarmaydi).
 *  Hisob-kitob, 3D va ochiq loyihalar to'liq katalogdan (H.catalog) foydalanadi — yashirish faqat tanlashda (qoida 2.7). */
export function korinadiKatalog(catalog, yashirin) {
  if (!yashirin || !yashirin.size) return catalog;
  const out = {};
  for (const k of Object.keys(catalog)) if (!yashirin.has(k)) out[k] = catalog[k];
  return out;
}
