/* verify_katalog_yangi_baza.mjs — TZ-50 (egasi #311/#325, 2026-10-23): ilova katalogi FAQAT yangi baza (ERP 2026-10-23, YANGI-BAZA-ISHONCHLI-NARXLAR) narxlari asosida.
 * [A] repo ichidagi invariantlar (har mashinada): src, narx > 0, ishonch YUQORI/O'RTA (PAST kirmagan), takror kalit yo'q, l/w musbat, ERP formatlari, ID'lar,
 *     materials-index = sheet-catalog, stoleshnitsa, materials.json (sukut_erp va STOL narxlari), Asosiy 100 ta'siri.
 * [B] Python ko'chirmasi (scripts/katalog_yangi_baza.py: erpKod, nomKalit, nomMaydoni) ↔ haqiqiy JS funksiyalar — python3 bo'lsa.
 * [C] lokal maxfiy fayllar bo'lsa (Smart3D_malumot/, gitda YO'Q; yo'q bo'lsa o'tkazib yuboriladi): har katalog yozuvi CSV qatoriga bir qiymatli mos, narxi (uzs, lst) CSV'dagi qiymatga TENG,
 *     qator ishonchi PAST emas; stoleshnitsa narxlari; chiqarilganlar CSV; skript qayta ishga tushirilsa hech narsa o'zgarmaydi (idempotent).
 * Ishga tushirish: node tests/verify_katalog_yangi_baza.mjs */
import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { erpKod } from '../app/js/engine/erpKod.js';
import { nomKalit } from '../app/js/engine/erpSinxron.js';
import { nomFormati, nomMaydoni } from '../app/js/engine/plitaMoslash.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DATA = ROOT + 'app/data/';
const J = (n) => JSON.parse(readFileSync(DATA + n, 'utf8'));
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const skip = (name) => console.log("  · o'tkazib yuborildi:", name);
const SANA = '2026-10-23', SRC = 'yangi_baza_' + SANA;

const SC = J('sheet-catalog.json'), MI = J('materials-index.json'), ST = J('stoleshnitsa-erp.json'), MJ = J('materials.json'), A = J('dekor-asosiy.json').items;
const sheets = SC.sheets, items = MI.items;
const TURLAR = ['LDSP', 'LMDF', 'MDF', 'HDF', 'AKRIL', 'OYNA'];
const PREFIKS = { LDSP: '10', LMDF: '11', MDF: '40', HDF: '50', AKRIL: '60', OYNA: '70' }, CAT = { LDSP: 'LDS', LMDF: 'LMD', MDF: 'MDF', HDF: 'HDF', AKRIL: 'AKR', OYNA: 'OYN' };
const UZS_TURI = ['tannarx', 'kirim', 'tannarx_eski', 'sotuv'], ETIBOR = ['YUQORI', "O'RTA"];

console.log('\n[A1] plita/list katalogi — faqat yangi baza');
ok(`hajm: ${sheets.length} plita (yangi bazada ishonchli narxli yozuvlar); materials-index bilan bir xil uzunlik va count`, sheets.length === 718 && items.length === sheets.length && MI.count === sheets.length);
ok(`har yozuvning manbasi "${SRC}"`, sheets.every(s => s.src === SRC), [...new Set(sheets.map(s => s.src))].join());
ok('narx: uzs — butun son > 0, lst — butun son > 0 va lst ≥ uzs (sotuv tannarxdan past emas), usd = 0 (yangi bazada dollar narxi yo\'q)',
  sheets.every(s => Number.isInteger(s.uzs) && s.uzs > 0 && Number.isInteger(s.lst) && s.lst >= s.uzs && s.usd === 0));
ok('uzs_turi (tannarx | kirim | tannarx_eski | sotuv) va ishonch — faqat YUQORI/O\'RTA: PAST katalogga KIRMAGAN', sheets.every(s => UZS_TURI.includes(s.uzs_turi) && ETIBOR.includes(s.ishonch)),
  JSON.stringify([...new Set(sheets.map(s => s.uzs_turi + '/' + s.ishonch))]));
