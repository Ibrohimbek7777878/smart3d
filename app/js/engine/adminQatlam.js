/* Smart3D engine/adminQatlam.js — admin panel o'zgartirishlarini fayl ma'lumoti ustiga qo'yish (TZ-37, 2-faza). Sof funksiyalar (Node va brauzer).
 * Manba: server ochiq GET /api/materiallar (Asosiy 100: rang, rasm, varaq narxi). Fayllar (app/data/*.json) O'ZGARMAYDI — baza ustun;
 * admin qatorni o'chirsa server uni bermaydi va fayldagi qiymat qoladi.
 * Server yo'q yoki xato — chaqirilmaydi: fayldagi qiymatlar ishlatiladi (web/src/services/hisob.js loadData). */
import { erpKod } from './erpKod.js';

const HEX = /^#[0-9a-f]{6}$/;
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
      for (const s of royxat || []) { const v = narx.get(erpKod(s)); if (v) s.uzs = v; }
    }
  }
  return out;
}
