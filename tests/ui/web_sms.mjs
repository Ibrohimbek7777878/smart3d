/* TZ-23 C4: telefon + SMS bilan kirish (sinov serveri — Eskiz'siz, kod javobda keladi: dev_code; haqiqiy SMS yuborilmaydi, S8).
 * Tekshiriladi: tugma ko'rinadi (server SMS ishlaganda), kod yuboriladi, qayta yuborish taymeri, noto'g'ri kod — xabar,
 * yangi raqam — akkaunt ochiladi (ism bilan) va ish joyi (TZ-25); o'sha raqam bilan qayta kirish — ish joyi; telefon (390).
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

  /* #209: SMS usuli ko'rinmaydi (kodi qoldi) — kirishda ham, ro'yxatda ham; email forma ishlaydi */
  R.tugma = await page.locator('[data-kirish-usul]').count();
  R.emailBor = await page.locator('input[type=email]').count();
  R.telMaydon = await page.locator('[data-sms-tel]').count();
  await page.goto(page.url().split('#')[0].split('?')[0] + '?t=' + Date.now() + '#s=reg'); await page.waitForTimeout(1500);
  R.regTugma = await page.locator('[data-kirish-usul]').count();
  R.hScroll = await M(() => document.documentElement.scrollWidth > innerWidth + 1);

  R.errs = errs;
  R.ok = R.tugma === 0 && R.regTugma === 0 && R.telMaydon === 0 && R.emailBor === 1 && !R.hScroll && errs.length === 0;
}
