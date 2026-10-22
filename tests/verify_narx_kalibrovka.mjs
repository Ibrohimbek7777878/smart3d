/* verify_narx_kalibrovka.mjs — TZ-36: narx kalibrovkasi (ERP buyurtmalariga yaqinlashtirish; egasi #194/#222: "ERP'da qanday bo'lsa shunday").
 *   K1  Bazis prisadka ERP hisobi: «ПРИСАДКА ЕВРО» soni = Евро mahkamlagich soni (qirra teshigi alohida emas), ruchka 1 ta/dona, belgi (МЕТКА) = samorez + metka obyektlari (prisadka aniqligi, 2026-10-22: 14 ERP buyurtmasida aynan)
 *   K2  kromka stavkasi eni/qalinligiga qarab (19/0,4 — 3 000, 19/1 — 4 000, 21/1 — 4 800, 35/1 — 5 700, 42/2 — 9 500) + metrga chiqit 8%
 *   K3  HDF: sukut_erp.HDF3 = ERP ЛХДФ 2,5мм 2800*2070 (140 000); barcha HDF — bitta kroy guruhi; raspil HDF/3 mm — Holzma 1 (25 000), LDSP — Holzma 2 (43 000)
 *   K5  Bazis stoleshnitsa — stoleshnitsa narxida (STOL26-3050 …), LDSP varag'ida emas; bo'laklar standart uzunlikka birga joylashadi
 * Haqiqiy 12 ta ERP buyurtmasi bilan o'lchash (mijoz fayllari repoda yo'q) — natijasi TZ-36 hisobotida. Bu yerda — sintetik, har doim ishlaydi.
 * Ishlatish: node tests/verify_narx_kalibrovka.mjs */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as B from '../app/js/engine/bazis/b3d.js';
import { bazisLoyiha, materiallarniQosh, stolKodi } from '../app/js/engine/bazis/loyiha.js';
import { bazisTeshiklar } from '../app/js/engine/bazis/teshik.js';
import { cutlist, productionCost, stolDonaSoni } from '../app/js/engine/cutlist.js';
import { nestProject } from '../app/js/engine/nesting.js';
import { narxSukut, narxQollash, sukutErpQollash, kromkaXizmat, kromkaOlchamKaliti, raspilYupqaXizmat } from '../app/js/engine/narxStavka.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const J = (p) => JSON.parse(readFileSync(join(ROOT, 'app/data', p), 'utf8'));
let n = 0, fails = 0;
const ok = (name, cond, extra = '') => { n++; if (!cond) { fails++; console.log('FAIL  ' + name + (extra ? '  → ' + extra : '')); } else console.log('ok    ' + name); };

const mats = J('materials.json');
sukutErpQollash(mats);
const S = narxSukut(mats);
const nestDef = J('nesting-defaults.json'); delete nestDef._meta;
const obj = (name, k, modelCode = 3001) => Array.from({ length: k }, () => ({ modelCode, name }));
const line = (p, code) => p.lines.find(l => l.code === code);

