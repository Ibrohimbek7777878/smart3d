/* F2 — Oshxona elementlari: detectRuns / splitSegments / deriveKitchen / moykaHole
   + SP-ST-001 cutlist (moyka cutout) + productionCost + nesting. */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'node:url';
import { detectRuns, splitSegments, deriveKitchen, moykaHole, SHEET_MAX } from '../app/js/engine/kitchen.js';
import { cutlist, productionCost } from '../app/js/engine/cutlist.js';
import { nestProject } from '../app/js/engine/nesting.js';
import { cutGCode, nestDXF, drillNC } from '../app/js/engine/cnc.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => {
  if (cond) { pass++; console.log('ok    ' + msg); }
  else { fail++; console.log('FAIL  ' + msg); }
};

const catalog = Object.fromEntries(
  JSON.parse(readFileSync(fileURLToPath(new URL('../app/data/fragments.json', import.meta.url)), 'utf8'))
    .map(f => [f.code, f]));
const mats = JSON.parse(readFileSync(fileURLToPath(new URL('../app/data/materials.json', import.meta.url)), 'utf8'));

const RECT = [[0, 0], [5000, 0], [5000, 3500], [0, 3500]];
const base = (id, x, y, rot = 0, w = 600, d = 550) =>
  ({ id, frg: 'SP-K-001', name: 'pastki', x, y, z: 0, w, d, h: 720, rot, qty: 1 });
const upper = (id, x, y, rot = 0, w = 600, d = 350) =>
  ({ id, frg: 'SP-K-002', name: 'ustki', x, y, z: 1450, w, d, h: 720, rot, qty: 1 });
const doc = (placements, kitchen) => ({
  room: { outline: RECT, wall_height: 2700, wall_thickness: 100, openings: [] },
  placements, kitchen
});
const K = { stoleshnitsa: true, sokol: true, dobor: true, doborH: 60, karniz: true, karnizH: 60, moyka: { on: true, offset: 600, fromBack: 100, size: 500 } };

/* ── 1) detectRuns ── */
let runs = detectRuns(doc([base('a', 0, 50), base('b', 600, 50), base('c', 1200, 50)]), catalog, 'kuxnya-pastki');
ok(runs.length === 1, '3 qator pastki → 1 run');
ok(runs[0].x0 === 0 && runs[0].x1 === 1800 && runs[0].axis === 'h', 'run 0..1800 gorizontal');
ok(runs[0].h === 720, 'run h = 720');

runs = detectRuns(doc([base('a', 0, 50), base('b', 700, 50)]), catalog, 'kuxnya-pastki');
ok(runs.length === 2, 'oraliq 100mm (>30) → 2 run');

runs = detectRuns(doc([base('a', 0, 50), base('b', 600, 50), base('c', 600, 600, 90)]), catalog, 'kuxnya-pastki');
ok(runs.filter(r => r.axis === 'h').length === 1 && runs.filter(r => r.axis === 'v').length === 1,
  'L shakl: 1 gorizontal + 1 vertikal run');

/* ── 2) splitSegments ── */
const long = { axis: 'h', x0: 0, x1: 3600, y0: 50, y1: 600, h: 720, members: [] };
let segs = splitSegments(long);
ok(segs.length === 2, '3600mm run → 2 segment (varaq 2800 dan katta)');
ok(segs[0].len <= SHEET_MAX && segs[1].len <= SHEET_MAX, 'har bir segment ≤ SHEET_MAX');
ok(Math.abs(segs[0].len + segs[1].len - 3600) < 1, 'segmentlar yig\'indisi = 3600');
ok(splitSegments({ axis: 'h', x0: 0, x1: 1800, y0: 50, y1: 600, h: 720, members: [] }).length === 1,
  '1800mm → 1 segment');

/* ── 3) deriveKitchen ── */
let d = deriveKitchen(doc([base('a', 0, 50), base('b', 600, 50), upper('u1', 0, 50), upper('u2', 600, 50)], K), catalog);
ok(d.length === 4, 'stol+sokol+dobor + karniz = 4 (1 pastki run, 1 ustki run)');
const st = d.find(p => p.frg === 'SP-ST-001');
ok(st && st.w === 1200 && st.z === 720 && st.h === 26 && st.auto === true, 'stoleshnitsa 1200×550 @z=720');
ok(d.some(p => p.frg === 'SP-ST-002' && p.no3d === true && p.z === 0 && p.h === 100), 'sokol no3d z=0 h=100');
ok(d.some(p => p.frg === 'SP-ST-003' && p.z === 746 && p.h === 60), 'dobor z=738 (720+26) h=60');
const kr = d.find(p => p.frg === 'SP-ST-004');
ok(kr && kr.z === 2170 && kr.h === 60, 'karniz ustki tepasida z=2170');

