/* TZ-37: full base.zip dan 61 yangi modul (MC-FB-…) brauzerda — katalogda ko'rinadi (qidiruv "MC-FB"), uch tilda nom, bitta modul (3 tortma tandem)
 * sahnaga qo'yiladi, o'lchami o'zgartirilganda formula ishlaydi (narx o'zgaradi, modul sahnada qayta quriladi), "Ichini ko'rish" (rentgen) — detallar ro'yxati.
 * Ishlatish: bash tests/ui/web.sh frag50   Skrinshotlar: tests/ui/out/web/frag50-*.png */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/frag50-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const txt = () => M(() => document.body.innerText);
  const has = async (t) => (await txt()).includes(t);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Frag50 Usta'); await fill('jasur@', 'frag50' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);

  /* 1) katalogda yangi modullar */
  const qid = page.locator('input[placeholder*="shkaf 2 eshik"]');
  await qid.fill('MC-FB'); await page.waitForTimeout(700);
  R.kartalar = await page.locator('[data-panel] button.h5').count();
  R.katalogSoni = await M(() => Object.keys(window.__app.H.catalog).filter(c => /^MC-FB-\d\d$/.test(c)).length);
  R.matn = await M(() => document.body.innerText.includes('MC · Oshxona pastki'));
  await page.screenshot({ path: `${OUT}/frag50-1-katalog.png` });
  await qid.fill('tandem'); await page.waitForTimeout(600);
  R.tandem = await page.locator('[data-panel] button.h5').count();
  const tandemNomlari = await M(() => [...document.querySelectorAll('[data-panel] button.h5')].map(b => b.innerText.split('\n')[0]).slice(0, 3));
  R.tandemNom = tandemNomlari;
  await page.screenshot({ path: `${OUT}/frag50-2-tandem.png` });

  /* 2) bitta modul: 3 tortma tandem (MC-FB-22) sahnaga */
  await qid.fill('MC-FB-22'); await page.waitForTimeout(600);
  const narx0 = (await M(() => window.__app.res && window.__app.res.priceRes.total)) || 0;
  await page.locator('[data-panel] button.h5').first().click(); await page.waitForTimeout(1800);
  R.qoshildi = await M(() => window.__app.doc.placements.some(p => p.frg === 'MC-FB-22'));
  const p1 = await M(() => { const p = window.__app.doc.placements.find(q => q.frg === 'MC-FB-22'); return p ? { w: p.w, d: p.d, h: p.h } : null; });
  const narx1 = await M(() => window.__app.res.priceRes.total);
  R.p1 = p1; R.narx1 = narx1;
  await page.screenshot({ path: `${OUT}/frag50-3-qoyildi.png` });

  /* 3) o'lchamni o'zgartirish: eni 450 → 540 (chegara 300–540) — narx oshadi, modul qayta quriladi */
  const eni = page.locator('input[type=number]').first();
  await eni.fill('540'); await eni.blur(); await page.waitForTimeout(1500);
  const p2 = await M(() => { const p = window.__app.doc.placements.find(q => q.frg === 'MC-FB-22'); return p ? { w: p.w, d: p.d, h: p.h } : null; });
  const narx2 = await M(() => window.__app.res.priceRes.total);
  R.p2 = p2; R.narx2 = narx2;
  await page.screenshot({ path: `${OUT}/frag50-4-kengaytirildi.png` });

  /* 4) rentgen: "Ichini ko'rish" — tortma tandem qismlari */
  const ichki = await click(/Ichini ko'rish →/); await page.waitForTimeout(3000);
  R.ichkiTugma = ichki;
  R.fasad = await M(() => { const m = document.body.innerText.match(/(\d+)×\s*Fasad ящика|(\d+)×\s*Tortma fasadi|(\d+)×\s*Fasad yashika/i); return m ? +(m[1] || m[2] || m[3]) : 0; });
  R.matnIchki = (await txt()).slice(0, 1800);
  await page.screenshot({ path: `${OUT}/frag50-5-ichi.png` });

  R.errs = errs;
  R.ok = R.katalogSoni >= 50 && R.kartalar >= 50 && R.matn && R.tandem >= 6 && R.qoshildi && narx1 > narx0 && p2 && p2.w === 540 && p1 && p1.w === 450 &&
    narx2 > narx1 && R.ichkiTugma && errs.length === 0;
}