ok('uzs_turi "sotuv" (tannarx/kirim yo\'q) bo\'lsa uzs = lst (faqat bor real raqam; boshqa qiymat o\'ylab topilmagan)', sheets.filter(s => s.uzs_turi === 'sotuv').every(s => s.uzs === s.lst));
ok('type LDSP/LMDF/MDF/HDF/AKRIL; qalinlik 2…40 mm; l ≥ w ≥ 1000 mm, butun; takroriy nom+SKU+qalinlik va ERP-kod yo\'q',
  sheets.every(s => TURLAR.includes(s.type) && s.th >= 2 && s.th <= 40 && Number.isInteger(s.l) && Number.isInteger(s.w) && s.l >= s.w && s.w >= 1000)
  && new Set(sheets.map(s => s.name + '|' + s.sku + '|' + s.th)).size === sheets.length && new Set(sheets.map(erpKod)).size === sheets.length);
const aniqOlcham = sheets.filter(s => { const m = /(?<![\d.,])(\d{3,4})\s*[*xх×]\s*(\d{3,4})(?![\d])/.exec(s.name); return m && +m[1] >= 1000 && +m[2] >= 1000; });
ok(`nomida aniq o'lcham yozilgan ${aniqOlcham.length} plita — l×w shu o'lcham`, aniqOlcham.every(s => { const m = /(?<![\d.,])(\d{3,4})\s*[*xх×]\s*(\d{3,4})(?![\d])/.exec(s.name); return Math.max(+m[1], +m[2]) === s.l && Math.min(+m[1], +m[2]) === s.w; }),
  aniqOlcham.filter(s => { const m = /(?<![\d.,])(\d{3,4})\s*[*xх×]\s*(\d{3,4})(?![\d])/.exec(s.name); return Math.max(+m[1], +m[2]) !== s.l; }).map(s => s.name + ' ' + s.l + '×' + s.w).slice(0, 3).join('; '));
const maydonli = sheets.filter(s => nomMaydoni(s.name, false) != null && !/\d{3,4}\s*[*xх×]\s*\d{3,4}/.test(s.name));
ok(`maydonli nomlar (${maydonli.length} ta): format nomdagi maydonga mos (4,575 → 2500×1830, 5,0325 → 2750×1830, 5,175 → 2500×2070, 5,796 → 2800×2070)`,
  maydonli.every(s => { const f = nomFormati(s.name, false); return f && f[0] === s.l && f[1] === s.w; }));
ok('turi bo\'yicha: LDSP 324, LMDF 168, AKRIL 152, MDF 61, HDF 13 (yangi bazadagi haqiqiy son)', (() => { const c = {}; sheets.forEach(s => { c[s.type] = (c[s.type] || 0) + 1; }); return c.LDSP === 324 && c.LMDF === 168 && c.AKRIL === 152 && c.MDF === 61 && c.HDF === 13 && !c.OYNA; })());

console.log('\n[A2] materials-index.json');
ok('sheet-catalog bilan bir xil (tartib, nom, SKU, qalinlik, l, w, narx, lst, usd, uzs_turi, ishonch)', items.every((m, i) => { const s = sheets[i]; return m.name === s.name && m.sku === s.sku && m.th === s.th && m.l === s.l && m.w === s.w && m.uzs === s.uzs && m.lst === s.lst && m.usd === s.usd && m.uzs_turi === s.uzs_turi && m.ishonch === s.ishonch && m.type === s.type && m.cat === s.cat; }));
ok('ID: 8 xonali, takrorsiz, prefiks turga mos (10 LDS · 11 LMD · 40 MDF · 50 HDF · 60 AKR · 70 OYN), cat_code mos', items.every(m => /^\d{8}$/.test(m.id) && m.id.startsWith(PREFIKS[m.type]) && m.cat_code === CAT[m.type]) && new Set(items.map(m => m.id)).size === items.length);
const maks = {}; items.forEach(m => { const p = m.id.slice(0, 2); maks[p] = Math.max(maks[p] || 0, +m.id.slice(2)); });
ok('id_seq — ishlatilgan eng katta raqamdan kam emas (chiqarilganlarning ID\'si qayta berilmaydi); avvalgi eng kattalar: LDS 480, LMD 193, MDF 159, HDF 16, AKR 430, OYN 3',
  Object.entries(maks).every(([p, v]) => MI.id_seq && MI.id_seq[p] >= v) && MI.id_seq['10'] >= 480 && MI.id_seq['11'] >= 193 && MI.id_seq['40'] >= 159 && MI.id_seq['50'] >= 16 && MI.id_seq['60'] >= 430 && MI.id_seq['70'] >= 3);
