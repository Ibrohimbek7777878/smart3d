/* F1 — poligon xona tekshiruvi: pointInPoly / fpInRoom / validateDoc (L shakl)
   + geom.triangulate (OBJ pol uchun). */
import { validateDoc, pointInPoly, fpInRoom, roomBBox, footprint } from '../app/js/engine/rules.js';
import { triangulate } from '../app/js/engine/geom.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => {
  if (cond) { pass++; console.log('ok    ' + msg); }
  else { fail++; console.log('FAIL  ' + msg); }
};

const RECT = [[0, 0], [4000, 0], [4000, 3000], [0, 3000]];
// L shakl: pastki to'liq 3600×2000 + chap ustki 2200×1000; qirqim = [2200..3600]×[2000..3000]
const L = [[0, 0], [3600, 0], [3600, 2000], [2200, 2000], [2200, 3000], [0, 3000]];
const mk = (outline, placements = [], openings = []) => ({
  room: { outline, wall_height: 2700, wall_thickness: 100, openings }, placements
});
const pl = (id, x, y, w = 600, d = 550, rot = 0) => ({ id, frg: 'SP-K-001', x, y, w, d, h: 720, rot, qty: 1 });

/* ── 1) pointInPoly ── */
ok(pointInPoly(2000, 1500, RECT), 'rect ichida');
ok(!pointInPoly(5000, 1500, RECT), 'rect tashqarida');
ok(pointInPoly(0, 0, RECT), 'rect burchagida (chegara → ichida)');
ok(pointInPoly(4000, 1500, RECT), 'rect chegarasida (±1mm)');
ok(!pointInPoly(3000, 2500, L), 'L qirqim hududida (x>2200, y>2000) → tashqarida');
ok(pointInPoly(1000, 2500, L), 'L chap ustki qismida → ichida');
ok(pointInPoly(2199, 2500, L), 'L qirqim yonida (x=2199 < 2200) → ichida');
ok(pointInPoly(3000, 1000, L), 'L pastki to\'liq qismida → ichida');

/* ── 2) roomBBox ── */
const bb = roomBBox(L);
ok(bb.w === 3600 && bb.h === 3000 && bb.minX === 0 && bb.minY === 0, 'roomBBox(L) = 3600×3000');
ok(roomBBox(RECT).w === 4000 && roomBBox(RECT).h === 3000, 'roomBBox(rect)');

/* ── 3) fpInRoom ── */
ok(!fpInRoom(footprint(pl('a', 2500, 2300, 600, 500)), L), 'notch ichidagi footprint → poligon tashqarida');
ok(fpInRoom(footprint(pl('b', 100, 100, 600, 550)), L), 'L ichidagi footprint → ichida');
ok(fpInRoom(footprint(pl('c', 50, 50, 600, 550)), RECT), 'rect ichida (regressiya)');
ok(!fpInRoom(footprint(pl('d', 3600, 50, 600, 550)), RECT), 'rect chetidan chiqqan (regressiya)');

/* ── 4) validateDoc — RECT regressiya ── */
let r = validateDoc(mk(RECT, [pl('p1', 100, 100), pl('p2', 800, 100)]));
ok(r.errors.length === 0 && !r.warnings.some(w => w.code === 'W_OUT_OF_ROOM'), 'rect: ichida — xato/ogohlantirish yo\'q');
r = validateDoc(mk(RECT, [pl('p1', 3700, 100, 600, 550)]));
ok(r.warnings.some(w => w.code === 'W_OUT_OF_ROOM'), 'rect: chetdan chiqqan → W_OUT_OF_ROOM (regressiya)');

/* ── 5) validateDoc — L shakl (F1 asosiy) ── */
r = validateDoc(mk(L, [pl('in', 100, 100), pl('up', 100, 2400, 600, 550)]));
ok(r.errors.length === 0, 'L: ichidagi 2 mebel — errors yo\'q');
ok(!r.warnings.some(w => w.code === 'W_OUT_OF_ROOM'), 'L: ikkalasi ham ichida — W_OUT yo\'q');

r = validateDoc(mk(L, [pl('notch', 2500, 2300, 600, 500)]));
ok(r.warnings.some(w => w.code === 'W_OUT_OF_ROOM'), 'L: qirqim (notch) hududidagi mebel → W_OUT_OF_ROOM');

r = validateDoc(mk(L, [pl('straddle', 2000, 2500, 600, 500)]));   // x 2000..2600 — qirqimni kesib o'tadi
ok(r.warnings.some(w => w.code === 'W_OUT_OF_ROOM'), 'L: qirqimni kesib turgan mebel → W_OUT_OF_ROOM');

r = validateDoc(mk(L, [pl('edge', 50, 2400, 600, 550)]));
ok(!r.warnings.some(w => w.code === 'W_OUT_OF_ROOM'), 'L: qirqim yonidagi (x=50) mebel → W_OUT yo\'q');

