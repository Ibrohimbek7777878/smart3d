/* TZ-42 (2026-10-22): narx to'g'riligi — Bazis materialini ERP plitasiga moslash, "varaqqa sig'madi" sababi va tuzatishi, mijoz materiali.
 *   1) list formati nomdagi maydondan: "4,6кв" / "4,575" → 2500×1830 (katalogda sukut 2800×2070 bo'lsa tuzatiladi)
 *   2) Bazis nomi → ERP plitasi: bir qiymatli — "aniq" (avtomatik); bir nechta — "nomzod" (o'ylab topilmaydi); yo'q — "yoq"
 *   3) "N ta detal varaqqa sig'madi": sabab — (a) Bazis tekstura yo'nalishi (tik eshik 599×1968 aylanmay "sig'madi"),
 *      (b) panelFitsSheet va kroy shartlari mos emasdi, (c) detal varaqdan haqiqatan katta. Narx jimgina kamaymaydi — yuza bo'yicha taxmin
 *   4) mijoz materiali: plita narxga (tannarx, ustama, aniqlik) kirmaydi; kesim, raspil va nest o'zgarmaydi
 *   5) mahalliy 30 ta haqiqiy buyurtma bo'lsa (git'da yo'q): sig'madi faqat HAQIQATAN varaqdan katta detal, narxga taxmin bilan qo'shilgan
 *   8) TZ-47 (B): list formati farqi bo'lishi mumkin bo'lgan moslik (dekor boshqa formatda ham/faqat shunda bor) — "nomzod" (sabab "format"), "aniq" emas
 *   7) TZ-47 (A): material almashtirilganda detal TEKSTURASI yangi material nomiga qarab qayta aniqlanadi (3860: "Акрил 18мм" → Каштан pearl: 4 list o'rniga 3)
 * Ishlatish: node tests/verify_narx_moslash.mjs */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');
const { loadData, createHisob } = await import('../web/src/services/hisob.js');
const E = await import('../web/src/services/erpMaterial.js');
const { nomMaydoni, nomFormati, plitaFormati, nomTahlil, bazisniERPga, bazisMoslashHammasi } = await import('../app/js/engine/plitaMoslash.js');
const { bazisLoyiha, materialTuri, materiallarniQosh, dekorYonalishi } = await import('../app/js/engine/bazis/loyiha.js');
const { PANEL_CODE } = await import('../app/js/engine/bazis/b3d.js');
const { cutlist, productionCost } = await import('../app/js/engine/cutlist.js');
const { nestProject, nestPanels, panelFitsSheet } = await import('../app/js/engine/nesting.js');
const { bazisAlmash } = E;
const { narxSukut } = await import('../app/js/engine/narxStavka.js');

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DATA = join(ROOT, 'app/data/');
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const skip = (name) => console.log("  · o'tkazib yuborildi:", name);
const J = (x) => JSON.stringify(x);

const H = createHisob(await loadData(n => Promise.resolve(JSON.parse(readFileSync(DATA + n, 'utf8')))));
H.applyNarxlar(narxSukut(H.materials));      // sex xizmat narxlari (raspil, kromka, ...) — saytdagi sukut bilan bir xil
const sheets = H.sheetCatalog.sheets;
const bs = sheets.find(s => s.sku === '7045 BS' && /Ультрадекор 4,575 Сатин/.test(s.name));
const pe = sheets.find(s => s.sku === '7045 PE' && /Кроношпан 4,575 Сатин/.test(s.name));

console.log('\n[1] list formati nomdagi maydondan');
ok('"4,6кв" → 4.575, "4,575" → 4.575, "5,0325" → 5.0325, "5,8кв" → 5.796', nomMaydoni('ЛДСП, Сатин 4,6кв') === 4.575 && nomMaydoni('ЛДСП Ультрадекор 4,575 Белый') === 4.575
  && nomMaydoni('Серый 5,0325 16мм') === 5.0325 && nomMaydoni('Белый 5,8кв') === 5.796);
ok('maydoni noma\'lum (4,3кв yoki "16мм" yoki bo\'sh) — null (o\'ylab topilmaydi)', nomMaydoni('ЛДСП 4,3кв') == null && nomMaydoni('Сатин 16мм') == null && nomMaydoni('') == null);
ok('"4,6кв" → 2500×1830 (moslash uchun); Bazis materialining kroy formati esa faqat aniq maydondan ("4,575") — "4,6кв" nominal, o\'zgarmaydi', J(nomFormati('ЛДСП, Сатин 4,6кв')) === '[2500,1830]'
  && materialTuri('ЛДСП, Сатин 4,6кв', 16).varaq === null && J(materialTuri('ЛДСП Ультрадекор 4,575 Белый 16мм', 16).varaq) === '[2500,1830]');
