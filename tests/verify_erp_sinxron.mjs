/* verify_erp_sinxron.mjs — TZ-37 (3-faza): ERP sinxronlash — admin yuklagan ERP JSON'i ↔ bizning katalog (engine/erpSinxron.js) va uning ilovadagi qatlami
 * (engine/adminQatlam.js erpNarxQollash + hisob.js loadData). ERP bilan jonli aloqa YO'Q: faqat JSON tekshiruvi va farq hisobi, hech narsa yozilmaydi.
 * Tekshiriladi: yuklangan fayl tekshiruvi (rad etiladigan qatorlar, matn tozalash); moslash NOM bo'yicha (SKU yolg'iz yetarli emas — haqiqiy ERP ma'lumotida
 * bir SKU turli mahsulotda); holatlar (o'zgardi, to'ldirildi, bir xil, narxsiz, qo'lda, yangi, noaniq, yo'q); dollar × kurs; xizmatlar (mavjud xlsx qoidalari bilan bir xil);
 * qatlam tartibi: fayl < ERP < admin qo'lda; hisobga ta'siri (varaq narxi, furnitura narxi). Ishga tushirish: node tests/verify_erp_sinxron.mjs */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');
const { loadData, createHisob } = await import('../web/src/services/hisob.js');
const Q = await import('../app/js/engine/adminQatlam.js');
const S = await import('../app/js/engine/erpSinxron.js');
const { erpKod } = await import('../app/js/engine/erpKod.js');
const { narxSukut } = await import('../app/js/engine/narxStavka.js');

const DATA = fileURLToPath(new URL('../app/data/', import.meta.url));
const J = (n) => JSON.parse(readFileSync(DATA + n, 'utf8'));
const read = n => Promise.resolve(J(n));
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };

console.log('\n[1] nomKalit va yuklangan fayl tekshiruvi');
ok('nomKalit: boshidagi kod va belgilar olinadi, ё=е, katta-kichik farqsiz', S.nomKalit('102-01-08-301 Монтефикс черный') === S.nomKalit('монтефикс  ЧЕРНЫЙ') && S.nomKalit('Ёлка 16мм') === S.nomKalit('елка-16 мм'));
ok('nomKalit: bo\'sh/belgilardan iborat nom — bo\'sh kalit', S.nomKalit('') === '' && S.nomKalit(null) === '' && S.nomKalit('---') === '');
ok('noto\'g\'ri shakl — xato (bo\'sh, ro\'yxat emas, yaroqli qator yo\'q)', ['', 5, null, {}, { mahsulotlar: [] }, { mahsulotlar: 'x' }, { mahsulotlar: [{ sku: 'a' }] }, { mahsulotlar: [1, null] }].every(j => !!S.erpMahsulotOqi(j).xato));
ok('LIMIT.qator dan ko\'p qator — xato', !!S.erpMahsulotOqi({ mahsulotlar: Array.from({ length: S.LIMIT.qator + 1 }, (_, i) => ({ name: 'a' + i })) }).xato);
const o1 = S.erpMahsulotOqi({ _meta: { sana: '2026-10-20 09:24', manba: 'ERP' }, mahsulotlar: [
  { id: 1, sku: ' A-1 ', name: ' Ikki   probel <b>teg</b>\u0001 ', category_name: 'K', unit: 'шт', display_price_uzs: '1 234,6', price_list_uzs: 2000.4, display_price_usd: 3, qoldiq: 5 },
  { id: 2, name: 'Narxsiz' }, { id: 3, name: 'Manfiy', display_price_uzs: -1 }, { id: 4, name: 'Harf', display_price_uzs: 'abc' }, { id: 5, name: 'Katta', display_price_uzs: 1e11 },
  { id: 1, name: 'Takror id' }, { name: '' }, null, 'matn'] });
