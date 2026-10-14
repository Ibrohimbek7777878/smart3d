/* A1/A2/A3 tekshiruvi — Smart3D (TZ-QOLGAN-ISHLAR §4 darhol).
   Ishga tushurish: node /tmp/opencode/verify_ai.mjs */
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');
const ai = await import(pathToFileURL(APP + '/js/ai.js').href);
const rules = await import(pathToFileURL(APP + '/js/engine/rules.js').href);
const { parseZamer, suggestLayout, aiBuild } = ai;
const { validateDoc, footprint, itemsOverlap } = rules;

const frags = JSON.parse(fs.readFileSync(APP + '/data/fragments.json', 'utf8'));
const catalog = Object.fromEntries(frags.map(f => [f.code, f]));

let n = 0, fails = 0;
const ok = (name, cond, extra = '') => {
  n++;
  if (!cond) { fails++; console.log('FAIL  ' + name + (extra ? '  → ' + extra : '')); }
  else console.log('ok    ' + name);
};
const eq = (name, got, want) =>
  ok(name, JSON.stringify(got) === JSON.stringify(want), 'got=' + JSON.stringify(got) + ' want=' + JSON.stringify(want));

/* ══════════════ A1: parseZamer ══════════════ */
{
  let r = parseZamer('oshxona 3.5 ga 2.8 metr');
  eq('A1 3.5 ga 2.8 → 3500×2800', [r.room.w, r.room.d], [3500, 2800]);

  r = parseZamer('oshxona 3х4 metr');           // kirill x
  eq('A1 kirill 3х4 → 3000×4000', [r.room.w, r.room.d], [3000, 4000]);

  r = parseZamer('oshxona 3 yarim x 2 metr');
  eq('A1 "3 yarim" → 3500×2000', [r.room.w, r.room.d], [3500, 2000]);

  r = parseZamer('угловая кухня 3x4 metr');
  eq('A1 "угловая" → L', r.room.layoutType, 'L');

  r = parseZamer('u shakl burchakka moyka 3x4 metr');
  eq('A1 "U shakl + burchak" → U', r.room.layoutType, 'U');
  {
    const pl = suggestLayout(r.room, catalog, r.orders);
    const wing = pl.filter(p => p.rot === 90 && Math.abs(footprint(p).x1 - (r.room.w - 50)) < 1);
    ok('A1 U shakl haqiqatan U quradi (o\'ng qanot rot90, devorga yopishqoq)', wing.length >= 1,
       'total=' + pl.length + ' wing=' + wing.length);
  }

  r = parseZamer('eshik 90 sm');
  eq('A1 "eshik 90 sm" → 900 mm (90 000 emas)', r.room.openings.map(o => o.width), [900]);

  r = parseZamer('deraza 1.5 metr, eshik 800');
  eq('A1 deraza 1.5 m → 1500, eshik 800 → 800', r.room.openings.map(o => o.width), [1500, 800]);

  r = parseZamer('eshik 90');
  eq('A1 yechimsiz "eshik 90" → 900 mm', r.room.openings.map(o => o.width), [900]);

  r = parseZamer('shkaf h 2400');
  ok('A1 "shkaf h 2400" xona balandligi EMAS (2700 qoladi)', r.room.h === 2700, 'h=' + r.room.h);
  ok('A1 "shkaf h 2400" unknown ga tushadi', r.unknown.length >= 1, JSON.stringify(r.unknown));

  r = parseZamer('xona balandligi 2500');
  eq('A1 "balandligi 2500" → room.h 2500', r.room.h, 2500);

  r = parseZamer('4 tadan osma shkaf, 3 ta pastki tumba');
  ok('A1 miqdorlar: ustki 4 + pastki 3',
     JSON.stringify(r.orders.map(o => o.kind + ':' + o.qty).sort()) === JSON.stringify(['pastki:3', 'ustki:4']),
     JSON.stringify(r.orders));

  const res = await aiBuild('noma\'lum matn', catalog);
  ok('A1 o\'lchamsiz matn → assumed=true (✅ emas)', res.assumed === true && res.doc.room.outline[1][0] === 3600);
}

