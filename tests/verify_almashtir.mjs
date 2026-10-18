/* Modulni almashtirish (egasi #239–#241): yangi modul eskisining joyida, eski modul ustma-ust tushmasdan chetga (engine/almashtir.js,
 * services/loyiha.js almashtir). Tekshiriladi: oddiy qator, band qator (devor oxirigacha → boshqa devor), joy yo'q, burchak, burilgan
 * modul, ustki modul, Erkin maydon; ustma-ust 0; devordan >= 3 mm; hujjat joy topilmasa o'zgarmaydi. */
import { almashtirishJoyi, joyYaroqli } from '../app/js/engine/almashtir.js';
import { devorChegara, devorOraliqlari, kirgan } from '../app/js/engine/devorOraliq.js';
import { footprint } from '../app/js/engine/rules.js';
import { registerHooks } from 'node:module';
registerHooks({ load(url, ctx, next) { return next(url, url.endsWith('.json') ? Object.assign({}, ctx, { importAttributes: { type: 'json' } }) : ctx); } });
const L = await import('../web/src/services/loyiha.js');

let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const J = JSON.stringify;
const xona = (W, D, o = {}) => Object.assign({ outline: [[0, 0], [W, 0], [W, D], [0, D]], wall_height: 2700, wall_thickness: 100, openings: [], utilities: [] }, o);
const R = xona(5000, 4000), T = devorChegara(R);
const mod = (id, o) => Object.assign({ id, frg: 'X', w: 600, d: 560, h: 720, z: 0, rot: 0, qty: 1 }, o);
const frag = (o) => Object.assign({ code: 'NEW', name: 'Yangi', category: 'base_cabinet', w: 800, d: 560, h: 720 }, o);
const ustma = (pl) => { let n = 0; for (let i = 0; i < pl.length; i++) for (let j = i + 1; j < pl.length; j++) if (kirgan(pl[i], pl[j])) n++; return n; };
const devordan = (room, pl) => Math.min(...pl.flatMap(p => devorOraliqlari(room, p, 80).map(g => g.oraliq)), 99);
const qoy = (room, pl) => ({ room, placements: pl, kitchen: L.freshKitchen() });
const tekshir = (nom, doc, eskiId, fr, o = {}) => {
  const asl = JSON.stringify(doc.placements);
  const r = L.almashtir(doc, eskiId, fr, o.eskiFrag);
  return { r, asl };
};

/* 1. oddiy: orqa devorga tiralgan qator o'rtasidagi modul — yangi o'sha joyda, eski o'ngga (yoki chapga) chetga */
{
  const a = mod('p1', { x: T, y: T }), b = mod('p2', { x: T + 1000, y: T }), c = mod('p3', { x: T + 2000, y: T });
  const doc = qoy(R, [a, b, c]);
  const { r } = tekshir('oddiy', doc, 'p2', frag());
  ok('oddiy: almashtirildi', !!r && r.yangi.frg === 'NEW');
  const fy = footprint(r.yangi), cx = T + 1000 + 300;   // eski modul markazi (u siljigan)
  ok("oddiy: yangi eski modulning orqa chetining o'rtasida (devorga bog'langan)", Math.abs((fy.x0 + fy.x1) / 2 - cx) < 1 && Math.abs(fy.y0 - T) < 0.5, J(fy));
  ok("oddiy: yangi modul eni 800, orqa devordan 3 mm", r.yangi.w === 800 && Math.abs(devordan(R, [r.yangi]) - 3) < 0.01);
  ok("oddiy: eski modul o'chmadi, ustma-ust 0", doc.placements.length === 4 && doc.placements.includes(b) && ustma(doc.placements) === 0, ustma(doc.placements));
  ok("oddiy: eski modul siljidi va hamma modul devordan >= 3 mm", (b.x !== T + 600 || b.y !== T) && devordan(R, doc.placements) >= 2.99, J(b));
}

/* 2. chetda bo'sh joy: oxirgi modul almashtirilganda yon tomonga suriladi, yana ustma-ust 0 */
{
  const pl = [mod('p1', { x: T, y: T }), mod('p2', { x: T + 1000, y: T })];
  const doc = qoy(R, pl);
  const r = L.almashtir(doc, 'p2', frag({ w: 1000 }));
  ok('chet: eski modul o\'ng/chap yon tomonga ("yon")', r && r.eskiJoyi === 'yon' && !r.ogoh, J(r && { j: r.eskiJoyi, o: r.ogoh }));
  ok('chet: ustma-ust 0, devordan >= 3', ustma(doc.placements) === 0 && devordan(R, doc.placements) >= 2.99);
  ok('chet: eski modul o\'sha devor bo\'ylab (orqa y o\'zgarmadi)', pl[1].y === T && pl[1].rot === 0, J(pl[1]));
}