ok('yaroqli 2 qator, 7 ta rad (manfiy, harf, juda katta narx; takror id; nomsiz; obyekt emas ×2)', o1.qatorlar.length === 2 && o1.rad.length === 7, JSON.stringify(o1.rad));
ok('narx butun so\'mga yaxlitlanadi, bo\'sh narx — 0; qoldiq raqam; manba va sana', o1.qatorlar[0].narx === 1235 && o1.qatorlar[0].royxat === 2000 && o1.qatorlar[0].usd === 3 && o1.qatorlar[1].narx === 0 && o1.qatorlar[0].qoldiq === 5 && o1.qatorlar[1].qoldiq === null && o1.meta.sana === '2026-10-20' && o1.meta.manba === 'ERP');
ok('matn tozalanadi: < > va boshqaruv belgilari yo\'q, probellar bittaga, SKU kesiladi', o1.qatorlar[0].nom === 'Ikki probel b teg /b' && o1.qatorlar[0].sku === 'A-1' && !/[<>\u0000-\u001f]/.test(o1.qatorlar[0].nom), o1.qatorlar[0].nom);
ok('ro\'yxat to\'g\'ridan-to\'g\'ri massiv yoki results/items bo\'lsa ham o\'qiladi', S.erpMahsulotOqi([{ name: 'A' }]).qatorlar.length === 1 && S.erpMahsulotOqi({ results: [{ name: 'A' }] }).qatorlar.length === 1 && S.erpMahsulotOqi({ items: [{ name: 'A' }] }).qatorlar.length === 1);

console.log('\n[2] Moslash va holatlar (sun\'iy katalog)');
const plita = [
  { k: 'ERP-a', sku: 'U1', nom: 'ЛДСП Белый 16мм', fayl: 300000, erp: 0, qolda: 0 }, { k: 'ERP-b', sku: 'U1', nom: 'ЛХДФ Белый 3мм', fayl: 90000, erp: 0, qolda: 0 },         // bir xil SKU — turli mahsulot
  { k: 'ERP-c', sku: '', nom: 'ЛДСП Серый 16мм', fayl: 0, erp: 0, qolda: 0 }, { k: 'ERP-d', sku: 'D4', nom: 'ЛДСП Дуб 16мм', fayl: 400000, erp: 410000, qolda: 0 },
  { k: 'ERP-e', sku: 'E5', nom: 'ЛДСП Ясень 16мм', fayl: 350000, erp: 0, qolda: 360000 }, { k: 'ERP-f', sku: 'F6', nom: 'Двойной 16мм', fayl: 1, erp: 0, qolda: 0 }, { k: 'ERP-g', sku: 'F7', nom: 'Двойной 16мм', fayl: 2, erp: 0, qolda: 0 },
  { k: 'ERP-h', sku: 'H8', nom: 'ЛДСП Бук 16мм', fayl: 280000, erp: 0, qolda: 0 }, { k: 'ERP-y', sku: 'Y9', nom: 'Yoq-1', fayl: 5, erp: 0, qolda: 7 }];
