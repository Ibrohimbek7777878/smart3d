/* TZ-18: lug'atlar to'liqligi.
 *   1) koddagi har t('kalit') — uz.json da bor (yo'q bo'lsa ekranda kalitning o'zi chiqadi);
 *   2) uz.json da bo'sh qiymat va ishlatilmagan kalit yo'q;
 *   3) {o'zgaruvchi} lar uchala tilda bir xil;
 *   4) ru.json / en.json — qamrov foizi; --qatiy bilan: 100% bo'lishi shart (tarjima tugagach run-all shu rejimda);
 *   5) har xato kodi (app/js/xatolar.js — server va brauzer) ru/en da bor: ekran xatoni tanlangan tilda ko'rsatadi (7-bosqich).
 *   6) ko'plik shakli (i18n/kopl.js): "kalit.one" / "kalit.few" / "kalit.many" — faqat ru/en da, asosiy kalit uz da bo'lsa (uz shakli o'zgarmaydi);
 *      o'zgaruvchilari asosiy kalitnikidek; "1 items have…" / "у 1 позиций…" kabi xatolar tutiladi.
 * Ishlatish: node tests/verify_til.mjs [--qatiy] */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XATOLAR } from '../app/js/xatolar.js';
import { koplikKalit } from '../web/src/i18n/kopl.js';

const SRC = fileURLToPath(new URL('../web/src/', import.meta.url));
const QATIY = process.argv.includes('--qatiy');
const lug = (n) => JSON.parse(readFileSync(join(SRC, 'i18n', n + '.json'), 'utf8'));
const uz = lug('uz'), ru = lug('ru'), en = lug('en');
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };

