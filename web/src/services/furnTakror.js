/* TZ-57: furnitura katalogi ro'yxatidagi takrorlar (sof funksiya — brauzersiz ham ishlaydi). */
/** TZ-57: ERP katalogida bir mahsulot bir necha ID bilan turishi mumkin (nomi, SKU va narxi bir xil) — ro'yxatda BIR marta (eng kichik ID);
 *  qolgan ID'lar katalogda (H.furnById) turaveradi — eski bog'lanishlar va narx hisobi buzilmaydi. Nomi bir xil, narxi yoki SKU'si farqli — birlashtirilmaydi. */
export function takrorsiz(items) {
  const ko = new Map();
  for (const it of items) {
    const k = [String(it.name || '').toLowerCase().replace(/[^0-9a-zа-яё]+/g, ''), String(it.sku || '').toLowerCase().replace(/\s+/g, ''), it.uzs].join('|');
    const x = ko.get(k);
    if (!x || String(it.id) < String(x.id)) ko.set(k, it);
  }
  return [...ko.values()];
}
