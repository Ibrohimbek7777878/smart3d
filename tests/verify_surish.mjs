/* Egasi #151, #152: devordan DEVOR_ORALIQ mm (har joylash yo'li) va surish qoidalari (engine/devorOraliq.js).
 * Devor kontur chizig'ining ikki tomoniga qalinlik/2 dan chiziladi (scene.js) — modul va devor YUZASI orasida DEVOR_ORALIQ,
 * devor ichiga kirish 0, burchakda — ikkala devordan. Surish: devorga yopishadi, devor/qo'shni modulga kirmaydi, z o'zgarmaydi. */
import { DEVOR_ORALIQ, devorChegara, devordanSur, devorOraliqlari, ichkiXona, surishJoyi, surishCheklov } from '../app/js/engine/devorOraliq.js';
import { suggestLayout } from '../app/js/ai.js';
import { footprint } from '../app/js/engine/rules.js';
import { registerHooks } from 'node:module';
/* web/src/services/loyiha.js i18n JSON'ini yuklaydi — Node'da JSON importi uchun atribut kerak (faqat shu test) */
registerHooks({ load(url, ctx, next) { return next(url, url.endsWith('.json') ? Object.assign({}, ctx, { importAttributes: { type: 'json' } }) : ctx); } });
const L = await import('../web/src/services/loyiha.js');

let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const J = JSON.stringify;
const xona = (W, D, o = {}) => Object.assign({ outline: [[0, 0], [W, 0], [W, D], [0, D]], wall_height: 2700, wall_thickness: 100, openings: [], utilities: [] }, o);
const R = xona(5000, 4000), T = devorChegara(R);
const mod = (o) => Object.assign({ w: 600, d: 450, h: 720, z: 0, rot: 0 }, o);
const engKam = (room, p) => Math.min(...devorOraliqlari(room, p, 60).map(g => g.oraliq));

ok('DEVOR_ORALIQ = 3 mm, T = qalinlik/2 + oraliq = 53', DEVOR_ORALIQ === 3 && T === 53, T);

/* 1. devordanSur: devor ichidagi modul chiqariladi, burchakda — ikkala devordan; uzoqdagisi joyida */
{
  const p = mod({ x: 0, y: 0 }); devordanSur(R, p);
  ok('burchak (0,0) → (53,53): ikkala devordan 3 mm', p.x === 53 && p.y === 53 && J(devorOraliqlari(R, p).map(g => g.oraliq)) === J([3, 3]), J(p));
  const q = mod({ x: 5000, y: 1000, rot: 90 }); devordanSur(R, q);
  ok("o'ng devor (rot 90): orqasi devordan 3 mm", q.x === 5000 - T && engKam(R, q) === 3, J(q));
  const u = mod({ x: 2000, y: -80, z: 1450, h: 700, d: 300 }); devordanSur(R, u);
  ok('ustki modul devor ichida (y −80) → y 53, z o\'zgarmaydi', u.y === 53 && u.z === 1450, J(u));
  const m = mod({ x: 2000, y: 1500 }); devordanSur(R, m);
  ok("xona o'rtasidagi modul joyida qoladi", m.x === 2000 && m.y === 1500);
  const Lr = xona(0, 0, { outline: [[0, 0], [4000, 0], [4000, 2000], [2500, 2000], [2500, 3500], [0, 3500]] });
  const n = mod({ x: 2000, y: 2900, rot: 270 }); devordanSur(Lr, n);   // ichki burchak devori x=2500 yonida
  ok('L xona: ichki (botiq) devordan ham 3 mm', engKam(Lr, n) >= 2.99 && footprint(n).x1 <= 2500 - T + 0.01, J(footprint(n)));
}

/* 2. ichkiXona: kontur T ga ichkariga, teshik dunyodagi joyida qoladi */
{
  const r = ichkiXona(xona(3600, 3000, { openings: [{ wall: 0, type: 'window', offset: 1300, width: 1200 }], utilities: [{ type: 'pipe', wall: 0, offset: 1900 }] }));
  ok('ichki xona: [[53,53],[3547,53],[3547,2947],[53,2947]]', J(r.outline) === J([[53, 53], [3547, 53], [3547, 2947], [53, 2947]]), J(r.outline));
  ok('deraza va quvur offseti yangi devor boshidan (1300 → 1247, 1900 → 1847)', r.openings[0].offset === 1247 && r.openings[0].width === 1200 && r.utilities[0].offset === 1847, J([r.openings, r.utilities]));
}

