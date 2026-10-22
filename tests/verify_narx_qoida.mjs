/* verify_narx_qoida.mjs — TZ-48 (egasi #301/#302, 2026-10-22): narx qoidalari.
 *   [1] sukutlar: ustama 0% (taklif 35%), prisadka va Bazis YOQILGAN, stoleshnitsa va akril narxga kiradi (mijoz materiali belgisi chiqaradi)
 *   [2] xizmatlar katalogi: prisadka 12 xizmat (PRISADKA-USLUGA 2-band narxlari), raspil Holzma 1/2/3 = 25 000 / 43 000 / 48 000 (sukut Holzma 2, HDF — Holzma 1),
 *       narxlar ERP xizmatlar jadvali bilan mos (maxfiy fayl bo'lsa)
 *   [3] +1 qo'shimcha raspil: sukutda bor (tanlangan stanok stavkasida), olib tashlanadi/qaytariladi, asosiy list soni o'zgarmaydi
 *   [4] Bazis: 5 000 × (16, 18, 19 mm detallar soni); HDF va boshqa qalinlik hisobga olinmaydi; o'chirilsa — yo'q
 *   [5] «Furniturasiz» jami: hisob (jami) o'zgarmaydi, furnitura (va unga ustama) chiqarilgan; modullar yig'indisi ikkala jamiga teng
 *   [6] narx tarkibi: bo'limlar yig'indisi AYNAN jamiga teng (turli sozlamalarda), qator yig'indisi = bo'lim jami, har qatorda manba va qoida
 *   [7] plita narx rejimi: sotuv (ro'yxat − 25 000; yo'q bo'lsa tannarx × 1,156; tagi tannarx) / tannarx; admin qo'lda va taxminiy narx o'zgarmaydi; list soni o'zgarmaydi
 *   [8] «Xizmat qo'shish»: katalog (ERP + Smart3D katalogi, qidiruv, guruhlar), qo'shilgan qator narxga ustamasiz kiradi, tekshiruv
 *   [9] ustama narx panelidan (doc.ustama), narx hujjati plita bo'limi (server tekshiruvi)
 * Ishga tushirish: node tests/verify_narx_qoida.mjs */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { cutlist, productionCost } from '../app/js/engine/cutlist.js';
import { nestProject } from '../app/js/engine/nesting.js';
import { narxSukut, narxQollash, narxXatoMi, plitaNarxi, plitaSozlama, plitaERPMi, raspilXizmat, raspilYupqaXizmat, bazisXizmat, prisadkaXizmat, PLITA_SUKUT } from '../app/js/engine/narxStavka.js';
import { xizmatKatalog, xizmatQidir, qoshXizmatTekshir, XIZMAT_GURUHLAR } from '../app/js/engine/xizmatKatalog.js';

const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const J = (p) => JSON.parse(readFileSync(join(ROOT, 'app/data', p), 'utf8'));
const mats = J('materials.json');
let n = 0, fails = 0;
const ok = (name, cond, extra = '') => { n++; if (!cond) { fails++; console.log('FAIL  ' + name + (extra ? '  → ' + extra : '')); } else console.log('ok    ' + name); };
const sum = (a) => a.reduce((s, x) => s + x, 0);

/* sinov loyihasi: fragmentlar (teshik, kromka, furnitura bor), ERP-test plita (ro'yxat narxi bor) */
const frags = J('fragments.json').filter(f => (f.holes || []).length && (f.hardware || []).length).slice(0, 5);
const mkMats = (extra = {}) => {
  const m = JSON.parse(JSON.stringify(mats));
  m.panel_materials.push(Object.assign({ code: 'ERP-TEST', name: 'ЛДСП ERP sinov', thickness: 16, sheet_price: 300000, sheet_lst: 400000, src: 'ERP', sheets: [[2800, 2070]] }, extra));
  return m;
};
const furnById = Object.fromEntries(J('furnitura-catalog.json').items.filter(i => i.id).map(i => [i.id, i]));
const furnBoglash = (J('furnitura-boglash.json').links) || {};
const hisobla = (m, slots, opt = {}) => {
  const cls = frags.map((f, i) => Object.assign(cutlist(f, f.w, f.d, f.h, m, { projectSlots: slots }), { placementId: 'p' + i }));
  const parts = []; cls.forEach(cl => cl.parts.forEach(p => parts.push(Object.assign({}, p, { id: cl.placementId + ':' + p.ref }))));
  const nest = nestProject(parts, m, { mode: 'bssf', kerf: 4, trimL: 10, trimW: 10 });
  return { cls, nest, run: (o = {}) => productionCost(cls, m, Object.assign({ nestResult: nest, furnituraById: furnById, furnituraBoglash: furnBoglash }, opt, o)) };
};
const S0 = narxSukut(mats);
const SLOT_ERP = { korpus: 'ERP-TEST', polka: 'ERP-TEST', fasad: 'ERP-TEST', orqa: 'ERP-TEST' };
const mT = mkMats();
const H = hisobla(mT, SLOT_ERP);
const base = H.run({ stavka: S0 });