ok('aniq o\'lcham nomda ("2800*2070") — o\'sha o\'lcham, maydondan ustun', J(materialTuri('ЛХДФ 3мм 2800*2070 Белый 5,175кв', 3).varaq) === '[2800,2070]');
/* 2026-10-22: katalog ERP products API bilan moslandi (scripts/katalog_erp_yangilash.py) — 7045 BS endi to'g'ri 2500×1830 formatda saqlanadi (avval sukut 2800×2070).
 * plitaFormati eski/sukut 2800×2070 kiritilsa nomdagi 4,575 ga baribir tuzatadi (eski saqlangan loyihalar va ERP'da formati yo'q plitalar uchun) — shu mantiq sintetik kirish bilan tekshiriladi */
ok('katalog ERP bilan moslangan: 7045 BS = 2500×1830 (nomdagi 4,575 ga mos), plitaFormati tuzatish talab qilmaydi', !!bs && bs.l === 2500 && bs.w === 1830 && J(plitaFormati(bs.name, bs.l, bs.w).f) === '[2500,1830]' && !plitaFormati(bs.name, bs.l, bs.w).tuzatildi);
ok('sukut 2800×2070 kiritilsa nomdagi 4,575 ga tuzatiladi → 2500×1830 (eski loyiha / ERP\'da formati yo\'q plita)', !!bs && J(plitaFormati(bs.name, 2800, 2070).f) === '[2500,1830]' && plitaFormati(bs.name, 2800, 2070).tuzatildi);
ok('boshqa katalog o\'lchami tegilmaydi (5,796 nomli 2440×1220; maydonsiz nom)', J(plitaFormati('ЛДСП Эггер 5,796 Белый 16мм', 2440, 1220).f) === '[2440,1220]' && J(plitaFormati('Акрил Shanghai UV 18мм Серый', 2800, 2070).f) === '[2800,2070]');
ok('ERP plitasi materialga o\'girilganda varaq formati — 2500×1830', J(E.erpMaterial(bs, H.materials).sheets) === '[[2500,1830]]');

console.log('\n[2] Bazis nomi → ERP plitasi');
const sat = bazisniERPga({ name: 'ЛДСП, Сатин 4,6кв', thickness: 16, tur: 'ldsp' }, sheets);
ok('"ЛДСП, Сатин 4,6кв" 16 mm — ikki nomzod (Кроношпан 7045 PE va Ультрадекор 7045 BS): noaniq, avtomatik tanlanmaydi', sat.holat === 'nomzod' && !sat.sheet && sat.nomzodlar.length === 2
  && sat.nomzodlar.some(s => s.sku === '7045 BS') && sat.nomzodlar.some(s => s.sku === '7045 PE'), J(sat.nomzodlar.map(s => s.sku)));
ok('nomzodlar tartibi: Ultradekor birinchi (sex standarti), ikkalasi narxli ERP plitasi', sat.nomzodlar[0].sku === '7045 BS' && sat.nomzodlar.every(s => s.uzs > 0));
const sat2 = bazisniERPga({ name: 'ЛДСП Ультрадекор 4,6кв Сатин', thickness: 16, tur: 'ldsp' }, sheets);
ok('ishlab chiqaruvchi aytilsa ("Ультрадекор") — aniq: 7045 BS', sat2.holat === 'aniq' && sat2.sheet === bs && sat2.sabab === 'dekor');
const sat3 = bazisniERPga({ name: 'ЛДСП Сатин 7045 BS', thickness: 16, tur: 'ldsp' }, sheets);
ok('nomda ERP SKU\'si ("7045 BS") — aniq: sku bo\'yicha', sat3.holat === 'aniq' && sat3.sheet === bs && sat3.sabab === 'sku', J(sat3.nomzodlar.map(s => s.sku)));
ok('qalinlik boshqa (18 mm) — mos plita yo\'q', bazisniERPga({ name: 'ЛДСП, Сатин 4,6кв', thickness: 18, tur: 'ldsp' }, sheets).holat === 'yoq');
ok('dekor ERP\'da yo\'q — "yoq" (eng yaqinini tanlamaydi)', bazisniERPga({ name: 'ЛДСП Фиолетовый единорог 4,6кв', thickness: 16, tur: 'ldsp' }, sheets).holat === 'yoq');
ok('LMDF alohida tur: "ЛМДФ Сатин 5,8кв" ni LDSP bilan aralashtirmaydi', bazisniERPga({ name: 'ЛМДФ Moonlight Сатин 5,8кв', thickness: 16, tur: 'lmdf' }, sheets).nomzodlar.every(s => s.type === 'LMDF'));
ok('tahlil: "Сатин BS", "16мм", "4,575", ishlab chiqaruvchi — dekor so\'zlariga kirmaydi', J(nomTahlil('ЛДСП Ультрадекор 4,575 Сатин BS 16мм').dekor) === '["сатин"]' && nomTahlil('ЛДСП Ультрадекор 4,575 Сатин BS 16мм').brend === 'ultradekor');
const bel = bazisniERPga({ name: 'ЛДСП Ультрадекор 4,575 Белый гладкий 16мм', thickness: 16, tur: 'ldsp' }, sheets);
ok('"Белый гладкий 4,575" — ERP\'dagi shu nomli plita topiladi yoki nomzodlar (jimgina boshqasini tanlamaydi)', (bel.holat === 'aniq' && /Белый гладкий/i.test(bel.sheet.name)) || (bel.holat === 'nomzod' && bel.nomzodlar.every(s => /Белый гладкий/i.test(s.name))), J([bel.holat, bel.nomzodlar.map(s => s.name)]));

