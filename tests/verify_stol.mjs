/* Stoleshnitsa L/U burchak: bitta ulanish (butt joint) — ustma-ust 0, bo'shliq 0, jami uzunlik = qatorlar.
   Sex qoidasi (4034, 3877 Кухня Г): 2 bo'lak, chuqurlik 600, biri uzun (to'liq), ikkinchisi qisqa taqaladi. */
import { readFileSync } from 'fs';
import { deriveKitchen } from '../app/js/engine/kitchen.js';
import { footprint } from '../app/js/engine/rules.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('ok    ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const catalog = Object.fromEntries(JSON.parse(readFileSync(new URL('../app/data/fragments.json', import.meta.url), 'utf8')).map(f => [f.code, f]));
const W = 5000, H = 3500, D = 550;
const RECT = [[0, 0], [W, 0], [W, H], [0, H]];

/* to'rtburchak (x0,y0,x1,y1) → placement; gor: rot 0, vert: rot 90 (anchor x1) */
const pl = (id, r, frg = 'SP-K-001') => {
  const vert = (r.y1 - r.y0) > (r.x1 - r.x0) && r.vert !== false;
  return vert ? { id, frg, x: r.x1, y: r.y0, z: 0, w: r.y1 - r.y0, d: r.x1 - r.x0, h: 720, rot: 90, qty: 1 }
              : { id, frg, x: r.x0, y: r.y0, z: 0, w: r.x1 - r.x0, d: r.y1 - r.y0, h: 720, rot: 0, qty: 1 };
};
const mirror = (r, mx, my) => ({ x0: mx ? W - r.x1 : r.x0, x1: mx ? W - r.x0 : r.x1, y0: my ? H - r.y1 : r.y0, y1: my ? H - r.y0 : r.y1 });
const row = (x0, y0, n, step, horiz) => Array.from({ length: n }, (_, i) => horiz
  ? { x0: x0 + i * step, y0, x1: x0 + (i + 1) * step, y1: y0 + D, vert: false }
  : { x0, y0: y0 + i * step, x1: x0 + D, y1: y0 + (i + 1) * step });

const run = (rects, kitchen) => {
  const placements = rects.map((r, i) => pl('m' + i, r, r.corner ? 'SP-K-007' : 'SP-K-001'));
  return deriveKitchen({ room: { outline: RECT }, placements, kitchen: Object.assign({ stoleshnitsa: true }, kitchen || {}) }, catalog)
    .filter(p => p.frg === 'SP-ST-001');
};
const inter = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
const analiz = (st) => {
  const fps = st.map(footprint);
  let over = 0;
  for (let i = 0; i < fps.length; i++) for (let j = i + 1; j < fps.length; j++) over += inter(fps[i], fps[j]);
  return { fps, over, total: st.reduce((s, p) => s + p.w, 0) };
};
const cornerGap = (fps, sq) => D * D - fps.reduce((s, f) => s + inter(f, sq), 0);

/* L: burchak moduli (900) gorizontal qatorda + 4 modul; vertikal 3 modul y=550.. */
const Lbase = [{ x0: 0, y0: 0, x1: 900, y1: D, vert: false, corner: true }, ...row(900, 0, 2, 600, true), ...row(0, D, 3, 600, false)];
/* L, burchak oralig'i BO'SH (modul yo'q): gor. 550 dan, vert. 550 dan */
const Lgap = [...row(550, 0, 3, 600, true), ...row(0, D, 3, 600, false)];
/* L, ikki qator burchakda ustma-ust (burchak moduli yo'q) */
const Lover = [...row(0, 0, 3, 600, true), ...row(0, 0, 3, 600, false)];
/* U: chap vertikal + gor. 5000 + o'ng vertikal; ikkala burchakda burchak moduli gor. qatorda */
const Ubase = [{ x0: 0, y0: 0, x1: 900, y1: D, vert: false, corner: true }, ...row(900, 0, 5, 640, true), { x0: 4100, y0: 0, x1: 5000, y1: D, vert: false, corner: true },
  ...row(0, D, 3, 600, false), ...row(W - D, D, 2, 600, false)];

