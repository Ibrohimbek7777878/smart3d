/* verify_katalog_erp.mjs — katalog yangilash (ERP /api/v2/products/, 2026-10-22; egasi #295: "narxni to'g'irlab qo'y, katta ERPni tekshir").
 * Tekshiriladi (faqat o'qish; ERP bilan jonli aloqa YO'Q):
 *   [1] plita katalogi (sheet-catalog.json): hajm pasaymagan (1281), takroriy kalit yo'q, l/w musbat va l ≥ w, narx ≥ 0, qalinlik musbat
 *   [2] list formati nomdagi maydonga mos: "4,575" → 2500×1830, "5,0325" → 2750×1830, "5,175" → 2500×2070, "5,796" → 2800×2070, "2,9768" → 2440×1220
 *       (katalogdagi sukut 2800×2070 endi qolmagan: ERP formati yozilgan); materials-index.json bilan bir xil qiymat
 *   [3] furnitura katalogi: hajm pasaymagan (3089), takroriy ID yo'q, narx ≥ 0, no_price ↔ uzs 0, price_src to'g'ri, ERP narxi (erp_api_) > 0
 *   [4] ERP eksporti (lokal maxfiy fayl, gitda YO'Q) mavjud bo'lsa: plita, furnitura va stoleshnitsa ERP bilan to'liq mos (reja bo'sh: o'zgarishi kerak qator yo'q), qalinlik tegilmagan.
 *       Fayl yo'q bo'lsa — o'tkazib yuboriladi (boshqa mashinada ham yashil).
 * 2026-10-23 (TZ-50, egasi #311/#325): plita va stoleshnitsa katalogi FAQAT yangi baza (YANGI-BAZA-ISHONCHLI-NARXLAR-2026-10-23) narxlariga o'tdi — hajm 1281 → 718 (yangi bazada yo'qlari chiqarildi),
 * src "yangi_baza_<sana>". Shu sababli ERP products API (2026-10-22) narxi bilan tenglik tekshiruvlari plita/stoleshnitsa uchun TUGADI (narxning yagona manbai — yangi baza; ularni
 * tests/verify_katalog_yangi_baza.mjs CSV bilan solishtiradi); list formati, takrorsizlik, indeks tengligi va furnitura (TZ-50 tegmagan) tekshiruvlari qoldi.
 * Ishga tushirish: node tests/verify_katalog_erp.mjs */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { erpKod } from '../app/js/engine/erpKod.js';
import { nomFormati, nomMaydoni } from '../app/js/engine/plitaMoslash.js';
import { reja } from '../scripts/katalog_erp_moslash.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DATA = ROOT + 'app/data/';
const J = (n) => JSON.parse(readFileSync(DATA + n, 'utf8'));
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const skip = (name) => console.log("  · o'tkazib yuborildi:", name);
const num = (v) => typeof v === 'number' && Number.isFinite(v);

const SC = J('sheet-catalog.json'), FC = J('furnitura-catalog.json'), MI = J('materials-index.json'), ST = J('stoleshnitsa-erp.json');
const sheets = SC.sheets, items = FC.items;