const furn = [{ k: '90000001', sku: '102-01-08-301', nom: 'Монтефикс черный', fayl: 1000, erp: 0 }, { k: '90000002', sku: 'M2', nom: 'Ручка Лофт', fayl: 0, erp: 0 }, { k: '90000003', sku: 'M3', nom: 'Петля', fayl: 500, erp: 0 }, { k: '90000004', sku: 'M4', nom: 'Ручка Нет', fayl: 800, erp: 0 }];
const stol = [{ erp_id: 777, sku: 'ST', nom: 'Столешница', narx_m2: 250000 }];
const q = (o) => ({ id: '', sku: '', nom: '', kat: '', birlik: 'шт', narx: 0, royxat: null, usd: 0, qoldiq: null, ...o });
const rows = [
  q({ id: '1', sku: 'U1', nom: '102-01 ЛДСП Белый 16мм', narx: 310000 }),                     // SKU U1 ikkala mahsulotda; NOM aniq ko'rsatadi → ERP-a
  q({ id: '2', sku: 'U1', nom: 'Совсем другой товар 5мм', narx: 1 }),                       // faqat SKU mos — qabul QILINMAYDI (yangi)
  q({ id: '3', nom: 'ЛДСП Серый 16мм', narx: 250000 }),                                    // katalogda narx yo'q → to'ldirildi
  q({ id: '4', sku: 'D4', nom: 'ЛДСП Дуб 16мм', narx: 410000 }),                           // ERP qatlami bilan teng → bir_xil
  q({ id: '5', sku: 'E5', nom: 'ЛДСП Ясень 16мм', narx: 355000 }),                         // qo'lda narx bor
  q({ id: '6', sku: 'F6', nom: 'Двойной 16мм', narx: 10 }),                                // katalogda ikki nom — SKU bilan ajraladi (F6 → ERP-f)
  q({ id: '7', sku: 'ZZ', nom: 'Двойной 16мм', narx: 10 }),                                // SKU hech biriga mos emas — noaniq (sku_farq)
  q({ id: '8', sku: 'H8', nom: 'ЛДСП Бук 16мм', narx: 0 }),                                // ERP'da narx yo'q → narxsiz
  q({ id: '9', sku: 'H8', nom: 'ЛДСП Бук 16мм', birlik: 'м2', narx: 5000 }),               // birlik varaq emas → noaniq (birlik) — lekin id=8 bilan bir xil nom
  q({ id: '10', sku: '102-01-08-301', nom: '102-01-08-301 Монтефикс черный', narx: 1500 }), // furnitura: nom kodi olib tashlanadi → o'zgardi
  q({ id: '11', nom: 'Ручка Лофт', narx: 0, usd: 2 }),                                    // so'm yo'q, dollar bor → 2 × kurs
  q({ id: '12', nom: 'Петля', narx: 500 }),                                                // bir xil
  q({ id: '777', nom: 'Столешница 3050', birlik: 'м2', narx: 260000 }),                    // stoleshnitsa — faqat ko'rsatiladi
  q({ id: '13', nom: 'Umuman yangi', narx: 100 })];