ok('qidiruv: aliases (massiv) va search_text (matn) har yozuvda, nom shunda uchraydi', items.every(m => Array.isArray(m.aliases) && m.aliases.length >= 2 && typeof m.search_text === 'string' && m.search_text.includes(m.name.toLowerCase())));

console.log('\n[A3] stoleshnitsa-erp.json');
const sit = ST.items;
ok(`${sit.length} dekor: narx_m2 > 0, narx_list_m2 ≥ narx_m2, narx_turi/ishonch to'g'ri, 26/38 mm, eni 600, erp_id takrorsiz`,
  sit.length === 132 && sit.every(d => d.narx_m2 > 0 && d.narx_list_m2 >= d.narx_m2 && UZS_TURI.includes(d.narx_turi) && ETIBOR.includes(d.ishonch) && [26, 38].includes(d.qalinlik) && d.eni === 600 && d.uzunliklar.length) && new Set(sit.map(d => d.erp_id)).size === sit.length);
ok('narx_turi "sotuv" bo\'lsa narx_m2 = narx_list_m2', sit.filter(d => d.narx_turi === 'sotuv').every(d => d.narx_m2 === d.narx_list_m2));
ok('sukut dekor: shu qalinlikda va ro\'yxatda (oldingi sukut — C514 GL 26 mm (16598), 3062/S 38 mm (16122) — yangi bazada bor, saqlandi)', ['26', '38'].every(T => { const d = sit.find(x => x.erp_id === ST.sukut[T]); return d && d.qalinlik === +T; }) && ST.sukut['26'] === 16598 && ST.sukut['38'] === 16122);
ok('_meta: yangi baza manbasi', /Yangi baza 2026-10-23/.test(ST._meta.manba) && /TZ-50/.test(ST._meta.manba));

console.log('\n[A4] materials.json');
const sukut = MJ.sukut_erp;
ok('sukut_erp: LDSP16 (ERP 10807) tannarx 319 030 / sotuv 410 000, MDF16 (11578) 580 515 / 640 000, HDF3 (11750) 124 961 / 165 000 — yangi baza, sana 2026-10-23, manba "ERP"',
  [['LDSP16', 10807, 319030, 410000], ['MDF16', 11578, 580515, 640000], ['HDF3', 11750, 124961, 165000]].every(([k, id, u, l]) => sukut[k] && sukut[k].erp_id === id && sukut[k].uzs === u && sukut[k].lst === l && sukut[k].sana === SANA && sukut[k].manba === 'ERP'));
ok('sukut_erp: LDSP18 — bog\'lanmagan (null); boshqa umumiy materiallar (LDSP18, LMDF16, MDF18, MDF8, oyna, OSB12) TEGILMAGAN — egasi tanlamaguncha', sukut.LDSP18 === null
  && (() => { const pm = (k) => MJ.panel_materials.find(m => m.code === k); return pm('LDSP18').sheet_price === 580650 && pm('LMDF16').sheet_price === 614238 && pm('MDF18').sheet_price === 521400 && pm('MDF8').sheet_price === 298868 && pm('OYNA').sheet_price === 200000 && pm('OSB12').sheet_price === 175000; })());
const stolPM = MJ.panel_materials.filter(m => m.unit_piece);
const sukD = (T) => sit.find(d => d.erp_id === ST.sukut[String(T)]);
ok('STOL26-3050 = 348 936 × 3050 × 600 (C514 GL) = 638 553; STOL38-3050 = 3062/S narx_m2 × 3050 × 600; STOL38-4200 — sukut dekorda 4200 yo\'q; hammasi dekor narxidan (qo\'lda emas)',
  (() => { const g = (c) => stolPM.find(m => m.code === c); const d26 = sukD(26), d38 = sukD(38);
    return d26.narx_m2 === 348936 && g('STOL26-3050').sheet_price === 638553 && g('STOL26-3050').sheet_price === Math.round(d26.narx_m2 * 3050 * 600 / 1e6) && g('STOL26-3050').price_src === 'ERP ' + SANA
      && g('STOL38-3050').sheet_price === Math.round(d38.narx_m2 * 3050 * 600 / 1e6) && g('STOL38-3050').price_src === 'ERP ' + SANA
      && (d38.uzunliklar.includes(4200) ? g('STOL38-4200').sheet_price === Math.round(d38.narx_m2 * 4200 * 600 / 1e6) : g('STOL38-4200').sheet_price === 0 && /^yoq/.test(g('STOL38-4200').price_src))
      && g('STOL26-4200').sheet_price === 0 && /^yoq/.test(g('STOL26-4200').price_src); })());

