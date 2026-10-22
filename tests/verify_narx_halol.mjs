/* verify_narx_halol.mjs — TZ-32 A (2026-10-18): narx aniqligi halol.
 *   [A1] plita narxi manbasi: tasdiqlangan (taxminiy emas) plitaning narxi ERP katalogida (sheet-catalog.json) aynan bor; faylda
 *        yo'q narx — "taxminiy" va "yoq — faylda topilmadi"; hisobda shunday plita "taxmin"; sukut_erp — bog'lash imkoni (hozir bo'sh);
 *        tanlangan ERP mahsuloti va Bazis sintetik materiali to'g'ri belgilanadi
 *   [A2] teshik kalitlari (MC birikma evrovint, D6) egasi tanlagan prisadka qatoriga bog'lanadi
 *   [A3] soni 0 bo'lgan furnitura qatori narxga kirmaydi
 *   [A4] petlya soni — bitta qoida (d6.petlyaSoni)
 *   [A5] MC modul: eshigi bor, petlya qatori yo'q — PET-4 = D6 kosalari soni
 *   [A6] ish haqi qatori nomi: raspil/kromka sex xizmatidan tanlansa — nomda yo'q; summa o'zgarmaydi
 * Ishga tushirish: node tests/verify_narx_halol.mjs */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { cutlist, productionCost } from '../app/js/engine/cutlist.js';
import { petlyaSoni } from '../app/js/engine/d6.js';
import { narxSukut, narxQollash, prisadkaXizmat, sukutErpQollash, TESHIK_UMUMIY, TESHIK_TURLARI } from '../app/js/engine/narxStavka.js';
import { materiallarniQosh } from '../app/js/engine/bazis/loyiha.js';

const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');
const { createHisob, loadData } = await import('../web/src/services/hisob.js');

const J = (p) => JSON.parse(readFileSync(fileURLToPath(new URL('../app/data/' + p, import.meta.url)), 'utf8'));
const mats = J('materials.json');
/* TZ-32 E: narxSukut endi ERP sukut stavkalarini ham beradi (materials.json sukut_narx); bu test BO'SH hujjat mexanikasini tekshiradi */
const matsBosh = Object.assign({}, mats); delete matsBosh.sukut_narx;
const sheets = J('sheet-catalog.json').sheets;
const mc = J('fragments-mc.json').fragments;
const SRC = readFileSync(fileURLToPath(new URL('../app/js/engine/cutlist.js', import.meta.url)), 'utf8');
let n = 0, fails = 0;
const ok = (name, cond, extra = '') => { n++; if (!cond) { fails++; console.log('FAIL  ' + name + (extra ? '  → ' + extra : '')); } else console.log('ok    ' + name); };
const pm = (m, c) => m.panel_materials.find(x => x.code === c);
const SLOTS = { korpus: 'LDSP18', polka: 'LDSP16', fasad: 'MDF16', orqa: 'HDF3' };

console.log('\n[A1] Plita narxi manbasi');
const narxli = mats.panel_materials.filter(m => m.sheet_price > 0 && !m.unit_piece);
/* 2026-10-22: katalog ERP products API bilan moslandi (qator src'i "erp_api_<sana>"). materials.json dagi tasdiqlangan narxlar (10-13 katalog, 10-16 va 10-18 ERP) ERP'ning keyingi
 * narxidan orqada qolishi mumkin; shunda ham narx haqiqiy ma'lumotga bog'langan bo'lishi SHART — yoki katalogda aynan bor, yoki ERP'dan qayta narxlangan qator bilan:
 *   (a) SKU bor — shu SKU, shu qalinlikdagi qator ERP'dan qayta narxlangan (LDSP18 W1000 ST19, LMDF16 5981 CD);
 *   (b) SKU yo'q (guruh narxi) — qatorning dollar narxi × eski kurs 11850 aynan shu narx (ERP hozir dollar narxlarini ×11950 da beradi; MDF18, HDF3).
 * Boshqa hech narsa qabul qilinmaydi (o'ylab topilgan narx baribir "yo'q" bo'lib qoladi — pastdagi taxminiy plitalar tekshiruvi). */
const KURS_ESKI = 11850;
const katalogda = (m) => sheets.some(s => Math.abs(+s.th - m.thickness) < 0.6 && (Math.round(s.uzs) === Math.round(m.sheet_price)
  || (/^erp_api_/.test(s.src || '') && (m.sku ? s.sku === m.sku : s.usd > 0 && Math.round(s.usd * KURS_ESKI) === Math.round(m.sheet_price)))));
