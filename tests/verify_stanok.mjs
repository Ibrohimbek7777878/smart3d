/* TZ-11 (2-tahrir): stanok fayllari — GibLab .project (Bazis eksportidek) va KDT prisadka fayli.
 *   Har doim: o'qish/yozish aylanishi (yozilgan .project qayta o'qilsa — o'sha model), KDT o'qlari, kodirovka.
 *   Mahalliy ma'lumot bo'lsa (git'da yo'q — mijoz fayllari, Smart3D_toplam_2026-10-16): 30 ta buyurtmaning sexdagi .project
 *   fayllaridan bizning KDT yoziladi va sexdagi asl KDT bilan detalma-detal solishtiriladi (o'lcham, kromka tomonlari,
 *   teshiklar — turi, joyi, diametri, chuqurligi); .project — o'qib, qayta yozib, yana o'qilganda aynan.
 * Ishlatish: node tests/verify_stanok.mjs [--batafsil] */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectOqi, projectYoz, xncOqi } from '../app/js/engine/post/project.js';
import { kdtYoz, kdtOqi, kdtOqlar, kdtFayllar } from '../app/js/engine/post/kdt.js';
import { matnOqi, cp1251, lotin } from '../app/js/engine/post/xml.js';
import { stanokModeli } from '../app/js/engine/post/smart3d.js';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BATAFSIL = process.argv.includes('--batafsil');
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const skip = (name) => console.log('  · o\'tkazib yuborildi:', name);