console.log('\n[1] Sukutlar (egasi #301)');
ok('ustama sukutda 0%: materials.json, narx hujjati, stavkasiz hisob; taklif 35%', mats.pricing.markup_pct === 0 && mats.pricing.markup_taklif === 0.35 && S0.ustama.foiz.qiymat === 0 && S0.ustama.foiz.manba === 'egasi'
  && base.markupPct === 0 && base.clientTotal === base.totalCost && productionCost(H.cls, mT, { nestResult: H.nest }).markupPct === 0);
ok('ustama qo\'lda yoqilsa (markupPct 0.35) — faqat plita + furnitura narxiga', (() => { const p = H.run({ stavka: S0, markupPct: 0.35 }); return p.clientTotal === Math.round((p.sheetCost + p.hwCost) * 1.35) + (p.totalCost - p.sheetCost - p.hwCost); })());
ok('admin ustamani qo\'lda 20% qilsa — o\'sha qiymat ustun', H.run({ stavka: narxQollash(S0, { ustama: { foiz: 20 } }).next }).markupPct === 0.2);
ok('prisadka va Bazis sukutda YOQILGAN (xizmatlar berilmasa)', base.xizmat_taklif.teshik.tanlangan === true && base.holeCost > 0 && base.xizmat_taklif.bazis.tanlangan === 'onlayn' && base.bazisCost > 0);
ok('usta o\'chirsa: prisadka (teshik: false) va Bazis (bazis: false) narxdan chiqadi', (() => { const p = H.run({ stavka: S0, xizmatlar: { teshik: false, bazis: false } }); return p.holeCost === 0 && p.bazisCost === 0 && p.xizmat_taklif.teshik.amount > 0 && p.xizmat_taklif.bazis.taklif > 0; })());
/* stoleshnitsa va akril sukutda narxga KIRADI; mijoz materiali belgisi (qo'lda) chiqaradi */
const stolCl = { parts: [{ length: 2000, width: 600, material: 'STOL26-3050', thickness: 26, qty: 1 }, { length: 700, width: 400, material: 'MDF18', thickness: 18, qty: 1 }, { length: 900, width: 500, material: 'LDSP16', thickness: 16, qty: 1 }], edges: [], holes: [], hardware: [] };
const pS = productionCost([stolCl], mats, { stavka: S0 });
const lS = (p, c) => p.lines.find(l => l.code === c && l.group !== 'Raspil');
ok('stoleshnitsa (STOL26-3050) narxga kiradi (ERP narxi)', lS(pS, 'STOL26-3050') && lS(pS, 'STOL26-3050').amount > 0 && !lS(pS, 'STOL26-3050').mijoz);
ok('akril/MDF18 narxga kiradi', lS(pS, 'MDF18') && lS(pS, 'MDF18').amount > 0 && !lS(pS, 'MDF18').mijoz);
const pM = productionCost([stolCl], mats, { stavka: S0, mijozMat: { 'STOL26-3050': true, MDF18: true } });
ok('mijoz materiali belgilansa — stoleshnitsa va akril narxdan chiqadi (qator qoladi, summa 0)', lS(pM, 'STOL26-3050').amount === 0 && lS(pM, 'STOL26-3050').mijoz && lS(pM, 'MDF18').amount === 0 && pM.sheetCost === pS.sheetCost - lS(pS, 'STOL26-3050').amount - lS(pS, 'MDF18').amount);
ok('Bazis hisobi: 3 detaldan faqat LDSP16 va MDF18 (16, 18 mm) hisoblanadi; stoleshnitsa (26 mm) hisoblanmaydi', pS.xizmat_taklif.bazis.qty === 2 && pS.bazisCost === 2 * 5000);

console.log('\n[2] Xizmatlar katalogi');
const xz = S0.xizmatlar, bynom = (nom) => Object.values(xz).find(q => q.nom === nom) || {};
const P12 = { 'ПРИСАДКА ЕВРО': 1600, 'ПРИСАДКА ЕВРО 2': 1200, 'ПРИСАДКА МЕТКА 3-2,5': 300, 'ПРИСАДКА ОВАЛ КАТТА': 10000, 'ПРИСАДКА ОВАЛ КИЧИК': 3000, 'ПРИСАДКА ОВАЛ КИЧИК 5': 5000,
  'ПРИСАДКА ПЕТЛЕ': 900, 'ПРИСАДКА ПОЛКАДЕРЖАТЕЛ': 800, 'ПРИСАДКА РУЧКА': 800, 'ПРИСАДКА ШКАНТ': 800, 'ПРИСАДКА ЭКСЕРТРИК': 1400, 'Присадка Паз': 4000 };
