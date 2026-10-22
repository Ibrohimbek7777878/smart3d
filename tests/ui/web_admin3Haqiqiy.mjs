/* TZ-37 (3-faza): admin panel — Tizim, O'zgarishlar tarixi kengaytmasi, ERP sinxronlash — HAQIQIY serverda (soxta API'siz).
 *   1) Tizim: AI (kalit "yo'q" va sababi; kalit qiymati ekranda yo'q), Google/SMS/Telegram holati, xatolar jurnali (24 soat/7 kun, kod bo'yicha qidiruv),
 *      zaxira holati; 3 til va 390 px da gorizontal skroll yo'q.
 *   2) Tarix: audit + narxlar bitta ro'yxatda; filtr (bo'lim, kim, sana, holat, kalit), sahifalash ("Yana"), narx o'zgarishini qaytarish;
 *   3) ERP sinxron: JSON fayl yuklash (noto'g'ri fayl rad), farq ko'rinishi (chiplar, filtr, qidiruv), qatorni belgidan olish, tasdiq bilan qo'llash,
 *      ilovada narx o'zgargani, Tarix'dan qaytarish, sukutga qaytarish, xizmatlar fayli; 3 til; 390 px;
 * Ishlatish: bash tests/ui/web.sh admin3Haqiqiy */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/admin3Haqiqiy-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT, errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const orgn = () => new URL(page.url()).origin;
  const kut = async (sel, ms = 8000) => { try { await page.locator(sel).first().waitFor({ timeout: ms }); return true; } catch (_) { return false; } };
  const matn = () => M(() => document.body.innerText);
  const skroll0 = () => M(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && document.body.scrollWidth <= window.innerWidth + 1);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { await page.locator(`input[placeholder*="${ph}"]`).first().fill(v); };
  const tasdiq = (nom) => page.locator('[role=dialog]:not([data-varaq])').getByRole('button', { name: nom });   // tasdiq oynasi (varaq emas)
  const sorovlar = [];
  page.on('request', q => { if (q.method() !== 'GET' && /\/api\/(admin|narxlar)/.test(q.url())) sorovlar.push({ m: q.method(), p: new URL(q.url()).pathname, body: q.postData() }); });
  const oxirgi = (m, re) => sorovlar.filter(c => c.m === m && re.test(c.p)).pop();
  const jsonOl = (yol) => M((yol) => fetch(yol, { cache: 'no-store' }).then(r => r.json()), yol);
  const yoz = (yol, method, body) => M(({ yol, method, body }) => fetch(yol, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.status), { yol, method, body });

  /* ── admin kiradi ── */
  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.context().clearCookies();
  await page.goto(orgn() + '/kirish?t=' + Date.now()); await page.waitForTimeout(1500);
  await fill('jasur@', 'admin@smart3d.uz'); await fill('kamida 8', 'web-test-admin-1');
  await click(/^Kirish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.goto(orgn() + '/admin'); await kut('[data-admin-tab]');
  R.tablar = await page.locator('[data-admin-tab]').count();
  R.yangiTablar = (await Promise.all(['erp', 'tizim'].map(b => page.locator(`[data-admin-tab="${b}"]`).count()))).every(n => n === 1);

  /* ═══ 1) TIZIM ═══ */
  // xatolar jurnalida kod bo'lsin: brauzer xato yozuvi (mavjud /api/log)
  await M(() => fetch('/api/log', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'S3D-UI-101', modul: 'sinov', sahifa: '/admin', xabar: 'sinov xatosi' }) }));
  await page.locator('[data-admin-tab="tizim"]').click(); await kut('[data-tz="ai"]');
  R.tizimYol = await M(() => location.pathname);
  R.tizimKarta = await kut('[data-tz="zaxira"]') && await kut('[data-tz="xatolar"]');
  R.aiOchiq = (await page.locator('[data-tz-holat="ai"]').getAttribute('data-ok')) === '0' && await kut('[data-tz-sabab="provayder_yoq"]');
  R.kalitYoq = (await page.locator('[data-tz-holat="kalit"]').getAttribute('data-ok')) === '0' && /Yo'q/.test(await page.locator('[data-tz-qator="kalit"]').innerText());
  R.smsSozlanmagan = (await page.locator('[data-tz-holat="sms"]').getAttribute('data-ok')) === '0' && /Sozlanmagan/.test(await page.locator('[data-tz="sms"]').innerText());
  R.googleSozlanmagan = (await page.locator('[data-tz-holat="google"]').getAttribute('data-ok')) === '0';
  R.telegramSozlangan = (await page.locator('[data-tz-holat="telegram"]').getAttribute('data-ok')) === '1' && /Sozlangan/.test(await page.locator('[data-tz="telegram"]').innerText());
  R.zaxiraYoq = (await page.locator('[data-tz-holat="zaxira"]').getAttribute('data-ok')) === '0' && await kut('[data-tz-zaxira-yoq]');
  R.sarfKarta = await kut('[data-ai-sarf-karta]');
  const tz = await M(() => fetch('/api/admin/tizim', { cache: 'no-store' }).then(r => r.text()));
  R.maxfiyYoq = !/sk-ant|AIza|eyJ|ESKIZ_PASSWORD|web-test-secret/.test(tz) && !/web-test-secret-0123/.test(await matn()) && JSON.parse(tz).ai.kalit.bor === false;
  R.jurnalKorinadi = await kut('[data-tz-jurnal]') && (await page.locator('[data-tz-jurnal]').first().innerText()).includes('S3D-UI-101');
  R.topKorinadi = (await page.locator('[data-tz-top="S3D-UI-101"]').count()) === 1;
  await page.screenshot({ path: `${OUT}/admin3-tizim-1440.png`, fullPage: true });
  await page.locator('[data-tz="xato-qidir"]').fill('S3D-UI-101'); await page.waitForTimeout(900);
  R.qidirKod = (await page.locator('[data-tz-jurnal]').count()) >= 1;
  await page.locator('[data-tz="xato-qidir"]').fill('abcdef012345'); await page.waitForTimeout(900);
  R.qidirRidYoq = (await page.locator('[data-tz-jurnal]').count()) === 0 && /Hech narsa topilmadi/.test(await matn());
  await page.locator('[data-tz="xato-qidir"]').fill('');
  await page.locator('[data-tz="yangila"]').click(); await page.waitForTimeout(700);
  R.yangilaIshlaydi = await kut('[data-tz-jurnal]');
  /* kalit qiymati yozilgan matnni kiritganda ham jurnal qidiruvi so'rovga uni yubormaydi (rid/kod shakli bo'lmasa — hex emas → server 400, ekranda xato) */

  /* ═══ 2) TARIX ═══ (umumiy serverda boshqa suitlar yozuv qoldirgan bo'lishi mumkin — shuning uchun faqat o'zimizning kalitlar: "UI-T-" qidiruvi) */
  /* 51 ta yozuv — 2 ta so'rov bilan (yozish chegarasi 60/daq): bitta PUT /api/narxlar da 51 xizmat = 51 tarix qatori */
  const xizmatlar = {};
  for (let i = 1; i <= 51; i++) xizmatlar['UI-T-' + String(i).padStart(2, '0')] = { nom: 'Sinov ' + i, guruh: 'raspil', qiymat: 1000 + i, birlik: 'list', kategoriya: 'Услуги Распила', manba: 'egasi' };
  const yozuvlar = [await yoz('/api/narxlar', 'PUT', { xizmatlar }), await yoz('/api/admin/katalog/SP-K-001', 'PUT', { yashirin: true })];
  R.yozuvlar = yozuvlar.every(c => c === 200);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(orgn() + '/admin/tarix'); await kut('[data-tarix-qator]');
  R.tarixYol = await M(() => location.pathname);
  await page.locator('[data-tarix="qidir"]').fill('UI-T-'); await page.waitForTimeout(1000);
  R.tarixJami = (await page.locator('[data-tarix-jami]').innerText()).includes('51');
  R.tarixSahifa50 = (await page.locator('[data-tarix-qator]').count()) === 50;
  R.tarixYana = (await page.locator('[data-tarix="yana"]').innerText()).includes('1');
  await page.locator('[data-tarix="yana"]').click(); await page.waitForTimeout(900);
  R.tarixYanaYuklandi = (await page.locator('[data-tarix-qator]').count()) === 51 && (await page.locator('[data-tarix="yana"]').count()) === 0;
  R.chiplarSon = /Narxlar · 51/.test(await page.locator('[data-tarix-suzgich="narxlar"]').innerText()) && /Modullar katalogi · 0/.test(await page.locator('[data-tarix-suzgich="katalog"]').innerText());
  await page.screenshot({ path: `${OUT}/admin3-tarix-1440.png` });
  await page.locator('[data-tarix-suzgich="narxlar"]').click(); await page.waitForTimeout(800);
  R.narxlarSuzgich = (await page.locator('[data-tarix-qator]').count()) === 50 && (await page.locator('[data-tarix-qator][data-tarix-bolim="narxlar"]').count()) === 50;
  await page.locator('[data-tarix-suzgich=""]').click(); await page.locator('[data-tarix="qidir"]').fill('UI-T-05'); await page.waitForTimeout(900);
  R.farqKorinadi = /qiymat: — → 1005/.test((await page.locator('[data-tarix-qator]').first().locator('[data-tarix-farq]').innerText()).replace(/\s+/g, ' '));
  await page.locator('[data-tarix="qidir"]').fill('UI-T-'); await page.waitForTimeout(800);
  /* kim */
  const kimOpt = await page.locator('[data-tarix="kim"] option').count();
  await page.locator('[data-tarix="kim"]').selectOption({ index: 1 }); await page.waitForTimeout(800);
  R.kimSuzgich = kimOpt >= 2 && (await page.locator('[data-tarix-jami]').innerText()).includes('51');
  await page.locator('[data-tarix="kim"]').selectOption({ index: 0 }); await page.waitForTimeout(500);
  /* sana */
  const ertaga = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10), kecha = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
  await page.locator('[data-tarix="dan"]').fill(ertaga); await page.waitForTimeout(800);
  R.sanaBosh = (await page.locator('[data-tarix-qator]').count()) === 0 && /Hech narsa topilmadi/.test(await matn());
  await page.locator('[data-tarix="dan"]').fill(kecha); await page.waitForTimeout(800);
  R.sanaOralig = (await page.locator('[data-tarix-jami]').innerText()).includes('51');
  await page.locator('[data-tarix="tozala"]').click(); await page.waitForTimeout(700);
  R.tozalandi = (await page.locator('[data-tarix="tozala"]').count()) === 0 && (await page.locator('[data-tarix="dan"]').inputValue()) === '' && (await page.locator('[data-tarix="qidir"]').inputValue()) === '';
  /* kalit qidiruvi va holat */
  await page.locator('[data-tarix="qidir"]').fill('UI-T-07'); await page.waitForTimeout(900);
  R.qidirKalit = (await page.locator('[data-tarix-qator]').count()) === 1;
  await page.locator('[data-tarix="holat"]').selectOption('qaytarilgan'); await page.waitForTimeout(800);
  R.holatBosh = (await page.locator('[data-tarix-qator]').count()) === 0;
  await page.locator('[data-tarix="holat"]').selectOption(''); await page.waitForTimeout(700);
  /* narx o'zgarishini qaytarish */
  const qid = await page.locator('[data-tarix-qator]').first().getAttribute('data-tarix-qator');
  R.narxIdN = /^n\d+$/.test(qid || '');
  await page.locator(`[data-tarix-qaytar="${qid}"]`).click();
  await tasdiq(/Qaytarish/).click(); await page.waitForTimeout(1000);
  const qp = oxirgi('POST', /narx-qaytar\/\d+$/);
  R.narxQaytarPost = !!qp && qp.p.endsWith('/' + qid.slice(1));
  R.ustamaQaytdi = (await jsonOl('/api/narxlar')).xizmatlar['UI-T-07'] === undefined && (await jsonOl('/api/narxlar')).xizmatlar['UI-T-08'].qiymat === 1008;
  R.qaytarilganBelgi = (await page.locator(`[data-tarix-qaytarilgan="${qid}"]`).count()) === 1 && (await page.locator(`[data-tarix-qaytar="${qid}"]`).count()) === 0;
  await page.locator('[data-tarix="holat"]').selectOption('qaytarilgan'); await page.waitForTimeout(800);
  R.holatQaytarilgan = (await page.locator('[data-tarix-qator]').count()) === 1;
  /* audit yozuvini qaytarish (katalog) */
  await page.locator('[data-tarix="tozala"]').click(); await page.waitForTimeout(500);
  await page.locator('[data-tarix-suzgich="katalog"]').click(); await page.waitForTimeout(800);
  const kid = await page.locator('[data-tarix-qator]').first().getAttribute('data-tarix-qator');
  await page.locator(`[data-tarix-qaytar="${kid}"]`).click(); await tasdiq(/Qaytarish/).click(); await page.waitForTimeout(1000);
  R.katalogQaytdi = !!oxirgi('POST', /\/api\/admin\/qaytar\/\d+$/) && Object.keys((await jsonOl('/api/katalog')).modullar).length === 0;
  /* sinov xizmatlarini tozalash (boshqa suitlar uchun): 50 ta yozuv bitta so'rovda */
  await yoz('/api/narxlar', 'PUT', { xizmatlar: Object.fromEntries(Object.keys(xizmatlar).map(k => [k, null])) });

  /* ═══ 3) ERP SINXRON ═══ */
  await page.goto(orgn() + '/admin/erp'); await kut('[data-erp="yuklash"]');
  R.erpYol = await M(() => location.pathname);
  R.erpBosh = /ERP qatlami bo'sh/.test(await matn()) && (await page.locator('[data-erp="sukut"]').count()) === 0 && (await page.locator('[data-erp-partiya]').count()) === 0;
  const yuklashSoni = () => sorovlar.filter(c => c.m === 'POST' && /erp\/yuklash$/.test(c.p)).length;
  await page.locator('[data-erp="fayl"]').setInputFiles({ name: 'yomon.json', mimeType: 'application/json', buffer: Buffer.from('bu json emas') }); await page.waitForTimeout(700);
  R.erpYomonFayl = /ERP fayli o'qilmadi/.test(await matn()) && yuklashSoni() === 0;
  await page.locator('[data-erp="fayl"]').setInputFiles({ name: 'notanish.json', mimeType: 'application/json', buffer: Buffer.from('{"foo": 1}') }); await page.waitForTimeout(700);
  R.erpTanilmadi = /Fayl tanilmadi/.test(await matn()) && yuklashSoni() === 0;
  /* ERP eksporti: katalogdan (noyob nomli) bir nechta yozuv; narxlar o'zgartirilgan; ortiqcha maydonlar (rasm havolasi) ham bor */
  const eksport = await M(async () => {
    const nk = (x) => String(x || '').replace(/^\s*[\d\-.]+\s+/, '').toLowerCase().replace(/ё/g, 'е').replace(/[^0-9a-zа-я]+/g, '');
    const sh = (await fetch('/data/sheet-catalog.json').then(r => r.json())).sheets, fc = (await fetch('/data/furnitura-catalog.json').then(r => r.json())).items.filter(i => i.id);
    const san = new Map(); for (const x of [...sh, ...fc]) san.set(nk(x.name), (san.get(nk(x.name)) || 0) + 1);
    const yo = (a) => a.filter(x => nk(x.name) && san.get(nk(x.name)) === 1);
    const S = yo(sh).filter(x => x.uzs > 0), Z = yo(sh).filter(x => !(x.uzs > 0)), F = yo(fc).filter(x => x.uzs > 0 && !x.no_price);
    const m = (it, narx, o = {}) => ({ id: 900000 + Math.floor(Math.random() * 90000), sku: it.sku, name: it.name, category_name: 'Sinov', unit: 'шт', display_price_uzs: narx, price_list_uzs: narx + 5000, qoldiq: 1, main_image: 'https://x.invalid/a.webp', main_thumbnail: 'https://x.invalid/t.webp', ...o });
    const kutilgan = { s1: S[0], s2: S[1], s3: S[2], z1: Z[0], f1: F[0], f2: F[1] };
    const json = { _meta: { manba: "mebelcity ERP /api/v2/products/ (faqat o'qish, GET)", sana: '2026-10-20 09:00' }, mahsulotlar: [m(S[0], S[0].uzs + 10000), m(S[1], S[1].uzs + 20000), m(S[2], S[2].uzs), m(Z[0], 250000), m(F[0], F[0].uzs + 500), m(F[1], F[1].uzs + 700),
      { id: 1, sku: 'YANGI-X', name: 'ERP da bor, katalogda yo\'q mahsulot', unit: 'шт', display_price_uzs: 1000 }] };
    return { matn: JSON.stringify(json), s1: { sku: S[0].sku, uzs: S[0].uzs, nom: S[0].name }, s2: { uzs: S[1].uzs, nom: S[1].name }, z1: { nom: Z[0].name }, f1: { id: F[0].id, uzs: F[0].uzs }, f2: { id: F[1].id, uzs: F[1].uzs }, jami: { sh: sh.length, fc: fc.length } };
  });
  await page.locator('[data-erp="fayl"]').setInputFiles({ name: 'erp-sinov.json', mimeType: 'application/json', buffer: Buffer.from(eksport.matn) });
  R.erpBatafsil = await kut('[data-erp="batafsil"]');
  const yp = oxirgi('POST', /erp\/yuklash$/), yb = yp && JSON.parse(yp.body);
  R.erpYuklashTana = !!yb && yb.tur === 'mahsulot' && yb.fayl_nom === 'erp-sinov.json' && yb.json.mahsulotlar.length === 7 && !('main_image' in yb.json.mahsulotlar[0]) && yb.json._meta.sana.startsWith('2026-10-20');
  R.erpChiplar = /O'zgardi · 2/.test(await page.locator('[data-erp-chip="plita:ozgardi"]').innerText()) && /Narx qo'yiladi · 1/.test(await page.locator('[data-erp-chip="plita:toldirildi"]').innerText())
    && /Bir xil · 1/.test(await page.locator('[data-erp-chip="plita:bir_xil"]').innerText()) && /O'zgardi · 2/.test(await page.locator('[data-erp-chip="furnitura:ozgardi"]').innerText()) && /Yangi · 1/.test(await page.locator('[data-erp-chip="yangi:yangi"]').innerText());
  R.erpYoqXabar = await kut('[data-erp="yoq"]');
  R.erpHolat = (await page.locator('[data-erp="holat"]').innerText()).includes('Qoralama');
  R.erpHechNarsaYoq = await (async () => { const e = await jsonOl('/api/erp-narx'); return JSON.stringify({ plita: e.plita, furnitura: e.furnitura, sana: e.sana }) === JSON.stringify({ plita: {}, furnitura: {}, sana: '' }); })();   // TZ-44: javobga versiya/jonli qo'shildi
  await page.screenshot({ path: `${OUT}/admin3-erp-1440.png`, fullPage: true });
  /* filtr va qidiruv */
  await page.locator('[data-erp-chip="plita:ozgardi"]').click(); await page.waitForTimeout(800);
  R.erpFiltr = (await page.locator('[data-erp-qator]').count()) === 2 && (await page.locator('[data-erp-qator][data-erp-holat="ozgardi"]').count()) === 2;
  await page.locator('[data-erp="qidir"]').fill(eksport.s2.nom.slice(0, 18)); await page.waitForTimeout(900);
  R.erpQidiruv = (await page.locator('[data-erp-qator]').count()) >= 1 && (await page.locator('[data-erp-qator]').count()) < 3;
  await page.locator('[data-erp="tozala"]').click(); await page.waitForTimeout(700);
  R.erpTozala = (await page.locator('[data-erp-qator]').count()) >= 7;
  /* qatorni belgidan olish va qo'llash */
  const soni0 = Number((/\((\d+)\)/.exec(await page.locator('[data-erp="qollash"]').innerText()) || [])[1]);
  R.erpQollashSoni0 = soni0 === 2 + 1 + 2;
  const s2k = await page.locator('[data-erp-qator^="plita:"]', { hasText: eksport.s2.nom }).first().locator('input[data-erp-tanla]').getAttribute('data-erp-tanla');
  await page.locator(`[data-erp-tanla="${s2k}"]`).uncheck(); await page.waitForTimeout(300);
  R.erpBelgiOlindi = Number((/\((\d+)\)/.exec(await page.locator('[data-erp="qollash"]').innerText()) || [])[1]) === soni0 - 1;
  await page.locator('[data-erp="qollash"]').click(); await page.waitForTimeout(300);
  R.erpTasdiqMatn = /5 ta narx|4 ta narx/.test(await matn()) && /ERP'ga hech narsa yozilmaydi/.test(await matn());
  await page.screenshot({ path: `${OUT}/admin3-erp-tasdiq-1440.png` });
  await tasdiq(/Qo'llash/).click(); await page.waitForTimeout(1500);
  const qb = oxirgi('POST', /erp\/\d+\/qollash$/), qbj = qb && JSON.parse(qb.body);
  R.erpQollashPost = !!qbj && qbj.tasdiq === true && qbj.istisno.length === 1 && qbj.istisno[0] === s2k && qbj.guruhlar.length === 3 && qbj.yangi_xizmat === false;
  R.erpQollandiHolat = (await page.locator('[data-erp="holat"]').innerText()).includes("Qo'llangan") && (await page.locator('[data-erp="qollash-blok"]').count()) === 0 && await kut('[data-erp="qollangan"]');
  const L = await jsonOl('/api/erp-narx');
  R.erpQatlam = Object.keys(L.plita).length === 2 && Object.keys(L.furnitura).length === 2 && L.furnitura[eksport.f1.id] === eksport.f1.uzs + 500 && L.sana === '2026-10-20';
  R.erpQatlamKarta = /Plita: 2 · Furnitura: 2/.test(await page.locator('[data-erp="qatlam-son"]').innerText()) && (await page.locator('[data-erp="sukut"]').count()) === 1;
  R.erpRoyxat = (await page.locator('[data-erp-p-holat="qollandi"]').count()) === 1;
  /* ilovada ta'sir (sahifa qayta ochilganda) */
  await page.goto(orgn() + '/loyiha/yangi?t=' + Date.now()); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.H)); i++) await page.waitForTimeout(250);
  R.erpIlovada = await M((a) => {
    const h = window.__app.H;
    return h.furnById[a.f1.id].uzs === a.f1.uzs + 500 && h.furnById[a.f2.id].uzs === a.f2.uzs + 700 && h.sheetCatalog.sheets.some(s => s.name === a.s1.nom && s.uzs === a.s1.uzs + 10000) && h.sheetCatalog.sheets.some(s => s.name === a.s2.nom && s.uzs === a.s2.uzs);
  }, eksport);
  /* Tarix'dan qaytarish */
  await page.goto(orgn() + '/admin/tarix'); await kut('[data-tarix-qator]');
  await page.locator('[data-tarix-suzgich="erp"]').click(); await page.waitForTimeout(800);
  R.erpTarixda = (await page.locator('[data-tarix-qator]').count()) === 1 && /partiya:/.test(await page.locator('[data-tarix-qator]').first().innerText());
  const eid = await page.locator('[data-tarix-qator]').first().getAttribute('data-tarix-qator');
  await page.locator(`[data-tarix-qaytar="${eid}"]`).click(); await tasdiq(/Qaytarish/).click(); await page.waitForTimeout(1200);
  const L2 = await jsonOl('/api/erp-narx');
  R.erpQaytarildi = Object.keys(L2.plita).length === 0 && Object.keys(L2.furnitura).length === 0;
  /* qayta yuklab qo'llash va sukutga qaytarish */
  await page.goto(orgn() + '/admin/erp'); await kut('[data-erp="yuklash"]');
  await page.locator('[data-erp-ochish]').first().click().catch(() => {});
  await page.locator('[data-erp="fayl"]').setInputFiles({ name: 'erp-sinov.json', mimeType: 'application/json', buffer: Buffer.from(eksport.matn) }); await kut('[data-erp="qollash"]');
  await page.locator('[data-erp="qollash"]').click(); await tasdiq(/Qo'llash/).click(); await page.waitForTimeout(1200);
  R.erpQayta = Object.keys((await jsonOl('/api/erp-narx')).plita).length === 3;
  await page.locator('[data-erp="sukut"]').click(); await tasdiq(/Sukutga qaytarish/).click(); await page.waitForTimeout(1200);
  R.erpSukut = !!oxirgi('POST', /erp\/sukut$/) && Object.keys((await jsonOl('/api/erp-narx')).plita).length === 0 && /ERP qatlami bo'sh/.test(await matn());
  /* xizmatlar fayli */
  const xs = await M(async () => {
    const sk = (await fetch('/data/materials.json').then(r => r.json())).sukut_narx.xizmatlar, kod = '7802360156';
    return JSON.stringify({ _meta: { sana: '2026-10-20' }, xizmatlar: [{ id: 1, name: sk[kod].nom, code: kod, category_name: sk[kod].kategoriya, client_price: sk[kod].qiymat + 2000, is_active: true, extra: 'tashlanadi' },
      { id: 2, name: 'Yangi xizmat', code: 'UI-NEW', category_name: 'Услуги Распила', client_price: 30000, is_active: true }] });
  });
  await page.locator('[data-erp="fayl"]').setInputFiles({ name: 'erp-xizmatlar.json', mimeType: 'application/json', buffer: Buffer.from(xs) }); await kut('[data-erp-guruh="xizmat"]');
  const xb = JSON.parse(oxirgi('POST', /erp\/yuklash$/).body);
  R.erpXizmatTur = xb.tur === 'xizmat' && !('extra' in xb.json.xizmatlar[0]);
  R.erpXizmatChip = /O'zgardi · 1/.test(await page.locator('[data-erp-chip="xizmat:ozgardi"]').innerText()) && /Yangi · 1/.test(await page.locator('[data-erp-chip="xizmat:yangi"]').innerText()) && await kut('[data-erp="yangi-xizmat"]');
  await page.locator('[data-erp="qollash"]').click(); await tasdiq(/Qo'llash/).click(); await page.waitForTimeout(1200);
  const nh = await jsonOl('/api/narxlar');
  R.erpXizmatQollandi = nh.xizmatlar['7802360156'].qiymat === 45000 && nh.xizmatlar['UI-NEW'] === undefined;
  await page.goto(orgn() + '/admin/tarix'); await kut('[data-tarix-qator]');
  await page.locator('[data-tarix="qidir"]').fill('7802360156'); await page.waitForTimeout(900);
  R.erpXizmatTarix = (await page.locator('[data-tarix-qator][data-tarix-bolim="narxlar"]').count()) === 1;
  await page.locator('[data-tarix-qaytar]').first().click(); await tasdiq(/Qaytarish/).click(); await page.waitForTimeout(1000);
  R.erpXizmatQaytdi = (await jsonOl('/api/narxlar')).xizmatlar['7802360156'].qiymat === 43000;

  /* ═══ UCH TIL va 390 px ═══ */
  for (const [til, sarlavha, tab, ai, kim, erpS] of [['ru', 'Состояние системы', 'Система', 'ИИ (Claude)', 'Кто', 'Синхронизация с ERP'], ['en', 'System status', 'System', 'AI (Claude)', 'Who', 'ERP sync'], ['uz', 'Tizim holati', 'Tizim', 'AI (Claude)', 'Kim', 'ERP sinxronlash']]) {
    await M((t) => localStorage.setItem('s3d-til', t), til);
    await page.goto(orgn() + '/admin/tizim'); await kut('[data-tz="ai"]');
    const m = await matn();
    R['til_' + til] = m.includes(sarlavha) && m.includes(tab) && m.includes(ai);
    await page.goto(orgn() + '/admin/tarix'); await kut('[data-tarix-qator]');
    R['tilTarix_' + til] = (await matn()).includes(kim) && (await page.locator('[data-tarix-suzgich="narxlar"]').count()) === 1;
    await page.goto(orgn() + '/admin/erp'); await kut('[data-erp="yuklash"]');
    R['tilErp_' + til] = (await matn()).includes(erpS);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(orgn() + '/admin/tizim'); await kut('[data-tz="zaxira"]'); await page.waitForTimeout(800);
  R.skroll390 = { tizim: await skroll0() };
  await page.screenshot({ path: `${OUT}/admin3-tizim-390.png`, fullPage: true });
  await page.goto(orgn() + '/admin/tarix'); await kut('[data-tarix-qator]'); await page.waitForTimeout(700);
  R.skroll390.tarix = await skroll0();
  await page.screenshot({ path: `${OUT}/admin3-tarix-390.png` });
  await page.goto(orgn() + '/admin/erp'); await kut('[data-erp="yuklash"]');
  await page.locator('[data-erp="fayl"]').setInputFiles({ name: 'erp-sinov.json', mimeType: 'application/json', buffer: Buffer.from(eksport.matn) }); await kut('[data-erp="batafsil"]'); await page.waitForTimeout(900);
  R.skroll390.erp = await skroll0();
  await page.screenshot({ path: `${OUT}/admin3-erp-390.png`, fullPage: true });

  R.xatolar = errs.length;
  const kutilgan = ['yangiTablar', 'tizimKarta', 'aiOchiq', 'kalitYoq', 'smsSozlanmagan', 'googleSozlanmagan', 'telegramSozlangan', 'zaxiraYoq', 'sarfKarta', 'maxfiyYoq',
    'jurnalKorinadi', 'topKorinadi', 'qidirKod', 'qidirRidYoq', 'yangilaIshlaydi', 'til_ru', 'til_en', 'til_uz', 'tilTarix_ru', 'tilTarix_en', 'tilTarix_uz', 'tilErp_ru', 'tilErp_en', 'tilErp_uz',
    'yozuvlar', 'tarixJami', 'tarixSahifa50', 'tarixYana', 'tarixYanaYuklandi', 'chiplarSon', 'narxlarSuzgich', 'farqKorinadi', 'kimSuzgich', 'sanaBosh', 'sanaOralig', 'tozalandi', 'qidirKalit',
    'holatBosh', 'narxIdN', 'narxQaytarPost', 'ustamaQaytdi', 'qaytarilganBelgi', 'holatQaytarilgan', 'katalogQaytdi',
    'erpBosh', 'erpYomonFayl', 'erpTanilmadi', 'erpBatafsil', 'erpYuklashTana', 'erpChiplar', 'erpYoqXabar', 'erpHolat', 'erpHechNarsaYoq', 'erpFiltr', 'erpQidiruv', 'erpTozala', 'erpQollashSoni0', 'erpBelgiOlindi',
    'erpTasdiqMatn', 'erpQollashPost', 'erpQollandiHolat', 'erpQatlam', 'erpQatlamKarta', 'erpRoyxat', 'erpIlovada', 'erpTarixda', 'erpQaytarildi', 'erpQayta', 'erpSukut', 'erpXizmatTur', 'erpXizmatChip',
    'erpXizmatQollandi', 'erpXizmatTarix', 'erpXizmatQaytdi'];
  R.yiqilgan = kutilgan.filter(k => !R[k]);
  R.ok = !R.yiqilgan.length && R.tablar === 10 && R.erpYol === '/admin/erp' && R.tizimYol === '/admin/tizim' && R.tarixYol === '/admin/tarix' && Object.values(R.skroll390).every(Boolean) && !errs.length;
}
