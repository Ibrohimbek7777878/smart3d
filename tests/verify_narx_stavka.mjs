/* verify_narx_stavka.mjs — TZ-20 (2026-10-17): narx stavkalari hisobda va "Narx aniqligi X%".
 *   [1] stavka berilmasa / boshlang'ich (taxmin) stavka — natija avvalgidek
 *   [2] stavka o'zgarsa narx o'zgaradi: raspil (list × stavka), kromka (metr × stavka), prisadka (Bazis turi bo'yicha), ish haqi, ustama
 *   [3] aniqlik: hammasi tasdiqlangan bo'lsa 100%; taxmin bo'lsa — kam, ro'yxatda
 *   [4] tekshiruv (server shu funksiyani ishlatadi): noto'g'ri qiymat rad etiladi, hech narsa o'zgarmaydi
 *   [5] sex jadvalidan yuklash (Xizmat_narxlari.xlsx) — paket bo'lmasa o'tkazib yuboriladi
 *   [6] sinov oshxonasi: aniqlik — hozir va sex jadvali yuklangandan keyin (stavkalar TEST UCHUN tanlangan, egasi tanlovi emas)
 * Ishga tushirish: node tests/verify_narx_stavka.mjs */
import { readFileSync, existsSync } from 'node:fs';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { cutlist, productionCost } from '../app/js/engine/cutlist.js';
import { nestProject } from '../app/js/engine/nesting.js';
import { deriveKitchen } from '../app/js/engine/kitchen.js';
import { applySexStandart } from '../app/js/engine/standart.js';
import { narxSukut, narxQollash, narxXatoMi, xizmatJadvalOqish, xizmatFarq } from '../app/js/engine/narxStavka.js';
import { xlsxOqish } from '../app/js/engine/xlsxOqish.js';

const J = (p) => JSON.parse(readFileSync(fileURLToPath(new URL('../app/data/' + p, import.meta.url)), 'utf8'));
const mats = J('materials.json');
let n = 0, fails = 0;
const ok = (name, cond, extra = '') => { n++; if (!cond) { fails++; console.log('FAIL  ' + name + (extra ? '  → ' + extra : '')); } else console.log('ok    ' + name); };
const JADVAL = fileURLToPath(new URL('../../Smart3D/Smart3D_toplam_2026-10-16/04_xizmat_narxlari/Xizmat_narxlari.xlsx', import.meta.url));

/* sinov oshxonasi — scripts/smeta_hisob.mjs bilan bir xil (3 m, 7 modul) */
const std = J('sex-standartlari.json');
const furnById = Object.fromEntries(J('furnitura-catalog.json').items.filter(i => i.id).map(i => [i.id, i]));
const furnBoglash = (J('furnitura-boglash.json').links) || {};
const catalog = Object.fromEntries([...J('fragments.json'), ...J('fragments-mc.json').fragments].map(f => [f.code, f]));
for (const f of Object.values(catalog)) applySexStandart(f, std);
const SLOTS = { korpus: 'LDSP16', polka: 'LDSP16', fasad: 'LDSP16' };
const lower = [['MC-KP-08', 600], ['MC-KP-11', 400], ['MC-KP-02', 600], ['MC-KP-04', 450]];
const upper = [['MC-KU-04', 600], ['MC-KU-07', 600], ['MC-KU-03', 300]];
let x = 50;
const placements = lower.map(([c, w], i) => { const p = { id: 'p' + i, frg: c, x, y: 50, z: 0, w, d: catalog[c].d, h: catalog[c].h, rot: 0 }; x += w; return p; });
x = 50;
upper.forEach(([c, w], i) => { placements.push({ id: 'u' + i, frg: c, x, y: 50, z: 1450, w, d: catalog[c].d, h: catalog[c].h, rot: 0 }); x += w; });
const doc = { room: { outline: [[0, 0], [3000, 0], [3000, 2500], [0, 2500]], wall_height: 2700, openings: [] },
  placements, kitchen: { stoleshnitsa: true, sokol: true, dobor: false, karniz: false, moyka: { on: false } } };
