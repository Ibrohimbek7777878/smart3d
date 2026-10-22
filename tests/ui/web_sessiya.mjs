/* Tezlik (testchi, 2026-10-22): kirgan foydalanuvchi sahifani qayta ochganda "Ro'yxatdan o'tish" / "Kirish" ekrani HECH QACHON ko'rinmasligi.
 * Saqlangan sessiya /api/me bilan tekshiriladi; shu javob kelguncha neutral "Yuklanmoqda…" (data-yuklanish) turadi, keyin:
 *   sessiya yaroqli  → to'g'ridan-to'g'ri ilova (ish joyi yoki so'ralgan manzil);   tugagan (401) → kirish ekrani;
 *   internet yo'q    → kirgan holat saqlanadi, ilova;                               sessiya yo'q   → ro'yxat ekrani darhol (avvalgidek).
 * /api/me sun'iy kechiktiriladi (route.fetch + kutish + route.fulfill): kirish ekrani bir lahzaga ham chiqsa — test yiqiladi.
 * Ko'rinish kuzatuvchisi (MutationObserver) sahifa HTML'idan oldin o'rnatiladi, shuning uchun bir kadrlik yaltirash ham ushlanadi.
 * Ishlatish: bash tests/ui/web.sh sessiya */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/sessiya-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

