/* TZ-42 (2026-10-22): Bazis materiali → ERP plitasi (nomzodlar) va "Mijoz materiali" belgisi — haqiqiy brauzerda.
 *   1) sun'iy .bpj (Satin "ЛДСП, Сатин 4,6кв", ikkita 2600 mm planka) yuklanadi: noaniq nom — avtomatik almashtirilmaydi, hisobot varag'ida
 *      "ERP: 2 ta mos plita" izohi bor
 *   2) "Almashtirish" → material oynasida nomzodlar bo'limi (2 plitka, narxi ERP'dan); biri tanlansa — narx manbasi "ERP"
 *   3) "Mijoz materiali" belgisi: plita narxga kirmaydi (tannarx kamayadi), kesim o'zgarmaydi; belgi olinsa narx qaytadi
 *   4) Narx qadamida qator "mijoz materiali" deb yoziladi; varaqqa sig'magan planka — alohida "taxminiy" qator
 *   5) loyiha saqlanib qayta ochilganda belgi va almashtirish tiklanadi; telefonda (390 px) gorizontal aylantirish yo'q
 * Ishlatish: bash tests/ui/web.sh narxMoslash */

export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/narxMoslash-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const txt = () => M(() => document.body.innerText);
  const has = async (t) => (await txt()).includes(t);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const waitText = async (t, ms = 10000) => { for (let i = 0; i < ms / 200; i++) { if (await has(t)) return true; await page.waitForTimeout(200); } return false; };
  const hisob = async () => { for (let i = 0; i < 40; i++) { await page.waitForTimeout(250); const r = await M(() => window.__app.res && window.__app.res.prod && window.__app.res.priceRes); if (r) break; } await page.waitForTimeout(500); };
  const snap = () => M(() => {
    const p = window.__app.res.prod, bm = Object.keys(window.__app.res.nest.by_material);
    const pl = p.lines.filter(l => /^Plita/.test(l.group));
    return { sheetCost: p.sheetCost, tannarx: p.totalCost, mijozNarxi: p.clientTotal, aniqlik: p.aniqlik.pct, mijoz: p.mijoz, sigmadi: p.sigmadi.length,
      plita: pl.map(l => ({ code: l.code, manba: l.manba, narx: l.unit_price, summa: l.amount, mijoz: !!l.mijoz, sigmadi: !!l.sigmadi, nom: l.name })),
      varaq: bm.map(k => window.__app.res.nest.by_material[k].sheet_count).join(','), mijozMat: window.__app.doc.mijozMat || null,
      almash: (window.__app.doc.bazis && window.__app.doc.bazis.almash) || null };
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Moslash Usta'); await fill('jasur@', 'moslash' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.res)); i++) await page.waitForTimeout(250);
  await page.locator('[data-sarlavha="loyihalar"]').click(); await waitText('Loyihalarim');

  /* 1) sun'iy .bpj: 6 ta oddiy detal + 2 ta 2600 mm planka, hammasi bitta Satin materialda */
  const SAT = 'ЛДСП, Сатин 4,6кв';
  const det = (i, nom, dl, dw) => ({ id: i + 1, name: nom, dimensions: { dl, dw, dp: 16 }, material: { name: SAT },
    contour: { outer: [[0, 0, dl, 0], [dl, 0, dl, dw], [dl, dw, 0, dw], [0, dw, 0, 0]].map(([x1, y1, x2, y2]) => ({ type: 'line', x1, y1, x2, y2 })) },
    butts: [{ elemIndex: 2, material: 'Кромка 19/1', thickness: 1 }],
    transform: { origin: { x: i * 40, y: 0, z: 0 }, axisX: { x: 1, y: 0, z: 0 }, axisY: { x: 0, y: 1, z: 0 }, axisZ: { x: 0, y: 0, z: 1 } } });
  const bpj = { version: '4.2', script: 'BazisUniversalExport', objects: [0, 1, 2, 3, 4, 5].map(i => det(i, 'bok', 700, 450)).concat([6, 7].map(i => det(i, 'planka', 2600, 300))), furnitures: [] };
  await page.locator('label[data-bazis-yukla] input[type=file]').setInputFiles({ name: 'satin.bpj', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bpj)) });
  for (let i = 0; i < 60 && !(await M(() => !!document.querySelector('[data-varaq="bazis"]'))); i++) await page.waitForTimeout(250);
  R.hisobotMatn = await M(() => (document.querySelector('[data-bazis-material="0"]') || {}).innerText || '');
  R.almashBoshida = await M(() => (window.__app.doc.bazis && window.__app.doc.bazis.almash) || null);
  await page.screenshot({ path: `${OUT}/narxMoslash-1440-hisobot.png` });
  await hisob();
  R.oldin = await snap();

  /* 2) "Almashtirish" → nomzodlar */
  await page.locator('[data-bazis-material="0"] button').click(); await page.waitForTimeout(600);
  R.nomzod = await M(() => { const s = document.querySelector('[data-material-nomzod]'); return s ? { n: s.querySelectorAll('[data-material-plitka]').length, matn: s.innerText } : null; });
  await page.screenshot({ path: `${OUT}/narxMoslash-1440-nomzod.png` });
  await page.locator('[data-material-nomzod] [data-material-plitka] button').first().click(); await hisob();
  R.erp = await snap();
  R.mijozTugma0 = await M(() => { const b = document.querySelector('[data-material-mijoz]'); return b ? b.getAttribute('aria-pressed') : null; });

  /* 3) mijoz materiali */
  await page.locator('[data-material-mijoz]').click(); await hisob();
  R.mijoz = await snap();
  R.mijozTugma1 = await M(() => document.querySelector('[data-material-mijoz]').getAttribute('aria-pressed'));
  await page.screenshot({ path: `${OUT}/narxMoslash-1440-mijoz.png` });
  await page.locator('[data-varaq="material"] button[aria-label="Yopish"]').click(); await page.waitForTimeout(400);

  /* 4) Narx qadami: qator "mijoz materiali", sig'magan planka — taxminiy qator */
  await click(/^Narx$/); await page.waitForTimeout(1500);
  R.narxMatn = await txt();
  await page.screenshot({ path: `${OUT}/narxMoslash-1440-narx.png` });

  /* 5) saqlash va qayta ochish */
  await page.waitForTimeout(3500);
  await page.locator('[data-sarlavha="loyihalar"]').click(); await page.waitForTimeout(1500);
  await page.locator('main button.h2').first().click(); await page.waitForTimeout(2500);
  for (let i = 0; i < 30 && !(await M(() => window.__app.res && window.__app.res.priceRes)); i++) await page.waitForTimeout(250);
  await hisob();
  R.qayta = await snap();

  /* belgini olish — narx qaytadi (material oynasi orqali) */
  await click(/^Mebel$/); await page.waitForTimeout(500);
  await page.locator('button[data-bazis-hisobot]').first().click(); await page.waitForTimeout(500);
  await page.locator('[data-bazis-material="0"] button').click(); await page.waitForTimeout(600);
  await page.locator('[data-material-mijoz]').click(); await hisob();
  R.olindi = await snap();
  await page.locator('[data-varaq="material"] button[aria-label="Yopish"]').click(); await page.waitForTimeout(300);

  /* telefon */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
  await M(() => window.scrollTo(0, 0));
  R.hScroll = await M(() => document.documentElement.scrollWidth > innerWidth + 1);
  await page.screenshot({ path: `${OUT}/narxMoslash-390.png` });

  R.errs = errs;
  const pl = (s) => s.plita.filter(l => !l.sigmadi)[0], sg = (s) => s.plita.find(l => l.sigmadi);
  R.ok = /2 ta mos plita/.test(R.hisobotMatn) && !R.almashBoshida && R.oldin.plita[0].manba === 'taxmin'
    && R.nomzod && R.nomzod.n === 2 && /7045/.test(R.nomzod.matn) && R.nomzod.matn.includes('so\'m')
    && R.erp.almash && Object.values(R.erp.almash).every(v => /^ERP-/.test(v)) && pl(R.erp).manba === 'ERP' && pl(R.erp).narx > 0 && R.erp.aniqlik > R.oldin.aniqlik
    && R.mijozTugma0 === 'false' && R.mijozTugma1 === 'true'
    && R.mijoz.sheetCost === 0 && R.mijoz.mijoz.length === 1 && R.mijoz.plita.every(l => l.mijoz && l.summa === 0) && R.mijoz.tannarx < R.erp.tannarx && R.mijoz.mijozNarxi < R.erp.mijozNarxi && R.mijoz.varaq === R.erp.varaq
    && /mijoz materiali/i.test(R.narxMatn) && /sig'madi/.test(R.narxMatn) && sg(R.erp) && sg(R.erp).manba === 'taxmin'
    && R.qayta.mijozMat && R.qayta.almash && R.qayta.sheetCost === 0 && R.qayta.tannarx === R.mijoz.tannarx
    && R.olindi.sheetCost > 0 && R.olindi.tannarx === R.erp.tannarx && !R.olindi.mijozMat && !R.hScroll && errs.length === 0;
}
