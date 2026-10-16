/* A1/A2/A3 tekshiruvi — Smart3D (TZ-QOLGAN-ISHLAR §4 darhol).
   Ishga tushurish: node tests/verify_ai.mjs */
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

/* ══════════════ A1 (2-qism): "metrga", miqdorlar va sig'mas buyurtma ══════════════ */
{
  let r = parseZamer('3.5 metrga 3 metr oshxona');
  eq('A1 "3.5 metrga 3 metr" → 3500×3000', [r.room.w, r.room.d], [3500, 3000]);
  r = parseZamer('3 yarim metr ga 3 metr oshxona');
  eq('A1 "3 yarim metr ga 3 metr" → 3500×3000', [r.room.w, r.room.d], [3500, 3000]);
  const sum = (o, k) => o.filter(x => x.kind === k).reduce((s, x) => s + x.qty, 0);
  r = parseZamer('oshxona 4x3, pastki 4 ta, ustki 3 ta');
  eq('A1 "pastki 4 ta, ustki 3 ta" (so\'z → son)', [sum(r.orders, 'pastki'), sum(r.orders, 'ustki')], [4, 3]);
  r = parseZamer('oshxona 4x3 pastki 4 ta ustki 3 ta');
  eq('A1 vergulsiz (ovoz) "pastki 4 ta ustki 3 ta"', [sum(r.orders, 'pastki'), sum(r.orders, 'ustki')], [4, 3]);
  r = parseZamer('oshxona 4x3, 3 ta pastki 2 ta ustki');
  eq('A1 "3 ta pastki 2 ta ustki" (son → so\'z, ikki marta sanalmaydi)', [sum(r.orders, 'pastki'), sum(r.orders, 'ustki')], [3, 2]);

  const b = await aiBuild('oshxona 4x3, pastki 4 ta, ustki 3 ta', catalog);
  const low = b.doc.placements.filter(p => !(p.z > 0) && p.h < 1800).length;
  const up = b.doc.placements.filter(p => p.z > 0).length;
  eq('A1 aiBuild so\'ralgan son: 4 pastki + 3 ustki', [low, up], [4, 3]);
  ok('A1 aiBuild: sig\'gan buyurtmada ogohlantirish yo\'q', (b.notes || []).length === 0, JSON.stringify(b.notes));
  const v = validateDoc(b.doc, { catalog });
  ok('A1 aiBuild 4+3: ustma-ust yo\'q', !v.warnings.concat(v.errors).some(w => /OVERLAP/.test(w.code)), JSON.stringify(v.warnings));
  const s = await aiBuild('oshxona 2x3, pastki 9 ta', catalog);
  ok('A1 sig\'magan buyurtma → "so\'raldi … sig\'di" ogohlantirishi', (s.notes || []).some(x => /pastki: 9 ta so'raldi/.test(x)), JSON.stringify(s.notes));
}

/* ══════════════ TZ-18 8-bosqich: AI uch tilda (internetsiz qoidali tahlilchi) ══════════════ */
{
  const I18N = join(APP, '..', 'web', 'src', 'i18n');
  const lug = (l) => JSON.parse(fs.readFileSync(join(I18N, l + '.json'), 'utf8'));
  const UZ = lug('uz'), RU = lug('ru'), EN = lug('en');
  const izi = (r) => JSON.stringify([r.room.w, r.room.d, r.room.h, r.room.layoutType,
    Object.entries(r.room.features).filter(([, v]) => v).map(([k]) => k), r.orders]);
  /* AI oynasidagi namunalar — tarjimasi o'zbekchadagidek tushuniladi (3-namunadagi "toko" — dizayn so'zi, faqat o'lcham) */
  for (const k of ['ai.misol1', 'ai.misol2']) {
    const u = izi(parseZamer(UZ[k]));
    eq('TZ-18 ' + k + ' ru = uz', JSON.parse(izi(parseZamer(RU[k]))), JSON.parse(u));
    eq('TZ-18 ' + k + ' en = uz', JSON.parse(izi(parseZamer(EN[k]))), JSON.parse(u));
  }
  for (const L of [RU, EN]) { const r = parseZamer(L['ai.misol3']); eq('TZ-18 ai.misol3 o\'lcham (' + (L === RU ? 'ru' : 'en') + ')', [r.room.w, r.room.d], [5000, 4000]); }

  const sum = (o, k) => o.filter(x => x.kind === k).reduce((s, x) => s + x.qty, 0);
  let r = parseZamer('П-образная кухня 4 на 3 метра, мойка, плита, холодильник, три верхних шкафа, окно 120 см');
  eq('TZ-18 ru: П-образная 4 на 3 метра → U 4000×3000', [r.room.layoutType, r.room.w, r.room.d], ['U', 4000, 3000]);
  ok('TZ-18 ru: мойка, плита, холодильник', r.room.features.sink && r.room.features.stove && r.room.features.fridge);
  eq('TZ-18 ru: "три верхних" → 3 ustki; окно 120 см → 1200', [sum(r.orders, 'ustki'), r.room.openings.map(o => o.type + o.width)], [3, ['window1200']]);
  r = parseZamer('кухня 3 с половиной на 2.8 м, высота потолка 2.6, мойка в углу, 3 штуки нижних');
  eq('TZ-18 ru: "3 с половиной на 2.8", потолок 2.6, "в углу" → L, 3 штуки нижних',
    [r.room.w, r.room.d, r.room.h, r.room.layoutType, sum(r.orders, 'pastki')], [3500, 2800, 2600, 'L', 3]);
  r = parseZamer('внутри шкафа полка');
  eq('TZ-18 ru: "внутри" — "три" emas (miqdor yo\'q)', r.orders, []);
  r = parseZamer('3 столешницы');
  eq('TZ-18 ru: столешница — stol emas', r.orders, []);

  r = parseZamer('L-shaped kitchen 3.6m x 3m, sink, stove, fridge, 3 upper cabinets');
  eq('TZ-18 en: L-shaped 3.6m x 3m → L 3600×3000', [r.room.layoutType, r.room.w, r.room.d], ['L', 3600, 3000]);
  ok('TZ-18 en: sink, stove, fridge, upper', r.room.features.sink && r.room.features.stove && r.room.features.fridge && r.room.features.upper);
  eq('TZ-18 en: 3 upper → 3 ustki', sum(r.orders, 'ustki'), 3);
  r = parseZamer('U-shaped kitchen 4 by 3 m, ceiling 2.8, window 1.2 m, two base cabinets, 2 tables');
  eq('TZ-18 en: 4 by 3 m, ceiling 2.8, window 1.2 m, two base, 2 tables',
    [r.room.layoutType, r.room.w, r.room.d, r.room.h, r.room.openings.map(o => o.type + o.width), sum(r.orders, 'pastki'), sum(r.orders, 'stol')],
    ['U', 4000, 3000, 2800, ['window1200'], 2, 2]);
  r = parseZamer('kitchen with 2 doors');
  eq('TZ-18 en: "with 2" — xona balandligi emas', r.room.h, 2700);
  r = parseZamer('cabinet height 2400, kitchen 3x4');
  eq('TZ-18 en: "cabinet height 2400" — mebel balandligi, xona emas', [r.room.h, r.unknown.length], [2700, 1]);
  r = parseZamer('3600 mm x 3000 mm kitchen');
  eq('TZ-18: "3600 mm x 3000 mm" → 3600×3000', [r.room.w, r.room.d], [3600, 3000]);
  r = parseZamer('360 sm x 300 sm');
  eq('TZ-18: "360 sm x 300 sm" → 3600×3000', [r.room.w, r.room.d], [3600, 3000]);
  r = parseZamer('oshxona 3000x4000 mebel');
  eq('TZ-18: "3000x4000 mebel" — "m" birlik emas', [r.room.w, r.room.d], [3000, 4000]);

  /* bitta oshxona uch tilda — bir xil loyiha */
  const uch = ['oshxona 4x3, L shakl, moyka, plita, xolodilnik, 3 ta ustki',
    'угловая кухня 4x3, мойка, плита, холодильник, 3 верхних',
    'L-shaped kitchen 4x3, sink, stove, fridge, 3 upper'];
  const qur = [];
  for (const m of uch) qur.push(await aiBuild(m, catalog));
  const iz = (b) => JSON.stringify(b.doc.placements.map(p => [p.frg, p.x, p.y, p.rot]).sort());
  ok('TZ-18 aiBuild: uz/ru/en — bir xil joylashuv', iz(qur[0]) === iz(qur[1]) && iz(qur[1]) === iz(qur[2]) && qur[0].doc.placements.length > 0,
    qur.map(b => b.doc.placements.length).join('/'));
  const vr = validateDoc(qur[1].doc, { catalog });
  ok('TZ-18 aiBuild ru: ustma-ust yo\'q', !vr.warnings.concat(vr.errors).some(w => /OVERLAP/.test(w.code)), JSON.stringify(vr.warnings));
}

console.log('\n' + (fails === 0 ? `=== HAMMASI OK (${n} ta tekshiruv) ===` : `=== ${fails}/${n} XATO ===`));
process.exit(fails ? 1 : 0);