ok('prisadka xizmatlari 12 ta, narxlar PRISADKA-USLUGA 2-banddagi', Object.entries(P12).every(([nom, q]) => bynom(nom).qiymat === q && bynom(nom).guruh === 'prisadka' && bynom(nom).birlik === 'dona') && Object.values(xz).filter(r => r.guruh === 'prisadka').length === 12,
  JSON.stringify(Object.entries(P12).filter(([nom, q]) => bynom(nom).qiymat !== q)));
ok('raspil: Holzma 1 / 2 / 3 = 25 000 / 43 000 / 48 000 (list); sukut Holzma 2; HDF (yupqa) — Holzma 1', bynom('Услуга Распила Holzma 1').qiymat === 25000 && bynom('Услуга Распила Holzma 2').qiymat === 43000 && bynom('Услуга Распила Holzma 3').qiymat === 48000
  && /Holzma 2$/.test(raspilXizmat(S0).nom) && /Holzma 1$/.test(raspilYupqaXizmat(S0).nom) && bynom('Услуга Распила Altendorf 2').qiymat === 33000);
ok('Bazis: sukut stavka — Bazis5, 5 000 so\'m/detal', bazisXizmat(S0, 'onlayn').qiymat === 5000 && /Bazis5/.test(bazisXizmat(S0, 'onlayn').nom));
ok('prisadka teshik turlari avvalgidek bog\'langan (ЕВРО, ПЕТЛЕ, ПОЛКАДЕРЖАТЕЛ, РУЧКА, ШКАНТ, ЭКСЕРТРИК, МЕТКА); ОВАЛ/Паз teshik sifatida avtomatik TANILMAYDI (texnolog javobi)',
  prisadkaXizmat(S0, 'konfirmat_yuza').qiymat === 1600 && prisadkaXizmat(S0, 'petlya').qiymat === 900 && prisadkaXizmat(S0, 'polka').qiymat === 800 && prisadkaXizmat(S0, 'ruchka').qiymat === 800
  && prisadkaXizmat(S0, 'shkant').qiymat === 800 && prisadkaXizmat(S0, 'eksentrik').qiymat === 1400 && prisadkaXizmat(S0, 'belgi').qiymat === 300
  && !Object.values(S0.tanlov.prisadka).some(k => /ОВАЛ|Паз/.test(xz[k].nom)));
ok('narx hujjati server tekshiruvidan o\'tadi (qayta qo\'llash o\'zgarish bermaydi)', narxQollash(S0, { xizmatlar: S0.xizmatlar, tanlov: S0.tanlov }).ozgarish.length === 0);
const ERP_X = join(ROOT, '..', 'Smart3D', 'Smart3D_malumot', 'erp-xizmatlar-2026-10-18.json');
if (!existsSync(ERP_X)) console.log('skip  maxfiy ERP xizmatlar fayli yo\'q — ERP bilan solishtirish o\'tkazib yuborildi');
else {
  const erp = JSON.parse(readFileSync(ERP_X, 'utf8')).xizmatlar;
  const farq = Object.entries(xz).filter(([kod, r]) => { const e = erp.find(x => String(x.code) === kod); return !e || Math.round(e.client_price) !== r.qiymat; });
  ok(`narx hujjatidagi ${Object.keys(xz).length} xizmat ERP xizmatlar jadvali (2026-10-18) bilan aynan mos`, farq.length === 0, JSON.stringify(farq.map(([k, r]) => [k, r.nom, r.qiymat])));
  const kat = J('erp-xizmatlar.json').xizmatlar;
  ok('xizmat qo\'shish katalogi (erp-xizmatlar.json) ERP bilan mos: har qatorda kod, narx, faol', kat.length > 150 && kat.every(r => { const e = erp.find(x => String(x.code) === r.kod && x.id === r.erp_id); return e && e.is_active && Math.round(e.client_price) === r.narx; }));
}