ok('har narxli plitada price_src bor', narxli.every(m => typeof m.price_src === 'string' && m.price_src.length > 2), narxli.filter(m => !m.price_src).map(m => m.code).join());
const tasdiq = narxli.filter(m => !m.taxminiy), taxmin = narxli.filter(m => m.taxminiy);
ok(`tasdiqlangan plita narxi ERP katalogida aynan bor (${tasdiq.map(m => m.code).join(', ')})`, tasdiq.every(katalogda) && tasdiq.every(m => !/^yoq/.test(m.price_src)),
  tasdiq.filter(m => !katalogda(m)).map(m => m.code).join());
ok(`faylda yo'q narx — "taxminiy", "yoq — faylda topilmadi" (${taxmin.map(m => m.code).join(', ')})`, taxmin.every(m => !katalogda(m) && /^yoq/.test(m.price_src)));
ok('sukut LDSP16 va MDF16 — taxminiy; LDSP18, HDF3 — manbali (SKU/nom bilan)', pm(mats, 'LDSP16').taxminiy && pm(mats, 'MDF16').taxminiy
  && !pm(mats, 'LDSP18').taxminiy && pm(mats, 'LDSP18').sku === 'W1000 ST19' && !pm(mats, 'HDF3').taxminiy && !!pm(mats, 'HDF3').sku_nom);   // HDF3 — TZ-36 K3 dan sukut_erp (ERP 0110 PE)
ok('stoleshnitsa — narxi ERP dekordan (TZ-32 yakuniy Q1); ERP\'da bo\'lmagan STOL26-4200 narxsiz', mats.panel_materials.filter(m => m.unit_piece).every(m => (m.sheet_price > 0 && m.price_src === 'ERP 2026-10-18') || (m.sheet_price === 0 && /^yoq/.test(m.price_src))));
/* hisobda */
const shkaf = mc.find(f => f.code === 'MC-KU-04');
const clK = cutlist(shkaf, shkaf.w, shkaf.d, shkaf.h, mats, { projectSlots: SLOTS });
const p0 = productionCost([clK], mats, {});
const pl = (p, c) => p.lines.find(l => /^Plita/.test(l.group) && l.code === c) || {};
ok('hisob: LDSP16/MDF16 plita qatori — "taxmin", LDSP18 — "ERP" (tasdiqlangan)', pl(p0, 'MDF16').manba === 'taxmin' && !pl(p0, 'MDF16').tasdiq && pl(p0, 'LDSP18').manba === 'ERP' && pl(p0, 'LDSP18').tasdiq,
  JSON.stringify([pl(p0, 'MDF16').manba, pl(p0, 'LDSP18').manba]));
ok('hisob: taxmin plita aniqlik ro\'yxatida', p0.aniqlik.taxmin.some(t => t.code === 'MDF16' && /^Plita/.test(t.group)));
/* sukut_erp — bog'lash imkoni (egasi javobigacha bo'sh) */
/* TZ-32 E4 (egasi roziligi 2026-10-18): korpus plitasi LDSP16 = ERP "Ультрадекор Белый гладкий 16мм"; qolganlari hali bog'lanmagan (null) */
const sl = mats.sukut_erp && mats.sukut_erp.LDSP16;
const sh = mats.sukut_erp && mats.sukut_erp.HDF3;
ok('sukut_erp: LDSP18 — bog\'lanmagan (null); LDSP16, MDF16 va HDF3 (TZ-36 K3: ЛХДФ 2,5мм 2800*2070, 140 000) — ERP mahsuloti (sku, nom, narx, sana, format)', mats.sukut_erp && ['LDSP18'].every(k => k in mats.sukut_erp && mats.sukut_erp[k] === null)
  && sh && sh.sku === '0110 PE' && sh.uzs === 140000 && sh.l === 2800 && sh.w === 2070 && sh.manba === 'ERP' && /ЛХДФ.*2800\*2070/.test(sh.nom)
  && mats.sukut_erp.MDF16 && mats.sukut_erp.MDF16.uzs === 580515 && mats.sukut_erp.MDF16.erp_id === 11578
  && sl && sl.sku === '0110 SM' && sl.uzs === 341761 && /Ультрадекор.*Белый.*гладкий/.test(sl.nom) && sl.manba === 'ERP' && /^\d{4}-\d{2}-\d{2}$/.test(sl.sana) && sl.l === 2750 && sl.w === 1830);
