/* TZ-09 2-bosqich: yangi frontend — email + parol bilan ro'yxat va kirish (haqiqiy server, sinov bazasi).
 * Ishlatish: bash tests/ui/web.sh kirish */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/kirish-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const txt = () => M(() => document.body.innerText);
  const has = async (t) => (await txt()).includes(t);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const tel = async (v) => { const el = page.locator('input[inputmode=numeric]').first(); await el.fill(''); await el.click(); await el.type(v); };
  const yangiSahifa = (hash) => page.goto(page.url().split(/[?#]/)[0] + '?t=' + Date.now() + (hash ? '#' + hash : ''));   // to'liq qayta yuklash
  const waitText = async (t, ms = 8000) => { for (let i = 0; i < ms / 200; i++) { if (await has(t)) return true; await page.waitForTimeout(200); } return false; };

  for (const [W, H] of [[1440, 900], [390, 844]]) {
    await page.setViewportSize({ width: W, height: H });
    await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
    await page.goto(page.url().split('#')[0]);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/kirish-${W}-1-royxat.png` });
    await click(/^Kirish$/); await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/kirish-${W}-2-kirish.png` });
    await click(/^Ro'yxatdan o'tish$/); await page.waitForTimeout(500);
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  R.qadam = '1)';
  /* 1) bo'sh forma — 4 ta xato, dizayn uslubida */
  await click(/^Ro'yxatdan o'tish$/); await page.waitForTimeout(400);
  const t1 = await txt();
  R.telefonYoq = !(await page.locator('input[inputmode=numeric]').count()) && !(await page.locator('input[placeholder*="Mebel-Pro"]').count());   // #209: faqat ism + email + parol
  R.boshForma = ['Ismingizni yozing', "Emailni to'g'ri yozing", 'Parol kamida 8 belgi'].map(x => t1.includes(x));
  await page.screenshot({ path: `${OUT}/kirish-1440-3-xatolar.png` });

  R.qadam = '2)';
  /* 2) to'g'ri ro'yxat → TZ-25: darhol ish joyi (so'rovnomasiz); server: ism, email, telefon (S1), sex nomi */
  await fill('Jasur', 'Usta Sinov');
  await fill('jasur@', 'usta.web@test.uz');
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/);
  R.onboarding = await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 }).then(() => true, () => false) && !(await has('Nima yasaymiz'));
  R.server = await M(async () => {
    const me = await (await fetch('/api/me')).json();                    // TZ-19 X2: kalit httpOnly cookie'da
    return { email: me.email, phone: me.phone, shop: me.shop, name: me.name };
  });
  R.kalitJSdaYoq = await M(() => localStorage.getItem('smart3d.token') === null && !document.cookie.includes('s3d_sess'));
  R.serverTogri = R.server.phone === '' && R.server.name === 'Usta Sinov' && R.server.email === 'usta.web@test.uz';

  R.qadam = '3)';
  /* 3) qayta ochilganda — kirgan holat saqlanadi, ish joyi (TZ-25) */
  await page.goto(page.url().split('#')[0]); await page.waitForTimeout(2500);
  R.qaytaOchildi = await M(() => !!document.querySelector('[data-ishjoyi]'));
  R.avatar = await M(() => [...document.querySelectorAll('header div')].map(d => d.textContent.trim()).find(t => t === 'US') || null);

  R.qadam = '4)';
  /* 4) chiqish (Sozlamalar → Chiqish: serverda ham bekor, TZ-19 X3) → email esda, kirish */
  await page.locator('[aria-label="Sozlamalar"]').click(); await waitText('Akkaunt');
  await click(/^Chiqish$/); await page.waitForTimeout(400); await click(/^Chiqish$/); await page.waitForTimeout(1200);
  R.chiqdi = await M(async () => (await fetch('/api/me')).status);
  await yangiSahifa('login'); await page.waitForTimeout(2000);
  R.emailEsda = await M(() => [...document.querySelectorAll('input[type=email]')].map(i => i.value)[0] || '');
  await fill('kamida 8', 'notogri-parol');
  await click(/^Kirish$/); await page.waitForTimeout(1200);
  R.notogriParol = await has("Email yoki parol noto'g'ri");
  await fill('kamida 8', 'parol12345');
  await click(/^Kirish$/);
  R.kirdi = await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 }).then(() => true, () => false);   // TZ-25: kirgach — ish joyi

  R.qadam = '5)';
  /* 5) takror email va takror telefon — dizayndagi xato matni */
  await M(() => { localStorage.removeItem('smart3d.token'); localStorage.removeItem('smart3d.user'); localStorage.removeItem('s3d-last-email'); });
  await yangiSahifa('reg'); await page.waitForTimeout(2000);
  await fill('Jasur', 'Boshqa Usta'); await fill('jasur@', 'usta.web@test.uz'); await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.waitForTimeout(1200);
  R.takrorEmail = await has('Bu email bilan akkaunt bor — kirish');

  /* TZ-31: Google sozlanmagan serverda "Google bilan kirish" tugmasi yo'q */
  await M(() => { localStorage.removeItem('smart3d.token'); localStorage.removeItem('smart3d.user'); });
  await yangiSahifa('login'); await page.waitForTimeout(1500);
  R.googleYoq = (await page.locator('[data-google]').count()) === 0;
  R.smsYoq = (await page.locator('[data-kirish-usul]').count()) === 0;   // #209: SMS tugmasi yashirin

  R.errs = errs;
  R.ok = R.boshForma.every(Boolean) && R.onboarding && R.serverTogri && R.kalitJSdaYoq && R.chiqdi === 401 && R.qaytaOchildi && R.emailEsda === 'usta.web@test.uz' &&
    R.notogriParol && R.kirdi && R.takrorEmail && R.telefonYoq && R.smsYoq && R.googleYoq && errs.length === 0;
}