d = deriveKitchen(doc([base('a', 0, 50)], null), catalog);
ok(d.length === 0, 'doc.kitchen yo\'q → []');
d = deriveKitchen(doc([base('a', 0, 50)], { stoleshnitsa: true, sokol: false, dobor: false, karniz: false }), catalog);
ok(d.length === 1 && d[0].frg === 'SP-ST-001', 'faqat stoleshnitsa → 1');

/* ── 4) moykaHole ── */
const hole = moykaHole(doc([], K));
ok(hole && hole.kind === 'cutout' && hole.x === 100 && hole.y === 600 && hole.w === 500, 'moyka cutout {x:fromBack100,y:offset600} (konvensiya: x=EN, y=UZUNLIK)');
ok(moykaHole(doc([], { moyka: { on: false } })) === null, 'moyka off → null');
ok(moykaHole(doc([], {})) === null, 'kitchen.moyka yo\'q → null');

/* ── 5) SP-ST-001 cutlist + moyka cutout ── */
const fr = catalog['SP-ST-001'];
ok(!!fr, 'SP-ST-001 fragment bazada');
const cl = cutlist(fr, 1200, 550, 18, mats, { projectSlots: {} });
ok(cl.parts.length === 1 && cl.parts[0].code === 'stoleshnitsa', 'cutlist: 1 detal stoleshnitsa');
ok(cl.parts[0].finish_length === 1200 && cl.parts[0].finish_width === 550, 'detal 1200×550 (kromkasiz 1200×550)');
ok(cl.edges.length === 1 && cl.edges[0].meters > 0, '4 tomon kromka (yig\'ilgan)');
cl.holes.push(Object.assign({}, hole));
ok(cl.holes.some(h => h.kind === 'cutout'), 'moyka cutout cl.holes ichida');
/* qoida 4.3: narx o'ylab topilmaydi — ERP xizmat narxi kelguncha cutout 'narx yo'q' */
ok(mats.hole_kinds.some(h => h.code === 'cutout' && !(h.price > 0)), 'materials hole_kinds: cutout bor, manbasiz narx yo\'q');

/* ── 6) nesting + productionCost ── */
const cls = [];
for (const p of deriveKitchen(doc([base('a', 0, 50), base('b', 600, 50), base('c', 1200, 50)], K), catalog)) {
  const f = catalog[p.frg];
  const c = cutlist(f, p.w, p.d, p.h, mats, { projectSlots: {} });
  c.placementId = p.id;
  if (p.frg === 'SP-ST-001') c.holes.push(Object.assign({}, hole));
  cls.push(c);
}
ok(cls.length === 3, '1 run → stol+sokol+dobor = 3 cutlist');
const allParts = [];
cls.forEach(c => c.parts.forEach(x => allParts.push(Object.assign({}, x, { id: c.placementId + ':' + x.ref }))));
const nest = nestProject(allParts, mats, {});
ok((nest.summary?.placed_count || 0) === allParts.length, 'raskroy: hammasi sig\'di (' + allParts.length + ' det.');
ok((nest.summary?.unplaced_count || 0) === 0 || !nest.by_material || Object.values(nest.by_material).every(r => !(r.unplaced || []).length), 'sig\'magan yo\'q');
const prod = productionCost(cls, mats, { nestResult: nest, xizmatlar: { teshik: true } });   // TZ-03: prisadka tanlangan holat
ok(prod.clientTotal > 0, 'tannarx > 0: ' + prod.clientTotal);
ok((prod.missing || []).some(m => m.code === 'hole:cutout'), 'moyka kesimi smetada "narx yo\'q" ro\'yxatida (to\'liq emas belgisi)');
ok(prod.perModule && prod.perModule.length === cls.length, 'perModule = cutlist soni (buildQuote uchun)');

/* ── 7) Uzun run: 2 segment stoleshnitsa ── */
d = deriveKitchen(doc([base('a', 0, 50), base('b', 600, 50), base('c', 1200, 50), base('d', 1800, 50), base('e', 2400, 50), base('f', 3000, 50)], { stoleshnitsa: true, sokol: false }), catalog);
ok(d.length === 1 && d[0].std === 4200, '3600mm run → 1 stoleshnitsa (4200 standart, egasi #162)');
ok(d[0].w === 3600, 'bo\'lak uzunligi = 3600');

