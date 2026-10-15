/* TZ-09 9-bosqich: WebGL'siz qurilma (eski telefon, o'chirilgan GPU) — 3D o'rniga tushunarli xabar (S3D-SCENE-101),
 * qolgan hammasi ishlaydi: hisob, qadamlar, fayllar; sayt (landing) — SVG zaxira bilan. Ishlatish: bash tests/ui/web.sh webglsiz */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/webglsiz-xato.png` }).catch(() => {});
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

  /* WebGL yo'q: canvas.getContext('webgl*') → null */
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...a) { return /webgl/i.test(String(type)) ? null : orig.call(this, type, ...a); };
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); });
  const base = page.url().split(/[?#]/)[0].replace(/app\.html$/, '');
  await page.goto(base + 'app.html?t=' + Date.now() + '#s=reg'); await page.waitForTimeout(2000);
  R.webglYoq = await M(() => !document.createElement('canvas').getContext('webgl'));

  await fill('Jasur', 'GL Usta'); await fill('jasur@', 'webglsiz' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await waitText('Nima yasaymiz');
  await click(/^Oshxona$/); await page.waitForTimeout(400); await click(/Muharrirni ochish/);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.res)); i++) await page.waitForTimeout(250);
  R.xabar = await waitText('3D sahna ochilmadi', 8000);
  R.narx = await M(() => window.__app.res && window.__app.res.priceRes.total);
  await page.screenshot({ path: `${OUT}/webglsiz-1440.png` });
  await click(/^Fayllar$/); await page.waitForTimeout(600);
  const dl = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
  await page.locator('[data-panel] button', { hasText: 'Excel smeta' }).first().click();
  R.excel = !!(await dl);

  /* sayt — 3D hikoya SVG zaxira bilan */
  await page.goto(base + '?t=' + Date.now()); await page.waitForTimeout(3000);
  R.sayt = await M(() => !!document.querySelector('[data-s3d]') && document.body.innerText.length > 200);

  R.errs = errs;
  R.ok = R.webglYoq && R.xabar && R.narx > 0 && R.excel && R.sayt && errs.length === 0;
}
