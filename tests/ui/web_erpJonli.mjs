/* TZ-44 (7, 8, 9, 10, 11): jonli ERP narxlari — brauzer tomoni. /api/erp-narx va /api/admin/erp/jonli* — SHARTNOMA shaklida soxtalashtiriladi (page.route;
 * server tomoni alohida agentda). Qolgani (ro'yxatdan o'tish, buyurtma, loyiha saqlash) — haqiqiy server.
 *   1) ilova ochilganda /api/erp-narx o'qiladi; narx panelida "ERP narxlari: HH:MM" (yangi — oddiy qator)
 *   2) versiya o'zgardi (furnitura narxi 2 baravar) → narx qayta hisoblandi, "Narxlar yangilandi (1 ta)"; loyiha (doc), tanlov, 3D (sceneV, docV)
 *      o'zgarmadi, avtomatik saqlash (PUT/POST /api/projects) ketmadi
 *   3) ETag: ikkinchi so'rov If-None-Match bilan → 304 → narx o'zgarmaydi, xabar yo'q
 *   4) ERP javobidan narx tushib qoldi → narx fayldagiga qaytdi (eski narx qolib ketmadi)
 *   5) buyurtma: serverdagi total_price qotgan (jonli yangilanishdan keyin ham); buyurtma varag'i ochiq paytda narx o'zgarmaydi, yopilgach qo'llanadi
 *   6) ko'rsatkich: eski (>10 daqiqa), jonli o'chiq, ERP xatosi, aloqa yo'q (ketma-ket 2 xato) → ogohlantirish; qaytgach — oddiy; 390 px; ru/en
 *   7) taymer: 120 s (soxta soat), tab yashirin — so'rov yo'q, qaytganda darrov bitta
 *   8) admin /admin/erp: "Jonli sinxronlash" kartasi — holat, oxirgi muvaffaqiyat, xato, kurs, "Hozir" (30 s), pauza, chegara (5–100), o'zgarishlar,
 *      tasdiq kutayotganlar (havola); 3 til; 390 px
 *   0) (brauzersiz) qatlam mantig'i: fayl < ERP < admin; ERP'dan tushgan narx fayldagiga qaytadi; loyihadagi ERP plitasi; ko'rsatkich qoidalari
 * Ishlatish: bash tests/ui/web.sh erpJonli */
import { erpAsl, erpQatlamQoy, erpSukutQoy } from '../../web/src/services/erpQatlam.js';
import { erpKod } from '../../app/js/engine/erpKod.js';
import { erpKorsatkich, erpHolati, isoMs } from '../../web/src/services/erpHolat.js';