/* ══════════════ A2: L/U layout — ustma-ust tushmaslik ══════════════ */
function checkLayout(name, room) {
  const pl = suggestLayout(room, catalog, []);
  let bad = [];
  for (let i = 0; i < pl.length; i++)
    for (let j = i + 1; j < pl.length; j++)
      if (itemsOverlap(pl[i], pl[j])) bad.push(pl[i].id + '↔' + pl[j].id);
  ok(name + ': 0 to\'qnashuv', bad.length === 0, bad.slice(0, 5).join(', ') + ' (jami ' + pl.length + ' modul)');

  const W = room.w, D = room.d;
  const out = pl.filter(p => {
    const f = footprint(p);
    return f.x0 < -1 || f.y0 < -1 || f.x1 > W + 1 || f.y1 > D + 1;
  });
  ok(name + ': hammasi xona ichida', out.length === 0,
     out.map(p => p.id + ' ' + JSON.stringify(footprint(p))).join(' | '));
  return pl;
}

{
  const pl = checkLayout('A2 L', { w: 3600, d: 2800, layoutType: 'L', features: { stove: true, fridge: true } });

  /* chap devor pastki shkaflar: D=2800, fridge bilan cheklangan → aynan 2 ta */
  const leftBase = pl.filter(p => p.rot === 270 && p.z === 0 && p.frg !== 'SP-K-015');
  eq('A2 L: chap devorda aynan 2 ta pastki shkaf', leftBase.length, 2);
  /* eski kodda anchor min-burchak sifatida olingan → footprint y0=0 bo'lib
     burchak moduli bilan ustma-ust tushgan edi */
  ok('A2 L: chap devor moduli burchakdan keyin boshlanadi (y0 >= 600)',
     leftBase.every(p => footprint(p).y0 >= 600),
     JSON.stringify(leftBase.map(p => footprint(p).y0)));

  const fridge = pl.find(p => p.frg === 'SP-K-015');
  ok('A2 L: xolodilnik chap devor tepasida (y1 = D-50)',
     fridge && Math.abs(footprint(fridge).y1 - 2750) < 1,
     fridge ? JSON.stringify(footprint(fridge)) : 'yo\'q');

  /* rot270 chap devor moduli haqiqatan devorga yopishqoq (x0 = 50) */
  ok('A2 L: chap devor moduli x0 = 50 mm', leftBase.every(p => Math.abs(footprint(p).x0 - 50) < 1),
     JSON.stringify(leftBase.map(p => footprint(p).x0)));
}

{
  const pl = checkLayout('A2 U', { w: 4200, d: 3000, layoutType: 'U', features: {} });
  eq('A2 U: 11 modul (2 burchak + 3 o\'rta + 3+3 qanot) — hech biri rad etilmagan', pl.length, 11);

  const rightWing = pl.filter(p => p.rot === 90 && Math.abs(footprint(p).x1 - 4150) < 1);
  eq('A2 U: o\'ng qanot 3 ta, devorga yopishqoq', rightWing.length, 3);

  const rightCorner = pl.find(p => p.rot === 0 && Math.abs(footprint(p).x1 - 4150) < 1 && Math.abs(footprint(p).y0 - 50) < 1);
  ok('A2 U: o\'ng burchak rot0, burchakda turibdi', !!rightCorner,
     rightCorner ? JSON.stringify(footprint(rightCorner)) : 'yo\'q');

  const leftWing = pl.filter(p => p.rot === 270 && Math.abs(footprint(p).x0 - 50) < 1);
  eq('A2 U: chap qanot 3 ta, devorga yopishqoq', leftWing.length, 3);
}

