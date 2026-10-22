/* verify_ustama_nol.mjs — TZ-49 (egasi #302/#303, 2026-10-22): ustama 0 va narxsiz furnituraga qo'lda narx (dvigatel + hisob ko'prigi).
 *   [1] ustama 0 ≠ bo'sh: usta 0 qo'ysa — admin 35% bo'lsa ham narx tannarxga teng (+xizmatlar); 35 → +35% (faqat plita va furnitura); null → admin/sukut
 *   [2] ustama manbasi (markupKelish): usta / admin (qiymat, sana) / sukut; ustamaAdmin; doc.ustama (loyiha tanlovi) → markupPctOl: 0 ishlaydi
 *   [3] narxsiz furnitura: qo'lda narx hisobga kiradi, manba «qo'lda», aniqlikda tasdiqlangan emas, "narxi yo'q" ro'yxatidan chiqadi; bazadagi narx ustun;
 *       admin koeffitsienti qo'llanmaydi; noto'g'ri qiymat e'tiborga olinmaydi; narx tarkibi yig'indisi jami bilan aynan teng
 * Ishga tushirish: node tests/verify_ustama_nol.mjs */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { productionCost } from '../app/js/engine/cutlist.js';
import { narxSukut, narxQollash, ustamaAdmin } from '../app/js/engine/narxStavka.js';
import { markupPctOl } from '../web/src/services/hisob.js';

const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const mats = JSON.parse(readFileSync(join(ROOT, 'app/data/materials.json'), 'utf8'));
let n = 0, fails = 0;
const ok = (name, cond, extra = '') => { n++; if (!cond) { fails++; console.log('FAIL  ' + name + (extra ? '  → ' + extra : '')); } else console.log('ok    ' + name); };
const sum = (a) => a.reduce((s, x) => s + x, 0);

/* sinov loyihasi: LDSP16 detallar, narxli furnitura (TS-1730, 6 000) va narxsiz furnitura (ZZ-NARXSIZ, bazada yo'q) */
const cl = () => ({
  parts: [{ length: 700, width: 500, material: 'LDSP16', thickness: 16, qty: 4 }, { length: 900, width: 400, material: 'LDSP16', thickness: 16, qty: 2 }],
  edges: [], holes: [],
  hardware: [{ code: 'TS-1730', name: 'Styajka TS-1730', qty: 3 }, { code: 'ZZ-NARXSIZ', name: 'Noma\'lum furnitura (Bazis)', qty: 5 }]
});
const S0 = narxSukut(mats);
const run = (o = {}) => productionCost([cl()], mats, Object.assign({ stavka: S0 }, o));

console.log('\n[1] Ustama 0 ≠ bo\'sh');
const adminStavka = narxQollash(S0, { ustama: { foiz: 35 } }).next;       // production: admin ilgari 35% saqlagan
const base = run({ stavka: adminStavka });
ok('admin 35% saqlagan, usta Sozlamalarda 0 qo\'ygan (markupPct: 0) → 0 ustama: mijoz narxi tannarxga teng', run({ stavka: adminStavka, markupPct: 0 }).markupPct === 0 && run({ stavka: adminStavka, markupPct: 0 }).clientTotal === base.totalCost);
ok('usta bo\'sh qoldirsa (markupPct yo\'q / null) → admin 35% ustun (aynan shu sabab: egasi 0 kutadi, narxda 35%)', base.markupPct === 0.35 && base.clientTotal > base.totalCost
  && run({ stavka: adminStavka, markupPct: null }).markupPct === 0.35 && run({ stavka: adminStavka, markupPct: undefined }).markupPct === 0.35);
ok('35 → +35% faqat plita va furnitura narxiga (xizmatlar ustamasiz)', (() => { const p = run({ markupPct: 0.35 }); return p.clientTotal === Math.round((p.sheetCost + p.hwCost) * 1.35) + (p.totalCost - p.sheetCost - p.hwCost) && p.clientTotal > p.totalCost; })());
ok('0 → mijoz narxi = tannarx (xizmatlar bilan), «Furniturasiz» jami = jami − furnitura', (() => { const p = run({ markupPct: 0 }); return p.clientTotal === p.totalCost && p.tarkib.jami === p.totalCost && p.clientFurnsiz === p.clientTotal - p.hwCost; })());
ok('stavkasiz va sozlamasiz — sukut 0%', productionCost([cl()], mats, {}).markupPct === 0 && run().markupPct === 0);