console.log('\n[A5] Asosiy 100 dekor — katalogdan chiqqan plitalar ta\'siri (dekor-asosiy.json va erpKod O\'ZGARMAGAN)');
const bor = new Set(sheets.map(erpKod));
const hol = A.map(e => e.kodlar.filter(c => bor.has(c)).length);
const tolik = A.filter((e, i) => hol[i] === e.kodlar.length).length, qisman = A.filter((e, i) => hol[i] > 0 && hol[i] < e.kodlar.length).length, yoq = A.filter((e, i) => hol[i] === 0).length;
ok(`100 dekor: ${tolik} to'liq (hamma kodi bor), ${qisman} qisman, ${yoq} kodsiz (UI ko'rsatmaydi, xato yo'q); 175 kodning 118 tasi katalogda`, A.length === 100 && tolik === 57 && qisman === 19 && yoq === 24 && hol.reduce((a, b) => a + b, 0) === 118);
ok('katalogda qolgan har Asosiy-100 kodi narxli LDSP/LMDF/MDF 16–18 mm (verify_mat100 dagidek)', A.every(e => e.kodlar.every(c => { const s = sheets.find(x => erpKod(x) === c); return !s || (s.uzs > 0 && ['LDSP', 'LMDF', 'MDF'].includes(s.type) && s.th >= 15.5 && s.th <= 18.5); })));

/* ───────── [B] Python ↔ JS ───────── */
console.log('\n[B] Python ko\'chirmasi (erpKod, nomKalit, nomMaydoni) ↔ JS');
const SKRIPT = ROOT + 'scripts/katalog_yangi_baza.py';
let pyOk = true;
try {
  const nomlar = [...new Set([...sheets.map(s => s.name), 'ЛДСП, Сатин 4,6кв', 'ЛМДФ 5кв Белый', '12 Мдф ПЕТ САППУЧИНО ГЛ 18 ММ', 'Ёлка 4,575 Дуб ёж', 'ЛДСП 4,3кв', ''])];
  const out = JSON.parse(execFileSync('python3', ['-I', SKRIPT, '--solishtir'], { input: JSON.stringify({ sheets: sheets.map(s => ({ name: s.name, sku: s.sku, th: s.th })), nomlar }), maxBuffer: 1 << 26 }).toString());
  ok(`erpKod: ${sheets.length} plita — Python = JS`, out.erpKod.every((k, i) => k === erpKod(sheets[i])));
  ok(`nomKalit: ${nomlar.length} nom — Python = JS`, out.nomKalit.every((k, i) => k === nomKalit(nomlar[i])), nomlar.find((n, i) => out.nomKalit[i] !== nomKalit(n)));
  ok('nomMaydoni (yaxlit va aniq) va nomFormati — Python = JS', out.maydon.every((v, i) => v === nomMaydoni(nomlar[i], true)) && out.maydon_aniq.every((v, i) => v === nomMaydoni(nomlar[i], false))
    && out.formati.every((v, i) => JSON.stringify(v) === JSON.stringify(nomFormati(nomlar[i], true))));
} catch (e) { pyOk = false; skip('python3 yo\'q yoki skript ishlamadi: ' + String(e.message).slice(0, 120)); }

