/* TZ-23 E: material va rang tanlash — ERP plitasi alohida material kodi (narx, varaq, raskroy), polka alohida (16 mm standart),
 * modul tanlovi loyihadan ustun, saqlashda faqat ishlatilgan ERP materiallari, 3D dekor rangi (nomidan, taxminiy). */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');
const { loadData, createHisob } = await import('../web/src/services/hisob.js');
const E = await import('../web/src/services/erpMaterial.js');
const { dekorRang } = await import('../app/js/engine/rang.js');

const DATA = fileURLToPath(new URL('../app/data/', import.meta.url));
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };

const H = createHisob(await loadData(n => Promise.resolve(JSON.parse(readFileSync(DATA + n, 'utf8')))));
const sheets = H.sheetCatalog.sheets;
const room = { outline: [[0, 0], [3600, 0], [3600, 3000], [0, 3000]], wall_height: 2700, wall_thickness: 100, openings: [] };
const yangiDoc = () => {
  const f = H.catalog['MC-KP-02'], g = H.catalog['MC-KP-11'];
  return { v: 1, room, placements: [
    { id: 'p1', frg: 'MC-KP-02', x: 50, y: 50, z: 100, w: 600, d: f.d, h: f.h, rot: 0, qty: 1 },
    { id: 'p2', frg: 'MC-KP-11', x: 650, y: 50, z: 100, w: 600, d: g.d, h: g.h, rot: 0, qty: 1 }] };
};
const qismlar = (r, slot) => r.cutlists.flatMap(c => c.parts.filter(p => p.slot === slot));

/* 1. dekor rangi — nomidan */
ok('dekor: oq / kulrang / yog\'och / Egger kodi', dekorRang('ЛДСП Кроношпан 16мм Белый').guruh === 'oq' && dekorRang('Серый графит').guruh === 'qora'
  && dekorRang('Дуб Сонома').yogoch && dekorRang('Egger H1145 ST10').guruh === 'yogoch_och' && dekorRang('W1000 ST9').guruh === 'oq');
ok('dekor: rangi aytilmagan nom — null (o\'ylab topilmaydi)', dekorRang('LDSP 18mm') === null && dekorRang('') === null);
const qamrov = sheets.filter(s => dekorRang(s.name)).length;
ok('dekor: ERP plitalarining kamida 60% rangi aniqlanadi', qamrov / sheets.length >= 0.6, qamrov + '/' + sheets.length);

/* 2. ERP plitasi → material kodi */
const oq = sheets.find(s => s.type === 'LDSP' && +s.th === 16 && s.uzs > 0 && /бел/i.test(s.name));
/* TZ-50 (2026-10-23): katalog FAQAT yangi baza narxli plitalari — katalogda narxsiz plita qolmadi; erpMaterial'ning narxsiz tarmog'i sinov namunasi bilan tekshiriladi (qiymat o'ylab topilmaydi: narx 0) */
ok('katalogda narxsiz plita yo\'q (TZ-50: faqat yangi baza narxli yozuvlari)', sheets.every(s => s.uzs > 0));
const narxsiz = { sku: '', name: 'ЛДСП 8мм 5кв Орех Калифорния ( Пр ) под заказ', cat: 'CRAFTWOOD (Тапоич)', type: 'LDSP', th: 16.0, l: 2750.0, w: 1830.0, uzs: 0, usd: 0.0, src: 'sinov' };   // avvalgi katalogdagi narxsiz yozuv (endi katalogda yo'q) — sinov namunasi
ok('ERP: namunalar topildi (narxli oq LDSP 16, narxsiz sinov namunasi)', !!oq && !!narxsiz);
ok('ERP kodi barqaror va har xil plitaga har xil', E.erpKod(oq) === E.erpKod({ ...oq }) && E.erpKod(oq) !== E.erpKod(narxsiz) && /^ERP-[0-9a-z]+$/.test(E.erpKod(oq)));
const kodlar = new Set(sheets.map(E.erpKod));
ok(`ERP kodi: ${sheets.length} plitada to'qnashuv yo'q`, kodlar.size === new Set(sheets.map(s => s.name + '|' + s.sku + '|' + s.th)).size, kodlar.size);
const mOq = E.erpMaterial(oq, H.materials), mNs = E.erpMaterial(narxsiz, H.materials);
ok('ERP material: narxi ERP\'dan, qalinlik, varaq o\'lchami', mOq.sheet_price === oq.uzs && mOq.thickness === 16 && mOq.sheets[0][0] === oq.l && !mOq.taxminiy);
const asos = H.materials.panel_materials.find(m => m.code === 'LDSP16');
ok('ERP material: narxi yo\'q — asos narxi, "taxminiy" (qoida 4.3)', mNs.sheet_price === asos.sheet_price && mNs.taxminiy && /taxminiy/.test(mNs.src));