const cls = placements.concat(deriveKitchen(doc, catalog)).map(p => Object.assign(cutlist(catalog[p.frg], p.w, p.d, p.h, mats, { projectSlots: SLOTS }), { placementId: p.id }));
const parts = [];
cls.forEach(cl => cl.parts.forEach(pp => parts.push(Object.assign({}, pp, { id: cl.placementId + ':' + pp.ref }))));
const nest = nestProject(parts, mats, { mode: 'bssf', kerf: 4, trimL: 10, trimW: 10 });
const OPT = { nestResult: nest, furnituraById: furnById, furnituraBoglash: furnBoglash };
const hisob = (stavka, extra = {}) => productionCost(cls, mats, Object.assign({}, OPT, { stavka }, extra));

/* test stavkalari — sex jadvalidagi qiymat SHAKLIDA (raqamlar test uchun), egasi tanlovi emas */
const TEST_X = {
  R1: { nom: 'Raspil (test)', guruh: 'raspil', qiymat: 18000, birlik: 'list', manba: 'sex jadvali', sana: '2026-07-03' },
  K1: { nom: 'Kromka (test)', guruh: 'kromka', qiymat: 4000, birlik: 'm', manba: 'sex jadvali', sana: '2026-07-03' },
  P1: { nom: 'Prisadka (test)', guruh: 'prisadka', qiymat: 1600, birlik: 'dona', manba: 'sex jadvali', sana: '2026-05-12' }
};
const qolla = (cur, patch) => narxQollash(cur, patch).next;

console.log('\n[1] Stavka berilmasa — avvalgidek');
const p0 = productionCost(cls, mats, OPT);
const s0 = narxSukut(mats);
const pS = hisob(s0);
ok(`boshlang'ich (taxmin) stavka bilan jami bir xil: ${p0.clientTotal}`, pS.clientTotal === p0.clientTotal && pS.totalCost === p0.totalCost, `${pS.clientTotal} ≠ ${p0.clientTotal}`);
ok('raspil qatori yo\'q (tanlanmagan)', !pS.lines.some(l => l.code === 'raspil') && pS.raspilCost === 0);
ok('perModule yig\'indisi = jami', pS.perModule.reduce((s, m) => s + m.client, 0) === pS.clientTotal);

console.log('\n[2] Stavka o\'zgarsa narx o\'zgaradi');
let S = qolla(s0, { xizmatlar: TEST_X, tanlov: { raspil: 'R1' } });
const pR = hisob(S);
const rl = pR.lines.find(l => l.code === 'raspil');
const nList = Math.round(nest.summary.total_sheets * 100) / 100;
ok(`raspil: ${rl && rl.name} = ${rl && rl.amount}`, rl && rl.qty === nList && rl.amount === Math.round(nList * 18000) && /^Raspil — \d+(\.\d+)? list × 18000$/.test(rl.name) && rl.tasdiq);
ok('tannarx raspil summasiga oshdi', pR.totalCost === p0.totalCost + rl.amount);
ok('perModule yig\'indisi = jami (raspil bilan)', pR.perModule.reduce((s, m) => s + m.client, 0) === pR.clientTotal);
const S2 = qolla(S, { xizmatlar: { R1: { ...TEST_X.R1, qiymat: 25000 } } });
ok('raspil stavkasi 18 000 → 25 000: narx oshdi', hisob(S2).clientTotal > pR.clientTotal);
S = qolla(S, { tanlov: { kromka: { _sukut: 'K1' } } });
const pK = hisob(S);
const em = pK.breakdown.edgeMeters;
ok(`kromka: ${em} m × 4000 = ${pK.edgeCost}`, pK.edgeCost === Object.values(pK._edgeAgg).reduce((t, a) => t + Math.round(a.meters * 4000), 0) && Math.abs(pK.edgeCost - em * 4000) < 4000, String(pK.edgeCost));
ok('kromka qatori tasdiqlangan, "taxminiy" emas', pK.lines.filter(l => l.group === 'Kromka').every(l => l.tasdiq && !l.taxminiy) && !pK.taxminiy.includes('Kromka'));
/* prisadka — Bazis turi bo'yicha (konfirmat, polka, ruchka — hammasi 'drill' turi) */
const bz = { parts: [{ length: 500, width: 300, material: 'LDSP16', qty: 1 }], edges: [], hardware: [],
  holes: [{ kind: 'drill', tur: 'konfirmat_yuza', qty: 10, nusxa: 1 }, { kind: 'drill', tur: 'polka', qty: 8, nusxa: 1 }, { kind: 'hinge', qty: 4, nusxa: 1 }] };