console.log('\n[K1] Bazis prisadka — ERP hisobi');
const objs = [...obj('Евро 51мм Алкан', 136), ...obj('Евровинт 7х51 (32) Мин60 симм', 37), ...obj('Петля прямая', 16), ...obj('Ручка 160 мм', 8), ...obj('Полкодержатель D5', 34), ...obj('metka samarezga', 10)];
const th = bazisTeshiklar(objs);
const tq = (t) => th.find(x => x.tur === t) || {};
ok('jismoniy son (KDT bilan tekshirilgan, detal nusxalari hisobga olingan): konfirmat_yuza 1 × 173, ruchka 16, belgi = metka + 4 × petlya', tq('konfirmat_yuza').qty === 173 && tq('ruchka').qty === 16 && tq('belgi').qty === 10 + 16 * 4);
ok('narxQty: konfirmat_yuza = Евро soni (obyektlar), qirra — narxQty yo\'q', tq('konfirmat_yuza').narxQty === 173 && tq('konfirmat_qirra').narxQty === undefined, JSON.stringify(th.filter(x => /konf/.test(x.tur))));
ok('narxQty: belgi (МЕТКА) = metka/samorez obyektlari soni (10); petlya vintlari/plankasi ПЕТЛЕ ichida', tq('belgi').narxQty === 10, JSON.stringify(tq('belgi')));
const frag = { code: 'BZ-test', name: 'test', w: 1000, d: 500, h: 800, category: 'bazis', production: 'panel', price_mode: 'unit', price: 0, auto_hardware: false,
  slots: { korpus: 'LDSP16', fasad: 'LDSP16', orqa: 'HDF3' }, parts: [{ code: 'a', nom: 'a', qty: 1, len: '600', width: '400', slot: 'korpus' }], edge: [], hardware: [], bazisTeshik: th };
const cl = cutlist(frag, 1000, 500, 800, mats, {});
const pr = productionCost([cl], mats, { stavka: S, xizmatlar: { teshik: true } });
const evro = line(pr, 'hole:konfirmat_yuza');
ok('«ПРИСАДКА ЕВРО» qatori: miqdor = Евро mahkamlagich soni (173), narx 1 600', evro && evro.qty === 173 && evro.unit_price === 1600 && evro.amount === 173 * 1600, JSON.stringify(evro && [evro.qty, evro.unit_price]));
ok('qirra teshigi alohida narxlanmaydi (ЕВРО juftligi)', !line(pr, 'hole:konfirmat_qirra'));
ok('ruchka: 16 teshik → 8 ta × 800 (ERP 1 ta/dona)', line(pr, 'hole:ruchka') && line(pr, 'hole:ruchka').qty === 8 && line(pr, 'hole:ruchka').amount === 6400);
ok('petlya 16 × 900, polka 34 × 800 (avvalgidek)', line(pr, 'hole:petlya').amount === 16 * 900 && line(pr, 'hole:polka').amount === 34 * 800);
ok('belgi — narxQty bo\'yicha (× 300)', line(pr, 'hole:belgi').qty === tq('belgi').narxQty && line(pr, 'hole:belgi').amount === tq('belgi').narxQty * 300);
/* egasi qirraga BOSHQA xizmat tanlasa — qirra ham narxlanadi (ЕВRO juftligi faqat bir xil xizmatda) */
const SK = narxQollash(S, { tanlov: { prisadka: { konfirmat_qirra: '780236010863' } } }).next;   // МЕТКА 300
const prK = productionCost([cl], mats, { stavka: SK, xizmatlar: { teshik: true } });
ok('qirraga alohida xizmat tanlansa — narxlanadi (jismoniy son)', line(prK, 'hole:konfirmat_qirra') && line(prK, 'hole:konfirmat_qirra').qty === tq('konfirmat_qirra').qty);
/* o'z modulining teshigi (narx_qty yo'q): ruchka /2, qirra (evrovint_torets) — evrovint bilan bir juft */
const own = { parts: [{ length: 500, width: 300, material: 'LDSP16', qty: 1 }], edges: [], hardware: [],
  holes: [{ kind: 'drill', tur: 'evrovint', qty: 20, nusxa: 1 }, { kind: 'drill', tur: 'evrovint_torets', qty: 20, nusxa: 1 }, { kind: 'drill', tur: 'd6_ruchka', qty: 6, nusxa: 1 }] };
const po = productionCost([own], mats, { stavka: S, xizmatlar: { teshik: true } });
ok('o\'z moduli: evrovint 20 × 1 600, torets alohida emas, d6_ruchka 6 → 3 ta', line(po, 'hole:evrovint').amount === 32000 && !line(po, 'hole:evrovint_torets') && line(po, 'hole:d6_ruchka').qty === 3);

