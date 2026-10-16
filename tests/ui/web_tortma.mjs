/* TZ-09 Q5: tortmali modul 3D da haqiqiy tortmalar bilan — "Ochish · tortmalar" ishlaydi, "Ichini ko'rish"da tortma qismlari;
 * narx o'zgarmaydi (tortma faqat 3D). Ishlatish: bash tests/ui/web.sh tortma */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/tortma-xato.png` }).catch(() => {});
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
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Tortma Usta'); await fill('jasur@', 'tortma' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await waitText('Nima yasaymiz');
  await click(/^Boshqa mebel$/); await page.waitForTimeout(400); await click(/Muharrirni ochish/);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);

  /* MC-KP-10 "yash 3x" — 3 tortmali modul */
  await page.locator('input[placeholder*="shkaf 2 eshik"]').fill('MC-KP-10'); await page.waitForTimeout(500);
  const narx0 = await M(() => window.__app.res && window.__app.res.priceRes.total);
  await page.locator('[data-panel] button.h5').first().click(); await page.waitForTimeout(1500);   // katalog kartasi
  R.qoshildi = await M(() => window.__app.doc.placements.some(p => p.frg === 'MC-KP-10'));
  R.narx = await M(() => window.__app.res.priceRes.total);
  R.tugma = await has('Ochish · tortmalar');
  await click(/Ochish · tortmalar/); await page.waitForTimeout(1800);
  R.ochildi = await has('Yopish · tortmalar');                       // tortmalar sahnada bor va ochiq (oldin — yaxlit quti edi)
  await page.screenshot({ path: `${OUT}/tortma-1440-ochiq.png` });

  /* "Ichini ko'rish" — tortma qismlari ro'yxatda */
  await click(/Ichini ko'rish →/); await page.waitForTimeout(3000);
  R.ichki = await M(() => document.body.innerText.match(/(\d+)×\s*Tortma fasadi/) ? +document.body.innerText.match(/(\d+)×\s*Tortma fasadi/)[1] : 0);
  await page.screenshot({ path: `${OUT}/tortma-1440-ichi.png` });

  R.errs = errs;
  R.ok = R.qoshildi && R.narx > (narx0 || 0) && R.tugma && R.ochildi && R.ichki === 3 && errs.length === 0;
}