const KUTISH = 2500;   // /api/me ga sun'iy kechikish, ms

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const orgn = () => new URL(page.url()).origin;
  const fill = async (ph, v) => { await page.locator(`input[placeholder*="${ph}"]`).first().fill(v); };
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const sozlama = () => M(() => ({ ...window.__q }));   // { forma: kirish ekrani ko'rindimi, yuk: neutral, ilova: ish joyi / sahifa }
  const kut = async (fn, ms = 20000) => { for (let i = 0; i < ms / 100; i++) { if (await M(fn)) return true; await page.waitForTimeout(100); } return false; };

  /* kuzatuvchi: kirish ekrani (data-auth, parol maydoni) yoki neutral holat DOM'ga qo'shilgan lahza — sahifa HTML'idan oldin */
  await page.addInitScript(() => {
    const q = window.__q = { forma: 0, yuk: 0, ilova: 0, formaT: 0, yukT: 0 };
    const t0 = performance.now();
    const qara = (n) => {
      if (!n || n.nodeType !== 1) return;
      const bor = (sel) => n.matches(sel) || !!n.querySelector(sel);
      if (bor('[data-auth],input[type=password]')) { q.forma++; if (!q.formaT) q.formaT = Math.round(performance.now() - t0); }
      if (bor('[data-yuklanish]')) { q.yuk++; if (!q.yukT) q.yukT = Math.round(performance.now() - t0); }
      if (bor('[data-ishjoyi],[data-sarlavha],[data-admin]')) q.ilova++;
    };
    new MutationObserver((recs) => { for (const r of recs) r.addedNodes.forEach(qara); }).observe(document, { childList: true, subtree: true });
  });
  /* /api/me ni kechiktirish: haqiqiy javob olinadi, KUTISH ms ushlab turiladi, keyin beriladi */
  let kechikish = 0, rejim = 'haqiqiy';   // haqiqiy | 401 | uzildi
  await page.route('**/api/me', async (route) => {
    if (rejim === 'uzildi') { await route.abort('failed'); return; }
    if (rejim === '401') { await new Promise(r => setTimeout(r, kechikish)); await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Sessiya tugadi', code: 'S3D-AUTH-001' }) }); return; }
    const resp = await route.fetch();
    if (kechikish) await new Promise(r => setTimeout(r, kechikish));
    await route.fulfill({ response: resp });
  });
  const ochish = async (yol, til = 'uz') => {
    await M((k) => { localStorage.setItem('s3d-til', k); }, til);
    await page.goto(orgn() + yol + (yol.includes('?') ? '&' : '?') + 't=' + Date.now(), { waitUntil: 'commit' });
  };

  await page.setViewportSize({ width: 390, height: 844 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);

  /* 0) sessiya yo'q — ro'yxat ekrani darhol, neutral holat umuman chiqmaydi (avvalgi xulq buzilmagan) */
  R.qadam = '0)';
  R.yoqForma = await kut(() => window.__q.forma > 0, 8000);
  R.yoqNeutral = (await sozlama()).yuk === 0;

  /* ro'yxatdan o'tamiz — keyin qayta ochishlar */
  R.qadam = 'reg)';
  await fill('Jasur', 'Sessiya Sinov'); await fill('jasur@', 'sessiya' + Date.now() + '@test.uz'); await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/);
  R.regIshJoyi = await page.locator('[data-ishjoyi]').waitFor({ timeout: 20000 }).then(() => true, () => false);

  /* 1) yaroqli sessiya, /api/me KUTISH ms kechikadi → kutish paytida neutral holat, kirish ekrani YO'Q; keyin ish joyi */
  R.qadam = '1)';
  kechikish = KUTISH; rejim = 'haqiqiy';
  await ochish('/app.html');
  R.k1Neutral = await kut(() => window.__q.yuk > 0 && !!document.querySelector('[data-yuklanish]'), 6000);
  await page.waitForTimeout(KUTISH / 2);                                    // kechikishning o'rtasi: hali ham neutral, ilova ham, forma ham yo'q
  const o1 = await M(() => ({ forma: !!document.querySelector('[data-auth],input[type=password]'), neutral: !!document.querySelector('[data-yuklanish]'), ilova: !!document.querySelector('[data-ishjoyi]'), matn: (document.querySelector('[data-yuklanish]') || {}).textContent || '' }));
  await page.screenshot({ path: `${OUT}/sessiya-1-neutral.png` });
  R.k1Orta = !o1.forma && o1.neutral && !o1.ilova && o1.matn === 'Yuklanmoqda…';
  R.k1Ilova = await page.locator('[data-ishjoyi]').waitFor({ timeout: 25000 }).then(() => true, () => false);
  const s1 = await sozlama();
  R.k1FormaYoq = s1.forma === 0;                                            // butun yuklanish davomida kirish ekrani birorta ham marta chizilmagan
  R.k1Neutral0 = s1.yuk > 0;
  R.k1Url = await M(() => location.pathname);

  /* 2) chuqur manzil (/loyihalar) + kechikish: neutral → "Loyihalarim", kirish ekrani yo'q */
  R.qadam = '2)';
  await ochish('/loyihalar');
  R.k2Neutral = await kut(() => !!document.querySelector('[data-yuklanish]'), 6000);
  await page.waitForTimeout(KUTISH / 2);
  R.k2Orta = await M(() => !document.querySelector('[data-auth],input[type=password]'));
  R.k2Loyihalar = await kut(() => document.body.innerText.includes('Loyihalarim'), 25000);
  R.k2FormaYoq = (await sozlama()).forma === 0;
  R.k2Url = await M(() => location.pathname);

  /* 3) ruscha til: neutral holat tanlangan tilda, lug'at (alohida bo'lak) kelgach ham kirish ekrani yo'q */
  R.qadam = '3)';
  await ochish('/app.html', 'ru');
  R.k3Neutral = await kut(() => { const e = document.querySelector('[data-yuklanish]'); return !!e && e.textContent === 'Загрузка…'; }, 8000);
  R.k3Ilova = await page.locator('[data-ishjoyi]').waitFor({ timeout: 25000 }).then(() => true, () => false);
  R.k3FormaYoq = (await sozlama()).forma === 0;
  R.k3Til = await M(() => document.documentElement.lang);

  /* 4) internet yo'q (/api/me uziladi): kirgan holat saqlanadi → ilova; kirish ekrani chiqmaydi */
  R.qadam = '4)';
  kechikish = 0; rejim = 'uzildi';
  await ochish('/app.html');
  R.k4Ilova = await page.locator('[data-ishjoyi]').waitFor({ timeout: 25000 }).then(() => true, () => false);
  R.k4FormaYoq = (await sozlama()).forma === 0;

  /* 5) sekin tarmoq + sekin protsessor (telefon): kirish ekrani chiqmaydi (avval 1–3 s ko'rinardi) */
  R.qadam = '5)';
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  kechikish = 0; rejim = 'haqiqiy';
  await ochish('/app.html');
  R.k5Ilova = await page.locator('[data-ishjoyi]').waitFor({ timeout: 90000 }).then(() => true, () => false);
  R.k5FormaYoq = (await sozlama()).forma === 0;
  R.k5Neutral = (await sozlama()).yuk > 0;
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await cdp.detach();

  /* 6) sessiya tugagan (/api/me → 401, kechikish bilan): kutish paytida neutral; keyin — kirish ekrani (mavjud xulq) */
  R.qadam = '6)';
  kechikish = KUTISH; rejim = '401';
  await ochish('/app.html');
  R.k6Neutral = await kut(() => !!document.querySelector('[data-yuklanish]'), 6000);
  await page.waitForTimeout(KUTISH / 2);
  R.k6Orta = await M(() => !document.querySelector('[data-auth],input[type=password]') && !!document.querySelector('[data-yuklanish]'));
  R.k6Kirish = await kut(() => !!document.querySelector('[data-auth]'), 15000);
  const s6 = await sozlama();
  R.k6Tartib = s6.yukT > 0 && s6.formaT > s6.yukT;                           // avval neutral, keyin kirish ekrani
  R.k6Url = await M(() => location.pathname);
  R.k6Neutralyoq = await kut(() => !document.querySelector('[data-yuklanish]'), 3000);
  await page.screenshot({ path: `${OUT}/sessiya-6-kirish.png` });

  R.errs = errs;
  R.ok = R.yoqForma && R.yoqNeutral && R.regIshJoyi &&
    R.k1Neutral && R.k1Orta && R.k1Ilova && R.k1FormaYoq && R.k1Neutral0 && R.k1Url.startsWith('/loyiha/') &&
    R.k2Neutral && R.k2Orta && R.k2Loyihalar && R.k2FormaYoq && R.k2Url === '/loyihalar' &&
    R.k3Neutral && R.k3Ilova && R.k3FormaYoq && R.k3Til === 'ru' &&
    R.k4Ilova && R.k4FormaYoq &&
    R.k5Ilova && R.k5FormaYoq && R.k5Neutral &&
    R.k6Neutral && R.k6Orta && R.k6Kirish && R.k6Tartib && R.k6Neutralyoq && R.k6Url === '/kirish' &&
    errs.length === 0;
}
