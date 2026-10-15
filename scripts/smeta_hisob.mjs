/* smeta_hisob.mjs — sinov oshxonasi smetasi (TZ-04: narx importidan oldin/keyin solishtirish).
   verify_mc.mjs [5] dagi 3 m oshxona bilan bir xil. Natija: JSON (tannarx, mijoz, narxsiz, taxminiy).
   Ishlatish: node scripts/smeta_hisob.mjs */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'node:url';
import { cutlist, productionCost } from '../app/js/engine/cutlist.js';
import { nestProject } from '../app/js/engine/nesting.js';
import { deriveKitchen } from '../app/js/engine/kitchen.js';
import { applySexStandart } from '../app/js/engine/standart.js';

const J = (p) => JSON.parse(readFileSync(fileURLToPath(new URL('../app/data/' + p, import.meta.url)), 'utf8'));
const mats = J('materials.json'), std = J('sex-standartlari.json');
const furnById = Object.fromEntries(J('furnitura-catalog.json').items.filter(i => i.id).map(i => [i.id, i]));
const catalog = Object.fromEntries([...J('fragments.json'), ...J('fragments-mc.json').fragments].map(f => [f.code, f]));
for (const f of Object.values(catalog)) applySexStandart(f, std);
const SLOTS = { korpus: 'LDSP16', polka: 'LDSP16', fasad: 'LDSP16' };

const lower = [['MC-KP-08', 600], ['MC-KP-11', 400], ['MC-KP-02', 600], ['MC-KP-04', 450]];
const upper = [['MC-KU-04', 600], ['MC-KU-07', 600], ['MC-KU-03', 300]];
let x = 50;
const placements = lower.map(([c, w], i) => { const p = { id: 'p' + i, frg: c, x, y: 50, z: 0, w, d: catalog[c].d, h: catalog[c].h, rot: 0 }; x += w; return p; });
x = 50;
upper.forEach(([c, w], i) => { placements.push({ id: 'u' + i, frg: c, x, y: 50, z: 1450, w, d: catalog[c].d, h: catalog[c].h, rot: 0 }); x += w; });
const doc = { room: { outline: [[0, 0], [3000, 0], [3000, 2500], [0, 2500]], wall_height: 2700, openings: [] },
  placements, kitchen: { stoleshnitsa: true, sokol: true, dobor: false, karniz: false, moyka: { on: false } } };
const all = placements.concat(deriveKitchen(doc, catalog));
const cls = all.map(p => Object.assign(cutlist(catalog[p.frg], p.w, p.d, p.h, mats, { projectSlots: SLOTS }), { placementId: p.id }));
const parts = [];
cls.forEach(cl => cl.parts.forEach(pp => parts.push(Object.assign({}, pp, { id: cl.placementId + ':' + pp.ref }))));
const nest = nestProject(parts, mats, { mode: 'bssf', kerf: 4, trimL: 10, trimW: 10 });
const prod = productionCost(cls, mats, { nestResult: nest, furnituraById: furnById });
console.log(JSON.stringify({ tannarx: prod.totalCost, mijoz: prod.clientTotal, narxsiz: prod.missing.length, taxminiy: prod.taxminiy }));
