/* Xona paneli shakl tablari (To'rtburchak / L / P / Erkin) va maydon tablari — 3 tilda, 1440 va 390 px da yozuv kesilmaydi.
 * Skrinshotlar: tests/ui/out/web/xona-tablar-1440.png, xona-tablar-390.png (+ -ru/-en).  Ishlatish: bash tests/ui/web.sh xona */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0]; R.ok = false;
  }
  return R;
}
async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { await page.locator(`input[placeholder*="${ph}"]`).first().fill(v); };
  const XONA = { uz: /^Xona$/, ru: /^Комната$/, en: /^Room$/ };
  let royxat = false; R.til = {}; let hammasi = true;
  for (const [til, razmer] of [['uz', 1440], ['ru', 1440], ['en', 1440], ['uz', 390], ['ru', 390], ['en', 390]]) {
    await page.setViewportSize({ width: razmer, height: razmer === 390 ? 844 : 900 });
    if (!royxat) {
      await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
      await page.reload(); await page.waitForTimeout(1500);
      await fill('Jasur', 'Xona Usta'); await fill('jasur@', 'xona' + Date.now() + '@test.uz');
      const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
      await fill('kamida 8', 'parol12345');
      await click(/^Ro'yxatdan o'tish$/); royxat = true;
      await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
    }
    await M((t) => { localStorage.setItem('s3d-til', t); }, til);
    await page.reload(); await page.waitForTimeout(1500);
    await page.waitForTimeout(1500);
    const tez = page.locator('[data-tez="kitchen"]');
    if (await tez.count()) { await tez.click(); await page.waitForTimeout(1500); }
    await click(XONA[til]); await page.waitForTimeout(900);
    const o = await M(() => {
      const tabs = [...document.querySelectorAll('[data-shakl-tab],[data-maydon-rejim]')];
      return tabs.map(b => { const sp = b.querySelector('.sc-interp') || b, r = b.getBoundingClientRect();
        return { id: b.dataset.shaklTab || b.dataset.maydonRejim, matn: sp.textContent.trim(), kesilgan: b.scrollWidth > b.clientWidth + 1, w: Math.round(r.width), oqim: r.right > innerWidth + 1 }; });
    });
    const ok = o.length >= 6 && o.every(x => !x.kesilgan && !x.oqim) && await M(() => document.documentElement.scrollWidth <= innerWidth + 1);
    R.til[til + razmer] = { ok, o }; hammasi = hammasi && ok;
    await page.screenshot({ path: `${OUT}/xona-tablar-${razmer}${til === 'uz' ? '' : '-' + til}.png` });
  }
  R.ok = hammasi;
}