const F = S.mahsulotFarq(rows, { plita, furnitura: furn, stoleshnitsa: stol, kurs: 12800 });
const R = (g, k) => F.qatorlar.find(x => x.g === g && x.k === k);
const byId = (id) => F.qatorlar.find(x => x.erp_id === id);
ok('SKU yolg\'iz yetarli emas: faqat SKU mos qator "yangi" (boshqa mahsulotga bog\'lanmaydi)', byId('2').g === 'yangi' && byId('2').q === false);
ok('nom bo\'yicha moslash + kod olib tashlanadi: ЛДСП Белый → ERP-a (ERP-b emas)', R('plita', 'ERP-a').h === 'ozgardi' && R('plita', 'ERP-a').eski === 300000 && R('plita', 'ERP-a').yangi === 310000 && R('plita', 'ERP-a').foiz === 3.3 && R('plita', 'ERP-b').h === 'yoq');
ok('to\'ldirildi: katalogda narx yo\'q (0) → ERP narxi, foiz yo\'q, qo\'llanadi', R('plita', 'ERP-c').h === 'toldirildi' && R('plita', 'ERP-c').foiz === null && R('plita', 'ERP-c').q === true);
ok('joriy narx — ERP qatlami (fayl emas): teng bo\'lsa "bir_xil", manba "erp"', R('plita', 'ERP-d').h === 'bir_xil' && R('plita', 'ERP-d').manba === 'erp' && R('plita', 'ERP-d').eski === 410000 && !R('plita', 'ERP-d').q);
ok('qo\'lda narx ustun: ERP boshqacha bo\'lsa "qolda", qo\'llanmaydi, joriy — qo\'lda narx', R('plita', 'ERP-e').h === 'qolda' && R('plita', 'ERP-e').eski === 360000 && R('plita', 'ERP-e').manba === 'qolda' && !R('plita', 'ERP-e').q);
ok('katalogda bir xil nomli ikki mahsulot: SKU ikkalasida ham bor bo\'lsa — ajratiladi', R('plita', 'ERP-f') && R('plita', 'ERP-f').yangi === 10);
ok('SKU hech biriga mos kelmasa — "noaniq" (sku_farq), qo\'llanmaydi', byId('7').g === 'noaniq' && byId('7').sabab === 'sku_farq' && !byId('7').q);
ok('ERP\'da narx 0 — "narxsiz": mavjud narx o\'zgarmaydi, qo\'llanmaydi', byId('8').g === 'plita' && byId('8').h === 'narxsiz' && byId('8').eski === 280000 && !byId('8').q);
ok('birligi varaq emas (м2) — "noaniq" (birlik), qo\'llanmaydi', byId('9').g === 'noaniq' && byId('9').sabab === 'birlik');
ok('furnitura: nom (kodsiz) bo\'yicha moslanadi, o\'zgardi', R('furnitura', '90000001').h === 'ozgardi' && R('furnitura', '90000001').eski === 1000 && R('furnitura', '90000001').yangi === 1500);
ok('furnitura: so\'m yo\'q, dollar bor → dollar × kurs (narx_manba usd_kurs), to\'ldirildi', R('furnitura', '90000002').yangi === 25600 && R('furnitura', '90000002').narx_manba === 'usd_kurs' && R('furnitura', '90000002').h === 'toldirildi');
ok('furnitura: bir xil; katalogda bor, faylda yo\'q — "yoq" (ro\'yxat boshi) va xulosada soni', R('furnitura', '90000003').h === 'bir_xil' && R('furnitura', '90000004').h === 'yoq' && F.xulosa.yoq.furnitura === 1 && F.xulosa.yoq.plita === 3);
ok('stoleshnitsa: ERP id bo\'yicha topiladi, faqat ko\'rsatiladi (q=false)', R('stoleshnitsa', '777').h === 'ozgardi' && R('stoleshnitsa', '777').eski === 250000 && R('stoleshnitsa', '777').yangi === 260000 && !R('stoleshnitsa', '777').q);
ok('katalogda yo\'q — "yangi"', byId('13').g === 'yangi');
ok('xulosa: guruh × holat sonlari va qo\'llanadigan qatorlar (plita 2: ERP-a, ERP-c; furnitura 2)', F.xulosa.qatorlar === rows.length && F.xulosa.guruh.plita.ozgardi === 2 && F.xulosa.guruh.plita.toldirildi === 1 && F.xulosa.qollanadi.plita === 3 && F.xulosa.qollanadi.furnitura === 2, JSON.stringify(F.xulosa));
ok('tartib: qo\'llanadiganlar avval (o\'zgardi — |foiz| kamayib), yo\'q — eng oxirida', (() => { const q1 = F.qatorlar.filter(x => x.q); return F.qatorlar.slice(0, q1.length).every(x => x.q) && F.qatorlar[F.qatorlar.length - 1].h === 'yoq'; })());
ok('bitta katalog yozuviga ERP\'da ikki qator tushsa — ikkalasi ham "noaniq" (takror), hech qaysi qo\'llanmaydi', (() => {
  const T = S.mahsulotFarq([q({ id: '1', nom: 'ЛДСП Бук 16мм', sku: 'H8', narx: 1 }), q({ id: '2', nom: 'ЛДСП Бук 16мм', sku: 'H8', narx: 2 })], { plita, furnitura: [], stoleshnitsa: [], kurs: 0 });
  const h8 = T.qatorlar.filter(x => x.erp_id); return h8.length === 2 && h8.every(x => x.h === 'noaniq' && x.sabab === 'takror' && !x.q); })());