console.log('\n[3] +1 qo\'shimcha raspil (egasi #302 Q3)');
const rq = (p) => p.lines.find(l => l.code === 'raspil_qosh');
const r1 = H.run({ stavka: S0 }), r0 = H.run({ stavka: S0, xizmatlar: { raspil1: false } });
const asosiyList = (p) => p.lines.filter(l => l.group === 'Raspil' && l.code !== 'raspil_qosh').reduce((s, l) => s + l.qty, 0);
ok('sukutda +1 list qo\'shimcha raspil: alohida qator, 1 list × tanlangan stanok stavkasi (Holzma 2 — 43 000)', !!rq(r1) && rq(r1).qty === 1 && rq(r1).unit_price === 43000 && rq(r1).amount === 43000 && rq(r1).tasdiq === true && r1.xizmat_taklif.raspil1.bor === true);
ok('olib tashlansa (xizmatlar.raspil1 = false): qator yo\'q, raspil summasi aynan 43 000 ga kam, taklif "mumkin" qoladi (qaytarish tugmasi uchun)', !rq(r0) && r1.raspilCost - r0.raspilCost === 43000 && r0.xizmat_taklif.raspil1.mumkin === true && r0.xizmat_taklif.raspil1.bor === false && r0.xizmat_taklif.raspil1.narx === 43000);
ok('qaytarilsa (raspil1: true) — yana bor; asosiy raspil list soni va plita list soni o\'zgarmaydi', H.run({ stavka: S0, xizmatlar: { raspil1: true } }).raspilCost === r1.raspilCost && asosiyList(r1) === asosiyList(r0) && r1.breakdown.sheetsCount === r0.breakdown.sheetsCount);
const S3 = narxQollash(S0, { tanlov: { raspil: Object.entries(xz).find(([, q]) => q.nom === 'Услуга Распила Holzma 3')[0] } }).next;
ok('stanok almashsa (Holzma 3) — +1 raspil shu stavkada: 48 000', rq(H.run({ stavka: S3 })).unit_price === 48000);
ok('raspil stanogi tanlanmagan bo\'lsa — +1 ham yo\'q (stavka o\'ylab topilmaydi); katalog kartasi narxida (areaEstimate) yo\'q', (() => { const S = JSON.parse(JSON.stringify(S0)); S.tanlov.raspil = null; return !rq(H.run({ stavka: S })) && !H.run({ stavka: S }).xizmat_taklif.raspil1.mumkin; })()
  && !rq(H.run({ stavka: S0, areaEstimate: true })));
ok('plitasiz (bo\'sh) loyiha — +1 raspil yo\'q', !rq(productionCost([{ parts: [], edges: [], holes: [], hardware: [] }], mats, { stavka: S0 })));
ok('perModule yig\'indisi = jami (+1 raspil bilan ham)', sum(r1.perModule.map(m => m.client)) === r1.clientTotal);

console.log('\n[4] Bazis: 5 000 × (16, 18, 19 mm) detallar; HDF hisobga olinmaydi (egasi #301/#302 Q2)');
const qalin = (ts) => ({ parts: ts.map((t, i) => ({ length: 500 + i, width: 300, material: t <= 4 ? 'HDF3' : 'LDSP16', thickness: t, qty: 1 })), edges: [], holes: [], hardware: [] });
const bz = (ts, xo = {}) => productionCost([qalin(ts)], mats, { stavka: S0, xizmatlar: xo });
const pB = bz([16, 16, 18, 19, 19, 3, 3, 3, 8, 10, 12, 25]);
ok('12 detaldan faqat 16/18/19 mm (5 ta) hisoblanadi: 5 × 5 000 = 25 000; HDF 3 mm (3 ta), 8/10/12/25 mm hisobga olinmaydi', pB.xizmat_taklif.bazis.qty === 5 && pB.xizmat_taklif.bazis.jami === 12 && pB.bazisCost === 25000
  && pB.lines.find(l => l.code === 'bazis').qty === 5 && pB.lines.find(l => l.code === 'bazis').unit_price === 5000 && pB.lines.find(l => l.code === 'bazis').tasdiq === true);
ok('18,4 yoki 15,9 kabi kasr qalinlik eng yaqin butunga yaxlitlanadi (18 / 16)', bz([18.4, 15.9]).xizmat_taklif.bazis.qty === 2 && bz([17.2, 20, 14]).xizmat_taklif.bazis.qty === 0);
ok('faqat HDF loyihasi — Bazis xizmati 0', bz([3, 3]).bazisCost === 0 && !bz([3, 3]).lines.some(l => l.code === 'bazis'));
ok('Bazis o\'chirilsa (bazis: false yoki null) — qator ham, summa ham yo\'q; taklif summasi 25 000', [false, null].every(v => { const p = bz([16, 16, 18, 19, 19, 3], { bazis: v }); return p.bazisCost === 0 && !p.lines.some(l => l.code === 'bazis') && p.xizmat_taklif.bazis.taklif === 25000; }));
ok('perModule: Bazis faqat 16/18/19 mm detalli modulga taqsimlanadi; yig\'indi = jami', (() => { const p = productionCost([qalin([3, 3]), qalin([16, 18])], mats, { stavka: S0 }); return sum(p.perModule.map(m => m.client)) === p.clientTotal && p.bazisCost === 10000; })());

console.log('\n[5] «Furniturasiz» jami (egasi #301, 2-qaror)');
for (const mk of [0, 0.35]) {
  const p = H.run({ stavka: S0, markupPct: mk });
  ok(`ustama ${mk * 100}%: furniturasiz = jami − furnitura × (1 + ustama); furnitura ${p.hwCost} so'm`, p.hwCost > 0 && p.clientFurnsiz === Math.round(p.sheetCost * (1 + mk)) + (p.clientTotal - Math.round((p.sheetCost + p.hwCost) * (1 + mk)))
    && Math.abs((p.clientTotal - p.clientFurnsiz) - p.hwCost * (1 + mk)) <= 1.5 && p.totalCostFurnsiz === p.totalCost - p.hwCost);
  ok(`ustama ${mk * 100}%: hisob buzilmaydi (jami o'zgarmagan), modullar yig'indisi ikkala jamga teng`, p.clientTotal === H.run({ stavka: S0, markupPct: mk }).clientTotal && sum(p.perModule.map(m => m.client)) === p.clientTotal && sum(p.perModule.map(m => m.clientFurnsiz)) === p.clientFurnsiz);
}
ok('furnitura bo\'lmasa — ikkala jami teng', (() => { const p = productionCost([qalin([16])], mats, { stavka: S0 }); return p.clientFurnsiz === p.clientTotal; })());

