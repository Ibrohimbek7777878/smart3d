/* TZ-09 7-bosqich: Sozlamalar — ustama hisobga ta'sir qiladi, stanok profili "Stanokka" ro'yxatini filtrlaydi,
 * sex logosi hisobotga chiqadi, raskroy parametrlari saqlanadi, sex standartlari (usta — faqat ko'radi).
 * Ishlatish: bash tests/ui/web.sh sozlamalar */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/sozlamalar-xato.png` }).catch(() => {});
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
  await fill('Jasur', 'Sozlama Usta'); await fill('jasur@', 'sozlama' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345'); await fill('Mebel-Pro', 'Sinov Sex');
  await click(/^Ro'yxatdan o'tish$/); await waitText('Nima yasaymiz');
  await click(/^Oshxona$/); await page.waitForTimeout(400); await click(/Muharrirni ochish/);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.res)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(800);
  const total = () => M(() => window.__app.res.priceRes.total);
  R.jami35 = await total();

  /* sozlamalar sahifasi — chap menyudan */
  await click(/^Sozlamalar$/); await waitText('Narx ustamasi');
  await page.screenshot({ path: `${OUT}/sozlamalar-1440.png`, fullPage: true });
  R.akkaunt = await has('Sinov Sex');

  /* ustama 50% → narx o'zgaradi, saqlanadi (server) */
  const mk = page.locator('[data-set="ustama"] input');
  await mk.fill('50'); await mk.press('Enter'); await page.waitForTimeout(1200);
  R.jami50 = await total();
  R.ustamaIshladi = R.jami50 > R.jami35 && Math.abs(R.jami50 / R.jami35 - 1.5 / 1.35) < 0.01;
  R.server = await M(async () => { const t = JSON.parse(localStorage.getItem('smart3d.token')); return (await (await fetch('/api/settings', { headers: { authorization: 'Bearer ' + t } })).json()); });

  /* stanok profili: DXF o'chiriladi → Fayllar'da yo'q */
  await page.locator('[data-set="stanok"] button', { hasText: 'DXF' }).click(); await page.waitForTimeout(1000);
  /* logo */
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.locator('[data-set="logo"] input[type=file]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await page.waitForTimeout(1200);
  R.logoSaqlandi = await M(() => !!document.querySelector('[data-set="logo"] img'));
  /* raskroy: arra 5 mm */
  const kerf = page.locator('[data-set="raskroy"] label', { hasText: 'Arra' }).locator('input');
  await kerf.fill('5'); await page.locator('[data-set="raskroy"] button', { hasText: 'Saqlash' }).click(); await page.waitForTimeout(800);
  R.raskroy = await M(() => JSON.parse(localStorage.getItem('s3d-nest-cfg') || 'null'));
  R.stdUstaOchiq = await M(() => [...document.querySelectorAll('[data-set="standart"] input')].some(i => !i.disabled));
  await page.screenshot({ path: `${OUT}/sozlamalar-1440-keyin.png`, fullPage: true });

  /* muharrirga qaytish → Narx: Foyda (+50%); Fayllar: DXF yo'q */
  await click(/Muharrirga/); await page.waitForTimeout(1500);
  await click(/^Narx$/); await page.waitForTimeout(800);
  R.foyda = (await txt()).match(/Foyda \(\+(\d+)%\)/)?.[1] || null;
  await click(/^Fayllar$/); await page.waitForTimeout(800);
  R.dxfYoq = await M(() => ![...document.querySelectorAll('[data-panel] button')].some(b => b.textContent.trim() === 'DXF'));
  try {
    const [pop] = await Promise.all([page.context().waitForEvent('page', { timeout: 15000 }), page.locator('[data-panel] button', { hasText: 'Hisobot (PDF)' }).first().click()]);
    await pop.waitForLoadState('domcontentloaded');
    R.hisobotLogo = await pop.evaluate(() => !!document.querySelector('img.usta'), null, false);
    await pop.close();
  } catch (e) { R.hisobotLogo = 'xato: ' + String(e.message).split('\n')[0]; }

  /* telefon: sozlamalar sahifasi */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('header [aria-label="Sozlamalar"]').click(); await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/sozlamalar-390.png`, fullPage: true });
  R.hScroll = await M(() => document.documentElement.scrollWidth > innerWidth + 1);

  R.errs = errs;
  R.ok = R.akkaunt && R.ustamaIshladi && R.server.markup_pct === 0.5 && R.logoSaqlandi && R.raskroy && R.raskroy.kerf === 5 &&
    !R.stdUstaOchiq && R.foyda === '50' && R.dxfYoq && R.hisobotLogo === true && !R.hScroll && errs.length === 0;
}
