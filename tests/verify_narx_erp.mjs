/* verify_narx_erp.mjs — TZ-32 E (2026-10-18): ERP'dan olingan sukut narxlar.
 *   [E4] sukut plita (LDSP16 korpus, MDF16 fasad) — ERP mahsuloti: sku, nom, narx, sana, manba, ERP id, varaq formati
 *   [E2/E5/E8] sukut narx hujjati (narxSukut): har xizmat qatorida manba+sana+narx; raspil Holzma 2; kromka korpus/fasad;
 *        prisadka teshik turi → ERP xizmati; tanlov kodlari mavjud va guruhi mos
 *   [E3] Bazis loyiha xizmati: sukut o'chiq (S3); onlayn = detal × 3 000, oflayn = detal × 6 000
 *   [E7] narxsiz 18 furnitura smeta va narx ro'yxatidan yashirin; bog'lansa qaytadi; ro'yxat eslatma sifatida chiqadi
 * Ishga tushirish: node tests/verify_narx_erp.mjs */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { cutlist, productionCost } from '../app/js/engine/cutlist.js';
import { narxSukut, narxQollash, prisadkaXizmat, kromkaXizmat, raspilXizmat, bazisXizmat, sukutErpQollash, TASDIQ_MANBA, GURUHLAR, TESHIK_TURLARI } from '../app/js/engine/narxStavka.js';

const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');
const J = (p) => JSON.parse(readFileSync(fileURLToPath(new URL('../app/data/' + p, import.meta.url)), 'utf8'));
const mats = J('materials.json');
const mc = J('fragments-mc.json').fragments;
let n = 0, fails = 0;
const ok = (name, cond, extra = '') => { n++; if (!cond) { fails++; console.log('FAIL  ' + name + (extra ? '  → ' + extra : '')); } else console.log('ok    ' + name); };
const SANA = /^\d{4}-\d{2}-\d{2}$/;

console.log('\n[E4] Sukut plita — ERP mahsuloti');
for (const [kod, id, narx] of [['LDSP16', 10807, 319030], ['MDF16', 11578, 580515], ['HDF3', 11750, 124961]]) {
  const v = mats.sukut_erp[kod];
  ok(`${kod}: sku, nom, narx ${narx}, sana, manba ERP, ERP id ${id}, varaq formati`, v && v.sku && v.nom && v.uzs === narx && SANA.test(v.sana) && v.manba === 'ERP' && v.erp_id === id && v.l > 1000 && v.w > 1000 && v.izoh);
}
const m1 = JSON.parse(JSON.stringify(mats));
ok('sukutErpQollash: LDSP16, MDF16 va HDF3 narxi ERP, "taxminiy" tushadi, manba matnida ERP + sana', sukutErpQollash(m1) === 3
  && ['LDSP16', 'MDF16', 'HDF3'].every(k => { const p = m1.panel_materials.find(x => x.code === k); return !p.taxminiy && /^ERP, \d{4}-/.test(p.price_src) && p.sheet_price === mats.sukut_erp[k].uzs && p.sheets[0][0] === mats.sukut_erp[k].l; }));

console.log('\n[E2/E5/E8] Sukut narx hujjati');
const S = narxSukut(mats);
const xz = S.xizmatlar;
ok('har xizmat qatorida narx > 0, manba (sex jadvali/egasi), sana, guruh, nom, kategoriya', Object.values(xz).length >= 18 && Object.values(xz).every(r => r.qiymat > 0 && TASDIQ_MANBA.includes(r.manba) && SANA.test(r.sana) && GURUHLAR.includes(r.guruh) && r.nom && r.kategoriya));
ok('raspil sukut = Holzma 2, 43 000 / list', raspilXizmat(S) && /Holzma 2$/.test(raspilXizmat(S).nom) && raspilXizmat(S).qiymat === 43000);
ok('kromka: korpus (PVC04) ПВХ 19/0,4 — 3 000/m; fasad (PVC2) ПВХ 19/2 — 4 900/m; sukut korpus',
  kromkaXizmat(S, 'PVC04').qiymat === 3000 && /19\/0,4/.test(kromkaXizmat(S, 'PVC04').nom) && kromkaXizmat(S, 'PVC2').qiymat === 4900 && /19\/2/.test(kromkaXizmat(S, 'PVC2').nom) && kromkaXizmat(S, 'BOSHQA').qiymat === 3000);
