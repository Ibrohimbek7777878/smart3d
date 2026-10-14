/* Smart3D engine/standart.js — sex standartlari (min/max) → fragment chegaralari.
 * Manba: data/sex-standartlari.json (egasi tasdiqlagan, o'zgartirish — faqat shu faylda).
 * TZ-HAQIQIY-MODULLAR A1. */

/** Fragmentda `standart` (tur) bo'lsa, shu turdagi min/max qo'llanadi; `standart_olchamlar`
 *  berilgan bo'lsa — faqat o'sha o'lchamlar (modulning o'z o'lchami oraliqdan juda uzoq
 *  bo'lgan o'lcham import paytida o'zgarmas qoldirilgan). */
export function applySexStandart(frag, std) {
  const t = frag && frag.standart && std && std.modullar && std.modullar[frag.standart];
  if (!t) return frag;
  const dims = Array.isArray(frag.standart_olchamlar) ? frag.standart_olchamlar : ['w', 'd', 'h'];
  for (const k of dims) {
    if (!t[k]) continue;
    if (t[k].min != null) frag['min_' + k] = t[k].min;
    if (t[k].max != null) frag['max_' + k] = t[k].max;
  }
  return frag;
}