console.log('\n[K2] Kromka — eni/qalinligiga qarab + chiqit');
const kk = (nom) => (kromkaXizmat(S, 'BZE-xyz', nom) || {}).qiymat;
ok('o\'lcham kaliti: "Кромка 19/1 …" → E19x1, "21/0,8" → E21x0.8, nomsiz → null', kromkaOlchamKaliti('Кромка 19/1 Озига мос') === 'E19x1' && kromkaOlchamKaliti('ПВХ 21/0,8') === 'E21x0.8' && kromkaOlchamKaliti('PVC kromka 2mm') === null);
ok('stavka: 19/0,4 — 3 000; 19/1 — 4 000; 21/1 — 4 800; 35/1 — 5 700; 42/2 — 9 500', [kk('Кромка 19/0,4 Белый'), kk('Кромка 19/1 Белый'), kk('Кромка 21/1 Золотой'), kk('Кромка 35/1 Озига мос'), kk('Кромка 42/2 Белый')].join() === '3000,4000,4800,5700,9500',
  [kk('Кромка 19/0,4 Белый'), kk('Кромка 19/1 Белый'), kk('Кромка 21/1 Золотой'), kk('Кромка 35/1 Озига мос'), kk('Кромка 42/2 Белый')].join());
ok('o\'lchami noma\'lum Bazis kromkasi — sukut (3 000); kod bo\'yicha tanlov (PVC2 — 4 900) ustun', kk('Кромка Белый') === 3000 && kk('Кромка 19/1') === 4000 && kromkaXizmat(S, 'PVC2', 'Кромка 19/1').qiymat === 4900);
ok('manbasi sex jadvali (tasdiqlangan), ERP xizmat nomi bor', ['E19x1', 'E21x1', 'E35x1', 'E42x2'].every(k => { const x = S.xizmatlar[S.tanlov.kromka[k]]; return x && x.manba === 'sex jadvali' && /ПВХ/.test(x.nom) && x.guruh === 'kromka'; }));
ok('server tekshiruvidan o\'tadi (sukut hujjat qayta qo\'llanadi)', narxQollash(S, { xizmatlar: S.xizmatlar, tanlov: S.tanlov }).ozgarish.length === 0);
const ed = { parts: [{ length: 500, width: 300, material: 'LDSP16', qty: 1 }], hardware: [], holes: [],
  edges: [{ material: 'BZE-a', thickness: 1, meters: 100, name: 'Кромка 19/1 Белый' }, { material: 'BZE-b', thickness: 1, meters: 50, name: 'Кромка 35/1 Белый' }] };
const mE = JSON.parse(JSON.stringify(mats));
materiallarniQosh(mE, { panel: [], edge: [{ code: 'BZE-a', name: 'Кромка 19/1 Белый', thickness: 1 }, { code: 'BZE-b', name: 'Кромка 35/1 Белый', thickness: 1 }] });
const pe = productionCost([ed], mE, { stavka: S });
const CH = 1 + mats.kromka_chiqit.foiz / 100;
ok('kromka qatori: 19/1 — 4 000, 35/1 — 5 700 so\'m/m', line(pe, 'BZE-a').unit_price === 4000 && line(pe, 'BZE-b').unit_price === 5700);
ok('chiqit 8%: 100 m → 108 m (qty), summa = 108 × 4 000; metr_sof = 100', mats.kromka_chiqit.foiz === 8 && line(pe, 'BZE-a').qty === Math.round(100 * CH * 100) / 100 && line(pe, 'BZE-a').amount === Math.round(100 * CH * 4000) && line(pe, 'BZE-a').metr_sof === 100);
ok('modullar bo\'yicha taqsimot jami bilan teng', pe.perModule.reduce((s, m) => s + m.client, 0) === pe.clientTotal);

