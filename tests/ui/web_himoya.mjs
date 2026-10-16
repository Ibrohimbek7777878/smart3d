/* TZ-19 §3: sayt CSP ostida to'liq ishlaydi (birorta skript/uslub/ulanish bloklanmaydi), kirish kaliti JS'ga ko'rinmaydi,
 * PDF hisobot oynasi o'zi chop etadi (xesh bilan ruxsat), eski sayt ham (server orqali) CSP bilan ochiladi.
 * Ishlatish: bash tests/ui/web.sh himoya */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/himoya-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const errs = [], csp = [];
  const konsol = [];   // har qanday konsol xatosi (4xx tarmoq javobi — kutilgan, masalan noto'g'ri parol — bundan mustasno)
  const onConsole = (m) => { const t = m.text(); if (/Content Security Policy|Refused to (execute|load|apply|connect)/i.test(t)) csp.push(t.slice(0, 200));
    else if (m.type() === 'error' && !/Failed to load resource/.test(t)) konsol.push(t.slice(0, 160)); };
  page.on('console', onConsole);
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const txt = () => M(() => document.body.innerText);
  const has = async (t) => (await txt()).includes(t);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const waitText = async (t, ms = 10000) => { for (let i = 0; i < ms / 200; i++) { if (await has(t)) return true; await page.waitForTimeout(200); } return false; };
  const base = page.url().split(/[?#]/)[0].replace(/app\.html$/, '');

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.goto(base + 'app.html?t=' + Date.now() + '#s=reg'); await page.waitForTimeout(2500);   // ro'yxat oynasidagi 3D ham
  R.cspSarlavha = await M(async () => (await fetch(location.href)).headers.get('content-security-policy') || '');

  /* ro'yxat → muharrir: 3D sahna, 4 qadam */
  await fill('Jasur', 'Himoya Usta'); await fill('jasur@', 'himoya' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });   // TZ-25: darhol ish joyi
  R.kalitJSdaYoq = await M(() => localStorage.getItem('smart3d.token') === null && !document.cookie.includes('s3d_sess'));
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);   // TZ-25: tez boshlash — oshxona
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.res)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1500);
  for (const s of ['Xona', 'Mebel', 'Narx', 'Fayllar']) { await click(new RegExp('^' + s + '$')); await page.waitForTimeout(700); }
  R.saqlandi = await (async () => { for (let i = 0; i < 40; i++) { if (await M(() => !!document.querySelector('[data-save="ok"]'))) return true; await page.waitForTimeout(200); } return false; })();   // avtomatik saqlash — cookie bilan

  /* fayllar: Excel (yuklab olish) va PDF hisobot (yangi oyna o'zi chop etadi) */
  const dl = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
  await click(/Excel smeta/);
  R.excel = !!(await dl);
  const pop = page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);
  await click(/Hisobot \(PDF\)/);
  const w = await pop;
  if (w) {
    w.on('console', onConsole);
    await w.waitForLoadState('load').catch(() => {});
    R.hisobotChop = await w.evaluate(() => typeof window.onload === 'function', undefined, false).catch(() => false);
    await w.close().catch(() => {});
  } else R.hisobotChop = false;

  /* ichini ko'rish va sozlamalar */
  await click(/^Mebel$/); await page.waitForTimeout(500);
  await page.locator('[data-panel] button').filter({ hasText: 'MC-KP' }).first().click().catch(() => {});
  await page.waitForTimeout(800);
  if (await click(/Ichini ko'rish →/)) { await page.waitForTimeout(2500); await page.locator('button[aria-label="Yopish"]').last().click().catch(() => {}); }
  await page.locator('[aria-label="Sozlamalar"]').click(); await waitText('Akkaunt');

  /* sayt (bosh sahifa) — 3D hikoya va demo */
  await page.goto(base + '?t=' + Date.now()); await page.waitForTimeout(3000);
  await M(() => window.scrollTo(0, document.documentElement.scrollHeight / 3)); await page.waitForTimeout(1500);

  /* production sxemasi — haqiqiy server (Express): "/" — yangi sayt, "/app.html" — ilova, "/eski/" — eski sayt (TZ-09 Q7) */
  const SRV = `http://127.0.0.1:${process.env.NPORT}`;
  await page.goto(SRV + '/?t=' + Date.now()); await page.waitForTimeout(3000);
  R.prodSayt = await M(() => !!document.querySelector('[data-s3d]'));
  await M(() => localStorage.setItem('s3d-til', 'uz'));   // boshqa port — boshqa origin: birinchi ochilishda brauzer tili (en-US) olinardi (TZ-18 §3)
  await page.goto(SRV + '/app.html?t=' + Date.now() + '#s=reg'); await page.waitForTimeout(3000);
  R.prodIlova = await has('Ro\'yxatdan o\'tish');
  if (!R.prodIlova) { R.prodIlovaMatn = (await txt()).slice(0, 200); await page.screenshot({ path: `${process.env.QA_OUT}/himoya-prod-ilova.png` }); }
  await page.goto(SRV + '/yoq-sahifa'); await page.waitForTimeout(800);
  R.prod404 = await has('Sahifa topilmadi');
  /* eski sayt — CSP bilan: importmap (xesh) va three.js ishlaydi */
  const yangiKonsol = konsol.length;
  await page.goto(SRV + '/eski/index.html?t=' + Date.now()); await page.waitForTimeout(5000);
  R.eskiSayt = await M(() => !!(window.__s3d && window.__s3d.state));
  R.eskiCsp = await M(async () => !!(await fetch(location.href)).headers.get('content-security-policy'));

  /* eski sayt (/eski/) — eski kod, bu tekshiruvga kirmaydi: undan oldingi xatolar soni */
  page.off('console', onConsole);
  R.csp = csp; R.errs = errs; R.konsol = konsol;
  R.ok = /script-src 'self'/.test(R.cspSarlavha) && R.kalitJSdaYoq && R.saqlandi && R.excel && R.hisobotChop === true &&
    R.prodSayt && R.prodIlova && R.prod404 && R.eskiSayt && R.eskiCsp && csp.length === 0 && yangiKonsol === 0 && errs.length === 0;
}
