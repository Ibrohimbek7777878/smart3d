/* TZ-18 2-bosqich: til tanlash — 🌐 menyusi (kompyuter), Sozlamalar → Til (telefon ham), eslab qolinadi, sahifa qayta
 * yuklanmaydi, <html lang> almashadi, Esc menyuni yopadi. Tarjima to'liq bo'lgach — rus/ingliz rejimida o'zbekcha matn qolmagani
 * ham shu yerda tekshiriladi (lug'atdagi qamrov 100% bo'lganda). Ishlatish: bash tests/ui/web.sh til */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/til-xato.png` }).catch(() => {});
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
  R.boshlangich = await M(() => document.documentElement.lang);
  await fill('Jasur', 'Til Usta'); await fill('jasur@', 'til' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await waitText('Nima yasaymiz');
  await click(/^Oshxona$/); await page.waitForTimeout(400); await click(/Muharrirni ochish/);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.res)); i++) await page.waitForTimeout(250);
  const narxUz = await M(() => window.__app.res.priceRes.total);
  const yuklandi = await M(() => { window.__belgi = 1; return 1; });

  /* 🌐 → Русский */
  await page.locator('button[aria-label="Til"]').click(); await page.waitForTimeout(300);
  R.menyu = await M(() => [...document.querySelectorAll('[role=menuitemradio]')].map(b => b.textContent.trim()));
  await page.screenshot({ path: `${OUT}/til-1440-menyu.png`, clip: { x: 900, y: 0, width: 540, height: 260 } });
  await page.locator('[role=menuitemradio][lang=ru]').click(); await page.waitForTimeout(600);
  R.ru = { lang: await M(() => document.documentElement.lang), saqlandi: await M(() => localStorage.getItem('s3d-til')),
    menyuYopiq: await M(() => !document.querySelector('[role=menu]')), qaytaYuklanmadi: await M(() => window.__belgi === 1),
    narx: await M(() => window.__app.res.priceRes.total), server: await M(async () => (await (await fetch('/api/settings')).json()).til) };
  await page.screenshot({ path: `${OUT}/til-1440-ru.png` });

  /* Esc menyuni yopadi */
  await page.locator('button[aria-label="Til"]').click(); await page.waitForTimeout(200);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  R.escYopdi = await M(() => !document.querySelector('[role=menu]'));

  /* qayta ochilganda — eslab qolingan */
  await page.goto(page.url().split(/[?#]/)[0] + '?t=' + Date.now()); await page.waitForTimeout(2500);
  R.eslabQoldi = await M(() => document.documentElement.lang);

  /* Sozlamalar → Til → English, keyin O'zbekcha */
  await page.locator('[aria-label="Sozlamalar"]').click(); await page.waitForTimeout(1200);
  R.sozlamaTil = await M(() => [...document.querySelectorAll('[data-set="til"] button')].map(b => b.textContent.trim()));
  await page.locator('[data-set="til"] button', { hasText: 'English' }).click(); await page.waitForTimeout(400);
  R.en = await M(() => document.documentElement.lang);
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
  R.hScroll = await M(() => document.documentElement.scrollWidth > innerWidth + 1);
  await page.locator('[data-set="til"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/til-390-sozlama.png` });
  await page.locator('[data-set="til"] button', { hasText: 'O\'zbekcha' }).click(); await page.waitForTimeout(400);
  R.uz = await M(() => document.documentElement.lang);

  /* sayt (bosh sahifa): pastdagi til tugmasi → menyu → Русский (sahifa qayta yuklanmaydi) */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(page.url().split(/[?#]/)[0].replace(/app\.html$/, '') + '?t=' + Date.now()); await page.waitForTimeout(2000);
  await page.locator('footer button[aria-haspopup=menu]').scrollIntoViewIfNeeded();
  await page.locator('footer button[aria-haspopup=menu]').click(); await page.waitForTimeout(300);
  await page.locator('[role=menuitemradio][lang=ru]').click(); await page.waitForTimeout(500);
  R.sayt = { lang: await M(() => document.documentElement.lang), tugma: await M(() => document.querySelector('footer button[aria-haspopup=menu]').textContent.trim()) };
  await M(() => localStorage.setItem('s3d-til', 'uz'));

  R.errs = errs;
  R.ok = R.sayt.lang === 'ru' && R.sayt.tugma === 'Русский' && yuklandi && R.menyu.join('|') === 'O\'zbekcha|Русский|English' && R.ru.lang === 'ru' && R.ru.saqlandi === 'ru' && R.ru.menyuYopiq &&
    R.ru.qaytaYuklanmadi && R.ru.narx === narxUz && R.ru.server === 'ru' && R.escYopdi && R.eslabQoldi === 'ru' && R.sozlamaTil.length === 3 && R.en === 'en' &&
    R.uz === 'uz' && !R.hScroll && errs.length === 0;
}
