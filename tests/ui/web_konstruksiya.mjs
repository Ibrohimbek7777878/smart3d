/* TZ-26: AI konstruksiya — matn qatoridan (sinov serverida AI kaliti yo'q → AI'siz tahlilchi; server yo'li — server testida).
 * Tekshiriladi: "shkaf 1200x600x2200, chapda shtanga, o'ngda 4 polka, 2 eshik" → xonaga modul (CH-…), "Modul chizish" paneli,
 * chizma: 2 bo'lim, chapda shtanga, o'ngda 4 polka, 2 eshik; izoh kartasi (kim tushundi, xulosa); narx; ruscha
 * "тумба 600, 4 ящика" → tumba 4 tortma; AI oynasidagi "Qurish" ham shu yo'l; xona matni ("oshxona 3x4 m") — oshxona yo'li
 * (almashtirish tasdig'i); keng polka — tizim to'g'rilaydi (izohda); telefon (390). Ishlatish: bash tests/ui/web.sh konstruksiya */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/konstruksiya-xato.png` }).catch(() => {});
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
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const qator = page.locator('[data-matn]');
  const yoz = async (s) => { await qator.fill(s); await qator.press('Enter'); };
  const kut = async (fn, arg, ms = 8000) => { for (let i = 0; i < ms / 200; i++) { const v = await M(fn, arg); if (v) return v; await page.waitForTimeout(200); } return null; };
  /* oxirgi qo'lda chizilgan modul: chizma (katalogda), joylashuv, narx */
  const oxirgi = () => M(() => {
    const a = window.__app, k = Object.keys(a.doc.chizmalar || {}), kod = k[k.length - 1], fr = kod && a.H.catalog[kod];
    const p = a.doc.placements.find(x => x.frg === kod), ch = fr && fr.chizma;
    const b = (n) => n ? { yo: n.yo || null, bo: (n.bo || []).map(x => b(x.n)), polka: n.polka || 0, tortma: n.tortma || 0, shtanga: !!n.shtanga, eshik: n.eshik || 0 } : null;
    return { n: k.length, kod, tur: ch && ch.tur, wdh: p && [p.w, p.d, p.h], ichki: ch && b(ch.ichki), narx: a.res && a.res.priceRes.total };
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Konstruksiya Usta'); await fill('jasur@', 'kons' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);

  /* 1) o'zbekcha shkaf */
  await yoz("shkaf 1200x600x2200, chapda shtanga, o'ngda 4 polka, 2 eshik");
  await kut(() => !!document.querySelector('[data-kons-izoh]'));
  await page.waitForTimeout(800);
  R.shkaf = await oxirgi();
  R.izoh = await M(() => (document.querySelector('[data-kons-izoh]') || {}).innerText || '');
  R.panel = await M(() => !!document.querySelector('[data-chizish]'));
  R.sahnada = await M((k) => { let n = 0; window.__app.sahna.sp.groups.items.traverse(o => { if (o.userData && o.userData.frg === k) n++; }); return n; }, R.shkaf.kod);
  await page.screenshot({ path: `${OUT}/konstruksiya-1440-shkaf.png` });

  /* 2) ruscha tumba */
  await yoz('тумба 600, 4 ящика');
  await kut((n) => Object.keys(window.__app.doc.chizmalar || {}).length > n, R.shkaf.n);
  await page.waitForTimeout(600);
  R.tumba = await oxirgi();

  /* 3) keng polka — tizim bo'lgich qo'yadi (izohda) */
  await yoz('javon 1600x300x1800 5 polka');
  await kut((n) => Object.keys(window.__app.doc.chizmalar || {}).length > n, R.tumba.n);
  await page.waitForTimeout(600);
  R.javon = await oxirgi();
  R.javonIzoh = await M(() => (document.querySelector('[data-kons-tuzatish]') || {}).innerText || '');

  /* 4) AI oynasidagi "Qurish" — shu yo'l */
  await page.locator('[data-matn-menyu]').click(); await page.waitForTimeout(400);
  await page.locator('[data-ai-tab] button', { hasText: 'Matn' }).click(); await page.waitForTimeout(200);
  await page.locator('[data-varaq="ai"] textarea').fill('ustki shkaf 800 2 eshik 2 polka');
  await page.locator('[data-varaq="ai"] button', { hasText: 'Qurish' }).click();
  await kut((n) => Object.keys(window.__app.doc.chizmalar || {}).length > n, R.javon.n);
  await page.waitForTimeout(600);
  R.ustki = await oxirgi();
  R.aiYopildi = await M(() => !document.querySelector('[data-varaq="ai"]'));

  /* 5) xona matni — oshxona yo'li (mebel bor — almashtirish tasdig'i), bekor qilinadi */
  const n0 = await M(() => window.__app.doc.placements.length);
  await yoz('oshxona 3x4 m L shakl');
  R.xonaTasdiq = !!(await kut(() => document.body.innerText.includes('Loyihani almashtirasizmi?'), null, 4000));
  if (R.xonaTasdiq) { await click(/^Bekor qilish$|^Bekor$/); await page.waitForTimeout(300); }
  R.xonaTegilmadi = (await M(() => window.__app.doc.placements.length)) === n0;

  /* 6) telefon (390) — panel va matn qatori, toshish yo'q */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(700);
  await yoz('tumba 400 3 tortma');
  await kut((n) => Object.keys(window.__app.doc.chizmalar || {}).length > n, R.ustki.n);
  await page.waitForTimeout(600);
  R.tel = await M(() => ({ toshish: document.documentElement.scrollWidth - innerWidth, izoh: !!document.querySelector('[data-kons-izoh]'), qator: document.querySelector('[data-matn-qatori]').getBoundingClientRect().bottom <= innerHeight + 1 }));
  await page.screenshot({ path: `${OUT}/konstruksiya-390.png` });
  await page.setViewportSize({ width: 1440, height: 900 });

  R.xatolar = errs;
  const s = R.shkaf.ichki;
  R.ok = R.shkaf.n === 1 && /^CH-/.test(R.shkaf.kod) && R.shkaf.tur === 'shkaf' && JSON.stringify(R.shkaf.wdh) === '[1200,600,2200]'
    && s.yo === 'v' && s.bo.length === 2 && s.bo[0].shtanga && s.bo[0].eshik === 1 && s.bo[1].polka === 4 && s.bo[1].eshik === 1 && R.shkaf.narx > 0
    && /AI'siz/.test(R.izoh) && /2 bo'lim/.test(R.izoh) && R.panel && R.sahnada > 0
    && R.tumba.tur === 'tumba' && R.tumba.ichki.tortma === 4 && R.tumba.wdh[0] === 600
    && R.javon.ichki.yo === 'v' && R.javon.ichki.bo.length === 2 && R.javon.ichki.bo.every(b => b.polka === 5) && /bo'lgich/.test(R.javonIzoh)
    && R.ustki.tur === 'ustki' && R.ustki.ichki.eshik === 2 && R.ustki.ichki.polka === 2 && R.aiYopildi
    && R.xonaTasdiq && R.xonaTegilmadi
    && R.tel.toshish <= 0 && R.tel.izoh && R.tel.qator
    && !errs.length;
}