const Sp = qolla(S, { xizmatlar: { P2: { ...TEST_X.P1, nom: 'Polka (test)', qiymat: 800 } }, tanlov: { prisadka: { konfirmat_yuza: 'P1', polka: 'P2' } } });
const pp = productionCost([bz], mats, { stavka: Sp, xizmatlar: { teshik: true } });
const hl = (k) => pp.lines.find(l => l.code === 'hole:' + k) || {};
ok('prisadka: konfirmat 10 × 1600, polka 8 × 800 (tur bo\'yicha)', hl('konfirmat_yuza').amount === 16000 && hl('polka').amount === 6400 && hl('konfirmat_yuza').tasdiq);
ok('bog\'lanmagan tur (hinge) — materials.json, taxmin', hl('hinge').amount === 4 * 1500 && !hl('hinge').tasdiq && pp.taxminiy.includes('Prisadka'));
const pOff = productionCost([bz], mats, { stavka: Sp });
ok('prisadka tanlanmagan (S3) — taklif summasi stavkadan', pOff.xizmat_taklif.teshik.amount === 16000 + 6400 + 6000 && pOff.holeCost === 0);
/* D6 teshiklari (d6.js): egasining petlya/hinge va eksentrik/cam tanlovi d6_kosa va d6_eksentrik ga ham o'tadi */
const d6 = { parts: [{ length: 500, width: 300, material: 'LDSP16', qty: 1 }], edges: [], hardware: [],
  holes: [{ kind: 'd6_kosa', qty: 2, nusxa: 1 }, { kind: 'd6_eksentrik', qty: 4, nusxa: 1 }, { kind: 'd6_eks_qirra', qty: 4, nusxa: 1 }, { kind: 'd6_eks_bolt', qty: 4, nusxa: 1 }] };
const hd = (St) => { const r = productionCost([d6], mats, { stavka: St, xizmatlar: { teshik: true } }); return (k) => r.lines.find(l => l.code === 'hole:' + k) || {}; };
const d0 = hd(Sp);
ok('D6: stavkasiz — avvalgidek (kosa 1500 hinge, eksentrik 800 cam)', d0('d6_kosa').unit_price === 1500 && d0('d6_eksentrik').unit_price === 800 && !d0('d6_kosa').tasdiq);
const dh = hd(qolla(Sp, { xizmatlar: { H9: { ...TEST_X.P1, nom: 'Petlya (test)', qiymat: 900 } }, tanlov: { prisadka: { hinge: 'H9' } } }));
ok('D6: hinge stavkasi → d6_kosa narxi (2 × 900), tasdiqlangan', dh('d6_kosa').amount === 1800 && dh('d6_kosa').tasdiq && dh('d6_eksentrik').unit_price === 800);
const dp = hd(qolla(Sp, { xizmatlar: { H9: { ...TEST_X.P1, nom: 'Petlya (test)', qiymat: 900 } }, tanlov: { prisadka: { petlya: 'H9' } } }));
ok('D6: petlya (Bazis) stavkasi ham d6_kosa ga o\'tadi', dp('d6_kosa').unit_price === 900);
const dc = hd(qolla(Sp, { xizmatlar: { C9: { ...TEST_X.P1, nom: 'Eksentrik (test)', qiymat: 1400 } }, tanlov: { prisadka: { cam: 'C9' } } }));
ok('D6: cam stavkasi → d6_eksentrik narxi (4 × 1400); qirra/bolt ikki marta sanalmaydi (eskicha)', dc('d6_eksentrik').amount === 5600 && dc('d6_eks_qirra').unit_price !== 1400 && dc('d6_eks_bolt').unit_price !== 1400);
const dx = hd(qolla(Sp, { xizmatlar: { C9: { ...TEST_X.P1, nom: 'Eksentrik (test)', qiymat: 1400 }, K9: { ...TEST_X.P1, nom: 'Kosa (test)', qiymat: 1000 } }, tanlov: { prisadka: { cam: 'C9', eksentrik: 'C9', d6_kosa: 'K9', hinge: 'C9' } } }));
ok('D6: o\'z qatori (d6_kosa) umumiy hinge dan ustun', dx('d6_kosa').unit_price === 1000);
const dq = hd(qolla(Sp, { xizmatlar: { Q9: { ...TEST_X.P1, nom: 'Qirra (test)', qiymat: 700 } }, tanlov: { prisadka: { d6_eks_qirra: 'Q9' } } }));
ok('D6: d6_eks_qirra alohida tanlansa — tanlov narxi', dq('d6_eks_qirra').unit_price === 700);
/* ish haqi va ustama */
const Si = qolla(S, { ish_haqi: { yoqilgan: false } });
ok('ish haqi o\'chirilsa — 0, qator yo\'q', hisob(Si).laborCost === 0 && !hisob(Si).lines.some(l => l.group === 'Ish haqi'));
const Sd = qolla(S, { ish_haqi: { detal: 20000 } });
ok('ish haqi detal 12 000 → 20 000: oshdi', hisob(Sd).laborCost > pK.laborCost);
const Su = qolla(S, { ustama: { foiz: 20 } });
const pU = hisob(Su);
ok('ustama 35% → 20%: mijoz narxi = tannarx × 1,20', pU.markupPct === 0.2 && pU.clientTotal === Math.round(pU.totalCost * 1.2));
ok('usta o\'z ustamasi (Sozlamalar) ustun', hisob(Su, { markupPct: 0.5 }).markupPct === 0.5);

