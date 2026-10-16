/* TZ-23 C4: telefon + SMS bilan kirish (sinov serveri — Eskiz'siz, kod javobda keladi: dev_code; haqiqiy SMS yuborilmaydi, S8).
 * Tekshiriladi: tugma ko'rinadi (server SMS ishlaganda), kod yuboriladi, qayta yuborish taymeri, noto'g'ri kod — xabar,
 * yangi raqam — akkaunt ochiladi (ism bilan) va onboarding; o'sha raqam bilan qayta kirish — "Loyihalarim"; telefon (390).
 * Ishlatish: bash tests/ui/web.sh sms */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/sms-xato.png` }).catch(() => {});
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
  const waitText = async (s, ms = 10000) => { for (let i = 0; i < ms / 200; i++) { if (await has(s)) return true; await page.waitForTimeout(200); } return false; };
  const tel = String(Date.now()).slice(-7);
  const raqam = '90' + tel;                                            // 9 raqam: 90 XXX XX XX
  const kodOl = async () => {
    const javob = page.waitForResponse(r => r.url().includes('/api/auth/sms/send'), { timeout: 10000 });
    await page.locator('[data-kirish-cta]').click();
    const j = await (await javob).json();
    await page.waitForTimeout(400);
    return j.dev_code;
  };

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.goto(page.url().split('#')[0] + '?t=' + Date.now() + '#s=login'); await page.waitForTimeout(1500);

  /* 1) kirish oynasida SMS tugmasi */
  R.tugma = await page.locator('[data-kirish-usul]').count();
  await page.locator('[data-kirish-usul]').click(); await page.waitForTimeout(300);
  R.telMaydon = await page.locator('[data-sms-tel]').count();
  R.emailYoq = !(await page.locator('input[type=email]').count());

  /* 2) noto'g'ri raqam → xabar; to'g'risi → kod yuboriladi */
  await page.locator('[data-sms-tel]').fill('123'); await page.locator('[data-kirish-cta]').click(); await page.waitForTimeout(300);
  R.telXato = await has("Telefon 9 raqam");
  await page.locator('[data-sms-tel]').fill(raqam);
  const kod = await kodOl();
  R.kodKeldi = /^\d{6}$/.test(kod || '');
  R.kodMaydon = await page.locator('[data-sms-kod]').count();
  R.taymer = await has('soniyadan keyin');
  R.toast = await has('Kod yuborildi');
  await page.screenshot({ path: `${OUT}/sms-1440-kod.png` });

  /* 3) noto'g'ri kod → xabar */
  await page.locator('[data-sms-kod]').fill(kod === '000000' ? '111111' : '000000');
  await page.locator('[data-kirish-cta]').click(); await page.waitForTimeout(800);
  R.kodXato = await has("Kod noto'g'ri");

  /* 4) to'g'ri kod + ism → yangi akkaunt → onboarding */
  await page.locator('[data-sms-kod]').fill(kod);
  await page.locator('input[autocomplete=name]').fill('SMS Usta');
  await page.locator('[data-kirish-cta]').click();
  R.onboarding = await waitText('Nima yasaymiz', 8000);
  R.user = await M(() => ({ name: window.__app.state.user && window.__app.state.user.name, phone: window.__app.state.user && window.__app.state.user.phone }));

  /* 5) chiqib, o'sha raqam bilan qayta kirish → "Loyihalarim" */
  await M(async () => { await fetch('/api/logout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.goto(page.url().split('#')[0].split('?')[0] + '?t=' + Date.now() + '#s=login'); await page.waitForTimeout(1500);
  await page.locator('[data-kirish-usul]').click(); await page.waitForTimeout(300);
  await page.locator('[data-sms-tel]').fill(raqam);
  const kod2 = await kodOl();
  await page.locator('[data-sms-kod]').fill(kod2 || '');
  await page.locator('[data-kirish-cta]').click();
  R.qaytaKirdi = await waitText('Loyihalarim', 8000);

  /* 6) telefon (390) — oyna sig'adi */
  await M(async () => { await fetch('/api/logout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); localStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(page.url().split('#')[0].split('?')[0] + '?t=' + Date.now() + '#s=login'); await page.waitForTimeout(1500);
  await page.locator('[data-kirish-usul]').click(); await page.waitForTimeout(300);
  R.hScroll = await M(() => document.documentElement.scrollWidth > innerWidth + 1);
  await page.screenshot({ path: `${OUT}/sms-390.png` });

  R.errs = errs;
  R.ok = R.tugma === 1 && R.telMaydon === 1 && R.emailYoq && R.telXato && R.kodKeldi && R.kodMaydon === 1 && R.taymer && R.toast &&
    R.kodXato && R.onboarding && R.user.name === 'SMS Usta' && R.user.phone === '998' + raqam && R.qaytaKirdi && !R.hScroll && errs.length === 0;
}