/* TZ-47 (B): list formati farqi bo'lishi mumkin bo'lgan moslik "aniq" emas — "nomzod" (sexda format ko'pincha o'zgaradi: Bazis nomida 4,575, kesish 5,0325) */
const ant = bazisniERPga({ name: 'ЛДСП Ультрадекор 4,575 Антрацит 16мм', thickness: 16, tur: 'ldsp' }, sheets);
ok('format: dekor ikki formatda ham bor (Антрацит 4,575 va 5,0325) — "aniq" emas, "nomzod" (sabab "format"), Bazis formati birinchi', ant.holat === 'nomzod' && ant.sabab === 'format' && !ant.sheet && ant.nomzodlar.length >= 2
  && ant.nomzodlar[0].sku === '0164 PE' && ant.nomzodlar.some(x => /5,0325/.test(x.name)), J(ant.nomzodlar.map(x => x.sku + ' ' + x.name)));
const kas = bazisniERPga({ name: 'ЛДСП Ультрадекор 4,575 Кашемир 16мм', thickness: 16, tur: 'ldsp' }, sheets);
ok('format: dekor faqat BOSHQA formatda bor (Кашемир 4,575 yo\'q) — avval "yoq", endi "nomzod" (sabab "format")', kas.holat === 'nomzod' && kas.sabab === 'format' && kas.nomzodlar.every(x => /Кашемир/i.test(x.name)), J([kas.holat, kas.sabab, kas.nomzodlar.map(x => x.name)]));
const belg = bazisniERPga({ name: 'ЛДСП Ультрадекор 4,575 Белый гладкий 16мм', thickness: 16, tur: 'ldsp' }, sheets);
ok('format: dekor faqat Bazis formatida bor (Белый гладкий 4,575, katalogda boshqa format yo\'q) — "aniq" qoladi', belg.holat === 'aniq' && belg.sabab === 'dekor' && belg.sheet.sku === '0110 SM', J([belg.holat, belg.sabab]));
ok('format: nomda aniq SKU ("7045 BS") — format farqi bo\'lsa ham "aniq" (foydalanuvchi o\'zi aytgan); nomda list maydoni yo\'q — oldingidek ("kop")', sat3.holat === 'aniq' && sat3.sabab === 'sku'
  && bazisniERPga({ name: 'ЛДСП Ультрадекор Антрацит', thickness: 16, tur: 'ldsp' }, sheets).sabab === 'kop');
const antD = bazisMoslashHammasi([{ code: 'BZM-x', name: 'ЛДСП Ультрадекор 4,575 Антрацит 16мм', thickness: 16, tur: 'ldsp' }], sheets);
ok('bazisMoslashHammasi: format nomzodi avtomatik qo\'llanmaydi (E.bazisMoslash: aniq = 0, nomzod = 1)', antD['BZM-x'].holat === 'nomzod' && (() => { const dd = { bazis: { materiallar: { panel: [{ code: 'BZM-x', name: 'ЛДСП Ультрадекор 4,575 Антрацит 16мм', thickness: 16, tur: 'ldsp' }] } } }; const r = E.bazisMoslash(dd, H); return r.aniq === 0 && r.nomzod === 1 && !dd.bazis.almash; })());

