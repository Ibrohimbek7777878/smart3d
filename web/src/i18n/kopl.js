/* Ko'plik shakli (CLDR, Intl.PluralRules): son bo'yicha 'one' | 'few' | 'many' | 'other'.
 * Lug'atda — asosiy kalit (boshqa shakllar uchun, masalan ruscha "позиций") va kerak bo'lsa "kalit.one" / "kalit.few" / "kalit.many" (tilga qarab):
 *   en: "narx.x": "{k} items have no price"        +  "narx.x.one": "{k} item has no price"
 *   ru: "narx.x": "у {k} позиций нет цены"          +  "narx.x.one": "у {k} позиции нет цены"   (2–4 va 5+ bir xil — alohida kalit shart emas)
 *   uz: faqat asosiy kalit (sondan keyin "ta" — shakl o'zgarmaydi).
 * Ishlatish: t('narx.x', { k: 3 }, 3) — uchinchi argument ko'plik sonini beradi. Shakl kaliti yo'q bo'lsa — asosiy kalit. */
const qoidalar = {};

export function shakl(til, son) {
  const n = Number(son);
  try { return (qoidalar[til] || (qoidalar[til] = new Intl.PluralRules(til))).select(n); }
  catch (_) { return n === 1 ? 'one' : 'other'; }
}

/** lug'at (bitta til) ichidan shu son uchun kalit: "kalit.shakl" bo'lsa — u, aks holda kalitning o'zi */
export function koplikKalit(lugat, til, key, son) {
  const f = key + '.' + shakl(til, son);
  return lugat[f] != null && lugat[f] !== '' ? f : key;
}
