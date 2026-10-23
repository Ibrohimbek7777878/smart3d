/* Stoleshnitsa L/U burchak: bitta ulanish (butt joint) — ustma-ust 0, bo'shliq 0, jami uzunlik = qatorlar.
   Sex qoidasi (4034, 3877 Кухня Г): 2 bo'lak, chuqurlik 600, biri uzun (to'liq), ikkinchisi qisqa taqaladi. */
import { readFileSync } from 'fs';
import { deriveKitchen } from '../app/js/engine/kitchen.js';
import { footprint } from '../app/js/engine/rules.js';
import { cutlist, productionCost } from '../app/js/engine/cutlist.js';
import { nestProject } from '../app/js/engine/nesting.js';
import { stolBolaklar } from '../app/js/engine/kitchen.js';

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
  ok(st.filter(p => p.rot === 0).length === 1 && st.find(p => p.rot === 0).std === 4200, 'L 3600: gor. qator 1 dona 4200 (egasi #162: SHEET_MAX o\'rniga standart uzunlik)');
}
/* alohida (burchaksiz) qatorlar o'zgarmaydi */
{
  const st = run([...row(0, 0, 2, 600, true), ...row(2500, 2000, 2, 600, true)]);
  ok(st.length === 2 && st.every(p => p.w === 1200 && !p.birlashma), 'bog\'lanmagan qatorlar o\'zgarmaydi');
}

