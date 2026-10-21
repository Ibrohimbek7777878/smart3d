/* verify_admin_qatlam.mjs — TZ-37 (2-faza): admin o'zgartirishlari fayl ustiga qo'yilishi (engine/adminQatlam.js + hisob.js loadData/createHisob).
 * Materiallar: Asosiy 100 rangi/rasmi/varaq narxi → plita rangi, material rasmi, ERP varag'i narxi (hisobga ta'sir qiladi).
 * Katalog: modul nomi (uz/ru/en), o'lcham chegarasi (admin > sex standarti — applyStandards'dan keyin ham), narx rejimi, yashirish
 * (tanlash va AI tanlovi o'zgaradi, hisob-kitob va ochiq loyihalar — yo'q). Admin o'zgartirishi yo'q bo'lsa — hech narsa o'zgarmaydi.
 * erpKod: server (admin) va brauzer bitta funksiya. Ishga tushirish: node tests/verify_admin_qatlam.mjs */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');
const { loadData, createHisob } = await import('../web/src/services/hisob.js');
const E = await import('../web/src/services/erpMaterial.js');
const Q = await import('../app/js/engine/adminQatlam.js');
const { erpKod } = await import('../app/js/engine/erpKod.js');
const { applySexStandart } = await import('../app/js/engine/standart.js');
const { katalogdanTop } = await import('../app/js/engine/katalogTanlash.js');
const { matndanSpec, specTekshir } = await import('../app/js/engine/konstruksiyaTili.js');

const DATA = fileURLToPath(new URL('../app/data/', import.meta.url));
const J = (n) => JSON.parse(readFileSync(DATA + n, 'utf8'));
const read = n => Promise.resolve(J(n));
const apiFake = (mv, kv) => (yol) => (yol === '/api/materiallar' && mv ? Promise.resolve(mv) : yol === '/api/katalog' && kv ? Promise.resolve(kv) : Promise.reject(new Error('HTTP 404')));
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };

const H0 = createHisob(await loadData(read));                                   // admin o'zgartirishsiz
const A = J('dekor-asosiy.json').items;
const e0 = A[0], kod0 = e0.kodlar[0];
const sh0 = H0.sheetCatalog.sheets.find(s => erpKod(s) === kod0);

console.log('\n[1] erpKod — bitta funksiya (server va brauzer)');
ok('erpMaterial.erpKod === engine/erpKod.erpKod', E.erpKod === erpKod);
ok('dekor-asosiy.json dagi 175 ERP kodining hammasi varaqlar katalogida va materials-index.json da', (() => {
  const a = new Set(H0.sheetCatalog.sheets.map(erpKod)), b = new Set(J('materials-index.json').items.map(erpKod));
  return A.every(e => e.kodlar.every(c => a.has(c) && b.has(c)));
})());

console.log('\n[2] Admin o\'zgartirishi yo\'q → hech narsa o\'zgarmaydi');
const bosh = createHisob(await loadData(read, apiFake({ dekor: {}, narx: {} }, { modullar: {} })));
ok('katalog bir xil (JSON)', JSON.stringify(bosh.catalog) === JSON.stringify(H0.catalog));
ok('varaqlar, Asosiy 100, rasmlar bir xil', JSON.stringify(bosh.sheetCatalog) === JSON.stringify(H0.sheetCatalog) && JSON.stringify(bosh.dekorAsosiy.items) === JSON.stringify(H0.dekorAsosiy.items) && JSON.stringify(bosh.rasmlar) === JSON.stringify(H0.rasmlar));
ok('nomlar bir xil; yashirin yo\'q; korinadiKatalog = katalogning o\'zi', JSON.stringify(bosh.nomlar) === JSON.stringify(H0.nomlar) && bosh.yashirin.size === 0 && bosh.korinadiKatalog === bosh.catalog);
const server0 = createHisob(await loadData(read, () => Promise.reject(new Error('server yo\'q'))));
ok('server xato bersa — jim, fayldagi qiymatlar', JSON.stringify(server0.catalog) === JSON.stringify(H0.catalog) && server0.yashirin.size === 0);
ok('sinov rejimi (api berilmagan) — so\'rov ketmaydi', JSON.stringify(createHisob(await loadData(read)).catalog) === JSON.stringify(H0.catalog));