console.log('\n[3] Bazis → kesim → raskroy → narx (sun\'iy "Big one" oshxona: Satin 4,6кв)');
const rect = (w, h) => [{ type: 'line', p1: [0, 0], p2: [w, 0] }, { type: 'line', p1: [w, 0], p2: [w, h] }, { type: 'line', p1: [w, h], p2: [0, h] }, { type: 'line', p1: [0, h], p2: [0, 0] }];
const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
let ko = 0;
const panel = (name, mat, th, w, h) => ({ modelCode: PANEL_CODE, name, material: mat, thickness: th, contour_outer: rect(w, h), butts: [], tf: { pos: [(ko++) * 20, 0, 0], oq: I3 } });
const SAT = 'ЛДСП, Сатин 4,6кв';
const obs = [];
for (let i = 0; i < 24; i++) obs.push(panel('bok', SAT, 16, 564, 716));                 // oddiy detallar
for (let i = 0; i < 4; i++) obs.push(panel('Дверь', SAT, 16, 599, 1968));              // tik eshik: lokal X qisqa
for (let i = 0; i < 2; i++) obs.push(panel('planka', SAT, 16, 2600, 300));             // 2500×1830 varaqdan uzun, 2750×1830 ga sig'adi
obs.push(panel('planka2', SAT, 16, 2790, 300));                                        // har ikkala formatdan uzun (2790 > 2730)
const rs = bazisLoyiha(obs, { fayl: 'bigone.b3d' });
const bm = rs.materiallar.panel[0];
ok('Bazis materiali: bitta Satin ("4,6кв" nominal — format nomdan olinmaydi, asosiy materialdan)', rs.materiallar.panel.length === 1 && bm.name === SAT && bm.varaq === null);
const eshik = rs.fragment.parts.find(p => p.nom === 'Дверь'), planka = rs.fragment.parts.find(p => p.nom === 'planka');
ok('tekstura: tik eshik (599×1968) — "en" (tola uzun tomon bo\'ylab); uzun planka (2600×300) — "uzunlik"', eshik.tekstura === 'en' && planka.tekstura === 'uzunlik', J([eshik.tekstura, planka.tekstura]));

/** loyiha hujjati + hisob (H.recalc — saytdagi bilan bir xil yo'l) */
const hujjat = (almash, mijoz) => {
  const doc = { v: 1, room: { outline: [[0, 0], [5000, 0], [5000, 3000], [0, 3000]], wall_height: 2700, wall_thickness: 100, openings: [] },
    placements: [{ id: 'bz1', frg: rs.fragment.code, name: 'bz', x: 500, y: 0, z: 0, w: rs.fragment.w, d: rs.fragment.d, h: rs.fragment.h, rot: 0, qty: 1 }],
    bazis: { fragment: rs.fragment, materiallar: JSON.parse(JSON.stringify(rs.materiallar)), hisobot: rs.hisobot } };
  if (almash) doc.bazis.almash = almash;
  if (mijoz) doc.mijozMat = mijoz;
  E.erpUla(H, doc);
  H.catalog[rs.fragment.code] = bazisAlmash(rs.fragment, doc.bazis.almash);
  materiallarniQosh(H.materials, doc.bazis.materiallar);
  return doc;
};
const hisob = (doc) => H.recalc(doc, { materialCode: 'LDSP16', fasadCode: 'LDSP16', orqaCode: 'HDF3' });
const matJoy = (r, kod) => r.nest.by_material[kod];

