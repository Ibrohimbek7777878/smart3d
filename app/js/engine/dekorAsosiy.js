/* Smart3D engine/dekorAsosiy.js — Asosiy 100 dekor (egasi #182, app/data/dekor-asosiy.json).
 * dekorKalit — dekor nomini taqqoslash kaliti: tur so'zi, ishlab chiqaruvchi, o'lcham, qalinlik, raqamli kod va kod qo'shimchasi
 * (UR, PE, ST9 …) olib tashlanadi: "ЛДСП Ультрадекор 4,575 Белый гладкий 16мм" va "ЛДСП 5кв Kronospan 16мм Белый гладкий" — bitta dekor.
 * asosiyIndeks — ERP material kodi (ERP-…) → yozuv; dekor kaliti → yozuv (ro'yxatdagi boshqa plitkalar ham shu rangda). */
const TUR = /(^|[\s,])(?:лдсп|лмдф|мдф|дсп|лхдф|хдф|акрил)(?=[\s,]|$)/g;
export function dekorKalit(nom) {
  return String(nom || '').toLowerCase().replace(/ё/g, 'е').replace(/c(?=[а-я])/g, 'с').replace(TUR, ' ').replace(/^l\s+/, '')
    .replace(/(?:^|\s)\d+(?:[.,]\d+)?(?:\s*(?:кв|мм|mm))?(?=\s|$)/g, ' ')
    .replace(/[,.;:*_|()]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/(?:\s+(?:[a-z]{1,3}(?:\/[a-z]{1,3})?|st\d+|\d+))+$/, '').trim();
}

/** data (dekor-asosiy.json) → { kod: Map(ERP kodi → yozuv), kalit: Map(dekor kaliti → yozuv), items } */
export function asosiyIndeks(data) {
  const kod = new Map(), kalit = new Map(), items = (data && data.items) || [];
  for (const e of items) { kalit.set(e.kalit, e); for (const c of e.kodlar || []) kod.set(c, e); }
  return { kod, kalit, items };
}

/** yozuv → 3D va plitka rangi { rang, guruh, yogoch } (engine/rang.js shaklida) */
export const asosiyRang = (e) => (e ? { rang: parseInt(String(e.rang_hex).slice(1), 16), guruh: e.guruh, yogoch: e.yuza === 'yogoch', glyanes: e.yuza === 'glyanes', taxminiy: e.rang_ishonch !== 'aniq' } : null);
