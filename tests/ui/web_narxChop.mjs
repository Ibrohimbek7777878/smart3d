/* TZ-49 (egasi #303/#306): «Sex tannarxi» kartasidagi «PDF / Chop etish» — to'liq ro'yxat bittama-bitta, pastda umumiy narx.
 *   1) tugma kartada (data-chop-tugma="karta") bor; hujjat (data-chop) sahifada bor, ekranda ko'rinmaydi
 *   2) print media: faqat hujjat ko'rinadi (menyu/3D yashirin); har qator miqdor × narx = summa; bo'lim yig'indisi; JAMI = narx paneli jami (clientTotal)
 *   3) PDF (A4) hosil bo'ladi (QA_OUT/narxChop.pdf) — ko'z bilan tekshirish uchun
 * Ishlatish: bash tests/ui/web.sh narxChop */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/narxChop-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}
async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { await page.locator(`input[placeholder*="${ph}"]`).first().fill(v); };
  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.goto(page.url().split('#')[0] + '?t=' + Date.now() + '#s=login'); await page.waitForTimeout(1500);
  await fill('jasur@', 'admin@smart3d.uz'); await fill('kamida 8', 'web-test-admin-1');
  await click(/^Kirish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.res && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);
  await click(/^Mebel$/); await page.waitForTimeout(500);
  for (const kod of ['MC-KP-02', 'MC-KP-10']) {
    await page.locator('input[placeholder*="shkaf 2 eshik"]').fill(kod); await page.waitForTimeout(500);
    await page.locator('[data-panel] button.h5').first().click(); await page.waitForTimeout(1200);
  }
  await click(/^Narx$/); await page.waitForTimeout(1500);
  for (let i = 0; i < 40 && !(await M(() => window.__app.res && window.__app.res.prod && window.__app.res.prod.tarkib)); i++) await page.waitForTimeout(250);
  R.tugmaKarta = await page.locator('[data-chop-tugma="karta"]').count();
  R.tugmaTepa = await page.locator('[data-chop-tugma="tepa"]').count();
  R.hujjatBor = await page.locator('[data-chop]').count();
  R.ekrandaYashirin = await M(() => { const e = document.querySelector('[data-chop]'); return !!e && getComputedStyle(e).display === 'none'; });
  await page.locator('[data-chop-tugma="karta"]').scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: `${OUT}/narxChop-karta.png` });
  /* print media: faqat hujjat */
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(400);
  R.print = await M(() => {
    const raqam = (s) => Number(String(s).replace(/[^\d]/g, ''));
    const h = document.querySelector('[data-chop]');
    const boshqa = [...document.body.children].filter(e => e !== h && !['SCRIPT', 'STYLE', 'LINK'].includes(e.tagName));
    const koringan = boshqa.filter(e => getComputedStyle(e).display !== 'none').length;
    const qatorlar = [...h.querySelectorAll('[data-chop-qator]')];
    const bolimlar = [...h.querySelectorAll('[data-chop-bolim]')].map(b => ({
      kod: b.dataset.chopBolim, qator: b.querySelectorAll('[data-chop-qator]').length,
      sum: [...b.querySelectorAll('[data-chop-summa]')].reduce((s, x) => s + raqam(x.innerText), 0), jami: raqam(b.querySelector('[data-chop-bolim-jami]').innerText) }));
    const p = window.__app.res.prod;
    return { hujjatKorinadi: getComputedStyle(h).display === 'block', boshqaKoringan: koringan, qatorSoni: qatorlar.length,
      bolimlar: bolimlar.map(b => b.kod + ':' + b.qator), bolimTugri: bolimlar.every(b => b.sum === b.jami),
      jami: raqam(h.querySelector('[data-chop-jami]').innerText), panelJami: Math.round(p.clientTotal),
      tannarx: raqam(h.querySelector('[data-chop-tannarx]').innerText), furnsiz: raqam(h.querySelector('[data-chop-furnsiz]').innerText), loyiha: h.querySelector('[data-chop-loyiha]').innerText,
      qatorYigindi: qatorlar.reduce((s, r) => s + raqam(r.querySelector('[data-chop-summa]').innerText), 0), tarkibQator: p.tarkib.bolimlar.filter(b => b.kod !== 'ustama').reduce((s, b) => s + b.qatorlar.length, 0) };
  });
  await page.pdf({ path: `${OUT}/narxChop.pdf`, format: 'A4', printBackground: true }).then(() => { R.pdf = true; }).catch((e) => { R.pdf = false; R.pdfXato = String(e.message).slice(0, 100); });
  await page.emulateMedia({ media: 'screen' });
  const q = R.print;
  R.ok = R.tugmaKarta === 1 && R.tugmaTepa >= 0 && R.hujjatBor === 1 && R.ekrandaYashirin && q.hujjatKorinadi && q.boshqaKoringan === 0 && q.qatorSoni > 5
    && q.bolimTugri && q.furnsiz > 0 && q.furnsiz <= q.jami && q.jami === q.panelJami && q.qatorSoni === q.tarkibQator && R.pdf && !errs.length;
  R.xatolar = errs;
}