/* 3. katalogdan qo'shish (addPlacement) — devordan 3 mm, yonma-yon, sig'masa — o'ng devordan 3 mm */
{
  const doc = L.newDoc(xona(5000, 4000));
  const f = { code: 'A', name: 'A', w: 600, d: 450, h: 720, category: 'kitchen' };
  const a = L.addPlacement(doc, f), b = L.addPlacement(doc, f);
  ok("1-modul (53, 53), 2-si yonida (653) — orqasi devordan 3 mm", a.x === 53 && a.y === 53 && b.x === 653 && b.y === 53, J([a, b]));
  for (let i = 0; i < 10; i++) L.addPlacement(doc, f);
  const oxir = doc.placements[doc.placements.length - 1];
  ok("joy tugasa — o'ng devordan 3 mm (devorga kirmaydi)", footprint(oxir).x1 === 5000 - T, J(footprint(oxir)));
  ok('hammasi devor yuzasidan ≥ 3 mm', doc.placements.every(p => engKam(xona(5000, 4000), p) >= 2.99));
  const s = { x: 4500, y: 53, w: 600, d: 450, h: 720, rot: 0 }; L.devordan(doc, s);
  ok('◀ ▶ / nusxa / burish devorga kiritmaydi (devordan)', s.x === 5000 - T - 600, J(s));
}

/* 4. AI zaxira joylashi (suggestLayout) — devordan 3 mm */
{
  const pl = suggestLayout({ w: 3600, d: 2800, layoutType: 'L', features: { stove: true, fridge: true } },
    Object.fromEntries([['SP-K-007', { code: 'SP-K-007', w: 900, d: 550, h: 720 }], ['SP-K-001', { code: 'SP-K-001', w: 600, d: 550, h: 720 }], ['SP-K-002', { code: 'SP-K-002', w: 600, d: 350, h: 700 }], ['SP-K-015', { code: 'SP-K-015', w: 600, d: 600, h: 2000 }]]), []);
  const r = xona(3600, 2800), g = pl.map(p => engKam(r, p)).filter(isFinite);
  ok('AI (suggestLayout): har modul devor yuzasidan ≥ 3 mm, devor yonidagilari aynan 3', pl.length > 3 && g.every(v => v >= 2.99) && g.some(v => Math.abs(v - 3) < 0.01), J(g));
}

/* 5. surish: devorga yopishish, devorga/qo'shniga kirmaslik, ustki va pastki, xonadan chiqmaslik */
{
  const qoshni = [mod({ id: 'q', x: 53, y: 53 })];
  ok("devorga 37 mm qolganda — yopishadi (y 90 → 53)", J(surishJoyi(R, [], mod({ x: 1000, y: 90 }))) === J({ x: 1000, y: 53 }));
  ok('devor ichiga tortilsa — 3 mm da to\'xtaydi (y −200 → 53)', J(surishJoyi(R, [], mod({ x: 1000, y: -200 }))) === J({ x: 1000, y: 53 }));
  ok("qo'shni modulga kirmaydi — yoniga chiqariladi (x 400 → 653)", J(surishJoyi(R, qoshni, mod({ x: 400, y: 53 }))) === J({ x: 653, y: 53 }));
  ok("qo'shniga 40 mm qolganda — yonma-yon yopishadi (x 693 → 653)", J(surishJoyi(R, qoshni, mod({ x: 693, y: 53 }))) === J({ x: 653, y: 53 }));
  ok('ustki modul pastki ustidan o\'tadi (balandlik kesishmaydi)', J(surishJoyi(R, qoshni, mod({ x: 300, y: 60, z: 1450, d: 300, h: 700 }))) === J({ x: 300, y: 53 }));
  ok('xonadan butunlay tashqariga — null (joyida qoladi)', surishJoyi(R, [], mod({ x: -3000, y: 500 })) === null);
  const pl = [mod({ id: 'a', x: 53, y: 53 }), mod({ id: 'b', x: 300, y: 53 }), mod({ id: 'c', x: 2000, y: 53 })];   // a va b eski loyihada ustma-ust
  const ch = surishCheklov(R, pl, 'a');
  ok('boshidan ustma-ust turgan modul ham suriladi (eski loyiha)', !!ch && J(ch(1000, 600)) === J({ x: 1000, y: 600 }));
  ok("lekin boshqasiga kirmaydi (c ga — yoniga)", J(ch(1900, 53)) === J({ x: 1400, y: 53 }), J(ch(1900, 53)));
}

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