console.log('\n[6] Narx tarkibi (egasi #301, 7-qaror): yig\'indi = jami');
const qoshX = [{ kod: '780236010876', nom: 'ПРИСАДКА ОВАЛ КАТТА', guruh: 'prisadka', birlik: 'dona', narx: 10000, manba: 'sex jadvali', sana: '2026-10-18', soni: 3 },
  { kod: 'SRV_DELIVERY', nom: 'Yetkazib berish', guruh: 'boshqa', birlik: 'reys', narx: 200000, manba: 'taxmin', sana: '2026-10-14', soni: 1 }];
const holatlar = [
  ['sukut', { stavka: S0 }], ['ustama 35%', { stavka: S0, markupPct: 0.35 }], ['ustama 12,5%', { stavka: S0, markupPct: 0.125 }],
  ['prisadka va Bazis o\'chiq, +1 raspil olingan', { stavka: S0, xizmatlar: { teshik: false, bazis: false, raspil1: false } }],
  ['qo\'shilgan xizmatlar', { stavka: S0, qoshXizmat: qoshX }], ['qo\'shilgan xizmatlar + ustama 35%', { stavka: S0, qoshXizmat: qoshX, markupPct: 0.35 }],
  ['mijoz materiali', { stavka: S0, mijozMat: { 'ERP-TEST': true } }], ['stavkasiz (materials.json)', {}], ['tannarx rejimi', { stavka: narxQollash(S0, { plita: { rejim: 'tannarx' } }).next }]
];
for (const [nom, o] of holatlar) {
  const p = H.run(o), T = p.tarkib;
  const bj = sum(T.bolimlar.map(b => b.jami));
  ok(`${nom}: bo'limlar yig'indisi ${bj} = mijoz narxi ${p.clientTotal}`, T.bolimlar.length >= 5 && Math.abs(bj - p.clientTotal) < 1e-6 && T.jami === p.clientTotal && T.furnsiz === p.clientFurnsiz);
  ok(`${nom}: har bo'limning qator yig'indisi = bo'lim jami; har qatorda manba va qoida`, T.bolimlar.every(b => Math.abs(sum(b.qatorlar.map(r => r.summa)) - b.jami) < 1e-6 && b.qatorlar.every(r => r.manba && r.qoida && r.nom && r.birlik !== undefined)),
    JSON.stringify(T.bolimlar.filter(b => Math.abs(sum(b.qatorlar.map(r => r.summa)) - b.jami) >= 1e-6).map(b => [b.kod, b.jami, sum(b.qatorlar.map(r => r.summa))])));
}
const T1 = H.run({ stavka: S0, qoshXizmat: qoshX, markupPct: 0.35 }).tarkib;
const B = (k) => T1.bolimlar.find(b => b.kod === k);
ok('bo\'limlar: plita, kromka, raspil, prisadka, Bazis, furnitura, qo\'shilgan xizmatlar, ustama', ['plita', 'kromka', 'raspil', 'prisadka', 'bazis', 'furnitura', 'qosh', 'ustama'].every(k => !!B(k)));
ok('plita qatori: miqdor (list) × birlik narx = summa; ro\'yxat narxi 400 000 − 25 000 = 375 000 (ERP o\'rtacha sotuv), manba ERP, qoida sotuv_royxat', (() => { const r = B('plita').qatorlar[0]; return r.miqdor >= 1 && r.narx === 375000 && Math.abs(r.miqdor * r.narx - r.summa) < 1 && r.manba === 'ERP' && r.qoida === 'sotuv_royxat' && r.qv.tannarx === 300000 && r.qv.lst === 400000; })());
ok('raspil bo\'limida +1 qo\'shimcha raspil qatori (qoida raspil_qosh)', B('raspil').qatorlar.some(r => r.qoida === 'raspil_qosh' && r.miqdor === 1 && r.narx === 43000 && r.summa === 43000));
ok('Bazis qatori: detal soni × 5 000 (qoida bazis_16_18_19)', B('bazis').qatorlar.length === 1 && B('bazis').qatorlar[0].narx === 5000 && B('bazis').qatorlar[0].qoida === 'bazis_16_18_19' && B('bazis').qatorlar[0].miqdor * 5000 === B('bazis').jami);
ok('prisadka teshik turlari bo\'yicha (bir nechta qator), qo\'shilgan xizmat qatorlari manbasi bilan (ERP / taxmin)', B('prisadka').qatorlar.length >= 2 && B('qosh').qatorlar.length === 2 && B('qosh').qatorlar.find(r => r.kod === 'qosh:SRV_DELIVERY').manba === 'taxmin' && B('qosh').qatorlar.find(r => r.kod === 'qosh:780236010876').manba === 'sex jadvali');
ok('ustama qatori: (plita + furnitura) × 35% — xizmatlarsiz', (() => { const p = H.run({ stavka: S0, qoshXizmat: qoshX, markupPct: 0.35 }); const u = B('ustama').qatorlar[0]; return u.summa === Math.round((p.sheetCost + p.hwCost) * 1.35) - (p.sheetCost + p.hwCost) && u.miqdor === 35 && u.narx === p.sheetCost + p.hwCost; })());