console.log('\n[3] Narx aniqligi');
ok(`hozirgi (stavkasiz): ${p0.aniqlik.pct}% (${p0.aniqlik.taxmin.length} taxmin qator, ${p0.aniqlik.narxsiz} narxsiz)`, p0.aniqlik.pct > 0 && p0.aniqlik.pct < 100 && p0.aniqlik.taxmin.some(t => t.group === 'Ustama'));
/* hammasi tasdiqlangan: furnituraning narxi ERP'dan, kromka/raspil — sex jadvali, ish haqi va ustama — egasi */
const toza = cls.map(cl => Object.assign({}, cl, { hardware: [] }));
const Sall = qolla(S, { ish_haqi: { detal: 12000, modul: 40000 }, ustama: { foiz: 35 } });
const pA = productionCost(toza, mats, Object.assign({}, OPT, { stavka: Sall }));
ok(`hammasi tasdiqlangan → 100% (${pA.aniqlik.pct}%)`, pA.aniqlik.pct === 100 && pA.aniqlik.taxmin.length === 0 && pA.aniqlik.tasdiqlangan === pA.clientTotal, JSON.stringify(pA.aniqlik.taxmin.slice(0, 3)));
const narxsizQator = toza.map(cl => Object.assign({}, cl, { hardware: [{ code: 'YOQ-FURNITURA-X', qty: 1, name: 'Narxsiz furnitura' }] }));
const pN = productionCost(narxsizQator, mats, Object.assign({}, OPT, { stavka: Sall }));
ok(`narxsiz qator bor → aniqlik 100% emas (${pN.aniqlik.pct}%), soni ko'rsatiladi (${pN.aniqlik.narxsiz})`, pN.aniqlik.narxsiz > 0 && pN.aniqlik.pct === 99 && pA.aniqlik.pct === 100);
const pB = productionCost(toza, mats, Object.assign({}, OPT, { stavka: qolla(Sall, { ish_haqi: { detal: 12000 } }) }));
const Sm = JSON.parse(JSON.stringify(Sall)); Sm.ish_haqi.modul.manba = 'taxmin';
const pM = productionCost(toza, mats, Object.assign({}, OPT, { stavka: Sm }));
ok(`ish haqi taxmin bo'lsa — 100% dan kam (${pM.aniqlik.pct}%), ro'yxatda "Ish haqi"`, pM.aniqlik.pct < 100 && pM.aniqlik.taxmin.some(t => t.group === 'Ish haqi') && pB.aniqlik.pct === 100);
const Sx = JSON.parse(JSON.stringify(Sall)); Sx.ustama.foiz.manba = 'taxmin';
const pX = productionCost(toza, mats, Object.assign({}, OPT, { stavka: Sx }));
ok(`ustama taxmin — ustama summasi taxmin (${pX.aniqlik.pct}% ≈ 100/1,35)`, pX.aniqlik.pct === Math.floor(pX.totalCost / pX.clientTotal * 100 + 1e-9) && pX.aniqlik.taxmin.some(t => t.group === 'Ustama'));