ok('bir mahsulot ikki katalogda bir vaqtda mos bo\'lsa — "noaniq" (ikki_katalog)', (() => {
  const T = S.mahsulotFarq([q({ id: '1', nom: 'Bir xil nom', narx: 1 })], { plita: [{ k: 'ERP-1', sku: '', nom: 'Bir xil nom', fayl: 5, erp: 0, qolda: 0 }], furnitura: [{ k: '90000009', sku: '', nom: 'Bir xil nom', fayl: 5, erp: 0 }], kurs: 0 });
  return T.qatorlar.find(x => x.erp_id === '1').sabab === 'ikki_katalog'; })());
ok('"yoq" ro\'yxati 300 ta bilan cheklanadi, soni to\'liq', (() => {
  const katta = Array.from({ length: 1000 }, (_, i) => ({ k: 'ERP-x' + i, sku: '', nom: 'Mahsulot ' + i, fayl: 10, erp: 0, qolda: 0 }));
  const T = S.mahsulotFarq([q({ id: '1', nom: 'Boshqa', narx: 1 })], { plita: katta, furnitura: [], kurs: 0 });
  return T.xulosa.yoq.plita === 1000 && T.qatorlar.filter(x => x.h === 'yoq').length === 300; })());

console.log('\n[3] Haqiqiy katalog (app/data) bilan: har qatorning o\'z yozuvi topiladi, narx o\'zgarmasa — "bir xil"');
const sheets = J('sheet-catalog.json').sheets, fc = J('furnitura-catalog.json');
const K = { plita: sheets.map(s => ({ k: erpKod(s), sku: s.sku, nom: s.name, fayl: s.uzs > 0 ? Math.round(s.uzs) : 0, erp: 0, qolda: 0 })),
  furnitura: fc.items.filter(i => i.id).map(i => ({ k: String(i.id), sku: i.sku, nom: i.name, fayl: !i.no_price && i.uzs > 0 ? Math.round(i.uzs) : 0, erp: 0 })), stoleshnitsa: [], kurs: fc.exchangeRate };
const nomSon = new Map(); for (const x of [...K.plita, ...K.furnitura]) nomSon.set(S.nomKalit(x.nom), (nomSon.get(S.nomKalit(x.nom)) || 0) + 1);
const yagona = [...K.plita.filter(x => x.fayl > 0 && nomSon.get(S.nomKalit(x.nom)) === 1).slice(0, 200), ...K.furnitura.filter(x => x.fayl > 0 && nomSon.get(S.nomKalit(x.nom)) === 1).slice(0, 200)];
const T = S.mahsulotFarq(yagona.map((x, i) => q({ id: String(i + 1), sku: x.sku, nom: x.nom, narx: x.fayl })), K);
ok(`${yagona.length} ta noyob nomli yozuv — hammasi o\'z yozuviga, narx bir xil`, (T.xulosa.guruh.plita.bir_xil || 0) + (T.xulosa.guruh.furnitura.bir_xil || 0) === yagona.length && !T.xulosa.guruh.yangi && !T.xulosa.guruh.noaniq, JSON.stringify(T.xulosa.guruh));
ok('narx 10% oshsa — hammasi "ozgardi", foiz 10 atrofida', (() => {
  const U = S.mahsulotFarq(yagona.map((x, i) => q({ id: String(i + 1), sku: x.sku, nom: x.nom, narx: Math.round(x.fayl * 1.1) })), K);
  const oz = U.qatorlar.filter(x => x.h === 'ozgardi'); return oz.length === yagona.length && oz.every(x => Math.abs(x.foiz - 10) < 0.5); })());

