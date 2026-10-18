/* Oddiy rejim (mijoz): ish joyida "Usta | Oddiy" almashtirgich. Tekshiriladi: sukut — Usta (10 asbob); Oddiyga o'tganda devor,
 * eshik/deraza, modul chizish, o'lchash, Bazis fayli va fayllar yashiriladi (matn qatori qoladi); 4 qadam: Xona (tayyor
 * o'lcham + eni/chuqurligi), Tayyor (karta bosilsa mebel joylanadi), Rang (korpus, fasad — "Ko'p ishlatiladigan"), Narx
 * (jami, tarkib, "Buyurtma berish"); qayta yuklanganda rejim saqlanadi; Ustaga bir bosishda qaytiladi; 390 px toshmaydi.
 * Skrinshotlar: out/web/oddiy-*.png. Ishlatish: bash tests/ui/web.sh oddiy */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/oddiy-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const has = async (s) => (await M(() => document.body.innerText)).includes(s);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const asboblar = () => M(() => [...document.querySelectorAll('[data-asbob]')].filter(e => e.offsetParent).map(e => e.getAttribute('data-asbob')));
  const rejim = () => M(() => { try { return localStorage.getItem('s3d-rejim'); } catch (_) { return 'x'; } });
  const tosh = () => M(() => document.documentElement.scrollWidth > window.innerWidth + 1 || document.body.scrollWidth > window.innerWidth + 1);
  const kut = async (fn, ms = 10000) => { for (let i = 0; i < ms / 200; i++) { if (await M(fn)) return true; await page.waitForTimeout(200); } return false; };
  const OD = (n) => page.locator(`[data-asbob="o-${n}"]`);
  const hol = () => M(() => { const d = window.__app.doc; return { n: d.placements.length, w: Math.max(...d.room.outline.map(p => p[0])), d: Math.max(...d.room.outline.map(p => p[1])) }; });

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Oddiy Mijoz'); await fill('jasur@', 'oddiy' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/);
  await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(600);
  if (await has("O'tkazib yuborish")) { await click(/^O'tkazib yuborish$/); await page.waitForTimeout(300); }

  /* 1) sukut — Usta: to'liq asboblar, almashtirgich ko'rinadi, hech narsa saqlanmagan */
  R.usta = { asboblar: await asboblar(), almashtirgich: await page.locator('[data-rejim-tugma]').count(), saqlangan: await rejim(),
    bosilgan: await M(() => document.querySelector('[data-rejim-tugma="usta"]').getAttribute('aria-pressed')) };
  await page.screenshot({ path: `${OUT}/oddiy-1440-usta.png` });

  /* 2) Oddiyga o'tish: faqat 4 qadam; devor, eshik, modul chizish, o'lchash, Bazis, fayllar yo'q; matn qatori bor */
  await page.locator('[data-rejim-tugma="oddiy"]').click(); await page.waitForTimeout(500);
  R.oddiy = { asboblar: await asboblar(), saqlangan: await rejim(), matn: await page.locator('[data-matn]').count(),
    fayllarTugma: await page.locator('[data-sarlavha="fayllar"]').count(), bazis: await page.locator('[data-asbob="bazis"]').count(),
    panel: await M(() => document.querySelector('[data-oddiy-panel]') ? document.querySelector('[data-oddiy-panel]').getAttribute('data-oddiy-panel') : null) };
  await page.screenshot({ path: `${OUT}/oddiy-1440-1-xona.png` });

  /* 3) ① Xona: tayyor o'lcham (4.2×3.1) va eni/chuqurligi raqam bilan */
  await page.locator('[data-oddiy-olcham] button', { hasText: '4.2×3.1' }).click(); await page.waitForTimeout(400);
  R.xona1 = await hol();
  const eni = page.locator('[data-oddiy-eni]'); await eni.fill('4500'); await eni.press('Enter'); await page.waitForTimeout(300);
  const chq = page.locator('[data-oddiy-chuqurlik]'); await chq.fill('3300'); await chq.press('Enter'); await page.waitForTimeout(400);
  R.xona2 = await hol();

  /* 4) ② Tayyor: karta bosilsa mebel joylanadi */
  await page.locator('[data-oddiy-keyingi]').click(); await page.waitForTimeout(400);
  R.tayyorKartalar = await page.locator('[data-oddiy-tayyor]').count();
  await page.screenshot({ path: `${OUT}/oddiy-1440-2-tayyor.png` });
  await page.locator('[data-oddiy-tayyor="oshxona-l"]').click(); await page.waitForTimeout(400);
  if (await page.locator('[data-tasdiq], [role=dialog]').count()) await click(/^Almashtirish$/);
  await kut(() => window.__app.doc.placements.length > 0, 8000); await page.waitForTimeout(800);
  R.tayyor = await hol();

  /* 5) ③ Rang: korpus va fasad — "Ko'p ishlatiladigan" plitkalar; bosilsa material o'zgaradi */
  await page.locator('[data-oddiy-keyingi]').click();
  R.rangPlitka = await kut(() => document.querySelectorAll('[data-oddiy-plitkalar] [data-material-plitka]').length > 0, 8000);
  R.rangSoni = await page.locator('[data-oddiy-plitkalar] [data-material-plitka]').count();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/oddiy-1440-3-rang.png` });
  const kor0 = await M(() => window.__app.state.matCode);
  await page.locator('[data-oddiy-plitkalar] [data-material-plitka]:not([data-on="1"]) button').first().click(); await page.waitForTimeout(600);
  const kor1 = await M(() => window.__app.state.matCode);
  await page.locator('[data-oddiy-rang-qism] button', { hasText: 'Fasad' }).click(); await page.waitForTimeout(500);
  const fas0 = await M(() => window.__app.state.fasadCode);
  await page.locator('[data-oddiy-plitkalar] [data-material-plitka]:not([data-on="1"]) button').first().click(); await page.waitForTimeout(600);
  const fas1 = await M(() => window.__app.state.fasadCode);
  R.rang = { korpus: [kor0, kor1], fasad: [fas0, fas1], sheetYopiq: await page.locator('[data-varaq]').count() };

  /* 6) ④ Narx va buyurtma: jami narx, tarkib, "Buyurtma berish" (tannarx ko'rinmaydi) */
  await page.locator('[data-oddiy-keyingi]').click(); await page.waitForTimeout(1500);
  R.narx = await M(() => ({ jami: (document.querySelector('[data-oddiy-jami]') || {}).innerText || '', tarkib: (document.querySelector('[data-oddiy-tarkib]') || {}).innerText || '',
    ber: !!document.querySelector('[data-buyurtma-ber]'), tannarx: document.body.innerText.includes('Sex tannarxi') }));
  await page.screenshot({ path: `${OUT}/oddiy-1440-4-narx.png` });
  await page.locator('[data-buyurtma-ber]').click(); await page.waitForTimeout(700);
  R.buyurtmaVaraq = await page.locator('[data-varaq="buyurtma"]').count();
  await page.screenshot({ path: `${OUT}/oddiy-1440-5-buyurtma.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  if (await page.locator('[data-varaq="buyurtma"]').count()) await page.locator('[data-varaq="buyurtma"] [aria-label="Yopish"]').first().click().catch(() => {});

  /* 7) qayta yuklanganda rejim saqlanadi (loyihaga ta'sir qilmaydi) */
  await page.waitForTimeout(1500);
  await page.reload(); await page.waitForTimeout(1500);
  await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  R.qayta = { asboblar: await asboblar(), saqlangan: await rejim() };

  /* 8) Ustaga bir bosishda qaytish */
  await page.locator('[data-rejim-tugma="usta"]').click(); await page.waitForTimeout(500);
  R.ustaga = { asboblar: await asboblar(), saqlangan: await rejim(), bazis: await page.locator('[data-asbob="bazis"]').count(), fayllarTugma: await page.locator('[data-sarlavha="fayllar"]').count() };
  await page.screenshot({ path: `${OUT}/oddiy-1440-usta-qayta.png` });
  await page.locator('[data-rejim-tugma="oddiy"]').click(); await page.waitForTimeout(300);

  /* 9) telefon 390: har qadam, gorizontal toshish yo'q */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(600);
  R.tel = {};
  const qad = { xona: 'xona', tayyor: 'tayyor', rang: 'rang', narx: 'narx' };
  let i = 0;
  for (const k of Object.keys(qad)) {
    i++;
    await OD(k).click({ force: true }); await page.waitForTimeout(400);
    if (!(await page.locator('[data-oddiy-panel]').count())) await OD(k).click({ force: true });   // kompyuterdagi ochiq holat telefonga o'tganda bir marta yopiladi
    await page.waitForTimeout(k === 'rang' ? 1200 : 600);
    R.tel[k] = { tosh: await tosh(), panel: await page.locator('[data-oddiy-panel]').count(), asbobQator: await M(() => { const n = document.querySelector('[data-asboblar]'); return n ? n.scrollWidth <= window.innerWidth + 1 || getComputedStyle(n).overflowX === 'auto' : false; }) };
    await page.screenshot({ path: `${OUT}/oddiy-390-${i}-${k}.png` });
  }
  await OD('narx').click({ force: true }); await page.waitForTimeout(300);   // yopiladi
  await page.screenshot({ path: `${OUT}/oddiy-390-yopiq.png` });

  R.xatolar = errs;
  const o = R.oddiy, u = R.usta, mat = (x) => x[0] !== x[1];
  R.ok = errs.length === 0
    && u.asboblar.length >= 9 && u.almashtirgich === 2 && u.saqlangan === null && u.bosilgan === 'true'
    && ['devor', 'teshik', 'chizish', 'olchash', 'fayllar', 'tanlash'].every(a => u.asboblar.includes(a))
    && o.asboblar.join() === 'o-xona,o-tayyor,o-rang,o-narx' && o.saqlangan === 'oddiy' && o.matn === 1 && o.fayllarTugma === 0 && o.bazis === 0 && o.panel === '1'
    && R.xona1.w === 4200 && R.xona1.d === 3100 && R.xona2.w === 4500 && R.xona2.d === 3300
    && R.tayyorKartalar >= 6 && R.tayyor.n > 0
    && R.rangPlitka && R.rangSoni >= 3 && mat(R.rang.korpus) && mat(R.rang.fasad) && R.rang.sheetYopiq === 0
    && /\d/.test(R.narx.jami) && R.narx.ber && !R.narx.tannarx && R.narx.tarkib.includes('4500') && R.buyurtmaVaraq === 1
    && R.qayta.asboblar.join() === 'o-xona,o-tayyor,o-rang,o-narx' && R.qayta.saqlangan === 'oddiy'
    && R.ustaga.asboblar.length >= 9 && R.ustaga.saqlangan === 'usta' && R.ustaga.bazis === 1 && R.ustaga.fayllarTugma === 1
    && Object.values(R.tel).every(x => !x.tosh && x.panel === 1 && x.asbobQator);
}
