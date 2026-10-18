/* Stoleshnitsa — ERP dekori bo'yicha narx (TZ-32 yakuniy, egasi #222 Q1): "bitta narx bo'lmaydi, materialga qarab farq qiladi".
 *
 * Ma'lumot: app/data/stoleshnitsa-erp.json (scripts/stoleshnitsa_erp.py) — har dekor o'z ERP narxi (1 m2) va uzunligi bilan.
 * Dona narxi = narx_m2 x uzunlik x eni / 1e6 (ERP birligi m2). Dekor tanlovi: doc.kitchen.stolErp (ERP id); tanlanmagan yoki
 * qalinlikka mos kelmasa — shu qalinlikning sukut dekori (egasi aytmagan: eng ko'p qoldiqli).
 * Dvigatel (kitchen.js) stoleshnitsa bo'laklarini doc.kitchen.stolUz (dekor uzunliklari) bo'yicha bo'ladi; narx — shu yerda
 * `STOL<qalinlik>-<uzunlik>` materiallariga yoziladi (cutlist.js dona bo'yicha hisoblaydi). */
import { stolQalinlik, stolKod } from './kitchen.js';

export const STOL_ENI_SUKUT = 600;

/** doc.kitchen uchun dekor yozuvi (qalinlikka mos) yoki null */
export function stolDekor(data, k) {
  if (!data || !Array.isArray(data.items)) return null;
  const T = stolQalinlik(k);
  const id = k && k.stolErp != null ? String(k.stolErp) : null;
  let d = id ? data.items.find(x => String(x.erp_id) === id && x.qalinlik === T) : null;
  if (!d) { const sid = data.sukut && data.sukut[String(T)]; d = sid != null ? data.items.find(x => String(x.erp_id) === String(sid)) : null; }
  return d || null;
}

/** dekorning dona narxi (so'm) — ERP m2 narxi x bo'lak maydoni */
export const stolDonaNarx = (d, std) => Math.round(d.narx_m2 * std * (d.eni || STOL_ENI_SUKUT) / 1e6);

/** kitchen nusxasi: tanlangan/sukut dekorning uzunliklari (stolUz) bilan — hujjat o'zgarmaydi */
export function stolKitchen(k, data) {
  if (!k || k.stoleshnitsa === false) return k;
  const d = stolDekor(data, k);
  return d ? Object.assign({}, k, { stolErp: d.erp_id, stolUz: d.uzunliklar }) : k;
}

/** materials.panel_materials ichidagi STOL<T>-<L> yozuvlarini tanlangan dekor narxi/nomi bilan yangilash (joyida). Dekor qaytadi. */
export function stolMaterialQollash(mats, data, k) {
  const d = stolDekor(data, k);
  if (!d || !mats) return d;
  const pm = mats.panel_materials || (mats.panel_materials = []);
  const sana = String((data._meta && data._meta.manba) || 'ERP').replace(/^.*?(\d{4}-\d{2}-\d{2}).*$/, '$1');
  for (const std of d.uzunliklar) {
    const code = stolKod(d.qalinlik, std), eni = d.eni || STOL_ENI_SUKUT;
    const yozuv = {
      code, name: `${d.nom} ${std}×${eni}×${d.qalinlik}`, thickness: d.qalinlik, factor: 1.0,
      sheet_price: stolDonaNarx(d, std), price_src: 'ERP ' + sana, unit_piece: true, std_l: std, sheets: [[std, eni]],
      src: `ERP ${d.sku} (${d.narx_m2} so'm/m²)`, erp: { id: d.erp_id, sku: d.sku, narx_m2: d.narx_m2 }
    };
    const i = pm.findIndex(m => m.code === code);
    if (i >= 0) pm[i] = yozuv; else pm.push(yozuv);
  }
  return d;
}