console.log('\n[3] Materiallar: rang, rasm, varaq narxi');
const yangiNarx = sh0.uzs + 50000, rasmYol = 'api/materiallar/rasm/' + encodeURIComponent(e0.kalit) + '?v=abc123def456';
const mv = { dekor: { [e0.kalit]: { rang_hex: '#123456', rasm: rasmYol } }, narx: { [kod0]: yangiNarx } };
const H1 = createHisob(await loadData(read, apiFake(mv, null)));
const sh1 = H1.sheetCatalog.sheets.find(s => erpKod(s) === kod0);
ok('rang: Asosiy 100 yozuvi va "aniq" belgisi', H1.dekorAsosiy.kod.get(kod0).rang_hex === '#123456' && H1.dekorAsosiy.kod.get(kod0).rang_ishonch === 'aniq');
ok('plitaRangi (plitka va 3D bir manba) admin rangida', E.plitaRangi(H1, sh1).rang === 0x123456 && E.plitaRangi(H1, sh1).taxminiy === false);
ok('materialRang (3D) ham admin rangida va rasm bilan', (() => { const c = E.erpQosh(H1, { placements: [] }, sh1), r = E.materialRang(H1, c); return !!r && r.rasm === rasmYol && r.rang === 0x123456; })());
ok('rasm: materialRasm → admin rasmi (ERP-kod bo\'yicha eski rasm ustun emas)', (() => { const r = E.materialRasm(H1, kod0, sh1.name); return r && r.src === rasmYol && r.mm[0] === 2800; })());
ok('boshqa dekorlar o\'zgarmagan', JSON.stringify(H1.dekorAsosiy.items.slice(1)) === JSON.stringify(H0.dekorAsosiy.items.slice(1)));
ok('varaq narxi: varaqlar katalogi va materiallar indeksida shu ERP kodi', sh1.uzs === yangiNarx && sh0.uzs !== yangiNarx);
ok('varaq narxi: boshqa varaqlar o\'zgarmagan', H1.sheetCatalog.sheets.every((s, i) => erpKod(s) === kod0 || s.uzs === H0.sheetCatalog.sheets[i].uzs));
ok('erpMaterial.sheet_price = admin narxi (tasdiqlangan)', E.erpMaterial(sh1, H1.materials).sheet_price === yangiNarx && E.erpMaterial(sh1, H1.materials).taxminiy === false);
const room = { outline: [[0, 0], [3600, 0], [3600, 3000], [0, 3000]], wall_height: 2700, wall_thickness: 100, openings: [] };
const hujjat = (H) => { const f = H.catalog['SP-K-001']; return { v: 1, room, placements: [{ id: 'p1', frg: 'SP-K-001', x: 50, y: 50, z: 0, w: f.w, d: f.d, h: f.h, rot: 0, qty: 1 }] }; };
const hisob = (H, sh) => { const doc = hujjat(H), c = E.erpQosh(H, doc, sh); return H.recalc(doc, { materialCode: c, polkaCode: c, fasadCode: 'MDF16' }); };
const r0 = hisob(H0, sh0), r1 = hisob(H1, sh1);
const l0 = r0.prod.lines.find(l => l.code === erpKod(sh0)), l1 = r1.prod.lines.find(l => l.code === erpKod(sh1));
ok('HISOBGA ta\'sir: raskroydagi list narxi = admin narxi', !!l0 && !!l1 && l0.unit_price === sh0.uzs && l1.unit_price === yangiNarx, JSON.stringify([l0 && l0.unit_price, l1 && l1.unit_price]));
ok('HISOBGA ta\'sir: jami narx farq qiladi, list soni bir xil', r1.priceRes.total !== r0.priceRes.total && l0.qty === l1.qty);
ok('yangi narx — faqat shu dekor tanlanganda (boshqa varaq narxi o\'zgarmagan)', (() => { const o = A[1].kodlar[0], s0 = H0.sheetCatalog.sheets.find(s => erpKod(s) === o), s1 = H1.sheetCatalog.sheets.find(s => erpKod(s) === o); return s0.uzs === s1.uzs; })());
/* noto'g'ri qiymatlar e'tiborsiz */
const yomon = createHisob(await loadData(read, apiFake({ dekor: { [e0.kalit]: { rang_hex: 'qizil', rasm: 'javascript:alert(1)' }, [A[1].kalit]: { rasm: 'https://evil.example/x.png' }, [A[2].kalit]: { rasm: '//evil.example/x.png' }, yoq: { rang_hex: '#000000' } },
  narx: { [kod0]: 12.5, 'ERP-yoq': 100, [A[1].kodlar[0]]: -5, [A[2].kodlar[0]]: '999', x: 1 } }, null)));
