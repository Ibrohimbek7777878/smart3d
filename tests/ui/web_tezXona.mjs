/* Egasi #245: bo'sh ish joyida tez boshlash tugmalari — Oshxona, Yotoqxona, Mehmonxona, Garderob; tugma bosilsa tayyor xona matni
 * qatorga yoziladi va butun xona katalog modullaridan quriladi. "Modul chizish" panelida "butun xona kerakmi" izohi turadi.
 * Ishlatish: bash tests/ui/web.sh tezXona */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/tezXona-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { await page.locator(`input[placeholder*="${ph}"]`).first().fill(v); };

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Tez Usta'); await fill('jasur@', 'tezxona' + Date.now() + '@test.uz');
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/);
  await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(800);

  /* 1) bo'sh loyihada tugmalar bor */
  R.tugmalar = await M(() => ['kitchen', 'yotoqxona', 'mehmonxona', 'garderob'].map(k => !!document.querySelector(`[data-tez="${k}"]`)));
  await page.screenshot({ path: `${OUT}/tezXona-1440-bosh.png` });

  /* 2) "Yotoqxona" — butun xona katalog modullaridan */
  await page.locator('[data-tez="yotoqxona"]').click();
  for (let i = 0; i < 40 && !(await M(() => window.__app.doc.placements.length)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(600);
  R.yotoqxona = await M(() => {
    const p = window.__app.doc.placements, H = window.__app.H;
    return { soni: p.length, katalogdaYoq: p.filter(x => !(H && H.catalog && H.catalog[x.frg])).length };
  });
  R.tugmalarKeyin = await M(() => !document.querySelector('[data-tez="yotoqxona"]'));   // loyiha bo'sh emas — tez tugmalar yo'qoladi
  await page.screenshot({ path: `${OUT}/tezXona-1440-yotoqxona.png` });

  /* 3) "Modul chizish" panelida izoh (avval AI izoh varag'i yopiladi — Esc) */
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await page.locator('[data-asbob="chizish"]').first().click().catch(async () => { await click(/Modul chizish/); });
  await page.waitForTimeout(700);
  R.izoh = await M(() => !!document.querySelector('[data-butun-xona]') && document.querySelector('[data-butun-xona]').innerText.length > 10);
  await page.screenshot({ path: `${OUT}/tezXona-1440-izoh.png` });

  R.xatolar = errs.length;
  R.ok = R.tugmalar.every(Boolean) && R.yotoqxona.soni >= 2 && R.yotoqxona.katalogdaYoq === 0 && R.tugmalarKeyin && R.izoh && !errs.length;
}