console.log('\n[4] Xizmatlar: ERP JSON → mavjud xlsx qoidalari (raspil, kromka, prisadka, Bazis; faol; UZS; narx > 0)');
const cur = narxSukut(J('materials.json'));
const sk = J('materials.json').sukut_narx.xizmatlar;
const kodH = '7802360156';
const xs = [{ id: 1, name: sk[kodH].nom, code: kodH, category_name: sk[kodH].kategoriya, client_price: 45000, is_active: true },
  { id: 2, name: 'Yangi', code: 'NEW-1', category_name: 'Услуги Распила', client_price: '20000', is_active: true }, { id: 3, name: 'Faol emas', code: 'OFF', category_name: 'Услуги Распила', client_price: 5, is_active: false },
  { id: 4, name: 'Dizayn', code: 'DZ', category_name: 'Dizayn', client_price: 5, is_active: true }, { id: 5, name: 'Narxsiz', code: 'NN', category_name: 'Услуги Распила', client_price: null }, { id: 6, name: '', code: '' }, 5];
const xo = S.erpXizmatOqi({ _meta: { sana: '2026-10-20' }, xizmatlar: xs });
ok('o\'qish: 2 xizmat qoladi; faol emas — o\'tkazildi, guruhsiz kategoriya — chetda, narxsiz/nomsiz/obyekt emas — rad', Object.keys(xo.xizmatlar).length === 2 && xo.otkazildi === 1 && xo.chetda === 1 && xo.rad.length === 3 && xo.jami === 3, JSON.stringify([xo.otkazildi, xo.chetda, xo.rad.length, xo.jami]));
ok('qator: guruh, birlik, manba "sex jadvali", sana — ERP fayl sanasi', xo.xizmatlar[kodH].guruh === 'raspil' && xo.xizmatlar[kodH].birlik === 'list' && xo.xizmatlar[kodH].manba === 'sex jadvali' && xo.xizmatlar[kodH].sana === '2026-10-20' && xo.xizmatlar['NEW-1'].qiymat === 20000);
const xf = S.xizmatFarq(xo, { ...cur, xizmatlar: { ...cur.xizmatlar, '780236012400': { ...cur.xizmatlar['780236012400'], manba: 'egasi', qiymat: 5100 } } }, null);
const xr = (k) => xf.qatorlar.find(x => x.k === k);
ok('farq: o\'zgardi (43 000 → 45 000), yangi; "egasi" qo\'ygan qiymat — qolda', xr(kodH).h === 'ozgardi' && xr(kodH).eski === 43000 && xr(kodH).q && xr('NEW-1').h === 'yangi' && xf.xulosa.yoq.xizmat === Object.keys(cur.xizmatlar).length - 1);
ok('"egasi" qiymati ERP\'ga teng emas bo\'lsa — qolda (qo\'llanmaydi)', (() => {
  const c2 = { ...cur, xizmatlar: { ...cur.xizmatlar, [kodH]: { ...cur.xizmatlar[kodH], manba: 'egasi', qiymat: 44000 } } };
  const r = S.xizmatFarq(xo, c2, null).qatorlar.find(x => x.k === kodH); return r.h === 'qolda' && !r.q; })());
ok('chegara tekshiruvi (narxQollash) bajarilsa — noaniq (chegara), qo\'llanmaydi', (() => {
  const r = S.xizmatFarq(xo, cur, (kod) => (kod === 'NEW-1' ? 'aql chegarasidan katta' : '')).qatorlar.find(x => x.k === 'NEW-1'); return r.h === 'noaniq' && r.sabab === 'chegara' && !r.q; })());
ok('noto\'g\'ri xizmat fayli — xato', !!S.erpXizmatOqi({ xizmatlar: [] }).xato && !!S.erpXizmatOqi({ xizmatlar: [5, null] }).xato && !!S.erpXizmatOqi({}).xato);