console.log('\n[7] Plita narx rejimi (egasi #302 Q1): ERP o\'rtacha sotuv narxi');
const sz = plitaSozlama(S0);
ok('sukut sozlama: rejim sotuv, chegirma 25 000, koeffitsient 1,156 (narx hujjati va hujjatsiz sukut bir xil)', sz.rejim === 'sotuv' && sz.chegirma === 25000 && sz.koef === 1.156 && PLITA_SUKUT.chegirma === 25000 && plitaSozlama(null).koef === 1.156 && S0.plita.chegirma.manba === 'egasi');
ok('ro\'yxat narxi bo\'lsa: lst − 25 000 (410 000 → 385 000)', plitaNarxi(341761, 410000, sz).narx === 385000 && plitaNarxi(341761, 410000, sz).qoida === 'sotuv_royxat');
ok('ro\'yxat narxi yo\'q: tannarx × 1,156 (341 761 → 395 088)', plitaNarxi(341761, 0, sz).narx === Math.round(341761 * 1.156) && plitaNarxi(341761, 0, sz).qoida === 'sotuv_koef');
ok('ro\'yxat − 25 000 tannarxdan past bo\'lsa (ro\'yxat = tannarx, masalan Akril AGT) — tannarx (taglik), pastga tushmaydi', plitaNarxi(975000, 975000, sz).narx === 975000 && plitaNarxi(975000, 975000, sz).qoida === 'sotuv_royxat_taglik');
ok('rejim «tannarx» — ERP tannarxi o\'zi', plitaNarxi(341761, 410000, { ...sz, rejim: 'tannarx' }).narx === 341761);
const pSotuv = H.run({ stavka: S0 }), pTan = H.run({ stavka: narxQollash(S0, { plita: { rejim: 'tannarx' } }).next });
const pl = (p) => p.lines.find(l => l.code === 'ERP-TEST' && /^Plita/.test(l.group) && !l.sigmadi);
ok('hisobda: sotuv rejimida list narxi 375 000, tannarx rejimida 300 000; manba "ERP", tasdiqlangan', pl(pSotuv).unit_price === 375000 && pl(pTan).unit_price === 300000 && pl(pSotuv).manba === 'ERP' && pl(pSotuv).tasdiq && pl(pSotuv).narx_tannarx === 300000 && pl(pSotuv).narx_lst === 400000);
ok('DIQQAT: faqat narx — kroy va list soni, kesim o\'zgarmaydi (ikkala rejimda bir xil)', pl(pSotuv).qty === pl(pTan).qty && pSotuv.breakdown.sheetsCount === pTan.breakdown.sheetsCount && pSotuv.sheetCost - pTan.sheetCost === pl(pSotuv).qty * 75000);
const Sk = narxQollash(S0, { plita: { chegirma: 30000, koef: 1.2 } }).next;
ok('admin chegirma va koeffitsientni o\'zgartirsa — narx yangilanadi (manba egasi)', pl(H.run({ stavka: Sk })).unit_price === 370000 && Sk.plita.chegirma.manba === 'egasi' && Sk.plita.koef.qiymat === 1.2);
const mNoLst = mkMats({ sheet_lst: undefined });
ok('ro\'yxat narxi yo\'q material: tannarx × 1,156 = 346 800', pl(hisobla(mNoLst, SLOT_ERP).run({ stavka: S0 })).unit_price === 346800 && pl(hisobla(mNoLst, SLOT_ERP).run({ stavka: S0 })).narx_qoida === 'sotuv_koef');
ok('admin qo\'lda kiritgan narx (qolda) — o\'zgarmaydi', pl(hisobla(mkMats({ qolda: true }), SLOT_ERP).run({ stavka: S0 })).unit_price === 300000 && !plitaERPMi({ src: 'ERP', qolda: true }));
ok('taxminiy va ERP bo\'lmagan (xlsx/katalog) narx — o\'zgarmaydi; sukut ERP plita (price_src "ERP, sana") — o\'zgaradi', !plitaERPMi({ src: 'ERP (narx yo\'q) — LDSP16 narxi, taxminiy', taxminiy: true }) && !plitaERPMi({ price_src: 'katalog 2026-10-13 (xlsx)' })
  && !plitaERPMi({ price_src: 'ERP 2026-10-18; Materiallar_va_narxlar.xlsx' }) && plitaERPMi({ price_src: 'ERP, 2026-10-18' }));