/* koddagi kalitlar: t('a.b'), t("a.b"); dinamik qismlar (t('mebel.kat_' + x)) — prefiks bo'yicha */
const used = new Set(), prefixes = new Set();
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) { if (n !== 'i18n') walk(p); continue; }
    if (!/\.(js|jsx)$/.test(n)) continue;
    const s = readFileSync(p, 'utf8');
    for (const m of s.matchAll(/(?<![\w.$])t\((['"])([\w.]+)\1\s*([,)])/g)) used.add(m[2]);
    for (const m of s.matchAll(/(?<![\w.$])t\((['"])([\w.]+)\1\s*\+/g)) prefixes.add(m[2]);
    for (const m of s.matchAll(/(['"])((?:ai|qadam|xona|sozlama|onb|mebel)\.[a-z]\w*[a-z0-9])\1/g)) used.add(m[2]);   // ro'yxatlardagi kalitlar
  }
})(SRC);
const missing = [...used].filter(k => !(k in uz) && !k.startsWith('xato.'));
ok('koddagi ' + used.size + ' ta kalit uz.json da bor', !missing.length, missing.slice(0, 10).join(', '));
const empty = Object.entries(uz).filter(([, v]) => v === '' || v == null).map(([k]) => k);
ok('uz.json da bo\'sh qiymat yo\'q', !empty.length, empty.join(', '));
/* d3.* — dvigatel nomlari, tr() orqali (o'zbekcha qiymat bo'yicha) ishlatiladi */
const unused = Object.keys(uz).filter(k => !used.has(k) && !k.startsWith('d3.') && ![...prefixes].some(p => k.startsWith(p)));
ok('uz.json da ishlatilmagan kalit yo\'q', !unused.length, unused.slice(0, 15).join(', '));
const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
/* ko'plik shakli kalitlari: "narx.x.one" — ru/en da, asosiy "narx.x" uz da bo'lsa ruxsat (6-band) */
const PL = /\.(zero|one|two|few|many)$/, asos = (k) => k.replace(PL, '');
for (const [nom, L] of [['ru', ru], ['en', en]]) {
  const bad = Object.keys(L).filter(k => k in uz && vars(L[k]) !== vars(uz[k]));
  ok(nom + ': {o\'zgaruvchi}lar uz bilan bir xil', !bad.length, bad.slice(0, 10).join(', '));
  const extra = Object.keys(L).filter(k => !(k in uz) && !k.startsWith('xato.') && !(PL.test(k) && asos(k) in uz));
  ok(nom + ': uz da yo\'q kalit yo\'q', !extra.length, extra.slice(0, 10).join(', '));
  const done = Object.keys(uz).filter(k => L[k]).length, total = Object.keys(uz).length;
  const pct = Math.round(done / total * 1000) / 10;
  console.log(`  · ${nom}: ${done}/${total} (${pct}%)`);
  if (QATIY) ok(nom + ': to\'liq tarjima', done === total, (total - done) + ' ta yo\'q');
}
for (const [nom, L] of [['ru', ru], ['en', en]]) {
  const yoq = Object.keys(XATOLAR).filter(k => !L['xato.' + k]);
  ok(nom + ': ' + Object.keys(XATOLAR).length + ' ta xato kodi tarjimada', !yoq.length, yoq.slice(0, 10).join(', '));
}

/* 6) ko'plik: shakl kalitlari + haqiqiy tanlash (t() dagi mantiq: koplikKalit → bo'lmasa asosiy kalit) */
{
  const tx = (L, kod, key, n) => { const k = koplikKalit(L, kod, key, n); return String(L[k] != null && L[k] !== '' ? L[k] : uz[key]).replace(/\{\w+\}/g, String(n)); };
  for (const [nom, L] of [['ru', ru], ['en', en]]) {
    const pk = Object.keys(L).filter(k => PL.test(k) && asos(k) in uz);
    const bad = pk.filter(k => vars(L[k]) !== vars(uz[asos(k)]));
    ok(nom + ': ' + pk.length + ' ta ko\'plik shakli, o\'zgaruvchilari asosiy kalitnikidek', !bad.length, bad.join(', '));
  }
  ok('uz: ko\'plik shakli kaliti yo\'q (uz o\'zgarmaydi)', !Object.keys(uz).some(k => PL.test(k)));
  /* "narxsiz" xabarlari: en — 1 item has / 2 items have; ru — 1, 21 → "позиции"; 2–4, 5, 11, 22 → "позиций" */
  const ENK = ['narx.aniqlik_narxsiz', 'narx.aniq_narxsiz', 'furnitura.narxsiz', 'chizish.narxsiz', 'zapchast.narxsiz', 'fayllar.zapchast_narxsiz', 'narx.zapchast_narxi_yoq'];
  ok('en: 1 → "item has", 0/2/5 → "items have" (' + ENK.length + ' kalit)', ENK.every(k => / item has /.test(tx(en, 'en', k, 1)) && !/ items /.test(tx(en, 'en', k, 1))
    && [0, 2, 5, 11, 21].every(n => / items have /.test(tx(en, 'en', k, n)) && !/ item has /.test(tx(en, 'en', k, n)))));
  const RUK = ['narx.aniqlik_narxsiz', 'narx.aniq_narxsiz', 'furnitura.narxsiz', 'chizish.narxsiz'];
  ok('ru: 1, 21, 101 → "позиции"; 0, 2–5, 11–14, 22 → "позиций" (' + RUK.length + ' kalit)', RUK.every(k => [1, 21, 101].every(n => /позиции /.test(tx(ru, 'ru', k, n)) && !/позиций/.test(tx(ru, 'ru', k, n)))
    && [0, 2, 3, 4, 5, 11, 12, 14, 22, 100].every(n => /позиций/.test(tx(ru, 'ru', k, n)) && !/позиции /.test(tx(ru, 'ru', k, n)))));
  ok('uz: shakl o\'zgarmaydi (1 va 5 bir xil qolip)', ENK.every(k => tx(uz, 'uz', k, 1).replace(/1/g, 'N') === tx(uz, 'uz', k, 5).replace(/5/g, 'N')));
}

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