/* perimetr L uchun yetarli (13 200 mm) */
r = validateDoc(mk(L, []));
ok(!r.errors.some(e => e.code === 'E_OUTLINE_TOO_SMALL'), 'L: perimetr yetarli');

/* ── 6) openings — poligon edge indekslari ── */
r = validateDoc(mk(L, [], [{ wall: 5, type: 'door', offset: 1000, width: 900, sill: 0, height: 2100 }]));
ok(!r.errors.some(e => e.code === 'E_OPENING_OUT_OF_WALL'), 'L: devor 5 (oxirgi edge) — teshik valid');
r = validateDoc(mk(L, [], [{ wall: 6, type: 'door', offset: 100, width: 900, sill: 0, height: 2100 }]));
ok(r.errors.some(e => e.code === 'E_OPENING_OUT_OF_WALL'), 'L: devor 6 (yo\'q edge) — xato');
r = validateDoc(mk(L, [], [{ wall: 2, type: 'window', offset: 0, width: 5000, sill: 900, height: 1400 }]));
ok(r.errors.some(e => e.code === 'E_OPENING_OUT_OF_WALL'), 'L: devor 2 (1400 mm) — 5000 mm teshik xato');

/* ── 7) triangulate (OBJ pol) ── */
const trisRect = triangulate(RECT);
ok(trisRect.length === 2, 'rect → 2 uchburchak');
const areaOf = (pts, tris) => tris.reduce((s, [a, b, c]) =>
  s + Math.abs(((pts[b][0] - pts[a][0]) * (pts[c][1] - pts[a][1]) - (pts[b][1] - pts[a][1]) * (pts[c][0] - pts[a][0])) / 2), 0);
const polyArea = (pts) => Math.abs(pts.reduce((s, p, i) => {
  const q = pts[(i + 1) % pts.length]; return s + (p[0] * q[1] - q[0] * p[1]);
}, 0) / 2);
ok(Math.abs(areaOf(RECT, trisRect) - polyArea(RECT)) < 1e-6, 'rect: uchburchaklar maydoni = poligon maydoni');
const trisL = triangulate(L);
ok(trisL.length === 4, 'L (6 nuqta) → 4 uchburchak (n-2)');
ok(Math.abs(areaOf(L, trisL) - polyArea(L)) < 1e-6, 'L: uchburchaklar maydoni = poligon maydoni (' + polyArea(L) + ')');
const trisCw = triangulate([...L].reverse());
ok(trisCw.length === 4 && Math.abs(areaOf([...L].reverse(), trisCw) - polyArea(L)) < 1e-6, 'CW kiritilgan ham ishlaydi (indekslar originalga)');
ok(trisL.every(([a, b, c]) =>
  ((L[b][0] - L[a][0]) * (L[c][1] - L[a][1]) - (L[b][1] - L[a][1]) * (L[c][0] - L[a][0])) > 0), 'L: barcha uchburchaklar CCW');

/* ── 8) quvur/rozetka (F1) ── */
const mkU = (outline, utilities) => ({ room: { outline, wall_height: 2700, wall_thickness: 100, openings: [], utilities }, placements: [] });
r = validateDoc(mkU(L, [{ type: 'pipe', wall: 0, offset: 500, z: 1000 }]));
ok(!r.errors.some(e => e.code === 'E_UTIL_OUT_OF_WALL'), 'quvur: devor 0 (3600mm), offset 500 — valid');
r = validateDoc(mkU(L, [{ type: 'outlet', wall: 5, offset: 2500, z: 300 }]));
ok(!r.errors.some(e => e.code === 'E_UTIL_OUT_OF_WALL'), 'rozetka: devor 5 (3000mm), offset 2500 — valid');
r = validateDoc(mkU(L, [{ type: 'pipe', wall: 5, offset: 3500, z: 1000 }]));
ok(r.errors.some(e => e.code === 'E_UTIL_OUT_OF_WALL'), 'quvur: devor 5 (3000mm), offset 3500 — xato');
r = validateDoc(mkU(L, [{ type: 'pipe', wall: 9, offset: 100, z: 1000 }]));
ok(r.errors.some(e => e.code === 'E_UTIL_OUT_OF_WALL'), 'quvur: devor 9 (yo\'q) — xato');
r = validateDoc(mkU(L, undefined));
ok(r.errors.filter(e => e.code.startsWith('E_UTIL')).length === 0, 'utilities yo\'q — xato yo\'q');
r = validateDoc(mkU(L, [{ type: 'pipe', wall: -1, offset: 100, z: 1000 }]));
ok(r.errors.some(e => e.code === 'E_UTIL_OUT_OF_WALL'), 'quvur: wall=-1 — xato');

console.log(`\n=== ${fail ? 'FAIL' : 'HAMMASI OK'} (${pass} pass, ${fail} fail) ===`);
process.exit(fail ? 1 : 0);