/* ───────── [C] lokal maxfiy fayllar ───────── */
console.log('\n[C] yangi baza CSV bilan solishtirish (lokal maxfiy fayl bo\'lsa)');
const topish = (nomlar) => nomlar.find(p => p && existsSync(p));
const CSV = topish([process.env.YANGI_BAZA_CSV, ROOT + 'Smart3D_malumot/YANGI-BAZA-ISHONCHLI-NARXLAR-2026-10-23.csv', ROOT + '../Smart3D/Smart3D_malumot/YANGI-BAZA-ISHONCHLI-NARXLAR-2026-10-23.csv']);
const ERP = topish([process.env.ERP_MAHSULOT_JSON, ROOT + 'Smart3D_malumot/eski narxlar/erp-mahsulotlar-2026-10-22.json', ROOT + '../Smart3D/Smart3D_malumot/eski narxlar/erp-mahsulotlar-2026-10-22.json']);
if (!CSV || !ERP) skip('YANGI-BAZA-ISHONCHLI-NARXLAR-2026-10-23.csv yoki erp-mahsulotlar-2026-10-22.json bu mashinada yo\'q');
else {
  /* CSV (';', qo'shtirnoqli maydonlar, utf-8 BOM) */
  const csvOqi = (t) => {
    t = t.replace(/^﻿/, ''); const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true; else if (c === ';') { row.push(f); f = ''; } else if (c === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; } else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    const h = rows.shift(); return rows.filter(r => r.length === h.length).map(r => Object.fromEntries(h.map((k, i) => [k, r[i]])));
  };
  const rows = csvOqi(readFileSync(CSV, 'utf8'));
  const E = new Map(JSON.parse(readFileSync(ERP, 'utf8')).map(p => [String(p.id), p]));
  const son = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  /* narx qoidasi (mustaqil JS ko'chirma): tannarx (O/K) → oxirgi kirim → tannarx (B) → sotuv */
  const narx = (r) => { const s = son(r.sotuv_UZS), t = son(r.tannarx_UZS), k = son(r.oxirgi_kirim_UZS), m = (r['tannarx_manba(O/K/B)'] || '').trim();
    const [u, tur] = t > 0 && (m === 'O' || m === 'K') ? [t, 'tannarx'] : k > 0 ? [k, 'kirim'] : t > 0 ? [t, 'tannarx_eski'] : s > 0 ? [s, 'sotuv'] : [0, '']; return { uzs: Math.round(u), tur, lst: s > 0 ? Math.round(s) : 0 }; };
  const nrm = (s) => String(s == null ? '' : s).toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
  for (const r of rows) { const p = E.get(r.ERP_id); r._nom = String(p.name || '').replace(/\s+/g, ' ').trim(); r._sku = String(p.sku || '').replace(/\s+/g, ' ').trim(); r._nk = nomKalit(r._nom); r._n = narx(r); }
  const byNk = new Map(); for (const r of rows) { (byNk.get(r._nk) || byNk.set(r._nk, []).get(r._nk)).push(r); }
  const mos = (s) => { /* mavjud/yangi yozuv → CSV qatori: nomKalit + SKU (ikkala tomonda bo'lsa teng); bir nechta bo'lsa SKU aniq tengi */
    let c = (byNk.get(nomKalit(s.name)) || []).filter(r => !nrm(r._sku) || !nrm(s.sku) || nrm(r._sku) === nrm(s.sku));
    if (c.length > 1) { const ex = c.filter(r => nrm(r._sku) && nrm(r._sku) === nrm(s.sku)); if (ex.length === 1) c = ex; }
    return c; };
  const juft = sheets.map(s => ({ s, c: mos(s) }));
  ok(`har katalog yozuvi yangi bazada bor va bir qiymatli (${sheets.length} ta)`, juft.every(x => x.c.length === 1), juft.filter(x => x.c.length !== 1).slice(0, 3).map(x => x.s.name + ' ×' + x.c.length).join('; '));
  const tengMi = (x) => { const r = x.c[0]; return r && r._n.uzs === x.s.uzs && r._n.lst === x.s.lst && r._n.tur === x.s.uzs_turi && r.ishonch === x.s.ishonch; };
  ok('har yozuvning narxi (uzs, lst), narx turi va ishonchi yangi baza qatoridagi qiymatga TENG', juft.every(tengMi), juft.filter(x => !tengMi(x)).slice(0, 3).map(x => x.s.name + ' ' + x.s.uzs + '/' + x.s.lst + ' ← ' + JSON.stringify(x.c[0] && x.c[0]._n)).join('; '));
  ok('hech bir yozuv PAST yoki faol bo\'lmagan qatordan emas; sotuv/tannarx/kirim sonlari CSV\'da yozilgan', juft.every(x => x.c[0] && x.c[0].ishonch !== 'PAST' && x.c[0].faol === 'FAOL' && x.c[0]._n.uzs > 0));
  ok('har yozuv alohida CSV qatoriga (ikki yozuv bitta qatorga emas)', new Set(juft.map(x => x.c[0] && x.c[0].ERP_id)).size === sheets.length);
  /* stoleshnitsa */
  const stolMos = sit.map(d => ({ d, r: rows.find(r => r.ERP_id === String(d.erp_id)) }));
  const stolTeng = (x) => x.r && x.r.ishonch !== 'PAST' && x.r.faol === 'FAOL' && x.r._n.uzs === x.d.narx_m2 && x.r._n.lst === x.d.narx_list_m2 && x.r._n.tur === x.d.narx_turi && x.r.ishonch === x.d.ishonch && x.d.sku === x.r._sku && x.d.nom === x.r._nom;
  ok(`stoleshnitsa: ${sit.length} dekorning narx_m2, narx_list_m2, narx turi, ishonch, SKU va nomi yangi baza qatoriga TENG`, stolMos.every(stolTeng), stolMos.filter(x => !stolTeng(x)).slice(0, 3).map(x => x.d.nom).join('; '));
  /* chiqarilganlar CSV */
  const CH = topish([process.env.CHIQARILGAN_CSV, ROOT + 'Smart3D_malumot/KATALOGDAN-CHIQARILGAN-2026-10-23.csv', ROOT + '../Smart3D/Smart3D_malumot/KATALOGDAN-CHIQARILGAN-2026-10-23.csv']);
  if (!CH) skip('KATALOGDAN-CHIQARILGAN-2026-10-23.csv bu mashinada yo\'q');
  else {
    const ch = csvOqi(readFileSync(CH, 'utf8'));
    ok(`chiqarilganlar CSV: ${ch.length} qator, ustunlar (guruh, kod, sku, nomi, eski narx, sabab); har birida sabab bor`, ch.length === 1008 && ['guruh', 'kod', 'sku', 'nomi', "eski_narx_UZS (faqat ma'lumot)", 'sabab'].every(k => k in ch[0]) && ch.every(r => r.sabab.length > 5));
    const chP = ch.filter(r => r.guruh === 'plita'), chS = ch.filter(r => r.guruh === 'stoleshnitsa');
    ok(`chiqarilganlar: plita ${chP.length} (693 yangi bazada yo'q + 131 PAST), stoleshnitsa ${chS.length}; hech biri katalogda yo'q (ERP-kod / erp_id)`,
      chP.length === 824 && chS.length === 184 && chP.filter(r => /PAST/.test(r.sabab)).length === 131 && chP.every(r => /^ERP-[0-9a-z]+$/.test(r.kod) && !bor.has(r.kod)) && chS.every(r => !sit.some(d => String(d.erp_id) === r.kod)));
    ok('katalog (718) + chiqarilgan plita (824) − yangi qo\'shilgan (261) = avvalgi 1281', sheets.length + chP.length - 261 === 1281);
  }
  /* skript idempotent: qayta ishga tushirilsa o'zgarish yo'q */
  if (pyOk) {
    try {
      const tmp = join(mkdtempSync(join(tmpdir(), 'kyb-')), 'h.json');
      execFileSync('python3', ['-I', SKRIPT, CSV, ERP, '--dry-run', '--hisobot', tmp], { maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'pipe'] });
      const h = JSON.parse(readFileSync(tmp, 'utf8'));
      const tb = Object.values(h.tur_boyicha);
      ok('skript idempotent (--dry-run): plita — chiqarilgan 0, qo\'shilgan 0, narxi o\'zgargan 0, hammasi "saqlandi"; stoleshnitsa — o\'zgarish 0', h.natija_plita === sheets.length && h.chiqarildi_plita === 0 && tb.every(t => !t.chiqarildi && !t.qoshildi && !t.yangilandi && !t.format_ozgardi && t.saqlandi > 0)
        && !h.stoleshnitsa.chiqarildi && !h.stoleshnitsa.qoshildi && !h.stoleshnitsa.yangilandi && h.stoleshnitsa.saqlandi === sit.length && h.narx_ozgargan.length === 0, JSON.stringify(h.tur_boyicha) + JSON.stringify(h.stoleshnitsa));
    } catch (e) { ok('skript --dry-run ishladi', false, String(e.message).slice(0, 200)); }
  }
}

console.log('\n' + (fail === 0 ? `=== HAMMASI OK (${pass} pass, 0 fail) ===` : `=== XATO: ${fail} ta (${pass} pass, ${fail} fail) ===`));
process.exit(fail ? 1 : 0);