export default async function run(page) {
  const R = {};
  try { qatlamMantiq(R); await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/erpJonli-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

/* 0) qatlam mantig'i (sof funksiyalar, brauzersiz): fayl < ERP < admin qo'lda; ERP javobidan tushgan narx — fayldagiga qaytadi; loyihadagi ERP plitasi
 *    faqat narxi shu yangilanishda o'zgargan bo'lsa yangilanadi; o'zgargan narxlar soni (N) */
function qatlamMantiq(R) {
  const sh = (nom, sku, th, uzs) => ({ name: nom, sku, th, uzs, type: 'LDSP' });
  const A = sh('ЛДСП A', 'A-1', 16, 1000), B = sh('ЛДСП B', 'B-1', 16, 0), C = sh('ЛДСП C', 'C-1', 16, 3000);
  const kA = erpKod(A), kB = erpKod(B), kC = erpKod(C);
  const out = { sheetCat: { sheets: [A, B, C] }, matIdx: { items: [{ ...A }, { ...B }, { ...C }] },
    furnCat: { items: [{ id: 1, uzs: 500, price_src: 'fayl' }, { id: 2, no_price: true }] }, adminMv: { narx: { [kB]: 7777 } } };
  out.erpAsl = erpAsl(out);
  const pmA = { code: kA, sheet_price: 1000, src: 'ERP', erp: { sku: 'A-1' } }, pmC = { code: kC, sheet_price: 2500, src: 'ERP', erp: { sku: 'C-1' } }, taxmin = { code: 'LDSP16', sheet_price: 5 };
  const mats = { panel_materials: [pmA, pmC, taxmin] }, doc = { erpMat: { [kA]: pmA, [kC]: pmC } };
  const ev1 = { plita: { [kA]: 1500 }, furnitura: { 1: 600, 2: 900 } };
  const r1 = erpQatlamQoy(out, mats, ev1, doc);
  R.q1 = { n: r1.n, A: out.sheetCat.sheets[0].uzs, Aidx: out.matIdx.items[0].uzs, B: out.sheetCat.sheets[1].uzs, f1: out.furnCat.items[0].uzs, f2: out.furnCat.items[1].uzs, f2np: 'no_price' in out.furnCat.items[1], f2src: out.furnCat.items[1].price_src,
    pmA: pmA.sheet_price, pmAdoc: doc.erpMat[kA].sheet_price, pmC: pmC.sheet_price, taxmin: taxmin.sheet_price, plitaMap: [...r1.plita.keys()].sort().join(',') === [kA, kB].sort().join(',') };
  const r2 = erpQatlamQoy(out, mats, ev1, doc);                                       // o'zgarish yo'q
  R.q2 = { n: r2.n, A: out.sheetCat.sheets[0].uzs, pmA: pmA.sheet_price };
  const r3 = erpQatlamQoy(out, mats, { plita: { [kB]: 9999 }, furnitura: { 1: 600, 2: 900 } }, doc);   // admin qo'lda narxi ERP'dan ustun; A ERP'dan tushdi → fayl narxi
  R.q3 = { n: r3.n, A: out.sheetCat.sheets[0].uzs, B: out.sheetCat.sheets[1].uzs, pmA: pmA.sheet_price };
  const r4 = erpQatlamQoy(out, mats, { plita: {}, furnitura: {} }, doc);               // ERP qatlami bo'sh (sukutga qaytarish) — hammasi fayldagiga
  R.q4 = { n: r4.n, f1: out.furnCat.items[0].uzs, f1src: out.furnCat.items[0].price_src, f2: 'uzs' in out.furnCat.items[1], f2np: out.furnCat.items[1].no_price, B: out.sheetCat.sheets[1].uzs, C: out.sheetCat.sheets[2].uzs, pmC: pmC.sheet_price };
  R.qOk = r1.n === 4 && R.q1.A === 1500 && R.q1.Aidx === 1500 && R.q1.B === 7777 && R.q1.f1 === 600 && R.q1.f2 === 900 && !R.q1.f2np && R.q1.f2src === 'erp_sinxron'
    && R.q1.pmA === 1500 && R.q1.pmAdoc === 1500 && R.q1.pmC === 2500 && R.q1.taxmin === 5 && R.q1.plitaMap
    && R.q2.n === 0 && R.q2.A === 1500 && R.q2.pmA === 1500
    && R.q3.n === 1 && R.q3.A === 1000 && R.q3.B === 7777 && R.q3.pmA === 1000
    && R.q4.n === 2 && R.q4.f1 === 500 && R.q4.f1src === 'fayl' && !R.q4.f2 && R.q4.f2np === true && R.q4.B === 7777 && R.q4.C === 3000 && R.q4.pmC === 2500;
  /* sukut plita (sukut_erp bilan bog'langan): ev.sukut bo'lsa — jonli narx; bo'lmasa / olib tashlansa — egasi tanlagan narx (sukut_erp) */
  const sMats = { sukut_erp: { LDSP16: { nom: 'x', uzs: 341761 }, LDSP18: null }, panel_materials: [{ code: 'LDSP16', sheet_price: 341761, price_src: 'ERP, 2026-10-18', taxminiy: false }, { code: 'LDSP18', sheet_price: 250000, taxminiy: true }] };
  const sOut = {};
  const s0 = erpSukutQoy(sOut, sMats, { plita: {} });                                   // yuklanganda: ev.sukut yo'q — o'zgarmaydi
  const sOldin = sMats.panel_materials[0].sheet_price;
  const s1 = erpSukutQoy(sOut, sMats, { sukut: { LDSP16: 360000, LDSP18: 270000, MDF99: 1 }, sana: '2026-10-22' });   // LDSP18 sukut bilan bog'lanmagan — tegilmaydi
  const pm = sMats.panel_materials[0], l18 = sMats.panel_materials[1];
  const j1 = { narx: pm.sheet_price, src: pm.price_src, taxminiyYoq: !('taxminiy' in pm), l18: l18.sheet_price, l18t: l18.taxminiy };
  const s2 = erpSukutQoy(sOut, sMats, { sukut: { LDSP16: 360000 } });                   // o'zgarmadi
  const s3 = erpQatlamQoy({ erpAsl: erpAsl({}), sukutAsl: sOut.sukutAsl }, sMats, { sukut: {} }, null);   // sukut javobdan tushdi — qaytadi
  R.sukut = { s0, sOldin, s1, ...j1, s2, s3n: s3.n, qaytdi: pm.sheet_price, qaytdiSrc: pm.price_src, qaytdiTaxmin: pm.taxminiy };
  R.sukutOk = s0 === 0 && s1 === 1 && R.sukut.narx === 360000 && R.sukut.src === 'ERP, 2026-10-22' && R.sukut.taxminiyYoq && l18.sheet_price === 250000 && l18.taxminiy === true && s2 === 0
    && s3.n === 1 && pm.sheet_price === 341761 && pm.price_src === 'ERP, 2026-10-18' && pm.taxminiy === false;
  /* ko'rsatkich mantig'i (sof): yangi / eski / o'chiq / xato / server eski deb belgilagan / jonli bloki yo'q */
  const hozir = Date.parse('2026-10-22T12:00:00Z'), j = (o) => erpHolati({ versiya: 1, jonli: { yoqilgan: true, oxirgi_muvaffaqiyat: '2026-10-22T11:55:00Z', xato_soni: 0, ...o } }, hozir);
  const ko = (h) => erpKorsatkich({ ...h, aloqa: true }, hozir);
  R.korsatkichMantiq = { yangi: ko(j({})).eski === false, eski10: ko(j({ oxirgi_muvaffaqiyat: '2026-10-22T11:49:00Z' })).eski === true, chegara: ko(j({ oxirgi_muvaffaqiyat: '2026-10-22T11:50:00Z' })).eski === false,
    ochiq: ko(j({ yoqilgan: false })).eski === true, xato: ko(j({ xato_soni: 1 })).eski === true, serverEski: ko(j({ eski: true })).eski === true, jonliYoq: erpKorsatkich(erpHolati({ plita: {} }, hozir), hozir) === null,
    vaqtYoq: ko(j({ oxirgi_muvaffaqiyat: null })).vaqt === '', zonasiz: isoMs('2026-10-22 06:44:27') === Date.parse('2026-10-22T06:44:27Z') };
  R.korsatkichMantiqOk = Object.values(R.korsatkichMantiq).every(Boolean);
}

const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT, errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const origin = new URL(page.url()).origin;
  const txt = () => M(() => document.body.innerText);
  const has = async (t) => (await txt()).includes(t);
  const fill = async (ph, v) => { await page.locator(`input[placeholder*="${ph}"]`).first().fill(v); };
  const kut = async (sel, ms = 8000) => { try { await page.locator(sel).first().waitFor({ timeout: ms }); return true; } catch (_) { return false; } };
  const waitText = async (t, ms = 8000) => { for (let i = 0; i < ms / 200; i++) { if (await has(t)) return true; await page.waitForTimeout(200); } return false; };
  const skroll0 = () => M(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && document.body.scrollWidth <= window.innerWidth + 1);
  const hhmm = (ms) => M((ms) => { const d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }, ms);
  const iso = (ms) => new Date(ms).toISOString();

  /* ───── soxta /api/erp-narx (SHARTNOMA: versiya, yangilangan, jonli{…}; ETag / If-None-Match → 304) ───── */
  const S = { versiya: 1, plita: {}, furnitura: {}, oxirgi: Date.now() - 30000, yoqilgan: true, xato: 0, kurs: 11773.68, uzilgan: false, javoblar: [] };
  const eskiMi = () => S.yoqilgan && Date.now() - S.oxirgi > 600000;
  const tana = () => ({ plita: S.plita, furnitura: S.furnitura, sana: '2026-10-22', versiya: S.versiya, yangilangan: iso(S.oxirgi),
    jonli: { yoqilgan: S.yoqilgan, oxirgi_muvaffaqiyat: iso(S.oxirgi), manba_sana: '2026-10-22T08:00:00Z', xato_soni: S.xato, kurs: S.kurs, eski: eskiMi() } });
  /* server ETag'i oxirgi muvaffaqiyatning o'zini O'Z ICHIGA OLMAYDI (faqat qo'pol bo'lagi) — shuning uchun 304 da ham X-Erp-Oxirgi sarlavhasi keladi */
  const etag = () => 'W/"' + S.versiya + '|' + S.xato + '|' + S.yoqilgan + '|' + (eskiMi() ? 1 : 0) + '"';
  await page.route('**/api/erp-narx', async (route) => {
    const h = route.request().headers(), inm = h['if-none-match'] || null;
    if (S.uzilgan) { S.javoblar.push({ inm, s: 'uzildi' }); return route.abort(); }
    const e = etag(), sar = { ETag: e, 'X-Erp-Versiya': String(S.versiya), 'X-Erp-Oxirgi': iso(S.oxirgi) };
    if (inm === e) { S.javoblar.push({ inm, s: 304 }); return route.fulfill({ status: 304, headers: sar }); }
    S.javoblar.push({ inm, s: 200 });
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { ...sar, 'Cache-Control': 'no-cache' }, body: JSON.stringify(tana()) });
  });
  const mutlaq = [];                                           // loyiha/buyurtma yozuvlari (avtomatik saqlash tekshiruvi)
  page.on('request', q => { if (q.method() !== 'GET' && /\/api\/(projects|orders)/.test(q.url())) mutlaq.push({ m: q.method(), p: new URL(q.url()).pathname, t: Date.now() }); });

  /* ───── ro'yxatdan o'tish (haqiqiy server) → oshxona → Narx ───── */
  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Jonli Usta'); await fill('jasur@', 'jonli' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }
  await fill('kamida 8', 'parol12345');
  await page.getByText(/^Ro'yxatdan o'tish$/).last().click(); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.res && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);
  await page.getByText(/^Narx$/).last().click(); await page.waitForTimeout(1200);

  const holat = () => M(() => { const s = window.__app.state, r = window.__app.res; return { jami: r.priceRes.total, dv: s.dv, docV: s.docV, sceneV: s.sceneV, doc: JSON.stringify(window.__app.doc), sel: JSON.stringify(s.sel), step: s.step, mat: s.matCode + '|' + s.fasadCode }; });
  const sat = (g, c) => M(([g, c]) => { const l = window.__app.res.prod.lines.find(x => x.group === g && x.code === c); return l ? { up: l.unit_price, amount: l.amount } : null; }, [g, c]);
  const korsatkich = () => M(() => { const e = document.querySelector('[data-erp-korsatkich]'); return e ? { holat: e.dataset.erpHolat, matn: e.innerText.trim() } : null; });
  const tekshir = () => M(() => window.__app.erp.tekshir());
  const rasm = async (nom) => { await M(() => { const e = document.querySelector('[data-erp-korsatkich]'); if (e) e.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(250); await page.screenshot({ path: `${OUT}/erpJonli-${nom}.png` }); };

  /* 1) boshlang'ich holat: /api/erp-narx o'qildi, ko'rsatkich yangi */
  R.boshlangich = await M(() => ({ erp: window.__app.erp.holat(), davr: window.__app.erp.davr, eskiMs: window.__app.erp.eskiMs }));
  R.korsatkich1 = await korsatkich();
  R.korsatkichKutilgan = 'ERP narxlari: ' + await hhmm(S.oxirgi);
  await rasm('1440-narx');
  const h0 = await holat();
  /* narxi ERP bog'langan furnitura qatori: eng qimmat "ERP" manbali */
  const tanlov = await M(() => {
    const H = window.__app.H, ls = window.__app.res.prod.lines.filter(l => l.group === 'Furnitura' && l.manba === 'ERP' && l.unit_price > 0).sort((a, b) => b.amount - a.amount);
    for (const l of ls) { const link = H.furnituraBoglash[l.code], id = link && typeof link === 'object' ? (link.erp_id || link.id) : link, it = H.furnById[id]; if (it && it.uzs > 0) return { kod: l.code, id: String(it.id), uzs: it.uzs, up: l.unit_price, amount: l.amount }; }
    return null;
  });
  R.tanlov = tanlov;
  const f0 = await sat('Furnitura', tanlov.kod);

  /* 2) versiya o'zgardi: furnitura narxi 2 baravar → narx qayta hisoblandi, xabar chiqdi; loyiha/3D/saqlash tegilmadi */
  await page.waitForTimeout(3500); const saqlashOldin = mutlaq.length;     // avtomatik saqlash tinchiguncha
  S.versiya = 2; S.furnitura = { [tanlov.id]: tanlov.uzs * 2 }; S.oxirgi = Date.now();
  R.tekshir2 = await tekshir();
  const h1 = await holat(); const f1 = await sat('Furnitura', tanlov.kod);
  R.xabar1 = await waitText('Narxlar yangilandi (1 ta)');
  R.yangilanish = { jamiOldin: h0.jami, jamiKeyin: h1.jami, oshdi: h1.jami > h0.jami, qatorOldin: f0.up, qatorKeyin: f1.up, ikkiBaravar: Math.abs(f1.up - f0.up * 2) <= 2,
    dv: h1.dv - h0.dv, docV: h1.docV - h0.docV, sceneV: h1.sceneV - h0.sceneV, docBir: h1.doc === h0.doc, tanlovBir: h1.sel === h0.sel && h1.mat === h0.mat && h1.step === h0.step };
  await rasm('1440-yangilandi');
  await page.waitForTimeout(3500);
  R.saqlashKetmadi = mutlaq.length === saqlashOldin;
  R.korsatkich2 = await korsatkich();
  R.erpHolat2 = await M(() => window.__app.erp.holat().versiya);

  /* 3) ETag: o'zgarish yo'q → 304 (If-None-Match bilan), narx va xabar o'zgarmaydi */
  const dvOldin = (await holat()).dv;
  R.xabarYoqoldi = !(await has('Narxlar yangilandi'));
  R.tekshir3 = await tekshir();
  R.etag = { oxirgi: S.javoblar[S.javoblar.length - 1], jami: S.javoblar.length };
  R.dv3 = (await holat()).dv === dvOldin;
  R.xabar3 = !(await has('Narxlar yangilandi'));

  /* 3b) 304 da ham ERP tirikligi: server oxirgi muvaffaqiyatni X-Erp-Oxirgi sarlavhasida beradi → ko'rsatkich to'liq javobsiz yangilanadi */
  S.oxirgi = Date.now() - 20000;
  R.tekshir3b = await tekshir();
  R.sarlavha304 = { status: S.javoblar[S.javoblar.length - 1].s, oxirgi: await M(() => window.__app.erp.holat().oxirgi), kutilgan: iso(S.oxirgi) };

  /* 4) ERP javobidan narx tushib qoldi (admin "Sukutga qaytarish") → narx fayldagiga qaytdi */
  S.versiya = 3; S.furnitura = {}; S.oxirgi = Date.now();
  R.tekshir4 = await tekshir();
  const h4 = await holat(); const f4 = await sat('Furnitura', tanlov.kod);
  R.qaytdi = { jami: h4.jami === h0.jami, qator: f4.up === f0.up, xabar: await waitText('Narxlar yangilandi (1 ta)') };

  /* 5) buyurtma: serverdagi narx qotgan; varaq ochiq paytda narx o'zgarmaydi */
  await page.waitForTimeout(3300);
  R.buyurtmaTugma = await page.locator('[data-buyurtma-ber]').count();
  await page.locator('[data-buyurtma-ber]').click(); await kut('[data-varaq="buyurtma"]');
  await page.locator('[data-buyurtma-ism]').fill('Jonli Mijoz');
  await page.locator('[data-buyurtma-tel]').fill('90 765 43 21');
  const varaqNarx = () => M(() => (document.querySelector('[data-buyurtma-xulosa]') || {}).innerText || '');
  const varaq0 = await varaqNarx();
  S.versiya = 4; S.furnitura = { [tanlov.id]: tanlov.uzs * 2 }; S.oxirgi = Date.now();
  R.tekshir5 = await tekshir(); await page.waitForTimeout(1800);
  R.varaqOchiq = { narxBir: (await varaqNarx()) === varaq0, kutmoqda: await M(() => window.__app.erp.kutayotgan()), jamiBir: (await holat()).jami === h0.jami };
  await page.screenshot({ path: `${OUT}/erpJonli-1440-varaq.png` });
  await page.locator('[data-buyurtma-yubor]').click();
  R.yuborildi = await waitText('sexga yuborildi');
  await page.waitForTimeout(500);
  const buy = await M(() => fetch('/api/orders', { cache: 'no-store' }).then(r => r.json()));
  R.buyurtma = { soni: buy.length, narx: buy[0] && buy[0].total_price, kutilgan: h0.jami };
  /* varaq yopildi (yuborilgach) → kutayotgan yangilanish qo'llandi */
  for (let i = 0; i < 20 && (await M(() => window.__app.erp.kutayotgan())); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(500);
  const h5 = await holat();
  R.varaqYopilgach = { kutish: await M(() => window.__app.erp.kutayotgan()), jamiOshdi: h5.jami > h0.jami, xabar: await waitText('Narxlar yangilandi (1 ta)') };
  /* yangilanishdan keyin ham serverdagi buyurtma narxi o'zgarmagan (ro'yxat va bitta buyurtma) */
  const buy2 = await M(() => fetch('/api/orders', { cache: 'no-store' }).then(r => r.json()));
  const bir = await M((id) => fetch('/api/orders/' + id, { cache: 'no-store' }).then(r => r.json()), buy2[0].id);
  R.buyurtmaQotgan = { royxat: buy2[0].total_price === h0.jami, bitta: bir.total_price === h0.jami, jonliNarx: h5.jami, qotganNarx: buy2[0].total_price };

  /* 6) ko'rsatkich: eski / o'chiq / xato / aloqa yo'q → ogohlantirish; qaytgach — oddiy */
  await page.waitForTimeout(3300);
  S.oxirgi = Date.now() - 15 * 60000; await tekshir(); await page.waitForTimeout(300);
  R.eski = { k: await korsatkich(), kutilgan: 'ERP bilan aloqa yo\'q — oxirgi narx ' + await hhmm(S.oxirgi) };
  await rasm('1440-eski');
  S.oxirgi = Date.now() - 60000; await tekshir(); await page.waitForTimeout(300);
  R.tiklandi1 = await korsatkich();
  S.yoqilgan = false; await tekshir(); await page.waitForTimeout(300); R.ochiq = await korsatkich();
  S.yoqilgan = true; S.xato = 3; await tekshir(); await page.waitForTimeout(300); R.xatoli = await korsatkich();
  S.xato = 0; await tekshir(); await page.waitForTimeout(300); R.tiklandi2 = await korsatkich();
  S.uzilgan = true; await tekshir(); await page.waitForTimeout(300); R.uzilish1 = await korsatkich();      // birinchi xato — jim (belgi o'zgarmaydi)
  await tekshir(); await page.waitForTimeout(300); R.uzilish2 = await korsatkich();                          // ikkinchi ketma-ket — ogohlantirish
  R.uzilishXabar = !(await has('S3D-'));
  await rasm('1440-uzilgan');
  S.uzilgan = false; await tekshir(); await page.waitForTimeout(300); R.tiklandi3 = await korsatkich();
  await rasm('1440-tiklandi');
  /* telefon 390 px: ko'rsatkich sig'adi, gorizontal skroll yo'q */
  S.oxirgi = Date.now() - 15 * 60000; await tekshir(); await page.waitForTimeout(300);
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
  R.tel = { k: await korsatkich(), skroll0: await skroll0(), sigdi: await M(() => { const r = document.querySelector('[data-erp-korsatkich]').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1; }) };
  await rasm('390-eski');
  /* rus va ingliz tilida (sahifa qayta yuklanmaydi) */
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [til, re] of [['ru', /Нет связи с ERP — последняя цена \d\d:\d\d/], ['en', /No connection to ERP — last price \d\d:\d\d/]]) {
    await page.locator('button[data-til-menyu]').click(); await page.waitForTimeout(300);
    await page.locator(`[role=menuitemradio][lang=${til}]`).click(); await page.waitForTimeout(600);
    R['til_' + til] = re.test(await M(() => (document.querySelector('[data-erp-korsatkich]') || {}).innerText || ''));
  }
  await page.locator('button[data-til-menyu]').click(); await page.waitForTimeout(300);
  await page.locator('[role=menuitemradio][lang=uz]').click(); await page.waitForTimeout(400);

  /* 7) taymer: 120 s, tab yashirin — so'rov yo'q, qaytganda darrov bitta (soxta soat) */
  S.oxirgi = Date.now() - 30000; S.xato = 0; S.yoqilgan = true;
  await page.clock.install(); await page.reload(); await page.waitForTimeout(2500);
  for (let i = 0; i < 80 && !(await M(() => window.__app && window.__app.state.dataReady)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1500);
  const n0 = S.javoblar.length;
  await page.clock.fastForward(100000); await page.waitForTimeout(500);
  const n1 = S.javoblar.length;
  await page.clock.fastForward(21000); await page.waitForTimeout(800);
  const n2 = S.javoblar.length;
  await M(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.fastForward(130000); await page.waitForTimeout(300); await page.clock.fastForward(130000); await page.waitForTimeout(600);
  const n3 = S.javoblar.length;
  await M(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(800);
  const n4 = S.javoblar.length;
  R.taymer = { davr: await M(() => window.__app.erp.davr), n0, n1, n2, n3, n4, oldin120: n1 === n0, keyin120: n2 === n0 + 1, yashirin: n3 === n2, qaytganda: n4 === n3 + 1 };
  await page.clock.resume().catch(() => {});
  await M(() => { delete document.visibilityState; });

  /* ───── 8) ADMIN: "Jonli sinxronlash" kartasi (soxta /api/admin/erp*, /api/me — admin) ───── */
  /* server shakli (agent/erpjonli: erp-jonli.js holat()): yassi obyekt; tasdiq_kutadi { soni, partiya_id }; ozgarishlar[{ id, vaqt (UTC, zonasiz), tur, kalit, nom, eski, yangi, foiz, harakat, sabab }] */
  const utc = (ms) => iso(ms).slice(0, 19).replace('T', ' ');
  const J = { yoqilgan: true, sabab: '', pauza: false, chegara_foiz: 30, versiya: 5, oxirgi_muvaffaqiyat: iso(Date.now() - 90000), manba_sana: '2026-10-22T08:05:00Z', xato_soni: 2, oxirgi_xato: { kod: 'S3D-ERP-003', matn: 'ERP javob bermadi' }, kurs: 11773.68, kurs_kutadi: null,
    tasdiq_kutadi: { soni: 3, ogohlantirish: 0, partiya_id: null, sabab: {} },
    ozgarishlar: [
      { id: 3, vaqt: utc(Date.now() - 60000), tur: 'plita', kalit: 'ERP-aaa1', nom: 'ЛДСП Белый гладкий 16мм', eski: 341761, yangi: 352000, foiz: 3, harakat: 'qollandi', sabab: '', partiya_id: null },
      { id: 2, vaqt: utc(Date.now() - 120000), tur: 'furnitura', kalit: '10807', nom: 'Ручка 160 матовая', eski: 16000, yangi: 24000, foiz: 50, harakat: 'kutadi', sabab: 'katta_ozgarish', partiya_id: 7 },
      { id: 1, vaqt: utc(Date.now() - 240000), tur: 'xizmat', kalit: 'raspil', nom: 'Raspil', eski: 5000, yangi: 5200, foiz: 4, harakat: 'qaytarildi', sabab: '', partiya_id: null }] };
  const amal = [];
  let hozirOxirgi = 0;
  await page.route('**/api/me', r => json(r, { id: 1, name: 'Admin Sinov', email: 'a@test.uz', role: 'admin' }));
  await page.route('**/api/admin/**', async (route) => {
    const q = route.request(), u = new URL(q.url()), m = q.method(), p = u.pathname, body = q.postData() ? JSON.parse(q.postData()) : null;
    if (m !== 'GET') amal.push({ m, p, body });
    if (p === '/api/admin/erp/jonli' && m === 'GET') return json(route, J);
    if (p === '/api/admin/erp/jonli' && m === 'PUT') {
      if (!body || typeof body.pauza !== 'boolean' || !(body.chegara_foiz >= 5 && body.chegara_foiz <= 100)) return json(route, { error: 'noto\'g\'ri', code: 'S3D-ADM-019' }, 400);
      J.pauza = body.pauza; J.chegara_foiz = body.chegara_foiz; return json(route, { ok: true });
    }
    if (p === '/api/admin/erp/jonli/hozir' && m === 'POST') {
      if (Date.now() - hozirOxirgi < 30000) return json(route, { error: 'Juda tez: 30 soniyada bir marta', code: 'S3D-ERP-007' }, 429);
      hozirOxirgi = Date.now(); J.oxirgi_muvaffaqiyat = iso(Date.now()); J.xato_soni = 0; return json(route, { ok: true });
    }
    if (p === '/api/admin/erp' && m === 'GET') return json(route, { qatlam: { plita: 0, furnitura: 0, oxirgi_sana: '' }, partiyalar: [{ id: 7, tur: 'mahsulot', holat: 'qoralama', farq_bor: true, vaqt: iso(Date.now() - 300000).slice(0, 19).replace('T', ' '), kim: 'tizim', fayl_nom: 'jonli.json', erp_sana: '2026-10-22', xulosa: { qatorlar: 3 } }] });
    if (p === '/api/admin/erp/7' && m === 'GET') return json(route, { id: 7, fayl_nom: 'jonli.json', holat: 'qoralama', vaqt: '2026-10-22 09:00:00', kim: 'tizim', erp_sana: '2026-10-22', eskirgan: false, jami: 0, items: [],
      xulosa: { qatorlar: 3, katalog: { plita: 1, furnitura: 1 }, guruh: {}, qollanadi: { plita: 0, furnitura: 0 }, yoq: {} } });
    return json(route, { error: 'yo\'q' }, 404);
  });
  await page.goto(origin + '/admin/erp'); await kut('[data-erpj="karta"]');
  await page.waitForTimeout(800);
  const karta = () => M(() => { const q = (s) => (document.querySelector(s) || {}).innerText || ''; return { holat: q('[data-erpj="holat"]'), oxirgi: q('[data-erpj-katak="oxirgi"]'), manba: q('[data-erpj-katak="manba"]'), xato: q('[data-erpj-katak="xato"]'), kurs: q('[data-erpj-katak="kurs"]'),
    kutayotgan: q('[data-erpj="kutayotgan"]'), qatorlar: [...document.querySelectorAll('[data-erpj-ozgarish]')].map(e => ({ kod: e.dataset.erpjOzgarish, holat: e.dataset.erpjHolat, matn: e.innerText.replace(/\s+/g, ' ') })) }; });
  R.karta = await karta();
  R.kartaTartib = await M(() => { const bol = document.querySelector('[data-admin-bolim="erp"]'); return !!bol && bol.firstElementChild === document.querySelector('[data-erpj="karta"]'); });
  await page.locator('[data-erpj="karta"]').screenshot({ path: `${OUT}/erpJonli-1440-admin.png` });
  /* "Hozir sinxronla": POST, tugma 30 soniya o'chiq */
  await page.locator('[data-erpj="hozir"]').click(); await page.waitForTimeout(700);
  R.hozir = { post: amal.filter(a => a.m === 'POST' && /\/jonli\/hozir$/.test(a.p)).length, ochiq: await page.locator('[data-erpj="hozir"]').isDisabled(), xabar: await has('Sinxronlash boshlandi') };
  await page.locator('[data-erpj="hozir"]').click({ force: true, timeout: 1500 }).catch(() => {}); await page.waitForTimeout(300);
  R.hozir.ikkinchiPost = amal.filter(a => a.m === 'POST' && /\/jonli\/hozir$/.test(a.p)).length;
  R.hozirKeyin = (await karta()).xato;
  /* pauza almashtirgich */
  await page.locator('[data-erpj="pauza"] button[role="switch"]').click(); await page.waitForTimeout(900);
  R.pauza = { put: amal.filter(a => a.m === 'PUT').pop(), holat: (await karta()).holat, switch: await page.locator('[data-erpj="pauza"] button[role="switch"]').getAttribute('aria-checked') };
  /* chegara: noto'g'ri qiymat — so'rov yo'q; to'g'ri — PUT */
  const putOldin = amal.filter(a => a.m === 'PUT').length;
  await page.locator('[data-erpj="chegara"]').fill('3'); await page.locator('[data-erpj="chegara-saqla"]').click(); await page.waitForTimeout(400);
  R.chegaraXato = { put: amal.filter(a => a.m === 'PUT').length === putOldin, xabar: await has('5 dan 100 gacha') };
  await page.locator('[data-erpj="chegara"]').fill('101');
  await page.locator('[data-erpj="chegara-saqla"]').click(); await page.waitForTimeout(400);
  R.chegara101Put = amal.filter(a => a.m === 'PUT').length === putOldin;
  await page.locator('[data-erpj="chegara"]').fill('50'); await page.locator('[data-erpj="chegara-saqla"]').click(); await page.waitForTimeout(900);
  R.chegaraSaqla = { put: amal.filter(a => a.m === 'PUT').pop(), qiymat: await page.locator('[data-erpj="chegara"]').inputValue() };
  /* tasdiq kutayotganlar: havola — ro'yxatga (partiya id yo'q), keyin ochiq farq (id bor) */
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('[data-erpj="kutayotgan-och"]').click(); await page.waitForTimeout(1200);
  R.havolaRoyxat = await M(() => { const r = document.querySelector('[data-erp="royxat"]').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });
  J.tasdiq_kutadi.partiya_id = 7;
  await page.reload(); await kut('[data-erpj="kutayotgan-och"]'); await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('[data-erpj="kutayotgan-och"]').click(); await page.waitForTimeout(300);
  R.havolaFarq = await kut('[data-erp="batafsil"][data-erp-id="7"]', 3000);
  /* o'chiq holat (server sozlanmagan) */
  J.yoqilgan = false; J.sabab = 'env_yoq'; J.tasdiq_kutadi = { soni: 0, ogohlantirish: 0, partiya_id: null, sabab: {} };
  await page.reload(); await kut('[data-erpj="karta"]'); await page.waitForTimeout(800);
  R.ochiqKarta = { holat: (await karta()).holat, izoh: await kut('[data-erpj="ochiq-izoh"]', 1000), sabab: await M(() => (document.querySelector('[data-erpj="ochiq-izoh"]') || {}).innerText || ''), hozirOchiq: await page.locator('[data-erpj="hozir"]').isDisabled(), kutayotganYoq: await kut('[data-erpj="kutayotgan-yoq"]', 1000) };
  await page.screenshot({ path: `${OUT}/erpJonli-1440-admin-ochiq.png` });
  J.yoqilgan = true; J.sabab = ''; J.xato_soni = 0;
  /* 3 til va telefon 390 px */
  for (const [til, re] of [['ru', /Живая синхронизация/], ['en', /Live sync/], ['uz', /Jonli sinxronlash/]]) {
    await page.locator('button[data-til-menyu]').click(); await page.waitForTimeout(300);          // til menyusi (server sozlamasiga ham yoziladi)
    await page.locator(`[role=menuitemradio][lang=${til}]`).click(); await page.waitForTimeout(700);
    R['admin_' + til] = re.test(await txt());
  }
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(600);
  await page.reload(); await kut('[data-erpj="karta"]'); await page.waitForTimeout(600);
  R.admin390 = { skroll0: await skroll0(), sigdi: await M(() => { const r = document.querySelector('[data-erpj="karta"]').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1; }) };
  await page.locator('[data-erpj="karta"]').screenshot({ path: `${OUT}/erpJonli-390-admin.png` });
  R.errs = errs;

  /* ───── xulosa ───── */
  const k = R.karta;
  R.ok = R.qOk && R.sukutOk && R.korsatkichMantiqOk && !!R.boshlangich.erp.bor && R.boshlangich.davr === 120000 && R.boshlangich.eskiMs === 600000
    && R.korsatkich1 && R.korsatkich1.holat === 'yangi' && R.korsatkich1.matn === R.korsatkichKutilgan
    && R.tekshir2 === 'yangi' && R.xabar1 && R.yangilanish.oshdi && R.yangilanish.ikkiBaravar && R.yangilanish.dv === 1 && R.yangilanish.docV === 0 && R.yangilanish.sceneV === 0 && R.yangilanish.docBir && R.yangilanish.tanlovBir
    && R.saqlashKetmadi && R.erpHolat2 === 2 && R.xabarYoqoldi
    && R.tekshir3 === 'ozgarmadi' && R.etag.oxirgi.s === 304 && !!R.etag.oxirgi.inm && R.dv3 && R.xabar3
    && R.tekshir3b === 'ozgarmadi' && R.sarlavha304.status === 304 && R.sarlavha304.oxirgi === R.sarlavha304.kutilgan
    && R.tekshir4 === 'yangi' && R.qaytdi.jami && R.qaytdi.qator && R.qaytdi.xabar
    && R.varaqOchiq.narxBir && R.varaqOchiq.kutmoqda && R.varaqOchiq.jamiBir && R.yuborildi && R.buyurtma.soni === 1 && R.buyurtma.narx === h0.jami
    && !R.varaqYopilgach.kutish && R.varaqYopilgach.jamiOshdi && R.varaqYopilgach.xabar && R.buyurtmaQotgan.royxat && R.buyurtmaQotgan.bitta
    && R.eski.k && R.eski.k.holat === 'eski' && R.eski.k.matn === R.eski.kutilgan && R.tiklandi1.holat === 'yangi'
    && R.ochiq.holat === 'eski' && R.xatoli.holat === 'eski' && R.tiklandi2.holat === 'yangi'
    && R.uzilish1.holat === 'yangi' && R.uzilish2.holat === 'eski' && R.uzilishXabar && R.tiklandi3.holat === 'yangi'
    && R.tel.skroll0 && R.tel.sigdi && R.til_ru && R.til_en
    && R.taymer.oldin120 && R.taymer.keyin120 && R.taymer.yashirin && R.taymer.qaytganda
    && /Yoqilgan/.test(k.holat) && /11 774/.test(k.kurs) && /\n2\b/.test(k.xato) && k.qatorlar.length === 3 && k.qatorlar[1].holat === 'kutadi' && /katta o'zgarish|chegaradan katta/.test(k.qatorlar[1].matn) && /S3D-ERP-003/.test(k.xato) && /Tasdiq kutayotganlar: 3/.test(k.kutayotgan)
    && R.kartaTartib && R.hozir.post === 1 && R.hozir.ochiq && R.hozir.xabar && R.hozir.ikkinchiPost === 1
    && R.pauza.put && R.pauza.put.body.pauza === true && R.pauza.put.body.chegara_foiz === 30 && /Pauza/.test(R.pauza.holat) && R.pauza.switch === 'true'
    && R.chegaraXato.put && R.chegaraXato.xabar && R.chegara101Put && R.chegaraSaqla.put.body.chegara_foiz === 50 && R.chegaraSaqla.put.body.pauza === true && R.chegaraSaqla.qiymat === '50'
    && R.havolaRoyxat && R.havolaFarq && /O'chiq/.test(R.ochiqKarta.holat) && R.ochiqKarta.izoh && /ERP_LOGIN va ERP_PASSWORD/.test(R.ochiqKarta.sabab) && R.ochiqKarta.hozirOchiq && R.ochiqKarta.kutayotganYoq
    && R.admin_ru && R.admin_en && R.admin_uz && R.admin390.skroll0 && R.admin390.sigdi && !errs.length;
}
