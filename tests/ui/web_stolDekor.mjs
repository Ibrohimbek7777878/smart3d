/* TZ-32 yakuniy (egasi #222 Q1): material varag'ida "Stoleshnitsa" qismi — ERP stoleshnitsa dekorlari (har biri o'z narxi bilan).
 * Tekshiriladi: ro'yxat (26 va 38 mm bo'limlari, narx), dekor tanlansa doc.kitchen.stolErp/stolT o'zgaradi, narx qatori shu dekor ERP narxida
 * (sukutdan farq qiladi), xato yo'q. Ishlatish: bash tests/ui/web.sh stolDekor */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/stolDekor-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const V = (sel) => page.locator('[data-varaq="material"] ' + sel);
  const stolQator = () => M(() => { const l = window.__app.res.prod.lines.find(x => x.group === 'Stoleshnitsa'); return l ? { code: l.code, name: l.name, narx: l.unit_price, manba: l.manba, tasdiq: l.tasdiq } : null; });

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Stol Dekor'); await fill('jasur@', 'stoldekor' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);
  for (let i = 0; i < 2; i++) {
    await page.locator('input[placeholder*="shkaf 2 eshik"]').fill('MC-KP-02'); await page.waitForTimeout(500);
    await page.locator('[data-panel] button.h5').first().click(); await page.waitForTimeout(1200);
  }
  await M(() => { const d = window.__app.doc; d.kitchen = Object.assign(d.kitchen || {}, { stoleshnitsa: true }); });
  await page.locator('[data-panel] button', { hasText: 'Korpus' }).first().click(); await page.waitForTimeout(500);
  await V('[data-material-qism] button').filter({ hasText: /^Stoleshnitsa$/ }).first().click(); await page.waitForTimeout(600);
  R.bolimlar = await M(() => [...document.querySelectorAll('[data-varaq="material"] [data-material-bolim]')].map(b => b.dataset.materialBolim));
  R.plitkalar = await M(() => document.querySelectorAll('[data-varaq="material"] [data-material-plitka]').length);
  R.narxMatn = await M(() => { const p = document.querySelector('[data-varaq="material"] [data-material-plitka]'); return p ? p.innerText.replace(/\s+/g, ' ') : ''; });
  /* 38 mm: ro'yxatni 38 ga cheklab, Kedr dekorini tanlash */
  await V('[data-material-filtr-panel] button').filter({ hasText: /^38 mm$/ }).first().click(); await page.waitForTimeout(500);
  await V('[data-material-qidiruv]').fill('Брекчия светлая'); await page.waitForTimeout(500);
  R.topildi = await M(() => document.querySelectorAll('[data-varaq="material"] [data-material-plitka]').length);
  await V('[data-material-plitka] > button').first().click(); await page.waitForTimeout(1500);
  R.kitchen = await M(() => ({ t: window.__app.doc.kitchen.stolT, id: window.__app.doc.kitchen.stolErp }));
  R.keyin = await stolQator();
  R.kutilgan = await M(() => { const d = window.__app.H.stolErp.items.find(x => x.erp_id === window.__app.doc.kitchen.stolErp); return Math.round(d.narx_m2 * 3050 * 600 / 1e6); });   // ERP m² narxi × 3050×600
  R.xatolar = errs;
  R.ok = R.bolimlar.includes('26') && R.bolimlar.includes('38') && R.plitkalar >= 20 && /×600 · [\d\s]+so'm/.test(R.narxMatn)
    && R.topildi >= 1 && R.kitchen.t === 38 && R.kitchen.id > 0 && R.keyin && /Брекчия светлая/.test(R.keyin.name) && R.keyin.code.startsWith('STOL38-') && R.keyin.narx > 0 && R.keyin.manba === 'ERP'
    && R.keyin.narx === R.kutilgan && errs.length === 0;
}
