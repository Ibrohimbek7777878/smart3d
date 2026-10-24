/* TZ-57/59 (serverdan GitHub'ga olingan kod): furnitura takrorlari, rasm/namuna, plita moslash xotirasi, Bazis "mahsulot emas" qatorlari.
 * Ishlatish: node tests/verify_serverdan.mjs */
import { takrorsiz } from '../web/src/services/furnTakror.js';
import { rasmYol, rasmNamuna } from '../web/src/services/furnRasm.js';
import { moslashKalit, xotiraQoy, xotiraBor, xotiradanSheet } from '../web/src/services/plitaXotira.js';
import { erpKod } from '../app/js/engine/erpKod.js';

let pass = 0, fail = 0;
const ok = (n, c, i = '') => { if (c) { pass++; console.log('ok   ', n); } else { fail++; console.log('FAIL ', n, i); } };

console.log('[1] takrorsiz: bir xil nom+SKU+narx — bir marta (eng kichik ID); narxi/SKU farqli — qoladi');
const A = { id: '90000020', name: 'Hettich Петля', sku: 'H-1', uzs: 5000 }, A2 = { id: '90000010', name: 'hettich  петля', sku: 'h-1', uzs: 5000 };
const B = { id: '90000030', name: 'Hettich Петля', sku: 'H-1', uzs: 6000 }, C = { id: '90000040', name: 'Hettich Петля', sku: 'H-2', uzs: 5000 };
const r = takrorsiz([A, A2, B, C]);
ok('4 → 3 qator', r.length === 3, String(r.length));
ok('takror orasidan eng kichik ID qoladi', r.some(x => x.id === '90000010') && !r.some(x => x.id === '90000020'));
ok('narxi farqli qoladi', r.some(x => x.id === '90000030'));
ok('SKU farqli qoladi', r.some(x => x.id === '90000040'));
ok('bo\'sh ro\'yxat', takrorsiz([]).length === 0);

console.log('[2] rasmYol / rasmNamuna: faqat jadvalda bor narsa; o\'ylab topilmaydi');
const H = { rasmlar: { furnitura: { 90001: 'data/rasm/furnitura/90001.webp' }, _meta: { namuna: ['90002'] } } };
ok('rasmYol — bor id', rasmYol(H, '90001') === '/data/rasm/furnitura/90001.webp');
ok('rasmYol — yo\'q id / H yo\'q / id yo\'q → null', rasmYol(H, '1') === null && rasmYol(null, '90001') === null && rasmYol(H, null) === null);
ok('rasmNamuna — ro\'yxatdagi', rasmNamuna(H, '90002') === true && rasmNamuna(H, 90002) === true);
ok('rasmNamuna — ro\'yxatda yo\'q / ma\'lumot yo\'q → false', rasmNamuna(H, '90001') === false && rasmNamuna({}, '1') === false && rasmNamuna(null, '1') === false);

console.log('[3] plita moslash xotirasi: kalit, saqlangan tanlov → katalogdagi plita');
const m1 = { name: 'ЛДСП Egger H1145 (Дуб)', thickness: 16 }, m2 = { name: 'лдсп egger h1145 дуб', thickness: 16 }, m3 = { name: 'ЛДСП Egger H1145 (Дуб)', thickness: 18 };
ok('kalit: harf-raqam, kichik, qalinlik bilan', moslashKalit(m1) === moslashKalit(m2) && moslashKalit(m1) !== moslashKalit(m3) && /\|16$/.test(moslashKalit(m1)));
ok('nomsiz material — kalit bo\'sh (saqlanmaydi)', moslashKalit({ thickness: 16 }) === '' && moslashKalit(null) === '');
const sheets = [{ name: 'Egger H1145 Дуб', sku: 'H1145', th: 16 }, { name: 'Boshqa', sku: 'X', th: 16 }];
ok('xotira yuklanmaguncha — null', xotiraBor() === false && xotiradanSheet(m1, sheets) === null);
xotiraQoy({ [moslashKalit(m1)]: { kod: erpKod(sheets[0]), nom: 'Egger H1145 Дуб' } });
ok('xotiradagi tanlov katalogdan topiladi', xotiradanSheet(m2, sheets) === sheets[0]);
ok('boshqa qalinlik — topilmaydi', xotiradanSheet(m3, sheets) === null);
ok('katalogda endi yo\'q plita — null (o\'ylab topilmaydi)', xotiradanSheet(m1, [sheets[1]]) === null);
ok('sheets massiv emas — null', xotiradanSheet(m1, null) === null);

console.log(`\n=== ${fail ? 'XATO' : 'HAMMASI OK'} (${pass} pass, ${fail} fail) ===`);
process.exit(fail ? 1 : 0);