const P = { konfirmat_yuza: ['ЕВРО', 1600], konfirmat_qirra: ['ЕВРО', 1600], petlya: ['ПЕТЛЕ', 900], hinge: ['ПЕТЛЕ', 900], polka: ['ПОЛКАДЕРЖАТЕЛ', 800], ruchka: ['РУЧКА', 800],
  shkant: ['ШКАНТ', 800], dowel: ['ШКАНТ', 800], eksentrik: ['ЭКСЕРТРИК', 1400], cam: ['ЭКСЕРТРИК', 1400], belgi: ['МЕТКА', 300], mark: ['МЕТКА', 300] };
for (const [k, [nom, q]] of Object.entries(P)) ok(`prisadka: ${k} → ПРИСАДКА ${nom} ${q}`, (prisadkaXizmat(S, k, null) || {}).qiymat === q && new RegExp(nom).test(prisadkaXizmat(S, k, null).nom));
ok('D6 teshiklari umumiy qatordan: d6_kosa → ПЕТЛЕ 900, d6_eksentrik → ЭКСЕРТРИК 1400', prisadkaXizmat(S, 'd6_kosa', 'hinge').qiymat === 900 && prisadkaXizmat(S, 'd6_eksentrik', 'cam').qiymat === 1400);
const bog = TESHIK_TURLARI.filter(k => !prisadkaXizmat(S, k, null));
console.log('      (ERP prisadka xizmatiga bog\'lanmagan teshik turlari — materials.json hole_kinds ga qaytadi: ' + bog.join(', ') + ')');
ok('bog\'lanmaganlar faqat: drill (umumiy), cutout (moyka kesimi), d6_eks_qirra, d6_eks_bolt (eksentrik 3 teshikdan 1 marta sanaladi)', bog.sort().join() === ['cutout', 'd6_eks_bolt', 'd6_eks_qirra', 'drill'].join());
ok('tanlov kodlari mavjud va guruhi mos', xz[S.tanlov.raspil].guruh === 'raspil' && Object.values(S.tanlov.kromka).every(c => xz[c].guruh === 'kromka') && Object.values(S.tanlov.prisadka).every(c => xz[c].guruh === 'prisadka') && Object.values(S.tanlov.bazis).every(c => xz[c].guruh === 'bazis'));
ok('server PUT tekshiruvidan o\'tadi (qayta qo\'llash o\'zgarish bermaydi)', narxQollash(S, { xizmatlar: xz, tanlov: S.tanlov }).ozgarish.length === 0);

console.log('\n[E3] Bazis loyiha xizmati (detal soniga qarab) — TZ-48: sukutda YOQILGAN, 5 000 so\'m/detal, faqat 16/18/19 mm detallar (HDF hisobga olinmaydi)');
ok('sukut (onlayn) = Bazis5 — 5 000 (detal boshiga); Bazis3 (3 000) va Bazis6 (6 000) katalogda qoladi, oflayn tanlov yo\'q', bazisXizmat(S, 'onlayn').qiymat === 5000 && /Bazis5/.test(bazisXizmat(S, 'onlayn').nom)
  && !bazisXizmat(S, 'oflayn') && S.xizmatlar['03'].qiymat === 3000 && S.xizmatlar['04'].qiymat === 6000);
