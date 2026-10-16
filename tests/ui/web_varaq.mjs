/* TZ-09 8-bosqich: dizaynda yo'q qismlar — teshik/quvur, erkin shakl, oshxona sozlamasi, material va ERP plita.
 * Ishlatish: bash tests/ui/web.sh varaq */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/varaq-xato.png` }).catch(() => {});
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
  const V = (sel) => page.locator('[data-varaq] ' + sel);
  const app = (fn) => M(fn);

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Varaq Usta'); await fill('jasur@', 'varaq' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await waitText('Nima yasaymiz');
  await click(/^Oshxona$/); await page.waitForTimeout(400); await click(/Muharrirni ochish/);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.res)); i++) await page.waitForTimeout(250);
  await click(/^Xona$/); await page.waitForTimeout(600);

  /* 1) teshik: deraza 1200 (1-devor) + quvur, keyin quvur o'chiriladi */
  await click(/^\+ Qo'shish$/); await page.waitForTimeout(500);
  await V('label:has-text("Kenglik") input').fill('1200');
  await V('button:has-text("+ Qo\'shish")').click(); await page.waitForTimeout(600);
  await V('button:has-text("Quvur")').click();
  await V('button:has-text("2-devor")').click();
  await V('label:has-text("Devor boshidan") input').fill('800');
  await V('button:has-text("+ Qo\'shish")').click(); await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/varaq-1440-teshik.png` });
  R.teshiklar = await app(() => ({ o: window.__app.doc.room.openings.map(o => o.type + ':' + o.width + '@' + o.wall), u: window.__app.doc.room.utilities.map(u => u.type + ':' + u.offset + '@' + u.wall) }));
  await V('button[aria-label^="O\'chirish: Quvur"]').click(); await page.waitForTimeout(500);
  R.quvurOchdi = await app(() => window.__app.doc.room.utilities.length === 0);
  await V('button[aria-label="Yopish"]').click(); await page.waitForTimeout(300);
  R.royxatda = await has('Deraza');

  /* 2) erkin shakl → L → qo'llash */
  await click(/Erkin$/); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/varaq-1440-shakl.png` });
  await V('button:has-text("L-shakl")').click(); await V('button:has-text("Qo\'llash")').click(); await page.waitForTimeout(900);
  R.lShakl = await app(() => window.__app.doc.room.outline.length);

  /* 3) oshxona sozlamasi: dobor 80 */
  await page.locator('button[aria-label="Oshxona elementlarini sozlash"]').click(); await page.waitForTimeout(400);
  await V('label:has-text("Dobor") input').fill('80');
  await page.screenshot({ path: `${OUT}/varaq-1440-oshxona.png` });
  await V('button:has-text("Saqlash")').click(); await page.waitForTimeout(500);
  R.dobor = await app(() => window.__app.doc.kitchen.doborH);
  R.doborMatni = await has('80 mm');

  /* 4) material: korpus chipi → ERP plita qidiruvi → tanlash → narx o'zgaradi */
  const jami0 = await app(() => window.__app.res.priceRes.total);
  await click(/^Mebel$/); await page.waitForTimeout(500);
  await page.locator('[data-panel] button', { hasText: 'Korpus' }).first().click(); await page.waitForTimeout(500);
  await V('input[placeholder*="Qidiruv"]').fill('egger'); await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/varaq-1440-material.png` });
  R.plitaSoni = await M(() => document.querySelectorAll('[data-varaq] button').length);
  await V('button:has-text("so\'m")').first().click(); await page.waitForTimeout(1200);
  R.tanlangan = await app(() => window.__app.state.sheet && window.__app.state.sheet.name);
  R.jamiOzgardi = (await app(() => window.__app.res.priceRes.total)) !== jami0;
  await V('button[aria-label="Yopish"]').click(); await page.waitForTimeout(300);
  R.chipda = R.tanlangan ? await has(R.tanlangan) : false;

  /* telefon: varaq sig'adimi */
  await page.setViewportSize({ width: 390, height: 844 });
  await click(/^Xona$/); await page.waitForTimeout(500);
  await click(/^\+ Qo'shish$/); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/varaq-390-teshik.png` });
  R.hScroll = await M(() => document.documentElement.scrollWidth > innerWidth + 1);

  R.errs = errs;
  R.ok = R.teshiklar.o.includes('window:1200@0') && R.teshiklar.u.includes('pipe:800@1') && R.quvurOchdi && R.royxatda && R.lShakl === 6 &&
    R.dobor === 80 && R.doborMatni && !!R.tanlangan && R.jamiOzgardi && R.chipda && !R.hScroll && errs.length === 0;
}