console.log('\n[1] plita katalogi');
ok('hajm: ≥ 700 plita (TZ-50: yangi baza ishonchli narxli yozuvlari; avval 1281)', sheets.length >= 700, sheets.length);
const kodlar = sheets.map(erpKod);
ok('takroriy ERP-kod yo\'q (nom|SKU|qalinlik)', new Set(kodlar).size === sheets.length, sheets.length - new Set(kodlar).size);
const nomSku = sheets.map(s => s.name + '|' + s.sku + '|' + s.th);
ok('takroriy nom+SKU+qalinlik yo\'q', new Set(nomSku).size === sheets.length);
const yomonLW = sheets.filter(s => !(num(s.l) && num(s.w) && s.l > 0 && s.w > 0 && s.l >= s.w));
ok('har plitada l va w — musbat son, l ≥ w', yomonLW.length === 0, yomonLW.slice(0, 3).map(s => s.name + ' ' + s.l + '×' + s.w).join('; '));
const yomonNarx = sheets.filter(s => !(num(s.uzs) && s.uzs >= 0 && num(s.usd) && s.usd >= 0));
ok('narx (uzs, usd) — son va ≥ 0', yomonNarx.length === 0, yomonNarx.slice(0, 3).map(s => s.name).join('; '));
ok('qalinlik — musbat son', sheets.every(s => num(s.th) && s.th > 0));
ok('l, w — butun mm (kasr yo\'q)', sheets.every(s => Number.isInteger(s.l) && Number.isInteger(s.w)));
ok('src — yangi_baza_<sana> (TZ-50: narx faqat yangi bazadan)', sheets.every(s => typeof s.src === 'string' && /^yangi_baza_\d{4}-\d{2}-\d{2}$/.test(s.src)), [...new Set(sheets.map(s => s.src))].join());
ok('_meta: yangi baza yozuvi bor (TZ-50)', /yangi baza \(ERP 2026-10-23/i.test(SC._meta) && /TZ-50/.test(SC._meta));

console.log('\n[2] list formati nomdagi maydonga mos (ERP formati)');
/* nomda aniq o'lcham yozilgan ("2800*2070 … 5,175кv") yoki maydon "kv" yaxlitlangan nom — qoida faqat aniq maydon (4,575 / 5,0325 …) uchun */
const kodli = sheets.filter(s => nomMaydoni(s.name, false) != null && !/\d{3,4}\s*[*xх×]\s*\d{3,4}/i.test(s.name));
const zid = kodli.filter(s => { const f = nomFormati(s.name, false); return !f || f[0] !== s.l || f[1] !== s.w; });
ok(`maydonli nomlar (${kodli.length} ta): format nomga mos — 4,575 → 2500×1830, 5,0325 → 2750×1830, 5,175 → 2500×2070, 5,796 → 2800×2070`, kodli.length > 400 && zid.length === 0,
  zid.slice(0, 4).map(s => s.name + ' ' + s.l + '×' + s.w).join('; '));
const l4575 = sheets.filter(s => /(?<![\d.,])4[,.]575(?![\d])/.test(s.name));
ok(`"4,575" nomli ${l4575.length} ta plita — hammasi 2500×1830 (sukut 2800×2070 emas)`, l4575.length >= 50 && l4575.every(s => s.l === 2500 && s.w === 1830));
const l50325 = sheets.filter(s => /(?<![\d.,])5[,.]0325(?![\d])/.test(s.name));
ok(`"5,0325" nomli ${l50325.length} ta plita — hammasi 2750×1830`, l50325.length >= 100 && l50325.every(s => s.l === 2750 && s.w === 1830));
const sat = sheets.find(s => s.sku === '7045 BS' && /Ультрадекор 4,575 Сатин/.test(s.name));
ok('Satin 7045 BS (BIG ONE): 2500×1830, tannarx 282 971, sotuv 380 000 (yangi baza; avval ERP 282 568)', !!sat && sat.l === 2500 && sat.w === 1830 && sat.uzs === 282971 && sat.lst === 380000 && sat.uzs_turi === 'tannarx');
ok('materials-index.json — sheet-catalog bilan bir xil (tartib, nom, SKU, l, w, qalinlik, narx)', MI.items.length === sheets.length
  && MI.items.every((m, i) => { const s = sheets[i]; return m.name === s.name && m.sku === s.sku && m.l === s.l && m.w === s.w && m.th === s.th && m.uzs === s.uzs && m.usd === s.usd; }));

console.log('\n[3] furnitura katalogi');
ok('hajm pasaymagan: ≥ 3089 furnitura', items.length >= 3089, items.length);
const idlar = items.map(i => String(i.id));
ok('takroriy ID yo\'q va har qatorda ID bor', items.every(i => i.id) && new Set(idlar).size === items.length);
ok('narx (uzs) — son va ≥ 0; usd ≥ 0', items.every(i => num(i.uzs) && i.uzs >= 0 && num(i.usd) && i.usd >= 0));
ok('no_price ↔ narx 0 (narxsiz qatorda narx o\'ylab topilmagan)', items.every(i => (i.no_price ? i.uzs === 0 : true)) && items.every(i => i.uzs > 0 || i.no_price === true));
const PS = /^(erp_uzs|erp_usd×kurs|yoq|dokon_\d{4}-\d{2}-\d{2}|erp_api_\d{4}-\d{2}-\d{2})$/;
ok('price_src to\'g\'ri (erp_uzs | erp_usd×kurs | dokon_<sana> | erp_api_<sana> | yoq)', items.every(i => PS.test(i.price_src || '')), [...new Set(items.filter(i => !PS.test(i.price_src || '')).map(i => i.price_src))].join());
ok('manbasi "yoq" qatorda narx yo\'q; ERP (erp_api_) qatorda narx > 0', items.every(i => (i.price_src === 'yoq' ? i.uzs === 0 : true)) && items.every(i => (/^erp_api_/.test(i.price_src) ? i.uzs > 0 && !i.no_price : true)));
const erpSoni = items.filter(i => /^erp_api_/.test(i.price_src)).length;
ok(`ERP API (so'm narxi, kurssiz) manbali qatorlar bor (${erpSoni} ta)`, erpSoni >= 1000);
ok('exchangeRate — musbat son (ERP dollar-yolg\'iz mahsulotlarga qo\'llagan kurs 11950), eski 12800 emas', num(FC.exchangeRate) && FC.exchangeRate === 11950);
ok('_meta: ERP API yozuvi va kurs yozuvi', /ERP \/api\/v2\/products\/ \(2026-10-2[23]/.test(FC._meta) && /kurs 11950/.test(FC._meta));

console.log('\n[4] ERP eksporti bilan to\'liq moslik (lokal maxfiy fayl bo\'lsa)');
const NOMZOD = [process.env.ERP_MAHSULOT_JSON, ROOT + 'Smart3D_malumot/eski narxlar/erp-mahsulotlar-2026-10-23.json', ROOT + '../Smart3D/Smart3D_malumot/eski narxlar/erp-mahsulotlar-2026-10-23.json', ROOT + 'Smart3D_malumot/eski narxlar/erp-mahsulotlar-2026-10-22.json', ROOT + '../Smart3D/Smart3D_malumot/eski narxlar/erp-mahsulotlar-2026-10-22.json'].filter(Boolean);
const erpYol = NOMZOD.find(p => existsSync(p));
if (!erpYol) skip('ERP eksporti (Smart3D_malumot/eski narxlar/erp-mahsulotlar-2026-10-22.json) bu mashinada yo\'q');
else {
  const R = reja(JSON.parse(readFileSync(erpYol, 'utf8')), SC, FC, ST);
  const kutilmagan = (g) => R[g].filter(x => (x.yangi_uzs > 0 && x.eski_uzs !== x.yangi_uzs));
  /* TZ-50: plita va stoleshnitsa narxi endi ERP products API (2026-10-22) bilan EMAS, yangi baza bilan tengligi tekshiriladi (verify_katalog_yangi_baza.mjs) — bu eksport eski narx manbai */
  /* list formati: ERP length×width bilan teng; istisno — nomda aniq o'lcham yozilgan ("2500*1830*18": ERP'da 2400 — noto'g'ri, nomdagi o'lcham ustun, TZ-50) */
  const lwFarq = R.plita.filter(x => x.yangi_lw && (x.yangi_lw[0] !== x.eski_lw[0] || x.yangi_lw[1] !== x.eski_lw[1]));
  ok('plita: ERP list formati bilan farq qiladigan qator yo\'q (faqat nomida aniq o\'lcham yozilganlar istisno)', lwFarq.every(x => /\d{3,4}\s*[*xх×]\s*\d{3,4}/i.test(x.nom)), lwFarq.map(x => x.nom).join('; '));
  ok('furnitura: ERP so\'m narxi bilan farq qiladigan qator yo\'q (TZ-50 furniturani o\'zgartirmagan)', kutilmagan('furnitura').length === 0, kutilmagan('furnitura').slice(0, 3).map(x => x.nom).join('; '));
  ok('nomdagi maydon ERP formatiga zid plita yo\'q (format_ziddiyat bo\'sh)', R.format_ziddiyat.length === 0);
  ok(`mos kelgan plitalar ≥ 700 (${R.plita.length}); noaniq ro'yxat faqat ERP dublikatlari (${R.noaniq.plita.length}: Shanghai UV / Супер Мат / ЛМДФ 2/2 — ERP'da bir xil nomli ikki qator)`, R.plita.length >= 700 && R.noaniq.plita.every(x => x.sabab === 'takror'));
  console.log('  · qalinlik farqi (ERP ↔ katalog; erpKod kaliti — tegilmagan):', R.th_farq.length, 'ta');
}

console.log('\n' + (fail === 0 ? `=== HAMMASI OK (${pass} pass, 0 fail) ===` : `=== XATO: ${fail} ta (${pass} pass, ${fail} fail) ===`));
process.exit(fail ? 1 : 0);