const m0 = JSON.parse(JSON.stringify(mats));
ok('sukutErpQollash: LDSP16 bog\'lanadi — narx, sku, manba, varaq formati; "taxminiy" tushadi', sukutErpQollash(m0) === 3 && pm(m0, 'LDSP16').sheet_price === 341761 && !pm(m0, 'LDSP16').taxminiy
  && pm(m0, 'LDSP16').sku === '0110 SM' && /^ERP, 2026-/.test(pm(m0, 'LDSP16').price_src) && JSON.stringify(pm(m0, 'LDSP16').sheets) === '[[2750,1830]]' && pm(m0, 'MDF16').sheet_price === 580515 && !pm(m0, 'MDF16').taxminiy);
const m1 = JSON.parse(JSON.stringify(mats));
m1.sukut_erp.LDSP16 = null; m1.sukut_erp.MDF16 = null; m1.sukut_erp.HDF3 = null;
ok('sukutErpQollash: null — hech narsa o\'zgarmaydi', sukutErpQollash(m1) === 0 && JSON.stringify(m1) === JSON.stringify(Object.assign(JSON.parse(JSON.stringify(mats)), { sukut_erp: m1.sukut_erp })));
m1.sukut_erp.MDF16 = { sku: 'T-1', nom: 'test', uzs: 0, manba: 'ERP', sana: '2026-10-18' };
m1.sukut_erp.LDSP16 = { sku: 'T-2', nom: 'test', uzs: 300000, manba: 'ERP' };
ok('sukutErpQollash: narxi 0 yoki sanasiz yozuv — bog\'lanmaydi (o\'ylab topilmaydi)', sukutErpQollash(m1) === 0 && pm(m1, 'MDF16').taxminiy && pm(m1, 'LDSP16').taxminiy);
m1.sukut_erp.MDF16 = { sku: 'T-1', nom: 'test fasad', uzs: 480000, manba: 'ERP', sana: '2026-10-18' };   // TEST yozuvi, egasi tanlovi emas
ok('sukutErpQollash: bog\'langan plita — narx, SKU, manba ERP, "taxminiy" tushadi', sukutErpQollash(m1) === 1 && pm(m1, 'MDF16').sheet_price === 480000 && !pm(m1, 'MDF16').taxminiy
  && pm(m1, 'MDF16').sku === 'T-1' && pm(m1, 'MDF16').price_src === 'ERP, 2026-10-18');
const p1 = productionCost([cutlist(shkaf, shkaf.w, shkaf.d, shkaf.h, m1, { projectSlots: SLOTS })], m1, {});
ok('bog\'langach — hisobda MDF16 "ERP", aniqlik oshdi', pl(p1, 'MDF16').manba === 'ERP' && p1.aniqlik.pct > p0.aniqlik.pct, `${p0.aniqlik.pct} → ${p1.aniqlik.pct}`);
/* web hisobi: tanlangan ERP mahsuloti (narxli) — tasdiqlangan; Bazis sintetik materiali — taxmin */
const H = createHisob(await loadData((nom) => Promise.resolve(J(nom))));
const erpSh = sheets.find(s => s.type === 'LDSP' && +s.th === 16 && s.uzs > 0);
const eff = H.effectiveMaterials(erpSh);
ok('effectiveMaterials: narxli ERP plitasi tanlansa — LDSP16 narxi ERP\'dan, "taxminiy" emas; asl materials.json o\'zgarmaydi',
  pm(eff, 'LDSP16').sheet_price === erpSh.uzs && !pm(eff, 'LDSP16').taxminiy && pm(H.materials, 'LDSP16').sheet_price === 341761);   // asl (sukut ERP) o'zgarmaydi
const mb = JSON.parse(JSON.stringify(mats));
materiallarniQosh(mb, { panel: [{ code: 'BZ-T1', name: 'Bazis test', thickness: 16, asos: 'LDSP18' }] });
ok('Bazis sintetik materiali (boshqa plitaning narxi) — "taxminiy"', pm(mb, 'BZ-T1').taxminiy === true && pm(mb, 'BZ-T1').sheet_price === pm(mats, 'LDSP18').sheet_price);

