/* TZ-18: lug'atlar to'liqligi.
 *   1) koddagi har t('kalit') — uz.json da bor (yo'q bo'lsa ekranda kalitning o'zi chiqadi);
 *   2) uz.json da bo'sh qiymat va ishlatilmagan kalit yo'q;
 *   3) {o'zgaruvchi} lar uchala tilda bir xil;
 *   4) ru.json / en.json — qamrov foizi; --qatiy bilan: 100% bo'lishi shart (tarjima tugagach run-all shu rejimda).
 * Ishlatish: node tests/verify_til.mjs [--qatiy] */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const unused = Object.keys(uz).filter(k => !used.has(k) && ![...prefixes].some(p => k.startsWith(p)));
ok('uz.json da ishlatilmagan kalit yo\'q', !unused.length, unused.slice(0, 15).join(', '));
const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
for (const [nom, L] of [['ru', ru], ['en', en]]) {
  const bad = Object.keys(L).filter(k => k in uz && vars(L[k]) !== vars(uz[k]));
  ok(nom + ': {o\'zgaruvchi}lar uz bilan bir xil', !bad.length, bad.slice(0, 10).join(', '));
  const extra = Object.keys(L).filter(k => !(k in uz) && !k.startsWith('xato.'));
  ok(nom + ': uz da yo\'q kalit yo\'q', !extra.length, extra.slice(0, 10).join(', '));
  const done = Object.keys(uz).filter(k => L[k]).length, total = Object.keys(uz).length;
  const pct = Math.round(done / total * 1000) / 10;
  console.log(`  · ${nom}: ${done}/${total} (${pct}%)`);
  if (QATIY) ok(nom + ': to\'liq tarjima', done === total, (total - done) + ' ta yo\'q');
}

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
