/* #219: til tugmasi HAMMA ekranda va kenglikda yuqori qatorda (viewport yuqori 80 px) ko'rinadi.
 * Ekranlar: sayt, kirish, ro'yxat, ish joyi, loyihalar, sozlamalar × 390 / 768 / 1440. Gorizontal skroll yo'q.
 * Ishlatish: bash tests/ui/web.sh tilTepa */
const VP = [[390, 844], [768, 1024], [1440, 900]];
export default async function run(page) {
  const R = { ok: true, joy: {} };
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0]; R.ok = false;
    await page.screenshot({ path: `${process.env.QA_OUT}/tilTepa-xato.png` }).catch(() => {});
  }
  return R;
}
async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const base = new URL(page.url()).origin + '/';
  const M = (fn, a) => page.evaluate(fn, a, false);
  const olch = async (w, nom) => {
    await page.waitForTimeout(600);
    const r = await M(() => {
      const b = [...document.querySelectorAll('[data-til-menyu]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; })[0];
      const q = b && b.getBoundingClientRect();
      return { top: q ? Math.round(q.top) : null, bottom: q ? Math.round(q.bottom) : null, right: q ? Math.round(q.right) : null, vw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth };
    });
    await page.screenshot({ path: `${OUT}/tilTepa-${w}-${nom}.png` });
    const yuqori = r.top !== null && r.top >= 0 && r.bottom <= 80;
    R.joy[`${w}-${nom}`] = r.top === null ? 'YO\'Q' : (yuqori ? 'tepada' : 'pastda y=' + r.top);
    if (!yuqori) R.ok = false;
    if (r.sw > r.vw + 1) { R.ok = false; (R.skroll = R.skroll || []).push(`${w}-${nom}`); }
  };
  await page.goto(base + 'app.html'); await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  for (const [w, h] of VP) {
    await page.setViewportSize({ width: w, height: h });
    await page.context().clearCookies(); await page.goto(base + 'app.html?t=' + Date.now()); await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
    await page.goto(base + '?t=' + Date.now()); await page.waitForTimeout(2000); await olch(w, 'sayt');
    await page.goto(base + 'app.html?t=' + Date.now() + '#s=login'); await page.waitForTimeout(1800); await olch(w, 'kirish');
    await page.goto(base + 'app.html?t=' + Date.now() + '#s=reg'); await page.waitForTimeout(1800); await olch(w, 'royxat');
    await page.locator('input[placeholder*="Jasur"]').first().fill('Til Tepa');
    await page.locator('input[placeholder*="jasur@"]').first().fill('tepa' + w + Date.now() + '@test.uz');
    await page.locator('input[placeholder*="kamida 8"]').first().fill('parol12345');
    await page.locator('button', { hasText: /^Ro'yxatdan o'tish$/ }).last().click();
    await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
    await olch(w, 'ishjoyi');
    if (w >= 768) { await M(() => document.querySelector('[data-sarlavha="loyihalar"]').click()); await page.waitForTimeout(900); await olch(w, 'loyihalar'); }
    await page.locator('[data-sozlamalar]').first().click(); await page.waitForTimeout(1200); await olch(w, 'sozlamalar');
  }
}
