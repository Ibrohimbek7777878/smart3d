/* TZ-19 §2: xato kodlari brauzerda — foydalanuvchi kodni ko'radi, xato serverga yoziladi, admin "Xatolar jurnali"da topadi.
 * Ishlatish: bash tests/ui/web.sh xatolar */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/xatolar-xato.png` }).catch(() => {});
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
  const waitText = async (t, ms = 10000) => { for (let i = 0; i < ms / 200; i++) { if (await has(t)) return true; await page.waitForTimeout(200); } return false; };

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(page.url().split('#')[0] + '?t=' + Date.now() + '#s=login'); await page.waitForTimeout(1500);

  /* 1) noto'g'ri parol — maydon ostida xabar (kod ko'rinmaydi, bu tekshiruv xatosi) */
  await fill('jasur@', 'admin@smart3d.uz'); await fill('kamida 8', 'notogri-parol-1');
  await click(/^Kirish$/); await page.waitForTimeout(1200);
  R.notogriParol = await has('Email yoki parol noto\'g\'ri');

  /* 2) admin kiradi */
  await fill('kamida 8', 'web-test-admin-1');
  await click(/^Kirish$/); await waitText('Loyihalarim');

  /* 3) noto'g'ri loyiha fayli → xabar + kod S3D-PROJ-101 (toast) */
  await page.locator('input[type=file][accept*="json"]').setInputFiles({ name: 'rasm.json', mimeType: 'application/json', buffer: Buffer.from('{"salom":1}') });
  R.toastKod = await (async () => { for (let i = 0; i < 25; i++) { const k = await M(() => { const e = document.querySelector('[data-kod]'); return e && e.textContent; }); if (k) return k; await page.waitForTimeout(200); } return null; })();
  await page.screenshot({ path: `${OUT}/xatolar-1440-toast.png`, clip: { x: 320, y: 700, width: 800, height: 140 } });

  /* 4) kutilmagan JS xatosi (global) — S3D-JS-101 jurnalga */
  await M(() => { setTimeout(() => { throw new Error('qa-sinov xatosi'); }, 0); });
  await page.waitForTimeout(1200);

  /* 5) Sozlamalar → Xatolar jurnali (faqat admin) */
  await page.locator('[aria-label="Sozlamalar"]').click(); await waitText('Xatolar jurnali');
  await page.waitForTimeout(1200);
  const kodlar = async () => M(() => [...document.querySelectorAll('[data-set="xatolar"] button b')].map(b => b.textContent));
  R.jurnalda = await kodlar();
  await page.locator('[data-set="xatolar"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/xatolar-1440-jurnal.png` });
  /* kod bo'yicha qidiruv */
  await page.locator('[data-set="xatolar"] input').fill('S3D-PROJ-101');
  await page.locator('[data-set="xatolar"] button', { hasText: 'Qidirish' }).click(); await page.waitForTimeout(1000);
  R.qidiruv = await kodlar();

  /* telefon: bo'lim sig'adimi */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  R.hScroll = await M(() => document.documentElement.scrollWidth > innerWidth + 1);
  await page.locator('[data-set="xatolar"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/xatolar-390-jurnal.png` });

  R.errs = errs.filter(e => !/qa-sinov xatosi/.test(e));
  R.ok = R.notogriParol && R.toastKod === 'S3D-PROJ-101' && R.jurnalda.includes('S3D-PROJ-101') && R.jurnalda.includes('S3D-JS-101') &&
    R.jurnalda.includes('S3D-AUTH-001') && R.qidiruv.length === 1 && R.qidiruv[0] === 'S3D-PROJ-101' && !R.hScroll && R.errs.length === 0;
}