console.log('\n[K3] HDF — bitta list, raspil stavkasi');
const hp = mats.panel_materials.find(m => m.code === 'HDF3');
ok('HDF3 = ERP «ЛХДФ 2,5мм 2800*2070 Белый» 140 000, format 2800×2070, "taxminiy" emas', hp.sheet_price === 140000 && JSON.stringify(hp.sheets) === '[[2800,2070]]' && !hp.taxminiy && hp.sku === '0110 PE');
const R = (l, w) => [{ type: 'line', p1: [0, 0], p2: [l, 0] }, { type: 'line', p1: [l, 0], p2: [l, w] }, { type: 'line', p1: [l, w], p2: [0, w] }, { type: 'line', p1: [0, w], p2: [0, 0] }];
const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const pan = (name, mat, t, l, w, x = 0) => ({ modelCode: B.PANEL_CODE, name, material: mat, thickness: t, contour_outer: R(l, w), butts: [], tf: { pos: [x, 0, 0], oq: I } });
const bobs = [pan('bok', 'ЛДСП Ультрадекор 4,575 Белый гладкий 16мм', 16, 700, 500), pan('orqa1', 'ХДФ Белый', 3, 900, 700, 800), pan('orqa2', 'ЛХДФ 3мм 2800*2070 Белый 5,796кв Standart', 3, 600, 500, 1800),
  pan('orqa3', 'ХДФ, 3 мм, Белый 2001', 3, 400, 300, 2600)];
const bz = bazisLoyiha(bobs, { fayl: 't.b3d' });
const hdfM = bz.materiallar.panel.filter(m => m.tur === 'hdf');
ok('3 xil nomdagi HDF — bitta material (BZM-hdf), 3 detal', hdfM.length === 1 && hdfM[0].code === 'BZM-hdf' && hdfM[0].detal === 3 && hdfM[0].varaq === null, JSON.stringify(hdfM));
const m3 = JSON.parse(JSON.stringify(mats)); materiallarniQosh(m3, bz.materiallar);
const c3 = cutlist(bz.fragment, bz.fragment.w, bz.fragment.d, bz.fragment.h, m3, {});
const ns3 = nestProject(c3.parts.map(p => Object.assign({}, p, { id: 'x:' + p.ref })), m3, nestDef);
ok('HDF — 1 list (3 detal 3 list emas), format 2800×2070', ns3.by_material['BZM-hdf'].sheet_count === 1 && ns3.by_material['BZM-hdf'].sheet_price === 140000, String(ns3.by_material['BZM-hdf'] && ns3.by_material['BZM-hdf'].sheet_count));
const p3 = productionCost([c3], m3, { nestResult: ns3, stavka: S });
ok('raspil: LDSP — Holzma 2 (43 000), HDF — Holzma 1 (25 000), alohida qatorlar', line(p3, 'raspil') && line(p3, 'raspil').unit_price === 43000 && line(p3, 'raspil_yupqa') && line(p3, 'raspil_yupqa').unit_price === 25000 && line(p3, 'raspil_yupqa').qty === 1
  && p3.raspilCost === line(p3, 'raspil').amount + 25000, JSON.stringify(p3.lines.filter(l => l.group === 'Raspil').map(l => [l.code, l.qty, l.unit_price])));
const S0 = narxQollash(S, { tanlov: { raspil_yupqa: null } }).next;
const p30 = productionCost([c3], m3, { nestResult: ns3, stavka: S0 });
ok('raspil_yupqa tanlanmasa — hammasi umumiy raspil stavkasida (avvalgidek), alohida qator yo\'q', !line(p30, 'raspil_yupqa') && line(p30, 'raspil').qty === p3.lines.filter(l => l.group === 'Raspil').reduce((s, l) => s + l.qty, 0));
ok('raspil_yupqa faqat raspil guruhidagi xizmat bo\'lishi mumkin (tekshiruv)', (() => { try { narxQollash(S, { tanlov: { raspil_yupqa: '780236012395' } }); return false; } catch (e) { return /topilmadi/.test(e.message); } })());
ok('raspilYupqaXizmat: sukut = Holzma 1 (25 000)', raspilYupqaXizmat(S).qiymat === 25000 && /Holzma 1/.test(raspilYupqaXizmat(S).nom));

