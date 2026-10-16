/* Smart3D engine/post/xml.js — TZ-11: stanok fayllari uchun umumiy yordamchilar (atributlar, XML belgilari, kodirovka).
 * Fayllar mashina yaratgan (Bazis, GibLab, KDT) — tuzilishi bir xil, shuning uchun to'liq XML-parser o'rniga atribut regex. */

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
/** XML belgilarini ochish (&lt; &#x2F; &#39; …) */
export function xmlOch(s) {
  return String(s == null ? '' : s).replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (m, e) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e]);
}
/** atribut qiymati uchun (Bazis uslubi: & < > " va / — &#x2F;) */
export function xmlYop(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\//g, '&#x2F;');
}
/** matn (teg ichida) uchun */
export const xmlMatn = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** teg atributlari → obyekt (Bazis'da "elb =" kabi bo'sh joy ham uchraydi) */
export function atributlar(s) {
  const o = {};
  for (const m of String(s || '').matchAll(/([\w.:-]+)\s*=\s*"([^"]*)"/g)) o[m[1]] = xmlOch(m[2]);
  return o;
}

/** baytlar → matn: avval UTF-8 (GibLab qayta saqlagan fayllar), bo'lmasa windows-1251 (Bazis eksporti) */
export function matnOqi(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(u8); } catch (e) { return new TextDecoder('windows-1251').decode(u8); }
}

/* windows-1251: kirill (А–я) 0xC0–0xFF, Ё/ё, № va asosiy tinish belgilari; ASCII — o'zi; qolgani — '?' */
const CP = { 0x401: 0xa8, 0x451: 0xb8, 0x2116: 0xb9, 0x2014: 0x97, 0x2013: 0x96, 0xab: 0xab, 0xbb: 0xbb, 0x201c: 0x93, 0x201d: 0x94, 0x2018: 0x91, 0x2019: 0x92,
  0x2026: 0x85, 0xa0: 0xa0, 0xb0: 0xb0, 0xd7: 0xd7, 0x40e: 0xa1, 0x45e: 0xa2, 0x404: 0xaa, 0x454: 0xba, 0x406: 0xb2, 0x456: 0xb3, 0x407: 0xaf, 0x457: 0xbf };
/** matn → windows-1251 baytlari (Bazis .project kodirovkasi) */
export function cp1251(s) {
  const str = String(s), out = new Uint8Array(str.length);
  let n = 0;
  for (const ch of str) {
    const c = ch.codePointAt(0);
    out[n++] = c < 0x80 ? c : c >= 0x410 && c <= 0x44f ? c - 0x350 : CP[c] != null ? CP[c] : 0x3f;
  }
  return out.slice(0, n);
}

/* KDT nomi — lotin (stanok ekrani): sex fayllaridagi qoida (Дверь → Dver, ящика → jaschika, конструкция → konstrukcija) */
const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'ju', я: 'ja' };
export function lotin(s) {
  return Array.from(String(s || '')).map(ch => {
    const lo = ch.toLowerCase(), t = TR[lo];
    if (t == null) return ch.charCodeAt(0) < 128 ? ch : '';
    return ch !== lo && t ? t[0].toUpperCase() + t.slice(1) : t;
  }).join('');
}

/** son — Bazis yozuvidagidek (butun bo'lsa butun, aks holda 4 xonagacha) */
export const son = (v) => { const r = Math.round(+v * 10000) / 10000; return Number.isInteger(r) ? String(r) : String(r); };
/** son — 2 xona (KDT, XNC dasturi o'lchami) */
export const son2 = (v) => (Math.round(+v * 100) / 100).toFixed(2);