console.log('\n[2] Ustama manbasi');
const kel = (o) => run(o).markupKelish;
ok('usta (markupPct berilgan, 0 ham) → tur "usta"', kel({ markupPct: 0 }).tur === 'usta' && kel({ markupPct: 0 }).foiz === 0 && kel({ markupPct: 0.2 }).foiz === 20);
ok('admin 35% (sana bilan) → tur "admin": qiymat 35, manba egasi, sana', (() => { const k = kel({ stavka: adminStavka }); return k.tur === 'admin' && k.foiz === 35 && k.manba === 'egasi' && /^\d{4}-\d{2}-\d{2}$/.test(k.sana); })());
ok('narx hujjati sukut (0%) yoki hujjat yo\'q → tur "sukut"', kel({}).tur === 'sukut' && kel({}).foiz === 0 && kel({ stavka: S0 }).tur === 'sukut' && ustamaAdmin(S0, mats).tur === 'sukut' && ustamaAdmin(null, mats).tur === 'sukut');
ok('admin 0 ni o\'zi saqlasa ham (qo\'lda) — sukut qiymatiga teng bo\'lsa "sukut", boshqa bo\'lsa "admin"', ustamaAdmin(adminStavka, mats).tur === 'admin' && ustamaAdmin(narxQollash(adminStavka, { ustama: { foiz: 0 } }).next, mats).foiz === 0);
ok('doc.ustama (loyiha tanlovi): {yoqilgan: true, foiz: 0} → 0; {yoqilgan: true, foiz: 35} → 0.35; o\'chirilgan → 0 (admin 35% ustidan); yo\'q → Sozlamalar (0 ham)',
  markupPctOl({ ustama: { yoqilgan: true, foiz: 0 } }, 0.2) === 0 && markupPctOl({ ustama: { yoqilgan: true, foiz: 35 } }, null) === 0.35 && markupPctOl({ ustama: { yoqilgan: false, foiz: 35 } }, 0.2) === 0
  && markupPctOl({}, 0) === 0 && markupPctOl({}, null) === null && markupPctOl(null, 0.1) === 0.1);
ok('loyiha tanlovi 0 + admin 35% → narx 0 ustama bilan (markupPctOl → productionCost)', (() => { const mp = markupPctOl({ ustama: { yoqilgan: false, foiz: 35 } }, null); const p = run({ stavka: adminStavka, markupPct: mp }); return mp === 0 && p.clientTotal === p.totalCost; })());

console.log('\n[3] Narxsiz furnituraga qo\'lda narx (TZ-49 4)');
const p0 = run({ markupPct: 0 });
const nl = p0.lines.find(l => l.code === 'ZZ-NARXSIZ');
ok('narx kiritilmaguncha: furnitura qatori narxsiz (manba "yoq"), "narxi yo\'q" ro\'yxatida, aniqlik ≤ 99%', nl && nl.no_price && nl.manba === 'yoq' && nl.amount === 0 && p0.missing.some(m => m.code === 'ZZ-NARXSIZ') && p0.aniqlik.pct <= 99 && p0.aniqlik.narxsiz === 1);
const q = run({ markupPct: 0, furnituraQolda: { 'ZZ-NARXSIZ': 12000 } });
const ql = q.lines.find(l => l.code === 'ZZ-NARXSIZ');
ok('qo\'lda narx 12 000 × 5 = 60 000 hisobga kiradi: furnitura jami va mijoz narxi shuncha oshadi', ql.unit_price === 12000 && ql.amount === 60000 && q.hwCost === p0.hwCost + 60000 && q.clientTotal === p0.clientTotal + 60000);
ok('qator manbasi "qolda", tasdiqlangan emas, narxsiz emas; "narxi yo\'q" ro\'yxatidan chiqdi', ql.manba === 'qolda' && ql.qolda === true && !ql.tasdiq && !ql.no_price && !q.missing.some(m => m.code === 'ZZ-NARXSIZ') && q.aniqlik.narxsiz === 0);
ok('aniqlik: qo\'lda narx tasdiqlangan hisoblanmaydi — "taxmin" ro\'yxatida qoladi, tasdiqlangan summa o\'smaydi', q.aniqlik.taxmin.some(x => x.code === 'ZZ-NARXSIZ' && x.manba === 'qolda' && x.amount === 60000) && q.aniqlik.tasdiqlangan === p0.aniqlik.tasdiqlangan);
ok('ustama bilan: qo\'lda furnitura ham ustamaga kiradi (35%)', (() => { const p = run({ markupPct: 0.35, furnituraQolda: { 'ZZ-NARXSIZ': 12000 } }); return p.clientTotal === Math.round((p.sheetCost + p.hwCost) * 1.35) + (p.totalCost - p.sheetCost - p.hwCost) && p.hwCost === q.hwCost; })());
ok('bazada narxi bor furniturada qo\'lda narx ustun emas (ERP/katalog ustun): TS-1730 6 000 qoladi', run({ markupPct: 0, furnituraQolda: { 'TS-1730': 99999 } }).lines.find(l => l.code === 'TS-1730').unit_price === 6000
  && run({ markupPct: 0, furnituraQolda: { 'TS-1730': 99999 } }).lines.find(l => l.code === 'TS-1730').manba !== 'qolda');
