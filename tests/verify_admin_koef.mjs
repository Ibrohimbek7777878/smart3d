/* verify_admin_koef.mjs — TZ-37 (3): admin furnitura koeffitsienti hisobga ulangan (cutlist.js hwUnitPrice).
 * koef 0.5 → furnitura narxi yarmi; koef yo'q / 1 / noto'g'ri — narx o'zgarmaydi (mavjud testlar buzilmaydi); boshqa kodga ta'sir qilmaydi.
 * Konstruksiya standarti (konstruksiyaTili.js): standart berilmasa — xulq o'zgarmaydi; berilsa — faqat aytilmagan qiymatlar.
 * Ishga tushirish: node tests/verify_admin_koef.mjs */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { productionCost } from '../app/js/engine/cutlist.js';
import { narxSukut } from '../app/js/engine/narxStavka.js';
import { promptlarYukla } from '../app/js/engine/promptlar.js';
import { specTekshir, matndanSpec, standartTekshir, STANDART_SUKUT } from '../app/js/engine/konstruksiyaTili.js';

const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');
const J = (p) => JSON.parse(readFileSync(fileURLToPath(new URL('../app/data/' + p, import.meta.url)), 'utf8'));
const mats = J('materials.json'), boglash = J('furnitura-boglash.json').links;
const furnById = {}; for (const it of J('furnitura-catalog.json').items) if (it.id) furnById[it.id] = it;
let n = 0, fails = 0;
const ok = (name, cond, extra = '') => { n++; if (!cond) { fails++; console.log('FAIL  ' + name + (extra ? '  → ' + extra : '')); } else console.log('ok    ' + name); };

const S = narxSukut(mats);
const parts = [{ ref: 'a', nom: 'yon', len: 700, width: 500, qty: 2, material_code: 'LDSP16', tekstura: 'erkin', slot: 'korpus' }];
const cl = (hw) => ({ parts, edges: [], holes: [], hardware: hw });
const pr = (hw, extra = {}) => productionCost([cl(hw)], mats, Object.assign({ stavka: S, furnituraById: furnById, furnituraBoglash: boglash }, extra));
const hwLine = (p, code) => p.lines.find(l => l.group === 'Furnitura' && l.code === code);

console.log('\n[1] Furnitura koeffitsienti (ERP ID bilan bog\'langan kod)');
const KOD = 'NAPRAV-400', DONA = furnById[boglash[KOD]].uzs;
ok('bazaviy narx katalogdan (ID bog\'langan)', DONA > 0);
const base = pr([{ code: KOD, qty: 3 }]);
ok('koef yo\'q — narx katalog narxi', hwLine(base, KOD).unit_price === DONA && hwLine(base, KOD).amount === DONA * 3);
ok('koef 0.5 — narx yarmi', hwLine(pr([{ code: KOD, qty: 3 }], { furnituraKoef: { [KOD]: 0.5 } }), KOD).unit_price === DONA * 0.5);
ok('koef 0.5 — summa yarmi (3 dona)', hwLine(pr([{ code: KOD, qty: 3 }], { furnituraKoef: { [KOD]: 0.5 } }), KOD).amount === DONA * 1.5);
ok('koef 2 — narx ikki baravar', hwLine(pr([{ code: KOD, qty: 1 }], { furnituraKoef: { [KOD]: 2 } }), KOD).unit_price === DONA * 2);
ok('koef 1 — o\'zgarmaydi', pr([{ code: KOD, qty: 3 }], { furnituraKoef: { [KOD]: 1 } }).totalCost === base.totalCost);
for (const yomon of [0, -1, NaN, 'abc', null, undefined, {}]) ok('noto\'g\'ri koef ' + String(yomon) + ' — e\'tiborsiz (1)', pr([{ code: KOD, qty: 3 }], { furnituraKoef: { [KOD]: yomon } }).totalCost === base.totalCost);
ok('boshqa kodga ta\'sir qilmaydi', hwLine(pr([{ code: KOD, qty: 1 }, { code: 'RU-128', qty: 2 }], { furnituraKoef: { [KOD]: 0.5 } }), 'RU-128').unit_price === furnById[boglash['RU-128']].uzs);
ok('tannarx koef bilan kamayadi (yarim narx farqi)', base.totalCost - pr([{ code: KOD, qty: 3 }], { furnituraKoef: { [KOD]: 0.5 } }).totalCost === DONA * 1.5);
const idli = pr([{ code: 'X-ID', id: boglash[KOD], qty: 1 }], { furnituraKoef: { 'X-ID': 0.5 } });
ok('hw.id bilan yozilgan furnitura ham koef oladi (kod bo\'yicha)', hwLine(idli, 'X-ID').unit_price === DONA * 0.5);
const modul = mats.hardware.find(h => h.price > 0);
ok('ID yo\'q, materials.hardware narxi — koef oladi', hwLine(pr([{ code: modul.code, qty: 1 }], { furnituraKoef: { [modul.code]: 0.5 } }), modul.code).unit_price === modul.price * 0.5);