console.log('\n[4] Tekshiruv (server)');
const rad = (patch) => { try { narxQollash(Sall, patch); return false; } catch (e) { return narxXatoMi(e); } };
ok('manfiy, matn, aql chegarasidan katta, noma\'lum guruh, taxmin manba, mavjud bo\'lmagan tanlov — rad', [
  { xizmatlar: { a: { ...TEST_X.R1, qiymat: -1 } } }, { xizmatlar: { a: { ...TEST_X.R1, qiymat: 'x' } } }, { xizmatlar: { a: { ...TEST_X.R1, qiymat: 2e6 } } },
  { xizmatlar: { a: { ...TEST_X.R1, guruh: 'x' } } }, { xizmatlar: { a: { ...TEST_X.R1, manba: 'taxmin' } } }, { tanlov: { raspil: 'yoq' } },
  { tanlov: { kromka: { _sukut: 'R1' } } }, { ustama: { foiz: 301 } }, { ish_haqi: { modul: -5 } }, { tanlov: { prisadka: { yoq_tur: 'P1' } } }
].every(rad));
const r0 = narxQollash(Sall, { ustama: { foiz: 35 } });
ok('bir xil qiymat — o\'zgarish yo\'q', r0.ozgarish.length === 0);
ok('egasi kiritgan qiymat — manba "egasi", bugungi sana', Sd.ish_haqi.detal.manba === 'egasi' && Sd.ish_haqi.detal.sana === new Date().toISOString().slice(0, 10));

console.log('\n[5] Sex jadvalidan yuklash');
if (!existsSync(JADVAL)) console.log('skip  paket yo\'q (Smart3D_toplam_2026-10-16) — o\'tkazib yuborildi');
else {
  const v = xlsxOqish(readFileSync(JADVAL), zlib.inflateRawSync);
  const r = Object.values(v).map(xizmatJadvalOqish).find(Boolean);
  const by = (nom) => Object.values(r.xizmatlar).find(q => q.nom === nom) || {};
  ok(`o'qildi: ${Object.keys(r.xizmatlar).length} qator (raspil/kromka/prisadka ${r.jami} dan, ${r.otkazildi} o'tkazildi)`, r && Object.keys(r.xizmatlar).length === r.jami - r.otkazildi && r.otkazildi >= 1);
  ok('raspil Altendorf 1 = 18 000 (list), Holzma 3 = 48 000', by('Услуга Распила Altendorf 1').qiymat === 18000 && by('Услуга Распила Holzma 3').qiymat === 48000 && by('Услуга Распила Altendorf 1').birlik === 'list');
  ok('kromka ПВХ 19/1 прямая = 4 000 (m)', by('Услуга ПВХ 19/1 прямая').qiymat === 4000 && by('Услуга ПВХ 19/1 прямая').guruh === 'kromka');
  ok('prisadka ЕВРО 1 600, ПЕТЛЕ 900, ЭКСЦЕНТРИК 1 400, Паз 4 000', by('ПРИСАДКА ЕВРО').qiymat === 1600 && by('ПРИСАДКА ПЕТЛЕ').qiymat === 900 && by('ПРИСАДКА ЭКСЕРТРИК').qiymat === 1400 && by('Присадка Паз').qiymat === 4000);
  ok('bo\'sh narx katagi — o\'qilmaydi (hech narsani o\'zgartirmaydi)', !Object.values(r.xizmatlar).some(q => q.nom === 'Услуга ПВХ 19/0,4+0,6 овальная'));
  ok('manba "sex jadvali", sana — "Amal sanasi"', by('Услуга Распила Altendorf 1').manba === 'sex jadvali' && by('Услуга Распила Altendorf 1').sana === '2026-07-03');
  ok('ko\'rib chiqish: yuklanmagan qator — o\'zgarmaydi, bir xil — "bir xil"', (() => { const cur = qolla(s0, { xizmatlar: { ZZ: TEST_X.R1, [Object.keys(r.xizmatlar)[0]]: Object.values(r.xizmatlar)[0] } }); const f = xizmatFarq(cur, r.xizmatlar); return f.bir_xil === 1 && f.yangi.length === Object.keys(r.xizmatlar).length - 1 && !f.ozgargan.length; })());
  const Sj = qolla(s0, { xizmatlar: r.xizmatlar });
  ok('server tekshiruvidan o\'tadi (hamma qator)', Object.keys(Sj.xizmatlar).length === Object.keys(r.xizmatlar).length);

  console.log('\n[6] Sinov oshxonasi — "Narx aniqligi" (stavkalar TEST UCHUN tanlangan, egasi tanlovi emas)');
  const kod = (nom) => Object.entries(r.xizmatlar).find(([, q]) => q.nom === nom)[0];
  const Stest = qolla(Sj, { tanlov: { raspil: kod('Услуга Распила Altendorf 1'), kromka: { _sukut: kod('Услуга ПВХ 19/1 прямая') },
    prisadka: { konfirmat_yuza: kod('ПРИСАДКА ЕВРО'), petlya: kod('ПРИСАДКА ПЕТЛЕ'), hinge: kod('ПРИСАДКА ПЕТЛЕ'), polka: kod('ПРИСАДКА ПОЛКАДЕРЖАТЕЛ'), shkant: kod('ПРИСАДКА ШКАНТ'), dowel: kod('ПРИСАДКА ШКАНТ'), eksentrik: kod('ПРИСАДКА ЭКСЕРТРИК'), cam: kod('ПРИСАДКА ЭКСЕРТРИК') } } });
  const pT = hisob(Stest);
  const qisqa = (p) => `tannarx ${p.totalCost}, mijoz ${p.clientTotal}, aniqlik ${p.aniqlik.pct}% — taxmin: ${p.aniqlik.taxmin.map(t => t.group + ' ' + t.amount).join(', ')}; narxsiz ${p.aniqlik.narxsiz}`;
  console.log('      hozir:            ' + qisqa(p0));
  console.log('      sex jadvali bilan: ' + qisqa(pT) + ' (raspil Altendorf 1, kromka ПВХ 19/1 прямая; ish haqi va ustama — taxmin)');
  const Sih = qolla(Stest, { ish_haqi: { yoqilgan: false }, ustama: { foiz: 35 } });
  const pT2 = hisob(Sih);
  console.log('      + ish haqi o\'chiq, ustama 35% egasi deb: ' + qisqa(pT2));
  ok('sex jadvali stavkalari bilan aniqlik oshdi', pT.aniqlik.pct > p0.aniqlik.pct && pT2.aniqlik.pct >= pT.aniqlik.pct);
}