/* ── 8) vertikal run → rot=90 (detal uzunligi W, varaqqa sig'adi) ── */
const vBase = (id, x, y) => ({ id, frg: 'SP-K-001', name: 'pastki', x, y, z: 0, w: 600, d: 550, h: 720, rot: 90, qty: 1 });
d = deriveKitchen(doc([vBase('a', 600, 0), vBase('b', 600, 600), vBase('c', 600, 1200)], { stoleshnitsa: true, sokol: false, dobor: false, karniz: false }), catalog);
ok(d.length === 1 && d[0].rot === 90 && d[0].w === 1800 && d[0].d === 550, 'vertikal run → stoleshnitsa rot=90, W=1800 (run uzunligi)');
const vcl = cutlist(catalog['SP-ST-001'], d[0].w, d[0].d, 18, mats, { projectSlots: {} });
ok(vcl.parts[0].finish_length === 1800, "vertikal stoleshnitsa detal uzunligi 1800 (2800 varaqqa sig'adi)");

/* ── 9) moyka belgisi derived placementda ── */
d = deriveKitchen(doc([base('a', 0, 50), base('b', 600, 50)], { stoleshnitsa: true, sokol: false, moyka: { on: true, offset: 600, fromBack: 100, size: 500 } }), catalog);
const mkP = d.find(p => p.frg === 'SP-ST-001');
ok(mkP && mkP.moyka && mkP.moyka.offset === 600 && mkP.moyka.backLocal != null, 'stoleshnitsa placementda moyka belgisi (3D marker uchun)');

/* ── 10) CNC ichki kontur: G-code 2a-bosqich + DXF CUTOUT ── */
const mcls = [];
const mdoc = doc([base('a', 0, 50)], { stoleshnitsa: true, sokol: false, dobor: false, karniz: false, moyka: { on: true, offset: 600, fromBack: 100, size: 500 } });
for (const p of deriveKitchen(mdoc, catalog)) {
  const c = cutlist(catalog[p.frg], p.w, p.d, p.h, mats, { projectSlots: {} });
  c.placementId = p.id;
  if (p.frg === 'SP-ST-001') c.holes.push(Object.assign({}, moykaHole(mdoc)));
  mcls.push(c);
}
const mp = [];
mcls.forEach(c => c.parts.forEach(x => mp.push(Object.assign({}, x, { id: c.placementId + ':' + x.ref }))));
const mnest = nestProject(mp, mats, {});
const gc = cutGCode(mnest, mcls, { toolDia: 6.0, addTabs: true });
ok(gc.includes('BOSQICH 2a') && gc.includes('Cutout:'), 'G-code: 2a-bosqich (ichki kontur) mavjud');
ok(gc.indexOf('BOSQICH 2a') < gc.indexOf('BOSQICH 2:'), 'ichki kontur tashqi konturdan OLDIN');
const dxf = nestDXF(Object.assign({}, mnest, { _cutlists: mcls }));
ok(dxf.includes('CUTOUT'), 'DXF: CUTOUT qatlami mavjud');
const nc = drillNC(mnest, mcls);
ok(!/Cutout/.test(nc), 'Excellon NC: cutout teshik sifatida YOQ (faqat drill)');

/* ── 11) o'rnatma texnika: bo'sh korpus — cutlist 0 detal, tannarx 0 ── */
const appl = {
  code: 'SP-TX-001', name: "O'rnatma pech", category: 'appliance', group: 'texnika',
  w: 600, d: 600, h: 600, price_mode: 'unit', price: 0, parts: [], holes: [], hardware: [], edge: []
};
const acl = cutlist(appl, 600, 600, 600, mats, { projectSlots: {} });
ok(acl.parts.length === 0 && acl.errors.length === 0, 'texnika: cutlist bo\'sh (0 detal, 0 xato)');
const aprod = productionCost([acl], mats, { nestResult: nestProject([], mats, {}) });
ok(isFinite(aprod.clientTotal), 'texnika: tannarx finite (0)');

console.log(`\n=== ${fail ? 'FAIL' : 'HAMMASI OK'} (${pass} pass, ${fail} fail) ===`);
process.exit(fail ? 1 : 0);