console.log('\n[K5] Bazis stoleshnitsa');
ok('stolKodi: nomdagi qalinlik ustun (26мм, panel 38 → STOL26), 3050 dan uzun — 4200', stolKodi('Столешница 26мм', 38, 2800) === 'STOL26-3050' && stolKodi('Столешница 38мм', 38, 3500) === 'STOL38-4200' && stolKodi('Столешница', 38, 2000) === 'STOL38-3050' && stolKodi('Столешница', 26, 2000) === 'STOL26-3050');
ok('stolDonaSoni: 1900 + 490 → 1 dona (ERP 4034), 2000 + 1500 → 2, kerf hisobda', stolDonaSoni([{ length: 1900, width: 600 }, { length: 490, width: 600 }], 3050, 600) === 1 && stolDonaSoni([{ length: 2000, width: 600 }, { length: 1500, width: 600 }], 3050, 600) === 2
  && stolDonaSoni([{ length: 1500, width: 600 }, { length: 1547, width: 600 }], 3050, 600) === 2 && stolDonaSoni([{ length: 1500, width: 600 }, { length: 1547, width: 600 }], 3050, 600, 0) === 1);
const sobs = [pan('bok', 'ЛДСП Ультрадекор 4,575 Белый гладкий 16мм', 16, 700, 500), pan('s1', 'Столешница 26мм', 26, 1900, 600, 800), pan('s2', 'Столешница 26мм', 26, 490, 600, 3000)];
const sz = bazisLoyiha(sobs, { fayl: 's.b3d' });
const sp = sz.fragment.parts.filter(p => /^STOL/.test(p.material_code));
ok('stoleshnitsa detallari katalog kodida (STOL26-3050), sintetik BZM materiali yo\'q', sp.length === 2 && sp.every(p => p.material_code === 'STOL26-3050' && p.stol_birga) && !sz.materiallar.panel.some(m => m.tur === 'stoleshnitsa'), JSON.stringify(sp.map(p => p.material_code)));
const m5 = JSON.parse(JSON.stringify(mats)); materiallarniQosh(m5, sz.materiallar);
const c5 = cutlist(sz.fragment, sz.fragment.w, sz.fragment.d, sz.fragment.h, m5, {});
const ns5 = nestProject(c5.parts.map(p => Object.assign({}, p, { id: 'x:' + p.ref })), m5, nestDef);
const p5 = productionCost([c5], m5, { nestResult: ns5, stavka: S });
const sl = p5.lines.find(l => l.group === 'Stoleshnitsa');
ok('narx: stoleshnitsa qatori — 2 bo\'lak 1 dona × STOL26-3050 narxi (LDSP varag\'ida emas)', sl && sl.code === 'STOL26-3050' && sl.qty === 1 && sl.unit_price === m5.panel_materials.find(m => m.code === 'STOL26-3050').sheet_price && sl.amount === sl.unit_price
  && !p5.lines.some(l => /^Plita/.test(l.group) && /Столешн/.test(l.name)), JSON.stringify(sl));
ok('kitchen yo\'li o\'zgarmagan: stol_birga belgisisiz bo\'laklar — har bo\'lak 1 dona (#162)', (() => {
  const k = { parts: [{ length: 1900, width: 600, material: 'STOL26-3050', qty: 1 }, { length: 490, width: 600, material: 'STOL26-3050', qty: 1 }], edges: [], hardware: [], holes: [] };
  const l = productionCost([k], m5, { stavka: S }).lines.find(x => x.group === 'Stoleshnitsa'); return l && l.qty === 2;
})());

console.log(`\n=== ${fails ? 'XATO' : 'HAMMASI OK'} (${n - fails} pass, ${fails} fail) ===`);
process.exit(fails ? 1 : 0);
