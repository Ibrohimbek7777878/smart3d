/* verify_xizmat.mjs — TZ-03 (qoida S3): xizmatni usta tanlaydi.
   Teshik burg'ilash (prisadka, moyka kesimi) faqat tanlansa tannarxga kiradi; ish haqi — avtomatik.
   Ishga tushirish: node tests/verify_xizmat.mjs */
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'node:url';
import { cutlist, productionCost } from '../app/js/engine/cutlist.js';
import { nestProject } from '../app/js/engine/nesting.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const J = (p) => JSON.parse(readFileSync(join(ROOT, 'app/data', p), 'utf8'));
const mats = J('materials.json');
let n = 0, fails = 0;
const ok = (name, cond, extra = '') => { n++; if (!cond) { fails++; console.log('FAIL  ' + name + (extra ? '  → ' + extra : '')); } else console.log('ok    ' + name); };

const frags = J('fragments.json').filter(f => (f.holes || []).length).slice(0, 6);
const cls = frags.map((f, i) => Object.assign(cutlist(f, f.w, f.d, f.h, mats, {}), { placementId: 'p' + i }));
cls[0].holes.push({ kind: 'cutout', x: 100, y: 600, w: 500, h: 500, qty: 1 });          // moyka kesimi (narxi yo'q)
const parts = []; cls.forEach(cl => cl.parts.forEach(p => parts.push(Object.assign({}, p, { id: cl.placementId + ':' + p.ref }))));
const nest = nestProject(parts, mats, { mode: 'bssf' });
const off = productionCost(cls, mats, { nestResult: nest });                                   // standart: tanlanmagan
const on = productionCost(cls, mats, { nestResult: nest, xizmatlar: { teshik: true } });
const sum = (p) => p.perModule.reduce((s, m) => s + m.client, 0);

console.log('\n[1] Standart holat — tanlanmagan (S3)');
ok('teshik tannarxga kirmaydi (holeCost 0)', off.holeCost === 0, String(off.holeCost));
ok('narxli teshik qatori yo\'q, faqat "tanlanmagan" ma\'lumot qatori (0 so\'m)',
  !off.lines.some(l => /^hole:/.test(l.code) && l.code !== 'hole:tanlanmagan') && off.lines.some(l => l.code === 'hole:tanlanmagan' && l.amount === 0));
ok('taklif summasi ko\'rsatiladi', off.xizmat_taklif.teshik.tanlangan === false && off.xizmat_taklif.teshik.amount > 0 && off.xizmat_taklif.teshik.qty > 0,
  JSON.stringify(off.xizmat_taklif));
ok('moyka kesimi "narx yo\'q" ro\'yxatiga tushmaydi (tanlanmagan)', !off.missing.some(m => m.code === 'hole:cutout'));
ok('ish haqi avtomatik (egasi qarori)', off.laborCost > 0 && off.lines.some(l => l.group === 'Ish haqi'));

console.log('\n[2] Usta tanlasa');
ok('teshik tannarxga kiradi = standartdagi taklif summasi', on.holeCost === off.xizmat_taklif.teshik.amount && on.holeCost > 0, `${on.holeCost} vs ${off.xizmat_taklif.teshik.amount}`);
ok('tannarx farqi aynan teshik summasi', on.totalCost - off.totalCost === on.holeCost, `${on.totalCost - off.totalCost} vs ${on.holeCost}`);
ok('moyka kesimi narxi yo\'q — "narx yo\'q" ro\'yxatida', on.missing.some(m => m.code === 'hole:cutout'));
ok('modullar bo\'yicha taqsimot jami bilan teng (ikkala holatda)', sum(off) === off.clientTotal && sum(on) === on.clientTotal);
ok('ish haqi ikkala holatda bir xil', on.laborCost === off.laborCost);

console.log('\n' + (fails === 0 ? `=== HAMMASI OK (${n} pass, 0 fail) ===` : `=== ${fails}/${n} XATO ===`));
process.exit(fails ? 1 : 0);