ok('noto\'g\'ri rang/rasm/narx va noma\'lum kalitlar e\'tiborsiz', JSON.stringify(yomon.sheetCatalog) === JSON.stringify(H0.sheetCatalog) && JSON.stringify(yomon.dekorAsosiy.items) === JSON.stringify(H0.dekorAsosiy.items) && JSON.stringify(yomon.rasmlar) === JSON.stringify(H0.rasmlar));
ok('materiallarQollash(null/{}) xato bermaydi', Q.materiallarQollash(null, {}) === null && Q.materiallarQollash({}, null) !== undefined && (Q.materiallarQollash({}, { dekor: [], narx: 5 }), true));

console.log('\n[4] Katalog: nom, chegara, narx rejimi, yashirish');
const KOD = 'SP-K-001', f0 = H0.catalog[KOD];
const kv = { modullar: { [KOD]: { nom_uz: 'Yangi nom', nom_ru: 'Новое имя', nom_en: 'New name', min_d: 400, max_d: 620, price_mode: 'm2', yashirin: true } } };
const H2 = createHisob(await loadData(read, apiFake(null, kv)));
const f2 = H2.catalog[KOD];
ok('chegara: modulga admin qiymati', f2.min_d === 400 && f2.max_d === 620 && f0.min_d !== 400);
ok('chegara: boshqa o\'qlar sex standartida qoladi', f2.min_h === f0.min_h && f2.max_h === f0.max_h && f2.min_w === f0.min_w);
ok('narx rejimi: m2; boshqa modullar o\'zgarmagan', f2.price_mode === 'm2' && f0.price_mode === 'unit' && Object.keys(H0.catalog).filter(k => k !== KOD).every(k => JSON.stringify(H2.catalog[k]) === JSON.stringify(H0.catalog[k])));
ok('nomlar: uz/ru/en modul nomi; boshqa nomlar o\'zgarmagan', H2.nomlar.uz.modullar[KOD] === 'Yangi nom' && H2.nomlar.ru.modullar[KOD] === 'Новое имя' && H2.nomlar.en.modullar[KOD] === 'New name'
  && H2.nomlar.ru.modullar['MC-KP-02'] === H0.nomlar.ru.modullar['MC-KP-02'] && f2.name === f0.name);