ok('admin koeffitsienti qo\'lda narxga qo\'llanmaydi (narxsiz furnitura koeffitsienti ham)', run({ markupPct: 0, furnituraQolda: { 'ZZ-NARXSIZ': 12000 }, furnituraKoef: { 'ZZ-NARXSIZ': 2, 'TS-1730': 2 } }).lines.find(l => l.code === 'ZZ-NARXSIZ').unit_price === 12000);
ok('noto\'g\'ri qiymatlar (0, manfiy, matn, NaN, > 1e9) e\'tiborga olinmaydi — furnitura narxsiz qoladi', [0, -5, 'abc', NaN, 2e9, null, undefined, {}].every(v => run({ markupPct: 0, furnituraQolda: { 'ZZ-NARXSIZ': v } }).lines.find(l => l.code === 'ZZ-NARXSIZ').no_price === true));
ok('modullar bo\'yicha taqsimot (perModule) qo\'lda narxni hisobga oladi: yig\'indi = jami', sum(q.perModule.map(m => m.client)) === q.clientTotal && sum(q.perModule.map(m => m.clientFurnsiz)) === q.clientFurnsiz);
ok('narx tarkibi: furnitura bo\'limida qo\'lda narxli qator (manba "qolda", kod, 5 × 12 000 = 60 000); yig\'indi = jami (ustama 0 va 35%)', [0, 0.35].every(mk => {
  const p = run({ markupPct: mk, furnituraQolda: { 'ZZ-NARXSIZ': 12000 } }), b = p.tarkib.bolimlar.find(x => x.kod === 'furnitura'), r = b.qatorlar.find(x => x.kod === 'ZZ-NARXSIZ');
  return r && r.manba === 'qolda' && r.miqdor === 5 && r.narx === 12000 && r.summa === 60000 && Math.abs(sum(p.tarkib.bolimlar.map(x => x.jami)) - p.clientTotal) < 1e-6 && p.tarkib.jami === p.clientTotal;
}));
ok('narxsiz qator tarkibda "yoq" manba bilan ko\'rinadi (usta narx kirita oladi)', (() => { const r = p0.tarkib.bolimlar.find(x => x.kod === 'furnitura').qatorlar.find(x => x.kod === 'ZZ-NARXSIZ'); return r && r.manba === 'yoq' && r.summa === 0; })());
ok('ERP/admin qatlamlari o\'zgarmaydi: qo\'lda narx narx hujjatiga (stavka) yozilmaydi', JSON.stringify(S0) === JSON.stringify(narxSukut(mats)) && !JSON.stringify(adminStavka).includes('ZZ-NARXSIZ'));

console.log(`\n=== ${fails ? 'XATO' : 'HAMMASI OK'} (${n - fails} pass, ${fails} fail) ===`);
process.exit(fails ? 1 : 0);