console.log('\n[A2] Teshik kalitlari → prisadka qatori');
const X = (nom, q) => ({ nom, guruh: 'prisadka', qiymat: q, birlik: 'dona', manba: 'sex jadvali', sana: '2026-05-12' });   // TEST stavkalari
const S = narxQollash(narxSukut(matsBosh), {
  xizmatlar: { E1: X('Evro (test)', 1600), E2: X('Evro qirra (test)', 1200), P1: X('Polka (test)', 800), R1: X('Ruchka (test)', 801), B1: X('Metka (test)', 300) },
  tanlov: { prisadka: { konfirmat_yuza: 'E1', konfirmat_qirra: 'E2', polka: 'P1', ruchka: 'R1', belgi: 'B1' } }
}).next;
const kut = { evrovint: 1600, evrovint_torets: 1200, d6_polka: 800, d6_ruchka: 801, d6_vint: 300, d6_planka: 300, d6_napr: 300 };
ok('evrovint → konfirmat_yuza, evrovint_torets → konfirmat_qirra, d6_polka → polka, d6_ruchka → ruchka, d6_vint/planka/napr → belgi',
  Object.entries(kut).every(([k, v]) => (prisadkaXizmat(S, k, k) || {}).qiymat === v), JSON.stringify(Object.keys(kut).map(k => (prisadkaXizmat(S, k, k) || {}).qiymat)));
ok('umumiy qatorlar — egasi tanlay oladigan turlar (TESHIK_TURLARI) ichida', Object.values(TESHIK_UMUMIY).flat().every(u => TESHIK_TURLARI.includes(u)));
ok('d6_eks_qirra / d6_eks_bolt — umumiy qatorga bog\'lanmaydi (eksentrik 3 marta sanalmaydi)', !prisadkaXizmat(S, 'd6_eks_qirra', 'd6_eks_qirra') && !prisadkaXizmat(S, 'd6_eks_bolt', 'd6_eks_bolt'));
const pT = productionCost([clK], mats, { stavka: S, xizmatlar: { teshik: true } });
const hl = (k) => pT.lines.find(l => l.code === 'hole:' + k) || {};
ok('MC modul hisobida: evrovint, evrovint_torets, d6_polka — sex jadvali narxi, tasdiqlangan', ['evrovint', 'evrovint_torets', 'd6_polka'].every(k => hl(k).tasdiq && hl(k).unit_price === kut[k]),
  JSON.stringify(['evrovint', 'evrovint_torets', 'd6_polka'].map(k => [hl(k).unit_price, hl(k).manba])));
const pS0 = productionCost([clK], mats, { stavka: narxSukut(matsBosh), xizmatlar: { teshik: true } });
ok('tanlov bo\'lmasa — avvalgidek (materials.json, taxmin)', ['evrovint', 'd6_polka'].every(k => { const l = pS0.lines.find(x => x.code === 'hole:' + k); return l && !l.tasdiq && l.unit_price === 300; }));

console.log('\n[A3] Soni 0 bo\'lgan furnitura');
const f0 = { code: 'T-A3', parts: [{ code: 'yon', len: 'h', width: 'd', qty: 2 }], hardware: [{ code: 'TS-1730', qty: 0 }, { code: 'RU-128', qty: 2 }, { code: 'NOG-90' }], auto_hardware: false };
const c0 = cutlist(f0, 600, 500, 700, mats, {});
ok('qty 0 — ro\'yxatda va narxda yo\'q; qty yozilmagan — 1 (avvalgidek)', !c0.hardware.some(h => h.code === 'TS-1730') && c0.hardware.find(h => h.code === 'RU-128').qty === 2
  && c0.hardware.find(h => h.code === 'NOG-90').qty === 1 && !productionCost([c0], mats, {}).lines.some(l => l.code === 'TS-1730'));