/* scripts/smeta_hisob.mjs web hisobi (createHisob().recalc) bilan bir xil yo'ldan yursin: stoleshnitsa LDSP listidan emas, tanlangan standartdan */
console.log('\n[7] scripts/smeta_hisob.mjs — web hisob bilan bir xil');
const { natija } = await import('../scripts/smeta_hisob.mjs');
const { createHisob, loadData } = await import('../web/src/services/hisob.js');
const Hh = createHisob(await loadData((nom) => Promise.resolve(J(nom))));
const docT = { room: { outline: [[0, 0], [3000, 0], [3000, 2500], [0, 2500]], wall_height: 2700, openings: [] }, placements: [], kitchen: { stoleshnitsa: true, sokol: true, dobor: false, karniz: false, moyka: { on: false } } };
let xx = 50; const cat = Hh.catalog;
for (const [c, w] of [['MC-KP-08', 600], ['MC-KP-11', 400], ['MC-KP-02', 600], ['MC-KP-04', 450]]) { docT.placements.push({ id: 'p' + docT.placements.length, frg: c, x: xx, y: 50, z: 0, w, d: cat[c].d, h: cat[c].h, rot: 0 }); xx += w; }
xx = 50;
for (const [c, w] of [['MC-KU-04', 600], ['MC-KU-07', 600], ['MC-KU-03', 300]]) { docT.placements.push({ id: 'u' + docT.placements.length, frg: c, x: xx, y: 50, z: 1450, w, d: cat[c].d, h: cat[c].h, rot: 0 }); xx += w; }
const rw = Hh.recalc(docT, { materialCode: 'LDSP16', fasadCode: 'LDSP16' });
ok(`skript = web hisob: mijoz ${natija.mijoz}, narxsiz ${natija.narxsiz}`, natija.mijoz === rw.prod.clientTotal && natija.tannarx === rw.prod.totalCost && natija.narxsiz === rw.prod.missing.length);
ok('stoleshnitsa (STOL26-3050) narxsiz — LDSP listidan narxlanmaydi', natija.narxsizlar.includes('STOL26-3050') && natija.aniqlik <= 99);

console.log(`\n=== ${fails ? 'XATO' : 'HAMMASI OK'} (${n - fails} pass, ${fails} fail) ===`);
process.exit(fails ? 1 : 0);