/* ustunlik: sex standarti keyin o'zgarsa (server /api/sex-standartlari → applyStandards) ham admin chegarasi turadi */
const std = J('sex-standartlari.json'), std2 = JSON.parse(JSON.stringify(std));
std2.modullar[f0.standart].d = { min: 300, max: 700 };
H2.applyStandards(std2); H0.applyStandards(std2);
ok('sex standarti o\'zgargach: admin chegarasi (400–620) o\'zgarmaydi', f2.min_d === 400 && f2.max_d === 620);
ok('shu standartdagi boshqa modul sex standartiga ergashadi', (() => { const b = Object.values(H2.catalog).find(f => f.code !== KOD && f.standart === f0.standart && (f.standart_olchamlar || ['w', 'd', 'h']).includes('d')); return b && b.min_d === 300 && b.max_d === 700; })());
ok('admin chegarasiz modul (H0) — standart bo\'yicha 300–700', H0.catalog[KOD].min_d === 300 && H0.catalog[KOD].max_d === 700);
ok('applySexStandart: admin_lim bo\'lmasa xulq o\'zgarmaydi', (() => { const x = applySexStandart({ standart: f0.standart, standart_olchamlar: ['d'] }, std); return x.min_d === std.modullar[f0.standart].d.min; })());
/* yashirish */
ok('yashirish: H.yashirin, korinadiKatalog yashirinsiz, catalog to\'liq', H2.yashirin.has(KOD) && !(KOD in H2.korinadiKatalog) && KOD in H2.catalog && Object.keys(H2.korinadiKatalog).length === Object.keys(H2.catalog).length - 1);
ok('hisob-kitob o\'zgarmaydi: yashirin modulli hujjat narxi yashirishsiz bilan bir xil', (() => {
  const d = hujjat(H0); const ra = H0.recalc(d, { materialCode: 'LDSP16', fasadCode: 'MDF16' }), rb = H2.recalc(JSON.parse(JSON.stringify(d)), { materialCode: 'LDSP16', fasadCode: 'MDF16' });
  return ra.priceRes.total === rb.priceRes.total && ra.cutlists.length === rb.cutlists.length && rb.cutlists.length === 1;
})());
const aiMatn = 'pastki shkaf 600', aiRaw = matndanSpec(aiMatn);
const aiT0 = katalogdanTop(specTekshir(aiRaw).spec, aiRaw, H0.korinadiKatalog, aiMatn);
const H3 = createHisob(await loadData(read, apiFake(null, { modullar: { [aiT0.frg]: { yashirin: true } } })));
const aiT1 = katalogdanTop(specTekshir(aiRaw).spec, aiRaw, H3.korinadiKatalog, aiMatn);
ok('AI/katalog tanlovi: yashirin modul tanlanmaydi (' + aiT0.frg + ' yashirilsa — ' + (aiT1 ? aiT1.frg : 'hech narsa') + '), lekin katalogda turadi', !!aiT0.frg && (!aiT1 || aiT1.frg !== aiT0.frg) && !!H3.catalog[aiT0.frg]);

console.log('\n[5] Sof funksiyalar: noto\'g\'ri qiymatlar e\'tiborsiz');
const kat = { A: { w: 1, min_w: 100, max_w: 200 }, B: { w: 2 } };
ok('katalogQollash: butun bo\'lmagan/manfiy chegara va noma\'lum rejim e\'tiborsiz', Q.katalogQollash(kat, { modullar: { A: { min_w: 5.5, max_w: -1, min_d: '9', price_mode: 'kg' }, YOQ: { min_w: 1 } } }) === 0 && JSON.stringify(kat.A) === JSON.stringify({ w: 1, min_w: 100, max_w: 200 }));
ok('katalogQollash(null) xato bermaydi', Q.katalogQollash(kat, null) === 0 && Q.katalogQollash(null, { modullar: { A: { min_w: 1 } } }) === 0);
ok('yashirinKodlar: faqat yashirin === true', (() => { const s = Q.yashirinKodlar({ modullar: { A: { yashirin: true }, B: { yashirin: 1 }, C: { yashirin: false }, D: {} } }); return s.size === 1 && s.has('A'); })());
ok('korinadiKatalog: yashirin yo\'q — o\'sha obyekt; bor — nusxa', Q.korinadiKatalog(kat, new Set()) === kat && Q.korinadiKatalog(kat, new Set(['A'])) !== kat && !('A' in Q.korinadiKatalog(kat, new Set(['A']))));
ok('katalogNomlar: bo\'sh/probelli nom e\'tiborsiz, probellar kesiladi', (() => { const o = {}; Q.katalogNomlar(o, { modullar: { A: { nom_uz: '  Salom ', nom_ru: '   ', nom_en: 5 } } }); return o.nomlarUz.modullar.A === 'Salom' && !o.nomlarRu && !o.nomlarEn; })());

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
