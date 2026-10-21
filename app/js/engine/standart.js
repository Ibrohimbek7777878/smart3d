/* Smart3D engine/standart.js — sex standartlari (min/max) → fragment chegaralari.
 * Manba: data/sex-standartlari.json (egasi tasdiqlagan, o'zgartirish — faqat shu faylda).
 * TZ-HAQIQIY-MODULLAR A1. */

/** Fragmentda `standart` (tur) bo'lsa, shu turdagi min/max qo'llanadi; `standart_olchamlar`
 *  berilgan bo'lsa — faqat o'sha o'lchamlar (modulning o'z o'lchami oraliqdan juda uzoq
 *  bo'lgan o'lcham import paytida o'zgarmas qoldirilgan).
 *  `standart_map` (krovat, parta — 'asos' standartlari): standart kaliti (uzunlik/eni) matras
 *  asosi yoki stol ustiga tegishli → modul o'qi `o` ga `ofset` qo'shib o'tadi (TZ-HAQIQIY-MODULLAR C2). */
export function applySexStandart(frag, std) {
  const t = frag && frag.standart && std && std.modullar && std.modullar[frag.standart];
  if (!t) return frag;
  const dims = Array.isArray(frag.standart_olchamlar) ? frag.standart_olchamlar : ['w', 'd', 'h'];
  const map = frag.standart_map || {};
  for (const k of dims) {
    if (!t[k]) continue;
    const m = map[k] || { o: k, ofset: 0 };
    /* bo'sh qiymat — chegara yo'q (TZ-14: admin olib tashlasa eski qiymat qolib ketmasin) */
    if (t[k].min != null) frag['min_' + m.o] = t[k].min + m.ofset; else delete frag['min_' + m.o];
    if (t[k].max != null) frag['max_' + m.o] = t[k].max + m.ofset; else delete frag['max_' + m.o];
  }
  adminChegara(frag);
  return frag;
}

/** TZ-37 (2-faza): admin modulga alohida o'lcham chegarasi bergan bo'lsa (fragment.admin_lim, engine/adminQatlam.js) — u sex standartidan ustun */
function adminChegara(frag) {
  if (frag.admin_lim) for (const k of Object.keys(frag.admin_lim)) frag[k] = frag.admin_lim[k];
}