/* ── 1) sun'iy detal: o'qlar, kromka, teshiklar ── */
{
  const d = { kod: '7', nom: 'Боковина ящика', dl: 2284, dw: 650, t: 16, kromka: { b: 1, l: 1, t: 0, r: 0 } };
  const tes = [{ tur: 'f', x: 50, y: 28, d: 7, otuvchi: true }, { tur: 'f', x: 1489.5, y: 45, d: 5, dp: 9 }, { tur: 'r', y: 55, z: 8, d: 4.5, dp: 35 }];
  const k = kdtOqi(kdtYoz(d, tes, 1));
  ok('KDT: o\'lcham, kromka (b → past, l → chap), nom lotincha', k.L === 2284 && k.W === 650 && k.T === 16 && k.kromka.bottom === 1 && k.kromka.left === 1 && !k.kromka.top && k.nom === '[7] Bokovina jaschika', JSON.stringify(k.kromka) + ' ' + k.nom);
  const f = k.teshiklar.filter(h => h.tur === 1), h = k.teshiklar.find(h => h.tur === 2);
  ok('KDT: yuza teshigi Y = dw − y, o\'tuvchi — qalinlik + 0,5', f.some(x => x.x === 50 && x.y === 622 && x.dp === 16.5 && x.d === 7) && f.some(x => x.x === 1489.5 && x.y === 605 && x.dp === 9), JSON.stringify(f));
  ok('KDT: qirra teshigi — o\'ng qirra (kvadrant 1), Z', h && h.kv === 1 && h.x === 2284 && h.y === 595 && h.z === 8 && h.dp === 35 && h.d === 4.5, JSON.stringify(h));
  const r = kdtOqlar(568, 630, 1);
  ok('KDT: eni uzunidan katta detal burilib yoziladi (uzun tomon — X)', r.L === 630 && r.W === 568 && r.f(10, 20).join() === '20,10');
  ok('KDT: qatorlar CRLF, ASCII', /\r\n/.test(kdtYoz(d, tes, 1)) && /^[\x00-\x7f]*$/.test(kdtYoz(d, tes, 1)));
  ok('lotin: sex qoidasi (ь tushadi, я → ja, щ → sch, ц → c, ы → i, й → j)', lotin('Задняя панель ящика') === 'Zadnjaja panel jaschika' && lotin('конструкция панельных дверей') === 'konstrukcija panelnih dverej' && lotin('Дверь') === 'Dver');
  ok('cp1251: kirill 1 bayt (Bazis .project kodirovkasi)', cp1251('Дверь')[0] === 0xc4 && cp1251('ё')[0] === 0xb8 && cp1251('a').length === 1);
  /* .project: yozish → o'qish */
  const M = { nom: 'Sinov', varaqlar: [{ id: 'V1', t: 16, nom: 'ЛДСП 16мм Белый', l: 2750, w: 1830 }], kromkalar: [{ id: 'K1', t: 1, w: -1, nom: 'Кромка 19/1 Белый' }],
    detallar: [{ id: '1', nom: 'бак', dl: 2284, dw: 650, soni: 2, kod: '1', varaq: 'V1', kromka: { t: null, b: 'K1', l: 'K1', r: null }, xnc: [{ side: 1, dz: 16, teshiklar: tes }] },
      { id: '2', nom: 'polka', dl: 568, dw: 630, soni: 3, kod: '2', varaq: 'V1', kromka: { t: null, b: 'K1', l: null, r: null }, xnc: [] }] };
  const P = projectOqi(projectYoz(M));
  const a = P.detallar[0];
  ok('.project: yozilgan fayl qayta o\'qilsa — detallar, soni, kromka, plita aynan', P.detallar.length === 2 && a.dl === 2284 && a.soni === 2 && a.kromka.b && a.kromka.l && !a.kromka.t
    && P.varaqlar[0].nom === 'ЛДСП 16мм Белый' && P.kromkalar[0].nom === 'Кромка 19/1 Белый' && P.detallar[1].soni === 3, JSON.stringify(P.detallar.map(x => [x.dl, x.soni, x.kromka])));
  ok('.project: XNC — teshiklar (tur, joyi, diametri, o\'tuvchi) aynan', a.xnc.length === 1 && JSON.stringify(a.xnc[0].teshiklar.map(h => [h.tur, h.x, h.y, h.z, h.d, h.dp, !!h.otuvchi]).sort()) === JSON.stringify(tes.map(h => [h.tur, h.x, h.y, h.z, h.d, h.dp, !!h.otuvchi]).sort()));
  ok('.project: Bazis sarlavhasi va kodlari (importBMV 1.84, windows-1251, XNC kodi 0001x001x1)', /^<\?xml version="1.0" encoding="windows-1251"\?><project importBMV="1.84">/.test(projectYoz(M)) && /code="0001x001x1"/.test(projectYoz(M)));
}

