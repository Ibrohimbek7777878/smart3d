/* TZ-09 8-bosqich (2): saqlash belgisi, mijoz ismi → server va kartada, prisadka (S3), loyihani o'chirish, fayldan ochish.
 * Ishlatish: bash tests/ui/web.sh qolgan */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/qolgan-xato.png` }).catch(() => {});
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

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Qolgan Usta'); await fill('jasur@', 'qolgan' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await waitText('Nima yasaymiz');
  await click(/^Oshxona$/); await page.waitForTimeout(400); await click(/Muharrirni ochish/);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.res)); i++) await page.waitForTimeout(250);

  /* 1) avtomatik saqlash — belgi (ikon, data-save="ok") */
  R.saqlandi = await (async () => { for (let i = 0; i < 40; i++) { if (await M(() => !!document.querySelector('[data-save="ok"]'))) return true; await page.waitForTimeout(200); } return false; })();
  await page.screenshot({ path: `${OUT}/qolgan-1440-header.png`, clip: { x: 0, y: 0, width: 1440, height: 70 } });

  /* 2) mijoz ismi (Narx) + prisadka */
  await click(/^Narx$/); await page.waitForTimeout(600);
  await page.locator('input[placeholder="Mijoz ismi"]').fill('Aziza Karimova');
  const hole0 = await M(() => window.__app.res.prod.holeCost);
  await page.locator('[data-xizmat] button').click(); await page.waitForTimeout(1000);
  R.prisadka = { oldin: hole0, keyin: await M(() => window.__app.res.prod.holeCost), tanlandi: await M(() => !!(window.__app.doc.xizmatlar || {}).teshik) };
  await page.screenshot({ path: `${OUT}/qolgan-1440-narx.png` });
  await page.waitForTimeout(3000);                                     // avtomatik saqlash (2 s)

  /* 3) Loyihalarim — kartada mijoz, modul soni; fayldan ochish; o'chirish */
  await click(/^Loyihalar$/); await waitText('Loyihalarim');
  await page.waitForTimeout(1200);
  R.karta = await M(() => document.body.innerText.includes('Aziza Karimova'));
  await page.screenshot({ path: `${OUT}/qolgan-1440-loyihalar.png` });
  const fayl = await M(() => JSON.stringify(window.__app.projectPayload()));
  await page.locator('input[type=file][accept*="json"]').setInputFiles({ name: 'smart3d-project.json', mimeType: 'application/json', buffer: Buffer.from(fayl) });
  R.fayldan = await waitText('Loyiha fayldan ochildi', 6000);
  R.fayldanMebel = await M(() => window.__app.doc.placements.length);
  await page.waitForTimeout(3000);                                     // yangi loyiha bo'lib saqlanadi
  const ikki = async () => M(async () => (await (await fetch('/api/projects')).json()).length);   // cookie sessiya (TZ-19 X2)
  R.serverdaLoyiha = await ikki();
  await click(/^Loyihalar$/); await page.waitForTimeout(1200);
  await page.locator('button[aria-label^="Loyihani o\'chirish"]').first().click(); await page.waitForTimeout(300);
  await click(/^O'chirish$/); await page.waitForTimeout(1500);
  R.ochirilgandan = await ikki();

  R.errs = errs;
  R.ok = R.saqlandi && R.prisadka.tanlandi && R.prisadka.keyin > R.prisadka.oldin && R.karta && R.fayldan && R.fayldanMebel > 0 &&
    R.serverdaLoyiha === 2 && R.ochirilgandan === 1 && errs.length === 0;
}