const shkaf = mc.find(f => f.code === 'MC-KU-04');
const SLOTS = { korpus: 'LDSP18', polka: 'LDSP16', fasad: 'MDF16', orqa: 'HDF3' };
const cl = cutlist(shkaf, shkaf.w, shkaf.d, shkaf.h, mats, { projectSlots: SLOTS });
const det = cl.parts.filter(p => [16, 18, 19].includes(Math.round(p.thickness))).length;   // HDF (3 mm) kirmaydi
ok(`sinov moduli: ${cl.parts.length} detal, shundan 16/18/19 mm — ${det} (HDF orqa devor hisobga olinmaydi)`, det > 0 && det < cl.parts.length && cl.parts.some(p => p.thickness < 10));
const pr = (xizmatlar, stavka = S) => productionCost([cl], mats, { stavka, xizmatlar });
const p0 = pr({}), pOff = pr({ bazis: null }), pOn = pr({ bazis: 'onlayn' }), pOf = pr({ bazis: 'oflayn' });
ok('sukut YOQILGAN (TZ-48): xizmatlar berilmasa Bazis qatori va summasi bor', p0.lines.some(l => l.code === 'bazis') && p0.bazisCost === det * 5000 && p0.xizmat_taklif.bazis.tanlangan === 'onlayn');
ok('usta o\'chirsa (bazis: null) — qator ham, summa ham yo\'q; taklif summasi ko\'rinadi', !pOff.lines.some(l => l.code === 'bazis') && pOff.bazisCost === 0 && pOff.xizmat_taklif.bazis.taklif === det * 5000 && pOff.xizmat_taklif.bazis.tanlangan === null);
ok(`eski loyihadagi 'onlayn': ${det} detal × 5 000 = ${det * 5000}, qator tasdiqlangan`, pOn.lines.find(l => l.code === 'bazis').amount === det * 5000 && pOn.bazisCost === det * 5000 && pOn.lines.find(l => l.code === 'bazis').tasdiq === true);
ok('eski loyihadagi \'oflayn\' — tanlov.bazis.oflayn bog\'lanmagan bo\'lsa ham sukut stavka (narx o\'ylab topilmaydi)', pOf.bazisCost === det * 5000);
const Sof = narxQollash(S, { tanlov: { bazis: { oflayn: '04' } } }).next;
ok('admin tanlov.bazis.oflayn ga Bazis6 ni bog\'lasa — oflayn: ' + det + ' detal × 6 000', pr({ bazis: 'oflayn' }, Sof).bazisCost === det * 6000 && pr({}, Sof).bazisCost === det * 5000);
ok('tannarx Bazis summasiga oshadi; perModule yig\'indisi = jami', p0.totalCost === pOff.totalCost + det * 5000 && p0.perModule.reduce((s, m) => s + m.client, 0) === p0.clientTotal);
ok('stavka (bazis qatori) bo\'lmasa — xizmat qo\'shilmaydi, narx o\'ylab topilmaydi', pr({ bazis: 'onlayn' }, narxSukut(Object.assign({}, mats, { sukut_narx: undefined }))).bazisCost === 0);

console.log('\n[E7] Narxsiz furnitura yashirin');
const YASH = mats.furnitura_yashirin.kodlar;
ok('18 ta kod, har biriga sabab matni', YASH.length === 18 && YASH.every(k => typeof mats.furnitura_yashirin.sabab[k] === 'string'));
ok('yashirinlarning birortasi ham narx/ID bilan bog\'lanmagan (aks holda ro\'yxatdan chiqarish kerak)', YASH.every(k => !(mats.hardware || []).some(h => h.code === k && h.price > 0) && !J('furnitura-boglash.json').links[k]));
const clH = { parts: cl.parts, edges: [], holes: [], hardware: YASH.map(k => ({ code: k, qty: 2 })).concat([{ code: 'PET-4', qty: 2 }]) };
const pH = productionCost([clH], mats, { stavka: S, furnituraById: {}, furnituraBoglash: J('furnitura-boglash.json').links });
ok('smetada (qatorlar) va narxsizlar ro\'yxatida yashirin kodlar yo\'q', YASH.every(k => !pH.lines.some(l => l.code === k) && !pH.missing.some(m => m.code === k)));
ok('yashirin ro\'yxat natijada qaytadi (eslatish uchun), soni to\'g\'ri', pH.yashirin.length === 18 && pH.yashirin.every(y => y.qty === 2));
const matsB = JSON.parse(JSON.stringify(mats)); matsB.hardware.push({ code: 'TIP-ON', name: 'test', price: 1000, unit: 'dona' });
ok('narx bog\'lansa — yashirinlikdan chiqadi va hisoblanadi (TEST narxi)', productionCost([clH], matsB, { stavka: S }).lines.some(l => l.code === 'TIP-ON' && l.amount === 2000));
console.log('\n      ESLATMA — narxi topilmagani uchun yashirilgan furnitura (ERP bog\'lanishi/narx kerak):');
for (const k of YASH) console.log('        - ' + k + ': ' + mats.furnitura_yashirin.sabab[k]);

console.log(`\n=== ${fails ? 'XATO' : 'HAMMASI OK'} (${n - fails} pass, ${fails} fail) ===`);
process.exit(fails ? 1 : 0);
