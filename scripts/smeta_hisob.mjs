/* smeta_hisob.mjs — sinov oshxonasi smetasi (TZ-04: narx importidan oldin/keyin solishtirish).
   verify_mc.mjs [5] dagi 3 m oshxona bilan bir xil. Natija: JSON (tannarx, mijoz, narxsiz, taxminiy).
   Ishlatish: node scripts/smeta_hisob.mjs */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHisob, loadData } from '../web/src/services/hisob.js';

/* Web bilan BIR XIL yo'l: web/src/services/hisob.js createHisob().recalc (placementSlots, deriveKitchen, stoleshnitsa standartlari).
   Eskirgan nusxa (cutlist() ni to'g'ridan chaqirish) stoleshnitsani LDSP listidan narxlar edi. */
const data = await loadData((n) => readFile(fileURLToPath(new URL('../app/data/' + n, import.meta.url)), 'utf8').then(JSON.parse));
const H = createHisob(data);
const catalog = H.catalog;

const lower = [['MC-KP-08', 600], ['MC-KP-11', 400], ['MC-KP-02', 600], ['MC-KP-04', 450]];
const upper = [['MC-KU-04', 600], ['MC-KU-07', 600], ['MC-KU-03', 300]];
let x = 50;
const placements = lower.map(([c, w], i) => { const p = { id: 'p' + i, frg: c, x, y: 50, z: 0, w, d: catalog[c].d, h: catalog[c].h, rot: 0 }; x += w; return p; });
x = 50;
upper.forEach(([c, w], i) => { placements.push({ id: 'u' + i, frg: c, x, y: 50, z: 1450, w, d: catalog[c].d, h: catalog[c].h, rot: 0 }); x += w; });
const doc = { room: { outline: [[0, 0], [3000, 0], [3000, 2500], [0, 2500]], wall_height: 2700, openings: [] },
  placements, kitchen: { stoleshnitsa: true, sokol: true, dobor: false, karniz: false, moyka: { on: false } } };
const r = H.recalc(doc, { materialCode: 'LDSP16', fasadCode: 'LDSP16' });
const prod = r.prod;
export const natija = { tannarx: prod.totalCost, mijoz: prod.clientTotal, narxsiz: prod.missing.length, taxminiy: prod.taxminiy, aniqlik: prod.aniqlik.pct, narxsizlar: prod.missing.map(m => m.code) };
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(JSON.stringify(natija));