/* 3. polka alohida — 16 mm */
const doc = yangiDoc();
const r0 = H.recalc(doc, { materialCode: 'LDSP18', fasadCode: 'MDF16' });
ok('eski loyiha (polka tanlanmagan): polka korpus bilan bir xil', qismlar(r0, 'polka').every(p => p.material === 'LDSP18'));
const r1 = H.recalc(doc, { materialCode: 'LDSP18', fasadCode: 'MDF16', polkaCode: 'LDSP16' });
const polka = qismlar(r1, 'polka');
ok('polka 16 mm: hamma polka LDSP16, 16 mm', polka.length > 0 && polka.every(p => p.material === 'LDSP16' && p.thickness === 16), polka.map(p => p.material + '/' + p.thickness).join());
ok('polka 16 mm: korpus o\'zgarmadi (LDSP18)', qismlar(r1, 'korpus').every(p => p.material === 'LDSP18'));
ok('polka 16 mm: raskroyda LDSP16 alohida', !!r1.nest.by_material.LDSP16);

/* 4. ERP plitasi loyihada: narx, raskroy, saqlash/ochish */
const d2 = yangiDoc();
const kod = E.erpQosh(H, d2, oq);
ok('erpQosh: doc.erpMat va hisob bazasiga qo\'shildi', d2.erpMat[kod] && H.materials.panel_materials.some(m => m.code === kod));
E.erpQosh(H, d2, oq);
ok('erpQosh: takror qo\'shilmaydi', H.materials.panel_materials.filter(m => m.code === kod).length === 1);
const r2 = H.recalc(d2, { materialCode: kod, fasadCode: 'MDF16', polkaCode: 'LDSP16' });
ok('ERP korpus: detallar shu kodda, raskroy alohida', qismlar(r2, 'korpus').every(p => p.material === kod) && !!r2.nest.by_material[kod]);
ok('ERP korpus: jami narx > 0 va kotirovka yig\'indisi teng', r2.priceRes.total > 0 && r2.priceRes.lines.reduce((a, l) => a + l.amount, 0) === r2.priceRes.total);

/* 5. modul tanlovi loyihadan ustun */
const d3 = yangiDoc();
const kodN = E.erpQosh(H, d3, narxsiz);
d3.placements[1].slots = { korpus: kodN };
const r3 = H.recalc(d3, { materialCode: 'LDSP18', fasadCode: 'MDF16', polkaCode: 'LDSP16' });
const p1 = r3.cutlists[0].parts.filter(p => p.slot === 'korpus'), p2 = r3.cutlists[1].parts.filter(p => p.slot === 'korpus');
ok('modul: faqat shu modul korpusi ERP plitasida, boshqasi — loyihadagi', p1.every(p => p.material === 'LDSP18') && p2.every(p => p.material === kodN));

/* 6. saqlash: faqat ishlatilgan ERP materiallari; ochishda tiklanadi */
const d4 = yangiDoc();
const k1 = E.erpQosh(H, d4, oq), k2 = E.erpQosh(H, d4, narxsiz);
d4.placements[0].slots = { fasad: k2 };
E.erpSaqla(H, d4, ['LDSP18', 'LDSP16', 'MDF16']);
ok('saqlash: ishlatilmagan ERP (loyihada tanlanmagan) olib tashlandi, modulniki qoldi', !d4.erpMat[k1] && !!d4.erpMat[k2], Object.keys(d4.erpMat || {}).join());
const d5 = yangiDoc();
E.erpSaqla(H, d5, ['LDSP18']);
ok('saqlash: ERP ishlatilmasa — erpMat yo\'q', !('erpMat' in d5));
const H2 = createHisob(await loadData(n => Promise.resolve(JSON.parse(readFileSync(DATA + n, 'utf8')))));
const saqlangan = JSON.parse(JSON.stringify(d4));
ok('ochish: yangi sessiyada ERP materiali yo\'q edi', !H2.materials.panel_materials.some(m => m.code === k2));
E.erpUla(H2, saqlangan);
const r6 = H2.recalc(saqlangan, { materialCode: 'LDSP18', fasadCode: 'MDF16', polkaCode: 'LDSP16' });
ok('ochish: erpUla — modul fasadi saqlangan ERP plitasida hisoblanadi', r6.cutlists[0].parts.filter(p => p.slot === 'fasad').every(p => p.material === k2));

/* 7. 3D: joylashuvlarga dekor rangi (nusxa — hujjat o'zgarmaydi) */
const pj = { matCode: k1, polkaCode: 'LDSP16', fasadCode: 'MDF16', orqaCode: null, stolCode: null };
const j = E.joyRanglari(H, d4.placements, pj);
ok('3D: korpus dekori (oq) har modulda, umumiy material rangsiz', j.every(p => p._rang && p._rang.korpus && p._rang.korpus.guruh === 'oq' && !p._rang.polka));
ok('3D: hujjat obyektlari o\'zgarmaydi (nusxa)', !('_rang' in d4.placements[0]) && j[0] !== d4.placements[0]);
const j2 = E.joyRanglari(H, d4.placements, { matCode: 'LDSP18', fasadCode: 'MDF16' });
const fasadRangi = dekorRang(narxsiz.name);
ok('3D: modul fasadi — o\'z dekori (nomida rang bo\'lsa), umumiy materialdagi modul — standart ko\'rinish',
  (fasadRangi ? j2[0]._rang && j2[0]._rang.fasad.rang === fasadRangi.rang : j2[0] === d4.placements[0]) && j2[1] === d4.placements[1]);

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