const mSukut = JSON.parse(JSON.stringify(mats));
ok('sukut ERP plitalari (LDSP16 / MDF16 / HDF3) ro\'yxat narxi bilan: 410 000−25 000, 640 000−25 000, 165 000−25 000 = 140 000 (egasi sotgan narx)', (() => {
  const import_ = mSukut.sukut_erp; return ['LDSP16', 'MDF16', 'HDF3'].every(k => import_[k].lst > 0) && plitaNarxi(import_.LDSP16.uzs, import_.LDSP16.lst, sz).narx === 385000 && plitaNarxi(import_.MDF16.uzs, import_.MDF16.lst, sz).narx === 615000 && plitaNarxi(import_.HDF3.uzs, import_.HDF3.lst, sz).narx === 140000;
})());
const rad = (patch) => { try { narxQollash(S0, patch); return false; } catch (e) { return narxXatoMi(e); } };
ok('server tekshiruvi: noto\'g\'ri rejim, manfiy chegirma, koeffitsient 0,1 yoki 9 — rad; to\'g\'ri qiymat — qabul', [{ plita: { rejim: 'x' } }, { plita: { chegirma: -1 } }, { plita: { chegirma: 2e6 } }, { plita: { koef: 0.1 } }, { plita: { koef: 9 } }, { plita: { koef: 'abc' } }].every(rad)
  && !rad({ plita: { rejim: 'tannarx', chegirma: 0, koef: 1.156 } }) && narxQollash(S0, { plita: { koef: 1.156 } }).ozgarish.length === 0 && narxQollash(S0, { plita: { koef: 1.2 } }).ozgarish.length === 1);
ok('eski narx hujjati (plita bo\'limi yo\'q) — sukut qiymatlar ishlatiladi; admin yozsa bo\'lim paydo bo\'ladi', (() => { const eski = JSON.parse(JSON.stringify(S0)); delete eski.plita; return plitaSozlama(eski).chegirma === 25000 && pl(H.run({ stavka: eski })).unit_price === 375000 && narxQollash(eski, { plita: { rejim: 'tannarx' } }).next.plita.rejim.qiymat === 'tannarx'; })());

console.log('\n[8] «Xizmat qo\'shish» (egasi #301, 4-qaror)');
const erpKat = J('erp-xizmatlar.json'), services = J('services.json');
const K = xizmatKatalog({ erp: erpKat, services, narxlar: S0 });
const KE = K.filter(x => !/^SRV_/.test(x.kod));   // ERP qatorlari (Smart3D katalogisiz)
const guruhSoni = Object.fromEntries(XIZMAT_GURUHLAR.map(g => [g, KE.filter(x => x.guruh === g).length]));
ok(`katalog (ERP): arra 15, kromka 147, prisadka 12, Rover 12, Bazis 4, boshqa (VR) 2; Smart3D katalogi qo'shiladi (${JSON.stringify(guruhSoni)})`, XIZMAT_GURUHLAR.every(g => guruhSoni[g] > 0) && guruhSoni.arra === 15 && guruhSoni.kromka === 147 && guruhSoni.prisadka === 12 && guruhSoni.rover === 12 && guruhSoni.bazis === 4 && guruhSoni.boshqa === 2
  && K.length === KE.length + services.services.length);
ok('barcha qatorlarda kod, nom, narx > 0, birlik, manba; kod takrorlanmaydi', K.every(x => x.kod && x.nom && x.narx > 0 && x.birlik && x.manba) && new Set(K.map(x => x.kod)).size === K.length);
ok('Rover (frezer) xizmatlari m² da, ERP narxi bilan (Fasad - 1 ta tig\'li 50 000)', KE.filter(x => x.guruh === 'rover').every(x => x.birlik === 'm2') && K.find(x => x.nom === "Fasad - 1 ta tig'li").narx === 50000);
ok('Smart3D katalogi (services.json) — ERP emas: manba "taxmin"; ERP qatorlari "sex jadvali"', K.filter(x => /^SRV_/.test(x.kod)).length === services.services.length && K.filter(x => /^SRV_/.test(x.kod)).every(x => x.manba === 'taxmin') && K.filter(x => !/^SRV_/.test(x.kod)).every(x => x.manba === 'sex jadvali' || x.manba === 'egasi'));
ok('narx hujjatidagi yangi narx ERP fayldagisidan ustun (admin / jonli sinxron)', (() => { const S = narxQollash(S0, { xizmatlar: { '780236010876': { ...xz['780236010876'], manba: 'egasi', qiymat: 12000 } } }).next; return xizmatKatalog({ erp: erpKat, services, narxlar: S }).find(x => x.kod === '780236010876').narx === 12000; })());
ok('qidiruv: "овал" → ОВАЛ KATTA/KICHIK (+ kromka oval), guruh filtri, kod bo\'yicha, topilmasa bo\'sh', xizmatQidir(K, 'присадка овал', 'prisadka').length === 3 && xizmatQidir(K, 'овал', 'hammasi').length > 3
  && xizmatQidir(K, '780236010805').length === 1 && xizmatQidir(K, 'zzzxxx').length === 0 && xizmatQidir(K, '', 'rover').length === 12 + 2 && xizmatQidir(K, 'holzma 2', 'arra').some(x => x.nom === 'Услуга Распила Holzma 2') && xizmatQidir(K, 'holzma', 'arra').length === 6 && xizmatQidir(K, 'Рас ПИЛА   holzma 3').length === 2);