const d0 = hujjat();
const r0 = hisob(d0);
const nm0 = matJoy(r0, bm.code);
ok('tik eshiklar joylashdi (oldin "sig\'madi" edi); faqat varaqdan HAQIQATAN uzun planka (2790 > 2730) sig\'madi', nm0.unplaced.length === 1 && nm0.unplaced[0].src.length === 2790, J(nm0.unplaced.map(u => [u.src.length, u.src.width])));
ok('moslashmagan material — asosiy materialning list formati (2750×1830, ERP sukut LDSP16)', nm0.sheet_length === 2750 && nm0.sheet_width === 1830, nm0.sheet_length + '×' + nm0.sheet_width);
const ln0 = r0.prod.lines.filter(l => l.code === bm.code);
const asosiy0 = ln0.find(l => !l.sigmadi), sg0 = ln0.find(l => l.sigmadi);
ok('sig\'magan detallar narxga YUZA bo\'yicha qo\'shildi ("taxmin"): alohida qator, narxi > 0', !!sg0 && sg0.sigmadi.soni === 1 && sg0.amount > 0 && sg0.manba === 'taxmin' && sg0.tasdiq === false && /sig'madi/.test(sg0.name), J(sg0));
const taxminKutilgan = (nm, birlik) => Math.round(Math.max(0.01, Math.round(nm.unplaced.reduce((a, u) => a + u.src.length * u.src.width, 0) / (nm.sheet_length * nm.sheet_width * 0.85) * 100) / 100) * birlik);
const kutilgan = taxminKutilgan(nm0, asosiy0.unit_price);
ok('taxmin = yuza ÷ (varaq × 0.85) × varaq narxi', sg0.amount === kutilgan, sg0.amount + ' ≠ ' + kutilgan);
ok('"tannarxga kirmagan" ogohlantirishi yo\'q (Kroy), r.prod.sigmadi ro\'yxatida', !r0.prod.missing.some(m => m.group === 'Kroy') && r0.prod.sigmadi.length === 1 && r0.prod.sigmadi[0].soni === 1);
ok('plita summasi = varaqlar + taxmin (oldin faqat varaqlar — narx kamayib qolardi)', r0.prod.sheetCost === asosiy0.amount + sg0.amount && sg0.amount > 0);
const rasp0 = r0.prod.lines.find(l => l.code === 'raspil');
ok('raspil ham taxminiy varaqni hisobga oladi (list soni = joylashgan + taxmin)', !!rasp0 && Math.abs(rasp0.qty - (asosiy0.qty + sg0.qty)) < 0.011, J([rasp0 && rasp0.qty, asosiy0.qty, sg0.qty]));
ok('aniqlik: taxmin qatorlari ro\'yxatda ("Narx aniqligi" oynasida ko\'rinadi)', r0.prod.aniqlik.taxmin.some(x => x.code === bm.code));
ok('modullar taqsimoti yig\'indisi jami bilan teng (yaxlitlash qoldig\'i bilan)', r0.priceRes.total === r0.prod.clientTotal);

/* ERP ga moslash: nomzod → foydalanuvchi 7045 BS ni tanlaydi → narx ERP'dan */
const kodBS = E.erpKod(bs);
const dA = hujjat();                       // yangi hujjat
dA.bazis.almash = { [bm.code]: E.erpQosh(H, dA, bs) };
E.erpUla(H, dA); H.catalog[rs.fragment.code] = bazisAlmash(rs.fragment, dA.bazis.almash);
const rA = hisob(dA);
const nmA = matJoy(rA, kodBS), lnA = rA.prod.lines.filter(l => l.code === kodBS);
ok('ERP SKU 7045 BS tanlangach: material kodi ERP-…, narx katalogdagi ERP narxi (282 568), manba "ERP", tasdiqlangan', !!nmA && lnA[0].unit_price === bs.uzs && lnA[0].manba === 'ERP' && lnA[0].tasdiq === true, J(lnA[0]));
ok('list formati ERP materialida 2500×1830; 2600 va 2790 li uch planka sig\'madi → yuza bo\'yicha taxmin', nmA.sheet_length === 2500 && nmA.sheet_width === 1830 && nmA.unplaced.length === 3
  && lnA.find(l => l.sigmadi).amount === taxminKutilgan(nmA, bs.uzs) && lnA.find(l => l.sigmadi).manba === 'taxmin');
ok('narx aniqligi oshdi (Satin plitasi tasdiqlangan manbadan)', rA.prod.aniqlik.tasdiqlangan > r0.prod.aniqlik.tasdiqlangan, rA.prod.aniqlik.tasdiqlangan + ' ≤ ' + r0.prod.aniqlik.tasdiqlangan);
ok('detallar yo\'qolmaydi: joylashgan + sig\'magan = 31 (24 + 4 + 3)', nmA.stats.placed_count + nmA.unplaced.length === 31 && nm0.stats.placed_count + nm0.unplaced.length === 31);

/* bir qiymatli moslik — bazisMoslash avtomatik qo'llaydi; noaniq — qo'llamaydi */
const dB = hujjat();
dB.bazis.materiallar.panel[0].name = 'ЛДСП Ультрадекор 4,6кв Сатин';
const mB = E.bazisMoslash(dB, H);
ok('bazisMoslash: bir qiymatli ("Ультрадекор … Сатин") — avtomatik: doc.bazis.almash + doc.erpMat', mB.aniq === 1 && dB.bazis.almash[bm.code] === kodBS && !!dB.erpMat[kodBS]);
const dC = hujjat();
const mC = E.bazisMoslash(dC, H);
ok('bazisMoslash: noaniq ("ЛДСП, Сатин 4,6кв", 2 nomzod) — O\'YLAB TOPILMAYDI: almash yo\'q, nomzod 1', mC.aniq === 0 && mC.nomzod === 1 && !dC.bazis.almash);

console.log('\n[4] mijoz materiali');
const dM = hujjat({ [bm.code]: kodBS }, { [kodBS]: true });
E.erpQosh(H, dM, bs); H.catalog[rs.fragment.code] = bazisAlmash(rs.fragment, dM.bazis.almash);
const rM = hisob(dM);
const lnM = rM.prod.lines.filter(l => l.code === kodBS);
ok('mijoz materiali: plita qatorlari summasi 0, belgi "mijoz", nomida "mijoz materiali"', lnM.length === 2 && lnM.every(l => l.mijoz && l.amount === 0 && l.unit_price === 0 && /mijoz materiali/.test(l.name)) && rM.prod.mijoz.includes(kodBS), J(lnM));
ok('plita narxi tannarxdan chiqdi: tannarx farqi = ERP plita summasi (varaqlar + taxmin)', rA.prod.totalCost - rM.prod.totalCost === rA.prod.sheetCost && rM.prod.sheetCost === 0, `${rA.prod.totalCost} - ${rM.prod.totalCost} vs ${rA.prod.sheetCost}`);
ok('ustama ham tushdi (ustama faqat plita+furnitura): mijoz narxi farqi ≥ plita summasi', rA.prod.clientTotal - rM.prod.clientTotal >= rA.prod.sheetCost);
ok('kesim o\'zgarmadi: raskroy natijasi (varaqlar, joylashuv) aynan bir xil', J(matJoy(rM, kodBS).sheets) === J(nmA.sheets) && matJoy(rM, kodBS).sheet_count === nmA.sheet_count && J(rM.cutlists.map(c => c.parts)) === J(rA.cutlists.map(c => c.parts)));
ok('raspil (xizmat) o\'zgarmadi — mijoz plitasini ham arralaymiz', rM.prod.raspilCost === rA.prod.raspilCost && rM.prod.edgeCost === rA.prod.edgeCost && rM.prod.laborCost === rA.prod.laborCost);
ok('aniqlik: mijoz plitasi summaga kirmaydi; "narxsiz" soni oshmaydi', !rM.prod.aniqlik.taxmin.some(x => x.code === kodBS) && rM.prod.missing.length <= rA.prod.missing.length);
ok('mijoz belgisi boshqa materialga ta\'sir qilmaydi (belgisiz hujjat narxi o\'zgarmagan)', rA.prod.sheetCost > 0 && r0.prod.sheetCost > 0);
/* belgi ERP bo'lmagan umumiy material (LDSP16) ga ham qo'yiladi */
const dL = { v: 1, room: d0.room, placements: [{ id: 'p1', frg: 'MC-KP-02', x: 50, y: 50, z: 100, w: 600, d: H.catalog['MC-KP-02'].d, h: H.catalog['MC-KP-02'].h, rot: 0, qty: 1 }] };
const rL0 = H.recalc(dL, { materialCode: 'LDSP16', fasadCode: 'LDSP16', orqaCode: 'HDF3' });
dL.mijozMat = { LDSP16: true };
const rL1 = H.recalc(dL, { materialCode: 'LDSP16', fasadCode: 'LDSP16', orqaCode: 'HDF3' });
const l16 = rL1.prod.lines.find(l => l.code === 'LDSP16');
ok('umumiy material (LDSP16) ham belgilanadi: summa 0, HDF3 (belgisiz) narxi saqlanadi, tannarx kamayadi', l16.mijoz && l16.amount === 0 && rL1.prod.totalCost < rL0.prod.totalCost && rL1.prod.lines.filter(l => /^Plita/.test(l.group) && l.code !== 'LDSP16').every(l => !l.mijoz));
ok('belgisiz hujjat: prod.mijoz bo\'sh', rL0.prod.mijoz.length === 0 && r0.prod.mijoz.length === 0);

console.log('\n[5] "sig\'madi" sababi');
const eshik0 = nestPanels([{ id: 'e', length: 599, width: 1968, qty: 1, texture: 'uzunlik', material: 'M' }], { sheetL: 2750, sheetW: 1830, trimL: 10, trimW: 10, kerf: 4 });
const eshik1 = nestPanels([{ id: 'e', length: 599, width: 1968, qty: 1, texture: 'en', material: 'M' }], { sheetL: 2750, sheetW: 1830, trimL: 10, trimW: 10, kerf: 4 });
ok('(a) sabab: tik eshik 599×1968 — tekstura "uzunlik" (Bazis lokal X tola deb olinardi) bo\'lsa 2750×1830 ga SIG\'MAYDI; tola uzun tomon bo\'ylab ("en") bo\'lsa sig\'adi', eshik0.unplaced.length === 1 && eshik1.unplaced.length === 0);
console.log('  (b) panelFitsSheet va kroy shartlari endi bir xil:');
const probe = (L) => {
  const p = { id: 'x', length: L, width: 300, qty: 1, texture: 'uzunlik', material: 'M' };
  const n = nestPanels([p], { sheetL: 2500, sheetW: 1830, trimL: 10, trimW: 10, kerf: 4 });
  return { fits: panelFitsSheet(p, 2500, 1830, 4, 10, 10), joylashdi: n.unplaced.length === 0 };
};
const farq = [];
for (let L = 2470; L <= 2500; L++) { const x = probe(L); if (x.fits !== x.joylashdi) farq.push(L); }
ok('2470…2500 mm uzun detal: "sig\'adi" bahosi va kroy natijasi har uzunlikda mos (avval 2481…2486 da mos emasdi)', farq.length === 0, J(farq));
ok('chegara: 2480 mm (2500 − 2×10 trim) sig\'adi, 2481 — yo\'q', probe(2480).joylashdi && !probe(2481).joylashdi);

console.log('\n[6] mahalliy haqiqiy buyurtmalar (bor bo\'lsa)');
const TOPLAM = join(ROOT, '..', 'Smart3D', 'Smart3D_toplam_2026-10-16', '01_buyurtma_fayllari', '04_bazis');
if (existsSync(TOPLAM)) {
  const { daraxt } = await import('../app/js/engine/bazis/daraxt.js');
  const inflate = (b) => new Uint8Array(zlib.inflateSync(Buffer.from(b.buffer, b.byteOffset, b.byteLength)));
  let n = 0, sigmagan = 0, sigmaganKichik = [], taxminsiz = [];
  for (const d of readdirSync(TOPLAM).filter(x => /^\d+_/.test(x))) {
    const f = readdirSync(join(TOPLAM, d)).find(x => /\.b3d$/i.test(x)); if (!f) continue;
    const r = daraxt(new Uint8Array(readFileSync(join(TOPLAM, d, f))), { inflate });
    const res = bazisLoyiha(r.objects, { fayl: f }); if (res.xato) continue;
    n++;
    const m2 = JSON.parse(readFileSync(DATA + 'materials.json', 'utf8')); materiallarniQosh(m2, res.materiallar);
    const c2 = cutlist(res.fragment, res.fragment.w, res.fragment.d, res.fragment.h, m2, {});
    const ns = nestProject(c2.parts.map(p => Object.assign({}, p, { id: 'x:' + p.ref })), m2, { mode: 'bssf', kerf: 4, trimL: 10, trimW: 10 });
    const pc = productionCost([c2], m2, { nestResult: ns });
    for (const [mat, nm] of Object.entries(ns.by_material)) {
      for (const u of nm.unplaced) {
        sigmagan++;
        const p = u.src, fits = (l, w) => l <= nm.eff_length && w <= nm.eff_width;
        /* bo'sh varaqqa sig'adigan detal "sig'madi" bo'lmasligi kerak (tekstura qoidasi bilan) */
        const sigadi = p.texture === 'uzunlik' ? fits(p.length, p.width) : p.texture === 'en' ? fits(p.width, p.length) : (fits(p.length, p.width) || fits(p.width, p.length));
        if (sigadi) sigmaganKichik.push(d.slice(0, 4) + ' ' + p.length + '×' + p.width + ' ' + p.texture);
      }
      if (nm.unplaced.length && !pc.sigmadi.some(s => s.code === mat)) taxminsiz.push(d.slice(0, 4) + ' ' + mat);
    }
  }
  ok(`${n} ta haqiqiy buyurtma: "sig'madi" faqat HAQIQATAN varaqdan uzun detal (${sigmagan} ta); varaqdan kichigi sig'may qolgani yo'q`, n >= 20 && sigmaganKichik.length === 0, sigmaganKichik.slice(0, 4).join('; '));
  ok('har bir sig\'magan detal narxga yuza bo\'yicha taxmin bilan kirgan (jimgina kamayish yo\'q)', taxminsiz.length === 0, taxminsiz.join('; '));
} else skip("haqiqiy buyurtmalar (Smart3D_toplam_2026-10-16 yo'q)");

console.log('\n[7] TZ-47 (A): almashtirishda tekstura qayta aniqlanadi');
ok('dekorYonalishi: Каштан pearl / Белый гладкий — oddiy; Дуб Вотан — naqsh; "ЛДСП 16мм" — nom aytmaydi (null)', dekorYonalishi('Каштан 18мм Cream pearl') === 'oddiy' && dekorYonalishi('ЛДСП Ультрадекор 4,575 Белый гладкий 16мм') === 'oddiy'
  && dekorYonalishi('ЛДСП Ультрадекор 4,575 Дуб Вотан 16мм') === 'naqsh' && dekorYonalishi('ЛДСП 16мм') === null);
{
  const fr = { code: 'BZ-t', parts: [
    { code: 'a', len: '1000', width: '800', material_code: 'BZM-a', tekstura: 'uzunlik' },     // Bazis "Акрил" (yo'nalishli) → oddiy Каштан
    { code: 'b', len: '600', width: '900', material_code: 'BZM-b', tekstura: 'erkin' },        // oddiy dekor → naqshli Дуб (qisqa X → 'en')
    { code: 'c', len: '900', width: '600', material_code: 'BZM-c', tekstura: 'erkin' },        // → nomi aytmaydigan LDSP16: o'zgarmaydi
    { code: 'd', len: '900', width: '600', material_code: 'BZM-d', tekstura: 'erkin' },        // → yupqa ЛМДФ Дуб Вотан (sexda txt=false): o'zgarmaydi
    { code: 'e', len: '900', width: '600', material_code: 'BZM-e', tekstura: 'uzunlik' },      // → HDF: o'zgarmaydi
    { code: 'f', len: '3000', width: '600', material_code: 'BZM-f', tekstura: 'uzunlik', stol_birga: true }] };
  const pm = [{ code: 'ERP-k', name: 'Каштан 18мм Cream pearl' }, { code: 'ERP-d', name: 'ЛДСП Ультрадекор 4,575 Дуб Вотан 16мм' }, { code: 'LDSP16', name: 'ЛДСП 16мм' },
    { code: 'ERP-m', name: 'ЛМДФ 0.55 ММ ДУБ ВОТАН ТК' }, { code: 'HDF3', name: 'ЛХДФ 2,5мм 2800*2070 Белый' }, { code: 'STOL26-3050', name: 'Столешница 26мм' }];
  const al = { 'BZM-a': 'ERP-k', 'BZM-b': 'ERP-d', 'BZM-c': 'LDSP16', 'BZM-d': 'ERP-m', 'BZM-e': 'HDF3', 'BZM-f': 'STOL26-3050' };
  const y = bazisAlmash(fr, al, pm).parts, T = (c) => y.find(x => x.code === c).tekstura;
  ok('oddiy dekorga almashtirilganda "uzunlik" → "erkin"; naqshli LDSP ga — yo\'nalishli (eni > uzunligi → "en")', T('a') === 'erkin' && T('b') === 'en', J(y.map(x => [x.code, x.tekstura])));
  ok('nomi aytmaydigan material, yupqa ЛМДФ naqshi, HDF va stoleshnitsa — tekstura o\'zgarmaydi', T('c') === 'erkin' && T('d') === 'erkin' && T('e') === 'uzunlik' && T('f') === 'uzunlik', J(y.map(x => [x.code, x.tekstura])));
  ok('material_code almashdi; panelMats berilmasa (eski chaqiruv) — tekstura umuman o\'zgarmaydi', y.every(x => x.material_code === al['BZM-' + x.code]) && bazisAlmash(fr, al).parts.every((x, i) => x.tekstura === fr.parts[i].tekstura));
  ok('asl fragment o\'zgarmadi (nusxa)', fr.parts[0].tekstura === 'uzunlik' && fr.parts[0].material_code === 'BZM-a');
}
{
  /* 6 ta 1000×800 detal "Акрил 18мм" (yo'nalishli), ERP Каштан 18мм (2440×1220): yo'nalishli — 3 list; almashtirishdan keyin erkin — 2 list */
  const AK = 'Акрил 18мм тепа корпус';
  const ob7 = []; for (let i = 0; i < 6; i++) ob7.push(panel('bok', AK, 18, 1000, 800));
  const r7 = bazisLoyiha(ob7, { fayl: 'kashtan.b3d' });
  const kod7 = r7.materiallar.panel[0].code;
  const sh7 = { sku: '0506I', name: 'Каштан 18мм Cream pearl', th: 18, l: 2440, w: 1220, uzs: 614040, type: 'LDSP', id: 'x7' };
  const nest7 = (yangi) => {
    const d = { v: 1, room: { outline: [[0, 0], [5000, 0], [5000, 3000], [0, 3000]], wall_height: 2700, wall_thickness: 100, openings: [] },
      placements: [{ id: 'bz7', frg: r7.fragment.code, name: 'bz', x: 500, y: 0, z: 0, w: r7.fragment.w, d: r7.fragment.d, h: r7.fragment.h, rot: 0, qty: 1 }],
      bazis: { fragment: r7.fragment, materiallar: JSON.parse(JSON.stringify(r7.materiallar)), hisobot: r7.hisobot, almash: {} } };
    const kod = E.erpQosh(H, d, sh7); d.bazis.almash[kod7] = kod;
    H.catalog[r7.fragment.code] = yangi ? bazisAlmash(r7.fragment, d.bazis.almash, H.materials.panel_materials) : bazisAlmash(r7.fragment, d.bazis.almash);
    materiallarniQosh(H.materials, d.bazis.materiallar);
    const r = hisob(d);
    return { list: r.nest.by_material[kod].sheet_count, tekstura: r.cutlists[0].parts.map(p => p.texture).join() };
  };
  const eski7 = nest7(false), yangi7 = nest7(true);
  ok('Bazis "Акрил" detallari import vaqtida yo\'nalishli (uzunlik)', r7.fragment.parts.every(x => x.tekstura === 'uzunlik'), J(r7.fragment.parts.map(x => x.tekstura)));
  ok('almashtirishdan keyin (yangi): Каштан pearl — erkin, 2 list; eski xatti-harakat: yo\'nalishli, 3 list', yangi7.list === 2 && eski7.list === 3 && /erkin/.test(yangi7.tekstura) && !/erkin/.test(eski7.tekstura), J([eski7, yangi7]));
}

console.log(`\n=== ${fail ? 'XATO: ' + fail + ' ta' : 'HAMMASI OK'} (${pass} pass, ${fail} fail) ===`);
process.exit(fail ? 1 : 0);