/* 3. butun orqa devor band: eski modul boshqa devorga o'tadi (burilib, orqasi devorga) */
{
  const W = 2000, Rk = xona(W, 3000), Tk = devorChegara(Rk);
  const pl = [mod('p1', { x: Tk, y: Tk, w: 900 }), mod('p2', { x: Tk + 900, y: Tk, w: 994 })];   // ichki eni 2000-2*53 = 1894 ... xona 2000: 53..1947 = 1894 → 900+994
  const doc = qoy(Rk, pl);
  const r = L.almashtir(doc, 'p2', frag({ w: 994 }));
  ok("band devor: eski modul boshqa devorga ('devor')", r && r.eskiJoyi === 'devor', J(r && r.eskiJoyi));
  ok('band devor: ustma-ust 0, devordan >= 3, xonada', ustma(doc.placements) === 0 && devordan(Rk, doc.placements) >= 2.99 && doc.placements.every(p => joyYaroqli(Rk, doc.placements.filter(q => q !== p), p)));
  ok("band devor: eski modul orqasi boshqa devorga qaragan (rot o'zgardi)", r.eskiJoyi !== 'devor' || pl[1].rot !== 0, J(pl[1]));
}

/* 4. burchak: burchakdagi modul almashtiriladi (ikkala devordan 3 mm) */
{
  const pl = [mod('p1', { x: T, y: T, w: 900, d: 900 })];
  const doc = qoy(R, pl);
  const r = L.almashtir(doc, 'p1', frag({ w: 900, d: 900 }));
  ok('burchak: yangi aynan burchakda, ikkala devordan 3 mm', r && Math.abs(r.yangi.x - T) < 0.5 && Math.abs(r.yangi.y - T) < 0.5 && devordan(R, [r.yangi]) >= 2.99, J(r && r.yangi));
  ok('burchak: eski modul ustma-ust emas', ustma(doc.placements) === 0 && doc.placements.length === 2);
}

/* 5. burilgan modul (o'ng devorga qaragan, rot 90): yangi o'sha burilishda, devor bo'ylab */
{
  const x = 5000 - T, pl = [mod('p1', { x, y: 1000, rot: 90 }), mod('p2', { x, y: 1600, rot: 90 })];
  const doc = qoy(R, pl);
  const r = L.almashtir(doc, 'p2', frag({ w: 700 }));
  ok('burilgan: yangi rot 90, orqasi devordan 3 mm', r && r.yangi.rot === 90 && Math.abs(devordan(R, [r.yangi]) - 3) < 0.01, J(r && r.yangi));
  ok('burilgan: ustma-ust 0, eski modul rot saqlandi (devor bo\'ylab)', ustma(doc.placements) === 0 && pl[1].rot === 90 && r.eskiJoyi === 'yon', J(pl[1]));
}

/* 6. joy yo'q: xona modulga zo'rg'a yetadi — almashtirish rad etiladi, hujjat O'ZGARMAYDI */
{
  const Rs = xona(700, 700), Ts = devorChegara(Rs);
  const pl = [mod('p1', { x: Ts, y: Ts, w: 590, d: 590 })];
  const doc = qoy(Rs, pl), asl = J(doc);
  const r = L.almashtir(doc, 'p1', frag({ w: 590, d: 590 }));
  ok("joy yo'q: yangi ham, eski ham sig'maydi → null, hujjat o'zgarmadi", r === null && J(doc) === asl, J(r));
}

/* 7. eski sig'maydi, yangi esa yaqin joyga tushadi → ogoh 'eski_qoldi' (eski joyida qoladi) */
{
  const Rs = xona(1400, 700), Ts = devorChegara(Rs);   // ichki 1294 x 594
  const pl = [mod('p1', { x: Ts, y: Ts, w: 590, d: 590 })];
  const doc = qoy(Rs, pl);
  const r = L.almashtir(doc, 'p1', frag({ w: 590, d: 590 }));
  /* eski surilishi mumkin (bo'sh joy bor) → 'yon'; bu holat yuqorida: ustma-ust 0 */
  ok("tor xona: eski yonga suriladi, ustma-ust 0", r && r.eskiJoyi === 'yon' && ustma(doc.placements) === 0, J(r));
  const Rt = xona(700, 1300), Tt = devorChegara(Rt);
  const pl2 = [mod('p1', { x: Tt, y: Tt, w: 590, d: 590 }), mod('p2', { x: Tt, y: Tt + 700, w: 590, d: 590 })];
  const doc2 = qoy(Rt, pl2);
  /* p1 ni almashtirish: yangi o'rnida; eski p1 hech qayerga sig'maydi (p2 yo'lda) -> 'eski_qoldi' yoki null */
  const r2 = L.almashtir(doc2, 'p1', frag({ w: 590, d: 590 }));
  ok("to'la xona: sig'maganda ustma-ust bo'lmaydi (null yoki ogoh)", r2 === null ? true : ustma(doc2.placements) === 0, J(r2 && r2.ogoh));
}

