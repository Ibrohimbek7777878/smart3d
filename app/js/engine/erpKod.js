/* Smart3D engine/erpKod.js — ERP plitasining barqaror material kodi (TZ-23 E). Katalogda ID yo'q (SKU takrorlanishi mumkin), shuning
 * uchun kod — nom | SKU | qalinlik xeshi (FNV-1a). Brauzer (web/src/services/erpMaterial.js) va server (admin "Materiallar") BITTA funksiyadan
 * foydalanadi: dekor-asosiy.json dagi `kodlar` va admin narxi (mat_narx.kod) shu kod bilan bog'lanadi. Funksiya O'ZGARMAYDI — o'zgarsa,
 * saqlangan loyihalar (doc.erpMat) va dekor-asosiy.json kodlari buziladi. */
export function erpKod(sh) {
  const str = String(sh.name || '') + '|' + String(sh.sku || '') + '|' + String(sh.th || '');
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return 'ERP-' + h.toString(36);
}
