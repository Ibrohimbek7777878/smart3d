/* Ko'plik shakli (i18n/kopl.js): oshxona namunasida narxi yo'q 1 ta qator bor — "1 items have no price" / "у 1 позиций нет цены" emas, to'g'ri shakl.
 * Sarlavhadagi izoh va Narx qadamidagi "Narx aniqligi" tugmasi, uz/ru/en; til almashtirilganda sahifa qayta yuklanmaydi (loyiha saqlanadi).
 * Ishlatish: bash tests/ui/web.sh koplik */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/koplik-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT, errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { await page.locator(`input[placeholder*="${ph}"]`).first().fill(v); };
  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Koplik Usta'); await fill('jasur@', 'koplik' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }
  await fill('kamida 8', 'parol12345'); await click(/^Ro'yxatdan o'tish$/);
  await page.locator('[data-ishjoyi]').waitFor({ timeout: 20000 });
  await page.locator('[data-tez="kitchen"]').click();
  for (let i = 0; i < 80 && !(await M(() => window.__app && window.__app.state.sceneOn && window.__app.res)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1200);
  R.prod = await M(() => { const p = window.__app.res.prod; return { pct: p.aniqlik.pct, narxsiz: p.aniqlik.narxsiz }; });
  await page.locator('header [data-sarl="narx"]').click(); await page.waitForTimeout(800);       // Narx qadami (aniqlik tugmasi)
  const til = async (kod) => {
    await page.locator('header [data-til-menyu]').click(); await page.waitForTimeout(200);
    await page.locator(`[role=menuitemradio][lang=${kod}]`).click(); await page.waitForTimeout(500);
  };
  const oqi = () => M(() => ({
    izoh: (document.querySelector('header') || { innerText: '' }).innerText.replace(/\s+/g, ' '),
    tugma: ((document.querySelector('[data-aniqlik]') || {}).innerText || '').replace(/\s+/g, ' ').trim()
  }));
  R.uz = await oqi();
  await til('ru'); R.ru = await oqi();
  await page.screenshot({ path: `${OUT}/koplik-ru-1440.png`, clip: { x: 0, y: 0, width: 1440, height: 80 } });
  await til('en'); R.en = await oqi();
  await page.screenshot({ path: `${OUT}/koplik-en-1440.png`, clip: { x: 0, y: 0, width: 1440, height: 80 } });
  await til('uz');
  R.xatolar = errs;
  R.ok = R.prod.narxsiz === 1 && R.prod.pct > 0 && R.prod.pct < 100
    && R.uz.izoh.includes(`Narx aniqligi ${R.prod.pct}% · 1 qatorning narxi yo'q`) && R.uz.tugma.includes(`Narx aniqligi ${R.prod.pct}% · 1 qatorning narxi yo'q`)
    && R.ru.izoh.includes(`Точность цены ${R.prod.pct}% · у 1 позиции нет цены`) && R.ru.tugma.includes(`у 1 позиции нет цены`) && !/1 позиций/.test(R.ru.izoh + R.ru.tugma)
    && R.en.izoh.includes(`Price accuracy ${R.prod.pct}% · 1 item has no price`) && R.en.tugma.includes(`1 item has no price`) && !/1 items/.test(R.en.izoh + R.en.tugma)
    && errs.length === 0;
}