ok('tekshiruv: buzuq qator tashlanadi, takror birlashadi, miqdor butun songa yuqoriga (S2), chegara', (() => {
  const t = qoshXizmatTekshir([{ kod: 'A1', nom: 'x', narx: 1000, soni: 2.2, guruh: 'arra', birlik: 'list', manba: 'sex jadvali' }, { kod: 'A1', narx: 1000, soni: 1 }, { kod: 'B C', narx: 5, soni: 1 }, { kod: 'C', narx: -5, soni: 1 }, { kod: 'D', narx: 5, soni: 0 }, null, { kod: 'E', narx: 5, soni: 1e9, guruh: 'zzz', manba: 'qalbaki' }]);
  return t.length === 2 && t[0].kod === 'A1' && t[0].soni === 4 && t[1].kod === 'E' && t[1].soni === 100000 && t[1].guruh === 'boshqa' && t[1].manba === 'taxmin' && qoshXizmatTekshir('x').length === 0;
})());
const pQ = H.run({ stavka: S0, qoshXizmat: qoshX, markupPct: 0.35 }), pN = H.run({ stavka: S0, markupPct: 0.35 });
const lq = (p, k) => p.lines.find(l => l.code === 'qosh:' + k);
ok('qo\'shilgan xizmat: miqdor × narx = summa (3 × 10 000; 1 × 200 000), ustamasiz', lq(pQ, '780236010876').amount === 30000 && lq(pQ, 'SRV_DELIVERY').amount === 200000 && lq(pQ, '780236010876').ustama === false && pQ.qoshCost === 230000);
ok('jami aynan 230 000 ga oshdi (ustama qo\'shilmagan); tannarx ham', pQ.clientTotal - pN.clientTotal === 230000 && pQ.totalCost - pN.totalCost === 230000);
ok('aniqlik: ERP xizmat tasdiqlangan, Smart3D katalogi (taxmin) — taxmin ro\'yxatida', lq(pQ, '780236010876').tasdiq === true && lq(pQ, 'SRV_DELIVERY').tasdiq === false && pQ.aniqlik.taxmin.some(x => x.code === 'qosh:SRV_DELIVERY') && !pQ.aniqlik.taxmin.some(x => x.code === 'qosh:780236010876'));
ok('perModule yig\'indisi = jami (qo\'shilgan xizmatlar bilan ham); olib tashlansa avvalgi narx', sum(pQ.perModule.map(m => m.client)) === pQ.clientTotal && H.run({ stavka: S0, qoshXizmat: [], markupPct: 0.35 }).clientTotal === pN.clientTotal);
ok('buzuq qo\'shilgan qator (doc buzilgan) narxni buzmaydi: o\'tkazib yuboriladi', H.run({ stavka: S0, qoshXizmat: [{ kod: '', narx: 'x', soni: -1 }, 5, 'x'] }).qoshCost === 0);

console.log('\n[9] Narx panelidan ustama (doc.ustama) va hisob ko\'prigi');
const { markupPctOl } = await import('../web/src/services/hisob.js');
ok('markupPctOl: doc.ustama yo\'q → Sozlamalar qiymati (yoki null); yoqilgan 35 → 0.35; o\'chirilgan → 0 (Sozlamalar ustidan); noto\'g\'ri → 0', markupPctOl({}, null) === null && markupPctOl({}, 0.2) === 0.2 && markupPctOl({ ustama: { yoqilgan: true, foiz: 35 } }, 0.2) === 0.35
  && markupPctOl({ ustama: { yoqilgan: false, foiz: 35 } }, 0.2) === 0 && markupPctOl({ ustama: { yoqilgan: true, foiz: 'x' } }, null) === 0 && markupPctOl({ ustama: { yoqilgan: true, foiz: 301 } }, null) === 0 && markupPctOl({ ustama: { yoqilgan: true, foiz: 12.5 } }, null) === 0.125);

console.log(`\n=== ${fails ? 'XATO' : 'HAMMASI OK'} (${n - fails} pass, ${fails} fail) ===`);
process.exit(fails ? 1 : 0);