/* ══════════════ A3: validateDoc — balandlik + aylanish ══════════════ */
const outline = [[0, 0], [4000, 0], [4000, 3000], [0, 3000]];
const base = { id: 'p1', frg: 'SP-K-001', x: 500, y: 500, z: 0, w: 600, d: 550, h: 720, rot: 0 };
const upper = { id: 'p2', frg: 'SP-K-002', x: 500, y: 500, z: 1450, w: 600, d: 350, h: 700, rot: 0 };

{
  const v = validateDoc({ room: { outline, openings: [] }, placements: [base, upper] });
  ok('A3: ustki + pastki (bir joyda, boshqa balandlik) → W_OVERLAP YO\'Q',
     !v.warnings.some(w => w.code === 'W_OVERLAP'),
     JSON.stringify(v.warnings));

  const v2 = validateDoc({ room: { outline, openings: [] }, placements: [base, { ...base, id: 'p3', x: 700 }] });
  ok('A3: haqiqiy ustma-ust pastki shkaflar → W_OVERLAP BOR',
     v2.warnings.some(w => w.code === 'W_OVERLAP'));

  const rotPair = [
    { id: 'r1', frg: 'A', x: 1000, y: 1000, z: 0, w: 600, d: 550, h: 720, rot: 270 },  // x∈[1000,1550] y∈[400,1000]
    { id: 'r2', frg: 'B', x: 1000, y: 400, z: 0, w: 600, d: 550, h: 720, rot: 0 }       // x∈[1000,1600] y∈[400,950]
  ];
  const v3 = validateDoc({ room: { outline, openings: [] }, placements: rotPair });
  ok('A3: rot270 bilan ustma-ust (eski kod topa olmagan) → W_OVERLAP BOR',
     v3.warnings.some(w => w.code === 'W_OVERLAP'));

  const edge = { id: 'e1', frg: 'C', x: 100, y: 500, z: 0, w: 600, d: 550, h: 720, rot: 90 };  // x∈[-450,100]
  const v4 = validateDoc({ room: { outline, openings: [] }, placements: [edge] });
  ok('A3: rot90 chapdan chiqib ketgan → W_OUT_OF_ROOM (eski kod topa olmagan)',
     v4.warnings.some(w => w.code === 'W_OUT_OF_ROOM'),
     JSON.stringify(v4.warnings));

  const okIn = { id: 'i1', frg: 'D', x: 50, y: 50, z: 0, w: 600, d: 550, h: 720, rot: 90 };   // x∈[-500,50] xato emas → [50-550, 50]
  const v5 = validateDoc({ room: { outline, openings: [] }, placements: [{ ...okIn, x: 600 }] });
  ok('A3: ichidagi rot90 → W_OUT_OF_ROOM YO\'Q',
     !v5.warnings.some(w => w.code === 'W_OUT_OF_ROOM'), JSON.stringify(v5.warnings));
}

/* footprint aniqligi (0/90/180/270) */
{
  const f = footprint({ x: 1000, y: 1000, w: 600, d: 550, rot: 270 });
  eq('footprint rot270 → x[1000,1550] y[400,1000]', [f.x0, f.y0, f.x1, f.y1], [1000, 400, 1550, 1000]);
  const g = footprint({ x: 1000, y: 1000, w: 600, d: 550, rot: 90 });
  eq('footprint rot90 → x[450,1000] y[1000,1600]', [g.x0, g.y0, g.x1, g.y1], [450, 1000, 1000, 1600]);
  const h = footprint({ x: 1000, y: 1000, w: 600, d: 550, rot: 180 });
  eq('footprint rot180 → x[400,1000] y[450,1000]', [h.x0, h.y0, h.x1, h.y1], [400, 450, 1000, 1000]);
}

console.log('\n' + (fails === 0 ? `=== HAMMASI OK (${n} ta tekshiruv) ===` : `=== ${fails}/${n} XATO ===`));
process.exit(fails ? 1 : 0);
