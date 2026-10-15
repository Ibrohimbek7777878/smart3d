/* TZ-09: yangi frontend hisob ko'prigi (web/src/app/bridge/hisob.js) — Node'da ishlaydi, natija to'g'ri va barqaror.
 * Eski sayt bilan AYNAN tengligi alohida brauzer testida: tests/ui/hisob_teng.sh */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');          // brauzerda price.js o'zi self.SpPrice ga yozadi
const { loadData, createHisob, baseForSheet } = await import('../web/src/app/bridge/hisob.js');

const DATA = fileURLToPath(new URL('../app/data/', import.meta.url));
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };

const H = createHisob(await loadData(n => Promise.resolve(JSON.parse(readFileSync(DATA + n, 'utf8')))));
ok('katalog: 121 modul (83 + 38; dizayndagi "121 ta modul")', Object.keys(H.catalog).length === 121, Object.keys(H.catalog).length);
ok('ERP furnitura ID bo\'yicha', Object.keys(H.furnById).length > 1000, Object.keys(H.furnById).length);
ok('material qidiruv indeksi', !!H.searchIndex);

const lower = [['MC-KP-08', 800], ['MC-KP-11', 600], ['MC-KP-02', 600], ['MC-KP-04', 1000]];
let x = 50;
const placements = lower.map(([c, w], i) => { const f = H.catalog[c]; const p = { id: 'p' + (i + 1), frg: c, x, y: 50, z: 0, w, d: f.d, h: f.h, rot: 0, qty: 1 }; x += w; return p; });
placements.forEach((p, i) => { p.x = 50 + lower.slice(0, i).reduce((a, [, w]) => a + w, 0); });
const doc = { v: 1, room: { outline: [[0, 0], [3600, 0], [3600, 3000], [0, 3000]], wall_height: 2700, wall_thickness: 100, openings: [] },
  placements, kitchen: { stoleshnitsa: true, sokol: true, dobor: false, karniz: false, moyka: { on: false } } };
const opt = { materialCode: 'LDSP18', fasadCode: 'MDF16' };

const r = H.recalc(doc, opt);
ok('hisob: jami > 0', r.priceRes.total > 0, r.priceRes.total);
ok('hisob: kotirovka satrlari yig\'indisi = jami', r.priceRes.lines.reduce((a, l) => a + l.amount, 0) === r.priceRes.total,
   r.priceRes.lines.reduce((a, l) => a + l.amount, 0) + ' ≠ ' + r.priceRes.total);
ok('oshxona elementlari qo\'shildi (stoleshnitsa, sokol)', r.placements.length > placements.length, r.placements.length);
ok('validatsiya xatosiz', r.val.errors.length === 0, JSON.stringify(r.val.errors.slice(0, 2)));
ok('raskroy bor', r.nest && Object.keys(r.nest.by_material || {}).length > 0);
const strip = (o) => JSON.stringify(o, (k, v) => (k === 'created_at' ? undefined : v));
const r2 = H.recalc(doc, opt);
ok('barqaror: ikki marta hisob — bir xil', strip(r) === strip(r2));
const withX = H.recalc(Object.assign({}, doc, { xizmatlar: { teshik: true } }), opt);
ok('prisadka tanlansa tannarx oshadi (S3)', withX.prod.totalCost > r.prod.totalCost, withX.prod.totalCost + ' vs ' + r.prod.totalCost);
ok('ERP plita → hisob bazasi', baseForSheet({ type: 'LDSP', th: 16 }) === 'LDSP16' && baseForSheet({ type: 'HDF', th: 2.5 }) === 'HDF3');

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