console.log('\n[5] Qatlam ilovada: fayl < ERP < admin qo\'lda; hisobga ta\'siri');
const api = (ev, mv) => (yol) => (yol === '/api/erp-narx' && ev ? Promise.resolve(ev) : yol === '/api/materiallar' && mv ? Promise.resolve(mv) : Promise.reject(new Error('HTTP 404')));
const H0 = createHisob(await loadData(read));
const sh0 = H0.sheetCatalog.sheets.find(s => s.type === 'LDSP' && s.th === 16 && s.l === 2800 && s.uzs > 0 && !J('dekor-asosiy.json').items.some(e => e.kodlar.includes(erpKod(s))));
const kodS = erpKod(sh0), furn0 = Object.values(H0.furnById).find(i => i.uzs > 0 && !i.no_price), furnYoq = Object.values(H0.furnById).find(i => i.no_price || !(i.uzs > 0));
const EV = { plita: { [kodS]: sh0.uzs + 11111 }, furnitura: { [furn0.id]: furn0.uzs + 222, [furnYoq.id]: 4567 }, sana: '2026-10-20' };
const H1 = createHisob(await loadData(read, api(EV)));
ok('ERP varaq narxi — sheetCatalog va materials-index da (ikkalasida ham)', H1.sheetCatalog.sheets.find(s => erpKod(s) === kodS).uzs === sh0.uzs + 11111 && H1.searchIndex !== undefined);
ok('hisobga ta\'sir: tanlangan varaqning narxi = ERP narxi (raskroy list narxi)', H1.effectiveMaterials(H1.sheetCatalog.sheets.find(s => erpKod(s) === kodS)).panel_materials.some(m => m.sheet_price === sh0.uzs + 11111) && !H0.effectiveMaterials(sh0).panel_materials.some(m => m.sheet_price === sh0.uzs + 11111));
ok('furnitura narxi — ERP narxi; narxsiz furnitura narx oladi (no_price olinadi, price_src erp_sinxron)', H1.furnById[furn0.id].uzs === furn0.uzs + 222 && H1.furnById[furnYoq.id].uzs === 4567 && !H1.furnById[furnYoq.id].no_price && H1.furnById[furnYoq.id].price_src === 'erp_sinxron');
ok('boshqa varaq va furnitura narxlari o\'zgarmaydi', H1.sheetCatalog.sheets.filter(s => erpKod(s) !== kodS).every((s, i) => s.uzs === H0.sheetCatalog.sheets.filter(x => erpKod(x) !== kodS)[i].uzs) && Object.values(H1.furnById).filter(i => i.id !== furn0.id && i.id !== furnYoq.id).every(i => i.uzs === H0.furnById[i.id].uzs));
const H2 = createHisob(await loadData(read, api(EV, { dekor: {}, narx: { [kodS]: sh0.uzs + 99 } })));
ok('admin qo\'lda narxi ERP qatlamidan ustun (fayl < ERP < qo\'lda)', H2.sheetCatalog.sheets.find(s => erpKod(s) === kodS).uzs === sh0.uzs + 99);
const H3 = createHisob(await loadData(read, api({ plita: { [kodS]: -5, 'x': 100, 'ERP-q': 1.5 }, furnitura: { [furn0.id]: 'abc', [furnYoq.id]: 0 } })));
ok('noto\'g\'ri qiymatlar (manfiy, kasr, matn, 0, ERP- bilan boshlanmagan kalit) e\'tiborsiz — hech narsa o\'zgarmaydi', H3.sheetCatalog.sheets.find(s => erpKod(s) === kodS).uzs === sh0.uzs && H3.furnById[furn0.id].uzs === furn0.uzs && H3.furnById[furnYoq.id].no_price === H0.furnById[furnYoq.id].no_price);
ok('erpNarxQollash(null/{}) xato bermaydi, hisoblagich 0', Q.erpNarxQollash({}, null).plita === 0 && Q.erpNarxQollash(null, {}).furnitura === 0 && Q.erpNarxQollash({ sheetCat: { sheets: [] } }, { plita: {}, furnitura: {} }).plita === 0);
const H4 = createHisob(await loadData(read, () => Promise.reject(new Error('server yo\'q'))));
ok('server yo\'q — fayldagi narxlar (hech narsa buzilmaydi)', H4.sheetCatalog.sheets.find(s => erpKod(s) === kodS).uzs === sh0.uzs);

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