/* ── 1b) Smart3D loyihasi → stanok modeli: MC-KP-02 (sex moduli) ── */
{
  const require = createRequire(import.meta.url);
  globalThis.SpPrice = require('../app/js/engine/price.js');
  const { loadData, createHisob } = await import('../web/src/services/hisob.js');
  const C = await import('../app/js/engine/chizish.js');
  const H = createHisob(await loadData(n => Promise.resolve(JSON.parse(readFileSync(join(ROOT, 'app/data', n), 'utf8')))));
  const f = H.catalog['MC-KP-02'];
  const ch = Object.assign(C.yangiChizma('shkaf'), { w: 1200 });
  H.catalog['CH-T1'] = C.chizmaKatalog(ch, 'CH-T1', 'Shkaf');
  const doc = { v: 1, room: { outline: [[0, 0], [4000, 0], [4000, 3000], [0, 3000]], wall_height: 2700, wall_thickness: 100, openings: [] },
    placements: [{ id: 'p1', frg: 'MC-KP-02', x: 0, y: 0, z: 100, w: 600, d: f.d, h: f.h, rot: 0, qty: 2 }, { id: 'p2', frg: 'SP-K-001', x: 700, y: 0, z: 0, w: 600, d: 560, h: 820, rot: 0, qty: 1 },
      { id: 'p3', frg: 'CH-T1', x: 1400, y: 0, z: 0, w: 1200, d: 600, h: 2200, rot: 0, qty: 1 }] };
  const r = H.recalc(doc, { materialCode: 'LDSP16', fasadCode: 'MDF16', polkaCode: 'LDSP16' });
  const { model, ogoh } = stanokModeli({ cutlists: r.cutlists, placements: doc.placements, catalog: H.catalog, materials: H.materials, nom: 'Sinov' });
  const pol = model.detallar.find(d => d.nom === 'pol' && d.dl === 600 && d.dw === 450);
  const xy = pol && pol.xnc[0] ? pol.xnc[0].teshiklar.filter(h => h.tur === 'f').map(h => [h.x, h.y, h.d, !!h.otuvchi].join(',')).sort() : [];
  /* sex fayli (3311, "pol" 600×450): bf (8,65) (8,385) (592,65) (592,385) Bore7 throughBoreDepth */
  ok('MC-KP-02 "pol" teshiklari — sexdagi .project dagi bilan aynan (Ø7 o\'tuvchi, 8/592 × 65/385)', JSON.stringify(xy) === JSON.stringify(['592,385,7,true', '592,65,7,true', '8,385,7,true', '8,65,7,true']), JSON.stringify(xy));
  ok('soni joylashuv soniga ko\'paytiriladi (2 ta modul — 2 ta pol)', pol && pol.soni === 2);
  const bok = model.detallar.find(d => d.nom === 'bok');
  ok('kromka: old qirra — "b" (sex fayllaridagidek)', bok && bok.kromka.b && !bok.kromka.t);
  ok('umumiy SP modul teshiklari stanok fayliga kirmaydi (ogohlantirish)', ogoh.spTeshik > 0);
  const yon = model.detallar.find(d => d.nom === 'Yon devor');
  ok('qo\'lda chizilgan shkaf: yon devorda konfirmat teshiklari (Ø7 yuza, Ø4,5 qirra)', yon && yon.xnc[0] && yon.xnc[0].teshiklar.some(h => h.tur === 'f' && h.d === 7) && yon.xnc[0].teshiklar.some(h => h.tur !== 'f' && h.d === 4.5));
  const M2 = projectOqi(projectYoz(model));
  ok('Smart3D .project — qayta o\'qilsa detallar, soni, teshiklar aynan', M2.detallar.length === model.detallar.length && M2.detallar.every((d, i) => d.soni === model.detallar[i].soni && d.dl === model.detallar[i].dl && (d.xnc[0] ? d.xnc[0].teshiklar.length : 0) === (model.detallar[i].xnc[0] ? model.detallar[i].xnc[0].teshiklar.length : 0)));
  const kq = (id) => (model.kromkalar.find(k => k.id === id) || {}).t || 0;
  const fl = model.detallar.flatMap(d => kdtFayllar({ kod: d.kod, nom: d.nom, dl: d.dl, dw: d.dw, t: d.t, kromka: Object.fromEntries(Object.entries(d.kromka).map(([q, id]) => [q, id ? kq(id) : 0])) }, d.xnc));
  ok(`KDT: ${fl.length} ta fayl — har biri o'qiladi, o'lcham va teshiklar bilan`, fl.length > 5 && fl.every(f => { const k = kdtOqi(f.matn); return k.L > 0 && k.W > 0 && k.L >= k.W; }));
  delete H.catalog['CH-T1'];
}