const variants = [[0, 0], [1, 0], [0, 1], [1, 1]];
for (const [nom, rs, kutil] of [['L (burchak moduli)', Lbase, 900 + 1200 + 1800], ['L (oraliq bo\'sh)', Lgap, 1800 + 1800 + 550], ['L (ustma-ust)', Lover, 1800 + 1800 - D]]) {
  for (const [mx, my] of variants) {
    const st = run(rs.map(r => mirror(r, mx, my)));
    const a = analiz(st);
    const wc = { x: mx ? W : 0, y: my ? H : 0 };
    const sq = { x0: mx ? W - D : 0, x1: mx ? W : D, y0: my ? H - D : 0, y1: my ? H : D };
    const tag = nom + ' ' + (mx ? 'o\'ng' : 'chap') + '/' + (my ? 'past' : 'tepa');
    ok(st.length === 2, tag + ': 2 bo\'lak');
    ok(a.over === 0, tag + ': ustma-ust 0 mm2 (' + a.over + ')');
    ok(cornerGap(a.fps, sq) === 0, tag + ': burchak bo\'shlig\'i 0 mm2 (' + cornerGap(a.fps, sq) + ')');
    ok(a.total === kutil, tag + ': jami uzunlik ' + a.total + ' = kutilgan ' + kutil);
    ok(st.filter(p => p.birlashma > 0).length === 1, tag + ': 1 ta butt ulanish');
  }
}
/* U */
for (const [mx, my] of variants) {
  const st = run(Ubase.map(r => mirror(r, mx, my)));
  const a = analiz(st);
  const tag = 'U ' + (mx ? 'M' : '') + (my ? 'M' : '');
  /* H run 5000 → 2 bo'lak (2700 dan katta); vertikallar: 1800 va 1200 → jami 3 + 2 = 5 */
  ok(a.over === 0, tag + ': ustma-ust 0 (' + a.over + ')');
  const sqL = { x0: mx ? W - D : 0, x1: mx ? W : D, y0: my ? H - D : 0, y1: my ? H : D };
  const sqR = { x0: mx ? 0 : W - D, x1: mx ? D : W, y0: my ? H - D : 0, y1: my ? H : D };
  ok(cornerGap(a.fps, sqL) === 0 && cornerGap(a.fps, sqR) === 0, tag + ': ikki burchakda bo\'shliq 0');
  ok(a.total === 5000 + 1800 + 1200, tag + ': jami uzunlik ' + a.total + ' = 8000');
  ok(st.filter(p => p.rot % 180 === 0).length === 2, tag + ': gor. 5000 → 2 dona kesim (SHEET_MAX qoidasi)');
  ok(st.reduce((s, p) => s + (p.birlashma || 0), 0) === 2, tag + ': 2 ta butt ulanish');
}
/* L: uzun gor. qator 3600 — 2 dona kesim saqlanadi, ulanish buzilmaydi */
{
  const rs = [...row(0, 0, 6, 600, true), ...row(0, D, 2, 600, false)];
  const st = run(rs);
  const a = analiz(st);
  ok(a.over === 0 && a.total === 3600 + 1200, 'L 3600 gor.: ustma-ust 0, jami ' + a.total + ' = ' + (3600 + 1200));
  ok(st.filter(p => p.rot === 0).length === 2, 'L 3600: gor. qator 2 dona kesim');
}
/* alohida (burchaksiz) qatorlar o'zgarmaydi */
{
  const st = run([...row(0, 0, 2, 600, true), ...row(2500, 2000, 2, 600, true)]);
  ok(st.length === 2 && st.every(p => p.w === 1200 && !p.birlashma), 'bog\'lanmagan qatorlar o\'zgarmaydi');
}
console.log(fail ? `=== XATO (${pass} pass, ${fail} fail) ===` : `=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