console.log('\n[A4] Petlya soni — bitta qoida');
ok('cutlist.js da alohida petlya jadvali yo\'q (hingesForDoor), d6.petlyaSoni ishlatiladi', !/hingesForDoor/.test(SRC) && /petlyaSoni\(/.test(SRC));
const eshikli = (h) => ({ code: 'T-A4', parts: [{ code: 'yon', len: 'h', width: 'd', qty: 2 }, { code: 'eshik', slot: 'fasad', len: String(h), width: '400', qty: 1 }], hardware: [] });
const pet = (h) => (cutlist(eshikli(h), 450, 500, h, mats, {}).hardware.find(x => x.code === 'PET-4') || {}).qty;
ok('eshik 950 — 2 petlya (sex: ≤1000 — 2; eski jadvalda 3 edi), 1001 — 3, 1700 — 4, 2100 — 5', [950, 1001, 1700, 2100].every(h => pet(h) === petlyaSoni(h)) && pet(950) === 2,
  [950, 1001, 1700, 2100].map(pet).join());

console.log('\n[A5] MC modul: eshik bor, petlya qatori yo\'q');
const qoshildi = [], tegilmadi = [];
for (const f of mc) {
  const cl = cutlist(f, f.w, f.d, f.h, mats, { projectSlots: SLOTS });
  const kosa = cl.holes.filter(h => h.kind === 'd6_kosa').length, avto = cl.hardware.filter(h => h._auto);
  const bor = (f.hardware || []).some(h => /TS-|PET|petl|hinge/i.test(h.code));
  if (kosa && !bor) { if (avto.length === 1 && avto[0].code === 'PET-4' && avto[0].qty === kosa) qoshildi.push(f.code); else tegilmadi.push(f.code + ' xato'); }
  else if (avto.length) tegilmadi.push(f.code + ' ortiqcha');
}
ok(`15 modulga PET-4 qo'shildi (soni = D6 kosalari): ${qoshildi.join(', ')}`, qoshildi.length === 15 && !tegilmadi.length, tegilmadi.join(' | '));
const kargo = mc.find(f => f.code === 'MC-KP-06'), sh1 = mc.find(f => f.code === 'MC-SH-01');
ok('kargo (MC-KP-06) va o\'z petlya qatori bor modul (MC-SH-01) — qo\'shilmaydi', !cutlist(kargo, kargo.w, kargo.d, kargo.h, mats, { projectSlots: SLOTS }).hardware.some(h => h._auto)
  && !cutlist(sh1, sh1.w, sh1.d, sh1.h, mats, { projectSlots: SLOTS }).hardware.some(h => h._auto));
const pK = productionCost([clK], mats, { furnituraById: H.furnById, furnituraBoglash: H.furnituraBoglash });
const petL = pK.lines.find(l => l.code === 'PET-4') || {};
ok('MC-KU-04: petlya qatori narxda (ERP bog\'lanishi — tasdiqlangan)', petL.qty === 4 && petL.amount > 0 && petL.tasdiq, JSON.stringify(petL));

console.log('\n[A6] Ish haqi qatori nomi');
const R = (q) => ({ nom: 'Raspil (test)', guruh: 'raspil', qiymat: q, birlik: 'list', manba: 'sex jadvali', sana: '2026-07-03' });
const K = { nom: 'Kromka (test)', guruh: 'kromka', qiymat: 3000, birlik: 'm', manba: 'sex jadvali', sana: '2026-07-03' };
/* ish haqi nomi mexanizmi: stavka qo'lda berilsa (TZ-32 yakuniy Q3: sukut 0, qator yo'q) */
const s0 = narxQollash(narxSukut(matsBosh), { ish_haqi: { detal: 12000, modul: 40000 } }).next;
const sR = narxQollash(s0, { xizmatlar: { R1: R(18000), K1: K }, tanlov: { raspil: 'R1' } }).next;
const sK = narxQollash(s0, { xizmatlar: { R1: R(18000), K1: K }, tanlov: { kromka: { _sukut: 'K1' } } }).next;
const sRK = narxQollash(sR, { tanlov: { kromka: { _sukut: 'K1' } } }).next;
const ih = (St) => productionCost([clK], mats, { stavka: St }).lines.find(l => l.group === 'Ish haqi');
const [l0, lR, lK, lRK] = [s0, sR, sK, sRK].map(ih);
ok('tanlanmagan — "Arralash, kromka urish va sex yig\'ish"', /^Arralash, kromka urish va sex yig'ish \(/.test(l0.name) && !l0.sex_xizmati.length);
ok('raspil tanlangan — nomda "arralash" yo\'q', /^Kromka urish va sex yig'ish \(/.test(lR.name) && !/arralash/i.test(lR.name) && lR.sex_xizmati.join() === 'raspil');
ok('kromka tanlangan — nomda "kromka" yo\'q', /^Arralash va sex yig'ish \(/.test(lK.name) && !/kromka/i.test(lK.name) && lK.sex_xizmati.join() === 'kromka');
ok('ikkalasi — "Sex yig\'ish"', /^Sex yig'ish \(/.test(lRK.name) && lRK.sex_xizmati.join() === 'raspil,kromka');
ok('ish haqi summasi o\'zgarmadi (egasi javobigacha mantiq o\'sha)', [lR, lK, lRK].every(l => l.amount === l0.amount), [l0, lR, lK, lRK].map(l => l.amount).join());

console.log(`\n=== ${fails ? 'XATO' : 'HAMMASI OK'} (${n - fails} pass, ${fails} fail) ===`);
process.exit(fails ? 1 : 0);
