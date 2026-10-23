/* verify_stol_erp.mjs — TZ-32 yakuniy (egasi #222 Q1): stoleshnitsa narxi TANLANGAN ERP DEKORdan (bitta narx emas).
 *   [1] app/data/stoleshnitsa-erp.json: har dekor ERP m2 narxi bilan; narxsiz yo'q; sukut = eng ko'p qoldiqli; ichki host/login yo'q
 *   [2] sukut dekor → narx qatori STOL26-3050 = narx_m2 × 3050 × 600 (manba ERP, tasdiqlangan)
 *   [3] boshqa dekor tanlansa narx o'zgaradi; 38 mm Egger (ERP nomida 4,1 m) → STOL38-4100; qalinlikka mos kelmagan tanlov → sukut
 *   [4] dekor uzunligi 3050 bo'lsa uzun qator ≤ 3050 bo'laklarga bo'linadi (ERP'da 4200 yo'q — o'ylab topilmaydi)
 * Ishga tushirish: node tests/verify_stol_erp.mjs */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHisob, loadData } from '../web/src/services/hisob.js';
import { stolDekor, stolDonaNarx } from '../app/js/engine/stoleshnitsa.js';

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('ok    ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const J = (n) => JSON.parse(readFileSync(fileURLToPath(new URL('../app/data/' + n, import.meta.url)), 'utf8'));
const data = J('stoleshnitsa-erp.json');
const raw = readFileSync(fileURLToPath(new URL('../app/data/stoleshnitsa-erp.json', import.meta.url)), 'utf8');

console.log('[1] ma\'lumot fayli');
ok(`${data.items.length} dekor, hammasi narxli (ERP m2), 26/38 mm, eni 600`, data.items.length > 100 && data.items.every(d => d.narx_m2 > 0 && [26, 38].includes(d.qalinlik) && d.eni === 600 && d.uzunliklar.length && d.sku !== undefined && d.erp_id > 0));
/* TZ-50 (2026-10-23): yangi bazada qoldiq ma'lumoti siyrak (132 dekordan 37 tasida), shuning uchun oldingi sukut dekor (egasi aytmagan; avval eng ko'p qoldiqli) saqlandi — u yangi bazada bor va narxli bo'lishi shart */
ok('har qalinlikda sukut dekor bor, o\'sha qalinlikda va yangi baza narxli', ['26', '38'].every(T => { const s = data.items.find(d => d.erp_id === data.sukut[T]); return s && s.qalinlik === +T && s.narx_m2 > 0; }));
ok('narxlar har xil (bitta narx emas): 26 mm da kamida 5 xil narx', new Set(data.items.filter(d => d.qalinlik === 26).map(d => d.narx_m2)).size >= 5);
ok('ERP nomida o\'lchami yozilmagan dekorda manba aytilgan (egasi #162 standarti)', data.items.filter(d => d.uzunliklar.length === 2).every(d => /#162/.test(d.olcham_manba)) && data.items.filter(d => d.uzunliklar.length === 1).every(d => d.olcham_manba === 'ERP nomi'));
ok('ichki host/IP/login/yo\'l yo\'q (repo ommaviy)', !/https?:\/\/|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|bittada\.uz|\/home\/|parol|password|login/i.test(raw));

const H = createHisob(await loadData((n) => Promise.resolve(J(n))));
const cat = H.catalog;
function doc(kitchen, n = 4) {
  const d = { room: { outline: [[0, 0], [8000, 0], [8000, 2500], [0, 2500]], wall_height: 2700, openings: [] }, placements: [], kitchen: Object.assign({ stoleshnitsa: true, sokol: false, dobor: false, karniz: false, moyka: { on: false } }, kitchen) };
  let x = 50;
  const mod = [['MC-KP-08', 600], ['MC-KP-11', 400], ['MC-KP-02', 600], ['MC-KP-04', 450]];
  for (let i = 0; i < n; i++) { const [c, w] = mod[i % 4]; d.placements.push({ id: 'p' + i, frg: c, x, y: 50, z: 0, w, d: cat[c].d, h: cat[c].h, rot: 0 }); x += w; }
  return d;
}
const stolQ = (r) => r.prod.lines.filter(l => l.group === 'Stoleshnitsa');
const hisob = (k, n) => H.recalc(doc(k, n), { materialCode: 'LDSP16', fasadCode: 'LDSP16' });

console.log('[2] sukut dekor');
const s26 = data.items.find(d => d.erp_id === data.sukut['26']);
const r0 = hisob({}, 4), l0 = stolQ(r0);
ok(`26 mm sukut (${s26.sku}) → bitta 3050 bo'lak, narx ${stolDonaNarx(s26, 3050)} = ${s26.narx_m2} × 3050 × 600`, l0.length === 1 && l0[0].code === 'STOL26-3050' && l0[0].unit_price === stolDonaNarx(s26, 3050) && l0[0].amount === l0[0].unit_price * l0[0].qty);
ok('narx qatori ERP manbali va tasdiqlangan; nomida dekor nomi', l0[0].manba === 'ERP' && l0[0].tasdiq === true && l0[0].name.includes(s26.dekor) && !l0[0].no_price);
ok('stoleshnitsa "narxsiz" ro\'yxatida yo\'q', !r0.prod.missing.some(m => m.group === 'Stoleshnitsa'));

console.log('[3] dekor tanlash');
const x26 = data.items.find(d => d.qalinlik === 26 && d.sku === 'C501 CR');
const r1 = hisob({ stolT: 26, stolErp: x26.erp_id }, 4), l1 = stolQ(r1);
ok(`boshqa 26 mm dekor (${x26.sku}, ${x26.narx_m2}/m²) → narx ${stolDonaNarx(x26, 3050)}; sukutdan farq qiladi`, l1[0].unit_price === stolDonaNarx(x26, 3050) && l1[0].unit_price !== l0[0].unit_price);
ok('hisob materiallarida shu dekor nomi (3D rang/kesim ro\'yxati)', l1[0].name.includes(x26.dekor));
ok('jami tannarx dekorga qarab o\'zgardi', r1.prod.totalCost !== r0.prod.totalCost);
const egger = data.items.find(d => d.qalinlik === 38 && d.brend === 'Egger' && d.uzunliklar[0] === 4100);
const r2 = hisob({ stolT: 38, stolErp: egger.erp_id }, 4), l2 = stolQ(r2);
ok(`38 mm Egger (${egger.sku}, ERP nomida 4,1 m) → STOL38-4100, narx ${stolDonaNarx(egger, 4100)}`, l2.length === 1 && l2[0].code === 'STOL38-4100' && l2[0].unit_price === stolDonaNarx(egger, 4100));
const r3 = hisob({ stolT: 38, stolErp: x26.erp_id }, 4);
ok('qalinlikka mos kelmagan tanlov (26 mm dekor, 38 mm) → 38 mm sukut dekori', stolQ(r3)[0].name.includes(data.items.find(d => d.erp_id === data.sukut['38']).dekor));
ok('stolDekor: stolErp yo\'q → sukut', stolDekor(data, {}).erp_id === data.sukut['26'] && stolDekor(data, { stolT: 38 }).erp_id === data.sukut['38']);

console.log('[4] uzunlik ERP\'dagidek');
const r4 = hisob({}, 10);   // ~ 4900 mm qator, 26 mm sukut dekor faqat 3050 (ERP nomida 3050*600*26)
const l4 = stolQ(r4);
ok('26 mm (ERP: faqat 3050) uzun qator → faqat STOL26-3050 bo\'laklari, 4200 yo\'q', l4.length === 1 && l4[0].code === 'STOL26-3050' && l4[0].qty >= 2);
const kedr = data.items.find(d => d.qalinlik === 38 && d.uzunliklar.length === 2);
const r5 = hisob({ stolT: 38, stolErp: kedr.erp_id }, 10), l5 = stolQ(r5);
ok(`38 mm Kedr (${kedr.sku}) 3050/4200 — hamma bo'lak narxli, narxsiz yo'q`, l5.length >= 1 && l5.every(l => l.unit_price > 0 && /^STOL38-(3050|4200)$/.test(l.code)) && !r5.prod.missing.some(m => m.group === 'Stoleshnitsa'));

console.log(fail ? `=== XATO (${pass} pass, ${fail} fail) ===` : `=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
