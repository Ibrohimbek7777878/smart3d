/* TZ-09 3–5-bosqich: yangi frontend muharriri — haqiqiy loyiha, hisob, 3D (bizning sahna, dizayn ko'rinishida).
 * Ishlatish: bash tests/ui/web.sh muharrir */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/muharrir-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  /* brauzer/drayver ogohlantirishi (GL Driver Message — GPU unumdorligi, bizning kod emas) hisobga olinmaydi */
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver Message/.test(m.text())) errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const txt = () => M(() => document.body.innerText);
  const has = async (t) => (await txt()).includes(t);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const waitText = async (t, ms = 10000) => { for (let i = 0; i < ms / 200; i++) { if (await has(t)) return true; await page.waitForTimeout(200); } return false; };
  const shot = (n) => page.screenshot({ path: `${OUT}/muharrir-1440-${n}.png` });
  const narx = () => M(() => { const b = [...document.querySelectorAll('header button')].find(x => /so'm/.test(x.textContent)); return b ? b.textContent.replace(/\s+/g, ' ').trim() : null; });

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);

  R.qadam = 'royxat';
  await fill('Jasur', 'Muharrir Usta');
  await fill('jasur@', 'muharrir' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/);
  await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });   // TZ-25: darhol ish joyi
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);

  R.qadam = 'muharrir';
  R.sahna = await (async () => { for (let i = 0; i < 50; i++) { const c = await M(() => !!document.querySelector('[data-scene] canvas')); if (c) return true; await page.waitForTimeout(200); } return false; })();
  await page.waitForTimeout(2500);
  R.narx1 = await narx();
  R.ichki = await M(() => { const a = window.__app; return a ? { H: !!a.H, res: !!a.res, dv: a.state.dv, dataReady: a.state.dataReady, mebel: a.doc.placements.length, ekran: a.state.screen, xato: a.state.dataErr } : 'yo\'q'; });
  R.recalcXato = await M(() => { const a = window.__app; try { a.H.recalc(a.doc, { materialCode: a.state.matCode, fasadCode: a.state.fasadCode, sheet: null, nestCfg: a.nestCfg() }); return 'ok'; } catch (e) { return String(e && e.stack || e).slice(0, 600); } });
  R.namunaNarxEmas = !!R.narx1 && !/5 701 103/.test(R.narx1);
  await shot('1-mebel');
  R.katalog = await M(() => (document.body.innerText.match(/(\d+) ta modul/) || [])[1] || null);
  

  R.qadam = 'qoshish';
  const cards = page.locator('[data-panel] button:has-text("so\'m")');
  R.kartalar = await cards.count();
  if (R.kartalar) { await cards.first().click(); await page.waitForTimeout(1200); }
  R.qoshildi = await waitText('Eni', 4000);
  await shot('2-modul-karta');
  R.narx2 = await narx();

  R.qadam = 'nusxa';
  const n0 = await M(() => document.body.innerText.match(/Nusxa qo'shildi/) ? 1 : 0);
  await page.locator('button[aria-label*="Nusxa"]').first().click().catch(() => {});
  await page.waitForTimeout(900);
  R.nusxa = await has("Nusxa qo'shildi");
  await page.locator('button[aria-label="90 gradus burish"]').first().click().catch(() => {});
  await page.waitForTimeout(700);

  R.qadam = 'narx';
  await click(/^Narx$/); await page.waitForTimeout(1200);
  await shot('3-narx');
  const t = await txt();
  /* egasi #300: ekranda plita «varaq» emas «list» deyiladi (test matni moslandi) */
  R.narxBosqich = { foyda: (t.match(/Foyda \(\+(\d+)%\)/) || [])[1] || null, raskroy: (t.match(/(\d+) list · (\d+) detal · isrof (\d+)%/) || [])[0] || null };

  R.qadam = 'fayllar';
  await click(/^Fayllar$/); await page.waitForTimeout(1000);
  await shot('4-fayllar');
  R.tekshiruv = await M(() => (document.body.innerText.match(/\d+ detal \d+ listga sig'di/) || [])[0] || null);

  R.qadam = 'xona';
  await click(/^Xona$/); await page.waitForTimeout(1000);
  await shot('5-xona');

  R.qadam = '2d';
  await click(/^2D$/); await page.waitForTimeout(1500);
  await shot('6-2d');
  await click(/^3D$/); await page.waitForTimeout(1500);

  R.qadam = 'eshik';
  await click(/Eshiklarni ochish/); await page.waitForTimeout(1800);
  await shot('7-eshiklar');

  R.errs = errs;
  R.ok = R.sahna && R.namunaNarxEmas && R.recalcXato === 'ok' && /\d/.test(R.narx1 || '') && R.katalog === '191' &&   // TZ-22: +2 yon dobor; 2026-10-16: +6 stol (texnika kodi SP-TX ga ko'chdi); TZ-37 full base: +61 MC-FB (130 → 191)
    R.qoshildi && R.nusxa && !!R.narxBosqich.raskroy && !!R.tekshiruv && errs.length === 0;
}