/* 7b. eski hech qayerga sig'maydi, yangi kichik — yaqin bo'sh joyga, eski joyida (ogoh) */
{
  const Rs = xona(1400, 700), Ts = devorChegara(Rs);
  const pl = [mod('p1', { x: Ts, y: Ts, w: 590, d: 590 }), mod('p2', { x: 757, y: Ts, w: 590, d: 590 })];   // orasida 114 mm
  const doc = qoy(Rs, pl);
  const r = L.almashtir(doc, 'p1', frag({ w: 100, d: 590 }));
  ok("eski sig'madi: ogoh 'eski_qoldi', eski joyida, ustma-ust 0", r && r.ogoh === 'eski_qoldi' && pl[0].x === Ts && ustma(doc.placements) === 0, J(r && { o: r.ogoh, y: r.yangi }));
}

/* 8. ustki modul (z 1450): pastki modullar xalal bermaydi; z saqlanadi (bir xil tur) */
{
  const fU = { code: 'U1', name: 'Ustki', category: 'wall_cabinet', w: 600, d: 320, h: 720 };
  const pl = [mod('p1', { x: T, y: T }), mod('p2', { x: T + 600, y: T, z: 1450, h: 720, d: 320 })];
  const doc = qoy(R, pl);
  const r = L.almashtir(doc, 'p2', fU, fU);
  ok('ustki: yangi z = 1450 (eski bilan bir xil tur), pastki p1 ga xalal bermaydi', r && r.yangi.z === 1450 && r.eski.x > T + 600 && ustma(doc.placements) === 0, J(r && r.yangi));
  const r2 = L.almashtir(qoy(R, [mod('q', { x: T, y: T, z: 1450, h: 720 })]), 'q', frag(), fU);
  ok("ustki → pastki tur o'zgarsa: z = katalog standarti (0)", r2 && r2.yangi.z === 0, J(r2 && r2.yangi.z));
}

/* 9. Erkin maydon: devor yo'q; yonma-yon suriladi */
{
  const pl = [mod('p1', { x: 300, y: 1000 }), mod('p2', { x: 1600, y: 1000 })];
  const doc = qoy(R, pl); doc.maydon = 'erkin';
  const r = L.almashtir(doc, 'p2', frag({ w: 1000 }));
  ok('erkin: yangi eski joyida, eski yonida, ustma-ust 0', r && r.yangi.x === 1600 + 300 - 500 && ustma(doc.placements) === 0, J(r && r.yangi));
}

/* 10. yangi modul boshqa modul bilan to'qnashsa (kengroq) — yaqin joyga, ogoh */
{
  const pl = [mod('p1', { x: T, y: T }), mod('p2', { x: T + 600, y: T }), mod('p3', { x: T + 1200, y: T })];
  const doc = qoy(R, pl);
  const r = L.almashtir(doc, 'p2', frag({ w: 1400 }));     // p1, p3 ga kiradi
  ok("keng yangi modul: ustma-ust 0 va natija bor (ogoh yoki siljish)", r && ustma(doc.placements) === 0 && devordan(R, doc.placements) >= 2.99, J(r && r.ogoh));
}

/* 11. toza funksiya hujjatga tegmaydi; mavjud bo'lmagan id → null */
{
  const pl = [mod('p1', { x: T, y: T })], asl = J(pl);
  const j = almashtirishJoyi(R, pl, 'p1', { w: 800, d: 560, h: 720, z: 0 });
  ok('almashtirishJoyi hujjatni o\'zgartirmaydi', J(pl) === asl && j && j.yangi);
  ok('id yo\'q → null', almashtirishJoyi(R, pl, 'zz', { w: 1, d: 1, h: 1 }) === null);
}

console.log(`\n${pass} o'tdi, ${fail} xato`);
process.exit(fail ? 1 : 0);