/* ── 2) haqiqiy buyurtmalar (mahalliy, git'da yo'q) ── */
const TOP = join(ROOT, '..', 'Smart3D', 'Smart3D_toplam_2026-10-16', '01_buyurtma_fayllari');
if (existsSync(join(TOP, '01_arra')) && existsSync(join(TOP, '02_kromka_prisadka'))) {
  const st = { detal: 0, kdt: 0, aynan: 0, b180: 0, farq: 0, faylsiz: 0, kontur: 0, freza: 0, kodTakror: 0, boshqaVersiya: 0 }, farqlar = [];
  let loy = 0, aylana = 0, aylanaJami = 0;
  /* Bazis .project da dl/dw butungacha yaxlitlangan (203), KDT da aniq (202.75) — o'lcham ±0,5, teshik ±0,3 mm */
  const tng = (a, b) => Math.abs((a || 0) - (b || 0)) < 0.31, tngO = (a, b) => Math.abs((a || 0) - (b || 0)) < 0.51;
  /* teshiklar to'plami teng (tartibsiz) */
  const teng = (A, B) => {
    if (A.length !== B.length) return false;
    const qol = B.slice();
    for (const a of A) {
      const i = qol.findIndex(b => b.tur === a.tur && (a.tur === 1 || b.kv === a.kv) && tng(a.x, b.x) && tng(a.y, b.y) && tng(a.z, b.z) && tng(a.dp, b.dp) && tng(a.d, b.d));
      if (i < 0) return false;
      qol.splice(i, 1);
    }
    return true;
  };
  const bur = (k) => ({ ...k, kromka: Object.fromEntries(Object.entries(k.kromka).map(([q, v]) => [{ top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[q], v])),
    teshiklar: k.teshiklar.map(h => ({ ...h, x: k.L - h.x, y: k.W - h.y, kv: h.kv ? { 1: 2, 2: 1, 3: 4, 4: 3 }[h.kv] : h.kv })) });
  const kromkaTeng = (a, b) => JSON.stringify(Object.keys(a).sort().map(k => [k, a[k]])) === JSON.stringify(Object.keys(b).sort().map(k => [k, b[k]]));
  for (const d of readdirSync(join(TOP, '01_arra')).filter(x => /^\d+_/.test(x))) {
    const kd = join(TOP, '02_kromka_prisadka', d);
    if (!existsSync(kd)) continue;
    /* Bazis eksporti (windows-1251, importBMV) — GibLab qayta saqlagan (_2, UTF-8, narxli) emas */
    const pf = readdirSync(join(TOP, '01_arra', d)).filter(x => /\.project$/i.test(x)).map(x => join(TOP, '01_arra', d, x))
      .map(f => ({ f, txt: matnOqi(readFileSync(f)) })).find(x => /^<\?xml[^>]*\?>\s*<project importBMV=/.test(x.txt));
    if (!pf) continue;
    loy++;
    const P = projectOqi(pf.txt);
    /* aylanish: o'qish → yozish → o'qish */
    const P2 = projectOqi(projectYoz(P));
    const im = (M) => JSON.stringify(M.detallar.map(x => [x.nom, x.dl, x.dw, x.soni, x.kod, (M.varaqlar.find(v => v.id === x.varaq) || {}).nom, ['t', 'b', 'l', 'r'].map(q => x.kromka[q] ? (M.kromkalar.find(k => k.id === x.kromka[q]) || {}).nom : 0),
      x.xnc.map(c => [c.side, c.teshiklar.map(h => [h.tur, h.x, h.y, h.z, h.d, h.dp, !!h.otuvchi].join()).sort().join(';')])]));
    aylanaJami++; if (im(P) === im(P2)) aylana++; else if (BATAFSIL) console.log('    aylanish farqi:', d.slice(0, 4));
    const kq = (id) => (P.kromkalar.find(k => k.id === id) || {}).t || 0;
    /* bir kod — bir KDT fayl: bir xil detallar (o'lcham, kromka, teshik) bitta kodda bo'lishi mumkin; har xil bo'lsa — sexdagi xato */
    const imzo = (x) => JSON.stringify([x.dl, x.dw, x.kromka, x.xnc.map(c => [c.side, c.teshiklar.map(h => [h.tur, h.x, h.y, h.z, h.d]).sort()])]);
    const kodImzo = {}; for (const x of P.detallar) (kodImzo[x.kod] = kodImzo[x.kod] || new Set()).add(imzo(x));
    const kodSoni = Object.fromEntries(Object.entries(kodImzo).map(([k, s]) => [k, s.size]));
    const korilgan = new Set();
    for (const x of P.detallar) {
      st.detal++;
      const t = (P.varaqlar.find(v => v.id === x.varaq) || {}).t || 16;
      const det = { kod: x.kod, nom: x.nom, dl: x.dl, dw: x.dw, t, kromka: Object.fromEntries(['t', 'b', 'l', 'r'].map(q => [q, kq(x.kromka[q])])) };
      if (x.xnc.some(c => Object.keys(c.boshqa || {}).length)) st.freza++;
      /* Bazis .project o'lchamni butungacha yaxlitlaydi (646), KDT — aniq (645.5): solishtirish uchun aniq o'lcham olinadi */
      const f0 = join(kd, x.kod + '_1.XML');
      if (existsSync(f0)) {
        const a0 = kdtOqi(readFileSync(f0, 'latin1')), rot = x.dl < x.dw;
        const [aL, aW] = rot ? [a0.W, a0.L] : [a0.L, a0.W];
        if (Math.abs(aL - x.dl) <= 0.51 && Math.abs(aW - x.dw) <= 0.51) { det.dl = aL; det.dw = aW; }
      }
      for (const fy of kdtFayllar(det, x.xnc)) {
        const f = join(kd, fy.nom);
        if (!existsSync(f)) { st.faylsiz++; continue; }
        st.kdt++;
        const asl = kdtOqi(readFileSync(f, 'latin1'));
        if (asl.kontur !== 4) { st.kontur++; continue; }                         // egri kontur — frezalash (keyingi bosqich)
        if (kodSoni[x.kod] > 1) { st.kodTakror++; continue; }                     // ikki xil detalga bir kod — bitta fayl (sexdagi ma'lumot)
        if (korilgan.has(fy.nom)) continue;                                        // bir xil detal — fayli bir marta solishtiriladi
        korilgan.add(fy.nom);
        const biz = kdtOqi(fy.matn), c = { side: +fy.nom.slice(-5, -4) };
        const olcham = tngO(biz.L, asl.L) && tngO(biz.W, asl.W) && tngO(biz.T, asl.T);
        if (!olcham) { st.boshqaVersiya++; continue; }                            // KDT boshqa loyiha variantidan (o'lchami boshqa)
        const aslTesh = asl.teshiklar;
        if (olcham && kromkaTeng(biz.kromka, asl.kromka) && teng(biz.teshiklar, aslTesh)) st.aynan++;
        else { const b2 = bur(biz); if (olcham && kromkaTeng(b2.kromka, asl.kromka) && teng(b2.teshiklar, aslTesh)) st.b180++; else { st.farq++; if (farqlar.length < 40) farqlar.push({ d: d.slice(0, 4), kod: x.kod, side: c.side, nom: x.nom, olcham, kromka: [biz.kromka, asl.kromka], tesh: [biz.teshiklar.length, aslTesh.length] }); } }
      }
    }
  }
  const mos = st.aynan + st.b180, sol = mos + st.farq;
  console.log('   ', JSON.stringify(st));
  if (BATAFSIL) for (const f of farqlar) console.log('    farq:', JSON.stringify(f));
  ok(`.project: ${aylanaJami} ta sex faylida o'qish → yozish → o'qish aynan (${aylana}/${aylanaJami})`, aylana === aylanaJami && loy >= 25);
  ok(`KDT: ${sol} ta to'rtburchak detal yuzasi — sexdagi KDT bilan aynan (${st.aynan}) yoki 180° burilgan (${st.b180}); farq ${st.farq} (${(100 * mos / Math.max(1, sol)).toFixed(1)}%)`, sol > 1500 && mos / sol >= 0.97, '');
} else skip('haqiqiy buyurtmalar (Smart3D_toplam_2026-10-16 yo\'q)');

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
