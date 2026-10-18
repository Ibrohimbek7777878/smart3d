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
  /* TZ-18 7-bosqich: server rad etgan maydon xatosi tanlangan tilda (ism "<b>…" brauzer tekshiruvidan o'tadi, server — 400 S3D-VAL-001) */
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'ru'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Жасур', '<b>Usta'); await fill('jasur@', 'tilru' + Date.now() + '@test.uz');
  { const tl = page.locator('input[inputmode=numeric]').first(); if (await tl.count()) { await tl.click(); await tl.type('9' + String(Date.now()).slice(-8)); } }
  await fill('минимум 8', 'parol12345');
  await page.locator('button', { hasText: /^Регистрация$/ }).last().click();
  R.ruServer = await (async () => { for (let i = 0; i < 25; i++) { if (await has('Введено неверное значение')) return true; await page.waitForTimeout(200); } return false; })();
  R.ruServerUz = await has('mumkin emas');
  /* ro'yxat oynasidagi 3D yorliqlar ham ruscha ("Yon devor ×2" — soni bilan ham) */
  R.ruYorliq = await M(() => document.body.innerText.split('\n').filter(l => /Yon devor|Planka|Eshik|Orqa devor|Polka|tomoni/.test(l)).slice(0, 5));
  await page.screenshot({ path: `${OUT}/til-1440-ru-server-xato.png`, clip: { x: 0, y: 0, width: 1440, height: 700 } });

  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  R.boshlangich = await M(() => document.documentElement.lang);
  await fill('Jasur', 'Til Usta'); await fill('jasur@', 'til' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });   // TZ-25: darhol ish joyi
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);   // TZ-25: tez boshlash — oshxona
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.res)); i++) await page.waitForTimeout(250);
  const narxUz = await M(() => window.__app.res.priceRes.total);
  const yuklandi = await M(() => { window.__belgi = 1; return 1; });

  /* 🌐 → Русский */
  await page.locator('button[data-til-menyu]').click(); await page.waitForTimeout(300);
  R.menyu = await M(() => [...document.querySelectorAll('[role=menuitemradio]')].map(b => b.textContent.trim()));
  await page.screenshot({ path: `${OUT}/til-1440-menyu.png`, clip: { x: 900, y: 0, width: 540, height: 260 } });
  await page.locator('[role=menuitemradio][lang=ru]').click(); await page.waitForTimeout(600);
  R.ru = { lang: await M(() => document.documentElement.lang), saqlandi: await M(() => localStorage.getItem('s3d-til')),
    menyuYopiq: await M(() => !document.querySelector('[role=menu]')), qaytaYuklanmadi: await M(() => window.__belgi === 1),
    narx: await M(() => window.__app.res.priceRes.total), server: await M(async () => (await (await fetch('/api/settings')).json()).til) };
  await page.screenshot({ path: `${OUT}/til-1440-ru.png` });
  /* TZ-18 5-bosqich: rus rejimida — katalogdagi modul nomlari ruscha, muharrirda o'zbekcha so'z qolmagan
     (loyiha nomi — foydalanuvchi matni, tekshirilmaydi) */
  const UZ = /(^|[^\p{L}])(Qadam|Mebel|Narx|Fayllar|Xona|Oshxona|pastki|ustki|so'm|Eshiklarni|Markazga|Barchasi|Korpus|Fasad|modul)(?![\p{L}])/u;
  R.ruKatalog = await M(() => [...document.querySelectorAll('[data-panel] button.h5')].slice(0, 6).map(b => (b.innerText.split('\n')[0] || '').trim()));
  /* TZ-18 6-bosqich: hujjatlar rus tilida — Excel (bo'lim sarlavhalari) va PDF hisobot (sarlavha, jami) */
  await page.locator('button', { hasText: 'Файлы' }).first().click(); await page.waitForTimeout(800);
  const dlx = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
  await page.locator('[data-panel] button', { hasText: 'Смета Excel' }).first().click();
  const fx = await dlx;
  R.ruExcel = fx ? (await (async () => { const b = await (await import('node:fs')).promises.readFile(await fx.path()); const s = b.toString('utf8'); return s.includes('МЕБЕЛЬНЫЕ МОДУЛИ') && s.includes('ИТОГОВАЯ СУММА'); })()) : false;
  const pop = page.waitForEvent('popup', { timeout: 15000 }).catch(() => null);
  await page.locator('[data-panel] button', { hasText: 'Отчёт (PDF)' }).first().click();
  const pw = await pop;
  R.ruPdf = pw ? await pw.evaluate(() => document.documentElement.lang + '|' + (document.body.innerText.match(/ИТОГО|Коммерческое предложение/g) || []).length) : null;
  if (pw) await pw.close().catch(() => {});
  await page.locator('button', { hasText: 'Мебель' }).first().click(); await page.waitForTimeout(600);
  R.ruQolgan = await M((re) => { const body = document.body.cloneNode(true); for (const el of body.querySelectorAll('input, [data-loyiha-nomi]')) el.remove();
    return body.innerText.split('\n').filter(l => new RegExp(re, 'u').test(l)).slice(0, 8); }, UZ.source);

  /* Esc menyuni yopadi */
  await page.locator('button[data-til-menyu]').click(); await page.waitForTimeout(200);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  R.escYopdi = await M(() => !document.querySelector('[role=menu]'));

  /* qayta ochilganda — eslab qolingan */
  await page.goto(page.url().split(/[?#]/)[0] + '?t=' + Date.now()); await page.waitForTimeout(2500);
  R.eslabQoldi = await M(() => document.documentElement.lang);

  /* Sozlamalar → Til → English, keyin O'zbekcha */
  await page.locator('[data-sozlamalar]').click(); await page.waitForTimeout(1200);   // ru rejimida yorliq "Настройки" — tildan mustaqil belgi
  R.sozlamaTil = await M(() => [...document.querySelectorAll('[data-set="til"] button')].map(b => b.textContent.trim()));
  await page.locator('[data-set="til"] button', { hasText: 'English' }).click(); await page.waitForTimeout(400);
  R.en = await M(() => document.documentElement.lang);
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
  R.hScroll = await M(() => document.documentElement.scrollWidth > innerWidth + 1);
  await page.locator('[data-set="til"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/til-390-sozlama.png` });
  await page.locator('[data-set="til"] button', { hasText: 'O\'zbekcha' }).click(); await page.waitForTimeout(400);
  R.uz = await M(() => document.documentElement.lang);

  /* sayt (bosh sahifa): sarlavhadagi til tugmasi (egasi #255: pastki tugma olib tashlangan) → menyu → Русский (sahifa qayta yuklanmaydi) */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(new URL(page.url()).origin + '/?t=' + Date.now());   // TZ-30: sayt ildizi (ilova manzili /loyiha/5 … bo'lishi mumkin) await page.waitForTimeout(2000);
  await page.locator('header button[data-til-menyu]').first().click(); await page.waitForTimeout(300);
  await page.locator('[role=menuitemradio][lang=ru]').click(); await page.waitForTimeout(500);
  R.sayt = { lang: await M(() => document.documentElement.lang), tugma: await M(() => (document.querySelector('header button[data-til-menyu]') || document.body).getAttribute('aria-label') || 'bor'), pastkiYoq: await M(() => !document.querySelector('footer button[aria-haspopup=menu]')) };
  await M(() => localStorage.setItem('s3d-til', 'uz'));

  R.errs = errs;
  R.ok = R.ruServer && !R.ruServerUz && R.ruYorliq.length === 0 && R.ruExcel && /^ru\|[1-9]/.test(R.ruPdf || '') && R.ruKatalog.length > 0 && R.ruKatalog.every(n => /[А-Яа-яЁё]/.test(n)) && R.ruQolgan.length === 0 && R.sayt.lang === 'ru' && R.sayt.pastkiYoq && yuklandi && R.menyu.join('|') === 'O\'zbekcha|Русский|English' && R.ru.lang === 'ru' && R.ru.saqlandi === 'ru' && R.ru.menyuYopiq &&
    R.ru.qaytaYuklanmadi && R.ru.narx === narxUz && R.ru.server === 'ru' && R.escYopdi && R.eslabQoldi === 'ru' && R.sozlamaTil.length === 3 && R.en === 'en' &&
    R.uz === 'uz' && !R.hScroll && errs.length === 0;
}