console.log('\n[2] Konstruksiya standarti (aytilmagan qiymatlar)');
const asos = specTekshir(matndanSpec('pastki shkaf 600')), bosh = specTekshir(matndanSpec('pastki shkaf 600'), null);
ok('standart yo\'q — xulq o\'zgarmaydi', JSON.stringify(asos) === JSON.stringify(bosh));
const sukutli = specTekshir(matndanSpec('pastki shkaf 600'), STANDART_SUKUT);
ok('sukut standart (oyoq 100, konfirmat) — hozirgi sukutlar bilan bir xil', JSON.stringify(sukutli.spec) === JSON.stringify(asos.spec) && sukutli.tuzatish.length === asos.tuzatish.length);
const T = standartTekshir({ oyoqBalandlik: 150, birikma: 'ekssentrik', ruchka: { tur: 'uzun', uzunlik: 1000 }, korpus: { nom: 'LDSP', qalinlik: 18 } }).std;
const s2 = specTekshir(matndanSpec('pastki shkaf 600'), T).spec;
ok('aytilmagan oyoq balandligi — standartdan (150): bo\'yi oyoq bilan 708 → 858', s2.oyoqH === 150 && s2.boyi === asos.spec.boyi - 100 + 150, JSON.stringify([s2.oyoqH, s2.boyi, asos.spec.boyi]));
ok('aytilmagan birikma — ekssentrik, ruchka — 1000', s2.furnitura.birikma === 'ekssentrik' && s2.furnitura.ruchka === 1000);
const s3 = specTekshir(matndanSpec('pastki shkaf 600, konfirmat, 600 mm ruchka, oyoq'), T).spec;
ok('aytilgan qiymat ustun: konfirmat va 600 ruchka standartni bosadi', s3.furnitura.birikma === 'konfirmat' && s3.furnitura.ruchka === 600);
const s4 = specTekshir(matndanSpec('pastki shkaf 600 sokol'), T).spec;
ok('aytilgan sokol — standartdagi oyoqni bosadi', s4.tag === 'sokol' && !s4.oyoqH);
const s5 = specTekshir(matndanSpec('pastki shkaf 600, korpus materiali kashemir'), T).spec;
ok('dekor aytilgan, qalinlik aytilmagan — standart qalinlik (18)', s5.material.korpus.qalinlik === 18, JSON.stringify(s5.material.korpus));
const s6 = specTekshir(matndanSpec('pastki shkaf 600, korpus materiali kashemir 16 mm'), T).spec;
ok('qalinlik aytilgan (16) — standart (18) emas', s6.material.korpus.qalinlik === 16);
ok('standart tekshiruvi: yomon qiymatlar rad etiladi', ['oyoqBalandlik', 'birikma', 'tag'].every(k => standartTekshir({ [k]: k === 'oyoqBalandlik' ? 5 : 'x' }).xato) && standartTekshir(null).xato && standartTekshir({ korpus: { nom: '<b>', qalinlik: 16 } }).xato);
ok('buzuq standart specTekshir ni buzmaydi (sukut)', JSON.stringify(specTekshir(matndanSpec('pastki shkaf 600'), { korpus: 5 }).spec) === JSON.stringify(asos.spec));

console.log('\n[3] Tayyor promptlar kutubxonasi: server ro\'yxati yoki jim statik zaxira');
const ST = J('promptlar.json').promptlar, MATNLI = { id: 'q-1', kat: 'oshxona', nom: { uz: 'x' }, matn: { uz: 'oshxona 3 metr' }, izoh: { uz: 'oshxona 3 metr' } };
ok('server ishlamasa (xato) — statik', (await promptlarYukla(ST, async () => { throw new Error('tarmoq yo\'q'); })) === ST);
ok('server noto\'g\'ri javob (shakl) — statik', (await promptlarYukla(ST, async () => ({ x: 1 }))) === ST && (await promptlarYukla(ST, async () => null)) === ST && (await promptlarYukla(ST, async () => ({ promptlar: [] }))) === ST);
const kut = await promptlarYukla(ST, async () => ({ promptlar: [...ST, MATNLI, { id: 'yomon', kat: 'noma\'lum', nom: { uz: 'x' }, matn: { uz: 'y' } }, { id: 'maydonsiz', kat: 'oshxona', usul: 'toplam', nom: { uz: 'x' } }] }));
ok('server ro\'yxati: parametrli + matnli; yaroqsizlari tashlanadi', kut.length === ST.length + 1 && kut.some(p => p.id === 'q-1') && !kut.some(p => p.id === 'yomon' || p.id === 'maydonsiz'));

console.log(`\n=== ${fails ? 'XATO' : 'HAMMASI OK'} (${n - fails} pass, ${fails} fail) ===`);
process.exit(fails ? 1 : 0);
