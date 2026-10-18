/* verify_narx_yakuniy.mjs — TZ-32 yakuniy (egasi #222): ERP bo'yicha yakuniy narx qoidalari.
 *   Q2: ustama FAQAT plita (stoleshnitsa ham) va furnitura narxiga; xizmat qatorlari (raspil, kromka, prisadka, Bazis) ERP narxi bo'yicha, ustamasiz
 *   Q3: ish haqi ERP'da xizmat narxiga kiritilgan (sex tannarxi) — alohida ish haqi qatori yo'q, 0; aniqlikka to'sqinlik qilmaydi
 * Ishga tushirish: node tests/verify_narx_yakuniy.mjs */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cutlist, productionCost } from '../app/js/engine/cutlist.js';
import { nestProject } from '../app/js/engine/nesting.js';
import { deriveKitchen } from '../app/js/engine/kitchen.js';
import { applySexStandart } from '../app/js/engine/standart.js';
import { narxSukut, narxQollash } from '../app/js/engine/narxStavka.js';

const J = (p) => JSON.parse(readFileSync(fileURLToPath(new URL('../app/data/' + p, import.meta.url)), 'utf8'));
const mats = J('materials.json');
/* TZ-32 E: narxSukut endi ERP sukut stavkalarini ham beradi (materials.json sukut_narx); bu test BO'SH hujjat mexanikasini tekshiradi */
const matsBosh = Object.assign({}, mats); delete matsBosh.sukut_narx;
let n = 0, fails = 0;
const ok = (name, cond, extra = '') => { n++; if (!cond) { fails++; console.log('FAIL  ' + name + (extra ? '  → ' + extra : '')); } else console.log('ok    ' + name); };

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
const TEST_X = {
  R1: { nom: 'Raspil (test)', guruh: 'raspil', qiymat: 43000, birlik: 'list', manba: 'sex jadvali', sana: '2026-10-18' },
  K1: { nom: 'Kromka (test)', guruh: 'kromka', qiymat: 3000, birlik: 'm', manba: 'sex jadvali', sana: '2026-10-18' },
  P1: { nom: 'Prisadka (test)', guruh: 'prisadka', qiymat: 1600, birlik: 'dona', manba: 'sex jadvali', sana: '2026-10-18' }
};
const qolla = (cur, patch) => narxQollash(cur, patch).next;
const s0 = narxSukut(mats);

console.log('[Q2] ustama faqat plita va furnitura');
const S = qolla(s0, { xizmatlar: TEST_X, tanlov: { raspil: 'R1', kromka: { _sukut: 'K1' }, prisadka: { konfirmat_yuza: 'P1' } } });
for (const [nom, st, xz] of [['sukut stavkalar', s0, {}], ['raspil 43 000 + kromka 3 000', S, {}], ['+ prisadka tanlangan', S, { xizmatlar: { teshik: true } }]]) {
  const p = hisob(st, xz), m = p.markupPct;
  const xizmat = p.raspilCost + p.edgeCost + p.holeCost + p.bazisCost + p.laborCost;
  ok(`${nom}: mijoz = (plita+furnitura) × ${1 + m} + xizmatlar (${xizmat}) = ${p.clientTotal}`, p.clientTotal === Math.round((p.sheetCost + p.hwCost) * (1 + m)) + xizmat);
  ok(`${nom}: xizmat qatorlari (raspil/kromka/prisadka/Bazis) ustamasiz, plita/stoleshnitsa/furnitura ustamali`,
    p.lines.filter(l => !l.info).every(l => (['Raspil', 'Kromka', 'Xizmatlar', 'Ish haqi'].includes(l.group)) === (l.ustama === false)));
  ok(`${nom}: modullar yig'indisi = jami`, p.perModule.reduce((s, q) => s + q.client, 0) === p.clientTotal);
  ok(`${nom}: tannarx (totalCost) o'zgarmagan: plita+raspil+kromka+furnitura+teshik+Bazis+ish haqi`, p.totalCost === p.sheetCost + p.raspilCost + p.edgeCost + p.hwCost + p.holeCost + p.bazisCost + p.laborCost);
}
const pR = hisob(S);
const rl = pR.lines.find(l => l.code === 'raspil');
ok(`raspil Holzma 43 000 → mijozga ham aynan ${rl.amount} (43 000 × ${rl.qty} list), ustama qo'shilmagan`, rl.unit_price === 43000 && rl.ustama === false && pR.clientTotal - Math.round((pR.sheetCost + pR.hwCost) * (1 + pR.markupPct)) >= rl.amount);
const p20 = hisob(qolla(S, { ustama: { foiz: 20 } })), p35 = hisob(S);
ok('ustama 35% → 20%: faqat plita+furnitura qismi o\'zgaradi, xizmatlar bir xil', p35.clientTotal - p20.clientTotal === Math.round((p35.sheetCost + p35.hwCost) * 1.35) - Math.round((p20.sheetCost + p20.hwCost) * 1.2));
const ustamaSum = p35.clientTotal - p35.totalCost;
ok(`ustama summasi (${ustamaSum}) = (plita+furnitura) × 35% — butun tannarxning 35% idan kam`, ustamaSum === Math.round((p35.sheetCost + p35.hwCost) * 1.35) - (p35.sheetCost + p35.hwCost) && ustamaSum < p35.totalCost * 0.35);

console.log('\n[Q3] ish haqi — ERP xizmat narxiga kiritilgan (sex tannarxi), alohida qator 0');
ok('boshlang\'ich hujjat: ish haqi detal/modul = 0, manba "egasi" (ERP), yoqilgan', s0.ish_haqi.detal.qiymat === 0 && s0.ish_haqi.modul.qiymat === 0 && s0.ish_haqi.detal.manba === 'egasi' && s0.ish_haqi.modul.manba === 'egasi');
ok('materials.json labor = 0 (12 000/40 000 taxmin olib tashlangan)', mats.labor.panel_per_piece === 0 && mats.labor.per_fragment_min === 0 && /ERP: ish haqi xizmat narxiga kiritilgan/.test(mats.labor.note));
const p0 = hisob(s0);
ok('ish haqi summasi 0, "Ish haqi" qatori yo\'q, narxsiz ro\'yxatida yo\'q', p0.laborCost === 0 && !p0.lines.some(l => l.group === 'Ish haqi') && !p0.missing.some(m => m.group === 'Ish haqi'));
ok('aniqlik: ish haqi "taxmin" ro\'yxatida emas', !p0.aniqlik.taxmin.some(t => t.group === 'Ish haqi') && !p0.taxminiy.includes('Ish haqi'));
const pNo = productionCost(cls, mats, OPT);   // stavkasiz hisob (materials.labor)
ok('stavkasiz hisob ham ish haqisiz va narxsiz emas', pNo.laborCost === 0 && !pNo.missing.some(m => m.group === 'Ish haqi'));
const pIh = hisob(qolla(s0, { ish_haqi: { detal: 5000 } }));
ok('usta/admin keyin o\'zgartira oladi: detal 5 000 → ish haqi qatori paydo bo\'ladi, ustamasiz', pIh.laborCost > 0 && pIh.lines.some(l => l.group === 'Ish haqi' && l.ustama === false)
  && pIh.clientTotal === Math.round((pIh.sheetCost + pIh.hwCost) * (1 + pIh.markupPct)) + pIh.raspilCost + pIh.edgeCost + pIh.holeCost + pIh.bazisCost + pIh.laborCost);

console.log(fails ? `=== XATO (${n - fails} pass, ${fails} fail) ===` : `=== HAMMASI OK (${n} pass, 0 fail) ===`);
process.exit(fails ? 1 : 0);
