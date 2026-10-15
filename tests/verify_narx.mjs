/* verify_narx.mjs — TZ-04: "taxminiy" belgisi, narx jadvali va import.
   Ishga tushirish: node tests/verify_narx.mjs */
import { readFileSync, mkdtempSync, rmSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'node:url';
import { cutlist, productionCost } from '../app/js/engine/cutlist.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const J = (p) => JSON.parse(readFileSync(join(ROOT, 'app/data', p), 'utf8'));
const mats = J('materials.json');
let n = 0, fails = 0;
const ok = (name, cond, extra = '') => { n++; if (!cond) { fails++; console.log('FAIL  ' + name + (extra ? '  → ' + extra : '')); } else console.log('ok    ' + name); };

/* ══ [1] taxminiy belgisi ══ */
console.log('\n[1] Taxminiy belgisi');
const frag = J('fragments.json').find(f => (f.holes || []).length && (f.parts || []).length > 3);
const cl = cutlist(frag, frag.w, frag.d, frag.h, mats, {});
const XZ = { xizmatlar: { teshik: true } };   // TZ-03: prisadka tanlangan holatda tekshiriladi
const p0 = productionCost([cl], mats, XZ);
const tx = (p) => p.lines.filter(l => l.taxminiy).map(l => l.group);
ok(`tasdiqlanmagan manba → taxminiy: ${p0.taxminiy.join(', ')}`,
  ['Kromka', 'Prisadka', 'Ish haqi'].every(g => p0.taxminiy.includes(g)), JSON.stringify(p0.taxminiy));
ok('qator nomida "— taxminiy"', p0.lines.filter(l => l.taxminiy).every(l => / — taxminiy$/.test(l.name)) && tx(p0).length > 0);
const m2 = JSON.parse(JSON.stringify(mats));
m2.edge_materials.forEach(e => { e.price_src = 'egasi, test'; });
m2.hole_kinds.forEach(h => { h.price_src = 'egasi, test'; });
m2.labor.price_src = 'egasi, test';
const p1 = productionCost([cl], m2, XZ);
/* eslatma: kroysiz hisobda plita qatori o'zi "(~N varaq, taxminiy)" — bu boshqa belgi, bu yerda tekshirilmaydi */
ok('egasi tasdiqlagach — taxminiy yo\'q, nomda belgi yo\'q', p1.taxminiy.length === 0 && !p1.lines.some(l => l.taxminiy || / — taxminiy$/.test(l.name)));
ok('belgi summaga ta\'sir qilmaydi', p0.totalCost === p1.totalCost && p0.clientTotal === p1.clientTotal, `${p0.totalCost} vs ${p1.totalCost}`);
const m3 = JSON.parse(JSON.stringify(mats)); m3.hole_kinds.forEach(h => { h.price = 0; });
ok('narxi yo\'q teshik — "taxminiy" emas, "narx yo\'q"', !productionCost([cl], m3, XZ).taxminiy.includes('Prisadka'));

/* ══ [2] jadval va import (Python) ══ */
console.log('\n[2] Narx jadvali va import');
const dir = mkdtempSync(join(tmpdir(), 'smart3d-narx-'));
try {
  const xl = join(dir, 'jadval.xlsx');
  const g = spawnSync('python3', ['-B', join(ROOT, 'scripts/narx_jadval.py'), xl], { encoding: 'utf8' });
  ok('jadval yaratildi', g.status === 0, (g.stderr || '').slice(-300));
  const cnt = g.status === 0 ? JSON.parse(g.stdout.trim().split('\n').pop()) : {};
  const links = J('id-links.json').links;
  const want = {
    zapchast: links.filter(l => l.tur === 'furnitura' && l.holat === 'yoq').length,
    taklif: links.filter(l => l.holat === 'taklif').length,
    narxsiz_plita: J('sheet-catalog.json').sheets.filter(s => !s.uzs).length,
    narxsiz_furnitura: J('furnitura-catalog.json').items.filter(i => i.no_price || !i.uzs).length
  };
  ok(`varaqlardagi sonlar ma'lumot bilan bir xil (${JSON.stringify(want)})`, Object.keys(want).every(k => cnt[k] === want[k]), JSON.stringify(cnt));
  /* to'ldirilmagan jadval → hech narsa o'zgarmasligi shart */
  const files = ['materials.json', 'id-links.json', 'furnitura-catalog.json', 'sheet-catalog.json', 'materials-index.json'];
  const mt = () => files.map(f => statSync(join(ROOT, 'app/data', f)).mtimeMs).join(',');
  const before = mt();
  const d = spawnSync('python3', ['-B', join(ROOT, 'scripts/narx_import.py'), xl], { encoding: 'utf8' });
  ok('bo\'sh jadval → 0 o\'zgarish, fayllar yozilmadi', d.status === 0 && /0 ta o'zgarish/.test(d.stdout) && mt() === before, d.stdout.slice(0, 200));
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log('\n' + (fails === 0 ? `=== HAMMASI OK (${n} pass, 0 fail) ===` : `=== ${fails}/${n} XATO ===`));
process.exit(fails ? 1 : 0);