/* ── Egasi #162: qalinlik 26/38, uzunlik 3050/4200, styajka, narx qatorlari ── */
const mats = JSON.parse(readFileSync(new URL('../app/data/materials.json', import.meta.url), 'utf8'));
const links = JSON.parse(readFileSync(new URL('../app/data/furnitura-boglash.json', import.meta.url), 'utf8')).links;
const furn = Object.fromEntries(JSON.parse(readFileSync(new URL('../app/data/furnitura-catalog.json', import.meta.url), 'utf8')).items.map(f => [f.id, { name: f.name, uzs: f.uzs, no_price: !(f.uzs > 0) }]));
const gor = (n) => row(0, 0, n, 600, true);   // n ta 600 mm modul, gorizontal qator
const pcs = (n, kit) => run(gor(n), kit);
{
  const a = pcs(4)[0];   // 2400 (2500 ga yaqin: 4 modul)
  ok(pcs(4).length === 1 && a.std === 3050 && a.w === 2400, '2400 mm → 1 dona 3050 (w ' + a.w + ')');
  const r25 = run([{ x0: 0, y0: 0, x1: 2500, y1: D, vert: false }]);
  ok(r25.length === 1 && r25[0].std === 3050 && r25[0].w === 2500 && r25[0].styajka === 0, '2500 mm → 1 dona 3050, styajka 0');
  const r36 = pcs(6);
  ok(r36.length === 1 && r36[0].std === 4200 && r36[0].w === 3600 && r36[0].styajka === 0, '3600 mm → 1 dona 4200, styajka 0');
  const r50 = run([{ x0: 0, y0: 0, x1: 2500, y1: D, vert: false }, { x0: 2500, y0: 0, x1: 5000, y1: D, vert: false }]);
  ok(r50.length === 2 && r50.reduce((s, p) => s + p.w, 0) === 5000 && r50.every(p => p.w <= 4200), '5000 mm → 2 bo\'lak, har biri ≤ 4200');
  ok(r50.reduce((s, p) => s + p.styajka, 0) === 1, '5000 mm → 1 ta styajka');
  ok(r50.every(p => p.std === 3050), '5000 = 2500 + 2500 → ikkalasi 3050 (eng kichik mos standart)');
  ok(JSON.stringify(stolBolaklar(5000, [600, 1200, 1800, 2400, 3000, 3600, 4200, 4800]).map(x => x.len)) === JSON.stringify([2400, 2600]) || stolBolaklar(5000, [600, 1200, 1800, 2400, 3000, 3600, 4200, 4800]).length === 2, 'modul chegarasida 2 bo\'lak');
  const r9 = stolBolaklar(9000, []);
  ok(r9.length === 3 && r9.every(x => x.len <= 4200), '9000 → 3 bo\'lak (2 ta styajka)');
  /* burchakda styajka yo'q (butt-ulanish) */
  const Ls = run(Lbase);
  ok(Ls.reduce((s, p) => s + p.styajka, 0) === 0 && Ls.some(p => p.birlashma > 0), 'L-burchak: styajka 0, birlashma > 0');
  const Us = run(Ubase);
  ok(Us.filter(p => p.rot % 180 === 0).length === 2 && Us.filter(p => p.rot % 180 === 0).reduce((s, p) => s + p.styajka, 0) === 1, 'U: gor. 5000 sig\'masdan bo\'lindi → 1 styajka; burchaklar styajkasiz');
  /* 26 / 38 tanlovi */
  ok(pcs(4)[0].h === 26 && pcs(4)[0].slots.stoleshnitsa === 'STOL26-3050', 'sukut: 26 mm (STOL26-3050)');
  const p38 = pcs(6, { stolT: 38 })[0];
  ok(p38.h === 38 && p38.stolT === 38 && p38.slots.stoleshnitsa === 'STOL38-4200', '38 mm tanlovi saqlanadi (STOL38-4200)');
  ok(pcs(4, { stolT: 30 })[0].h === 26, 'noto\'g\'ri qalinlik → 26');
  /* kesim ro'yxati va narx */
  const frg = catalog['SP-ST-001'];
  const parts = (pl, m) => { const cl = cutlist(frg, pl.w, pl.d, pl.h, m, { projectSlots: { stoleshnitsa: 'LDSP18' }, placementSlots: pl.slots }); if (pl.styajka > 0) cl.hardware.push({ fragment: frg.code, code: 'STYAJKA-STOL', qty: pl.styajka, _auto: true }); return cl; };
  const cl38 = parts(p38, mats);
  ok(cl38.parts[0].thickness === 38 && cl38.parts[0].material === 'STOL38-4200', 'kesim ro\'yxatida qalinlik 38, material STOL38-4200');
  const cls = r50.map(p => parts(p, mats));
  const nest = nestProject(cls.flatMap((c, i) => c.parts.map(x => Object.assign({}, x, { id: 'p' + i + ':' + x.ref }))), mats, {});
  ok(!nest.by_material['STOL26-3050'], 'stoleshnitsa varaqqa kroy qilinmaydi');
  const pc = productionCost(cls, mats, { nestResult: nest, furnituraById: furn, furnituraBoglash: links });
  const sl = pc.lines.find(l => l.code === 'STOL26-3050');
  /* TZ-32 yakuniy (egasi #222 Q1): narx — sukut ERP dekor (26 mm sukut C514 GL: TZ-50 yangi baza tannarxi — 638 553 = 348 936 so'm/m² × 3050×600; avval 638 939) */
  ok(sl && sl.qty === 2 && sl.unit === 'dona' && sl.no_price === false && sl.unit_price === 638553 && sl.amount === 2 * 638553 && sl.manba === 'ERP' && sl.tasdiq === true, 'narx qatori: STOL26-3050 × 2 dona, ERP dekor narxi (638 553, yangi baza)');
  ok(!pc.missing.some(m => /^STOL/.test(m.code)), '"narx yo\'q" ro\'yxatida stoleshnitsa yo\'q');
  const sy = pc.lines.find(l => l.code === 'STYAJKA-STOL');
  ok(sy && sy.qty === 1 && sy.id === undefined && sy.unit_price === 20000 && sy.amount === 20000 && /Стяжка/.test(sy.name), 'styajka qatori: 1 dona × 20 000 (90002044)');
  ok(pc.lines.filter(l => l.group === 'Plita (Kroy)').length === 0, 'stoleshnitsa maydon (varaq) qatori emas');
  ok(Number.isFinite(pc.totalCost) && pc.perModule.length === 2, 'tannarx hisoblanadi, perModule 2');
  const dona = mats.panel_materials.filter(m => m.unit_piece);
  ok(dona.filter(m => m.sheet_price > 0).length === 3 && dona.filter(m => m.sheet_price > 0).every(m => /^ERP \d{4}-\d{2}-\d{2}$/.test(m.price_src) && m.erp && m.erp.narx_m2 > 0), 'stoleshnitsa materiallari: 3 tasi ERP dekor narxida (price_src ERP)');
  ok(dona.filter(m => !(m.sheet_price > 0)).map(m => m.code).join() === 'STOL26-4200', 'STOL26-4200: sukut 26 mm dekorida 4200 uzunlik ERP\'da yo\'q — narxsiz, o\'ylab topilmaydi');
}
console.log(fail ? `=== XATO (${pass} pass, ${fail} fail) ===` : `=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
