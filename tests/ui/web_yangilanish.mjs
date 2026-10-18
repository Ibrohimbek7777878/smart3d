/* Yangi versiya o'zi yuklanadi: A ochiq → B chiqadi → registration.update() → sahifa o'zi B (meta s3d-sinov=B);
 * kirgan foydalanuvchi ishi (modullar) C ga o'tganda yo'qolmaydi. Ishlatish: bash tests/ui/web_yangilanish.sh */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0]; R.ok = false;
  }
  return R;
}
async function asosiy(page, R) {
  const base = page.url().replace(/[^/]*$/, '');
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const belgi = () => M(() => { const m = document.querySelector('meta[name="s3d-sinov"]'); return m ? m.content : 'A'; });
  const ctl = (v) => page.request.get(base + '__ctl?v=' + v);
  const yangila = () => M(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  const kut = async (fn, ms) => { for (let i = 0; i < ms / 250; i++) { try { if (await fn()) return true; } catch (_) { /* navigatsiya */ } await page.waitForTimeout(250); } return false; };
  const fill = async (ph, v) => { await page.locator(`input[placeholder*="${ph}"]`).first().fill(v); };

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload();
  R.sw = await kut(() => M(() => !!navigator.serviceWorker.controller), 20000);
  if (!R.sw) { await page.reload(); R.sw = await kut(() => M(() => !!navigator.serviceWorker.controller), 20000); }
  await page.waitForTimeout(3000);                                   // oldindan keshlash
  R.a = await belgi();
  R.birinchiReload = await M(() => (window.__t0 = 1, performance.getEntriesByType('navigation').length));

  /* 1) B chiqdi — ish yo'q, sahifa o'zi yangilanadi */
  await ctl('B'); await yangila();
  R.b = await kut(async () => (await belgi()) === 'B', 20000);
  R.bQayta = await M(() => window.__t0 === undefined);               // haqiqatan qayta yuklangan
  await page.waitForTimeout(2500);
  R.bTurg = (await belgi()) === 'B';                                 // tsikl yo'q: yana o'zgarmadi

  /* 2) kirgan foydalanuvchi, ish bor — C chiqadi, ish yo'qolmasin */
  await fill('Jasur', 'Yangilanish Usta'); await fill('jasur@', 'yangi' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
  await fill('kamida 8', 'parol12345');
  await page.getByText(/^Ro'yxatdan o'tish$/).last().click();
  await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.locator('[data-tez="kitchen"]').click();
  await kut(() => M(() => window.__app.doc.placements.length > 0), 10000);
  const n0 = await M(() => window.__app.doc.placements.length);
  R.mebel0 = n0;
  await M(() => { window.__t0 = 1; });
  await page.waitForTimeout(3500);                                   // avtomatik saqlash (2 s) ishlasin
  await ctl('C'); await yangila();
  R.c = await kut(async () => (await belgi()) === 'C', 30000);
  R.cQayta = await M(() => window.__t0 === undefined);
  await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 }).catch(() => {});
  await kut(() => M(() => window.__app.doc.placements.length > 0), 15000);
  R.mebel1 = await M(() => window.__app.doc.placements.length);
  R.ok = R.sw && R.a === 'A' && R.b && R.bQayta && R.bTurg && R.c && R.cQayta && R.mebel0 > 0 && R.mebel1 === R.mebel0;
}
