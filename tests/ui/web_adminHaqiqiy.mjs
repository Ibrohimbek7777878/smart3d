/* Egasi #261: admin panel HAQIQIY serverda (soxta API'siz): admin kiradi → /admin ochiladi, 404 ga otilmaydi, sahifa qayta yuklansa ham qoladi,
 * furnitura va promptlar bo'limlari ma'lumot yuklaydi; oddiy foydalanuvchi /admin da 404 ko'radi.
 * Ishlatish: bash tests/ui/web.sh adminHaqiqiy */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/adminHaqiqiy-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT, errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { await page.locator(`input[placeholder*="${ph}"]`).first().fill(v); };
  const orgn = () => new URL(page.url()).origin;
  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });

  /* 1) admin: kirish → sarlavhada "Admin panel" → bosilsa /admin */
  await page.goto(orgn() + '/kirish?t=' + Date.now()); await page.waitForTimeout(1500);
  await fill('jasur@', 'admin@smart3d.uz'); await fill('kamida 8', 'web-test-admin-1');
  await click(/^Kirish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.goto(orgn() + '/admin'); await page.waitForTimeout(2500);
  R.adminYol = new URL(page.url()).pathname;
  R.qobiq = await M(() => document.body.innerText.includes('Admin panel') && document.body.innerText.includes('Furnitura'));
  await page.screenshot({ path: `${OUT}/adminHaqiqiy-1440.png` });
  for (const [nom, yol] of [['Furnitura', '/admin/furnitura'], ['Tayyor promptlar', '/admin/promptlar'], ['Standart', '/admin/standart'], ['Tarix', '/admin/tarix']]) {
    await page.goto(orgn() + yol); await page.waitForTimeout(2200);
    R['b_' + nom] = { yol: new URL(page.url()).pathname, matn: (await M(() => document.body.innerText)).length };
  }
  await page.goto(orgn() + '/admin/promptlar'); await page.waitForTimeout(2500);
  R.promptSoni = await M(() => (document.body.innerText.match(/yotoqxona|oshxona|mehmonxona|bolalar|garderob/gi) || []).length);
  await page.goto(orgn() + '/admin/furnitura'); await page.waitForTimeout(2500);
  R.furnNarxsiz = await M(() => /Narxsiz furnitura/.test(document.body.innerText));

  /* 2) oddiy foydalanuvchi: /admin → 404 */
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.context().clearCookies();
  await page.goto(orgn() + '/royxat?t=' + Date.now()); await page.waitForTimeout(1500);
  await fill('Jasur', 'Oddiy Usta'); await fill('jasur@', 'oddiy' + Date.now() + '@test.uz'); await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.goto(orgn() + '/admin'); await page.waitForTimeout(2500);
  R.oddiy404 = !!(await page.locator('[data-admin-emas]').count());   // 404 o'rniga "faqat admin uchun" kartasi (sahifa ma'lumoti baribir yuklanmaydi)

  R.xatolar = errs.length;
  R.ok = R.adminYol === '/admin' && R.qobiq && ['Furnitura', 'Tayyor promptlar', 'Standart', 'Tarix'].every(k => R['b_' + k].yol.startsWith('/admin/') && R['b_' + k].matn > 200)
    && R.promptSoni >= 20 && R.furnNarxsiz && R.oddiy404 && !errs.length;
}
