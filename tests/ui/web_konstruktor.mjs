/* TZ-22: avtomatik konstruksiya (AI'siz) — Mebel qadamidagi tugma → oyna → variantlar → "Qo'llash".
 * Xonaga deraza (1-devor) va quvur (1-devor) qo'shiladi; moyka quvur yonida, eshiklar ochilganda bir-biriga kirmaydi,
 * telefon (390 px) — gorizontal siljish yo'q. Ishlatish: bash tests/ui/web.sh konstruktor */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/konstruktor-xato.png` }).catch(() => {});
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

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Konstruktor Usta'); await fill('jasur@', 'kons' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });   // TZ-25: darhol ish joyi
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);   // TZ-25: tez boshlash — oshxona
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.res)); i++) await page.waitForTimeout(250);
  if (await has("O'tkazib yuborish")) { await click(/O'tkazib yuborish/); await page.waitForTimeout(300); }

  /* namuna oshxona — konstruktor bilan: faqat MebelCity modullari, dobor va texnika */
  R.namuna = await M(() => window.__app.doc.placements.map(p => p.frg));
  R.namunaMC = R.namuna.length > 0 && R.namuna.every(c => /^(MC-|SP-ST-00[56]|SP-TX-00[48])/.test(c));

  /* xona: deraza (1-devor, 1200) va quvur (1-devor, 1900 mm) */
  await click(/^Xona$/); await page.waitForTimeout(600);
  await click(/^\+ Qo'shish$/); await page.waitForTimeout(500);
  await V('label:has-text("Kenglik") input').fill('1200');
  await V('button:has-text("+ Qo\'shish")').click(); await page.waitForTimeout(500);
  await V('button:has-text("Quvur")').click();
  await V('button:has-text("1-devor")').click();
  await V('label:has-text("Devor boshidan") input').fill('1900');
  await V('button:has-text("+ Qo\'shish")').click(); await page.waitForTimeout(500);
  await page.locator('[data-varaq] button[aria-label="Yopish"]').click(); await page.waitForTimeout(400);

  /* Mebel → Avtomatik konstruksiya */
  await click(/^Mebel$/); await page.waitForTimeout(600);
  await page.locator('button[data-konstruktor]').click(); await page.waitForTimeout(500);
  R.oyna = await M(() => !!document.querySelector('[data-varaq="konstruktor"]'));
  await page.screenshot({ path: `${OUT}/konstruktor-1440-oyna.png` });
  await V('button:has-text("Variantlarni ko\'rish")').click(); await page.waitForTimeout(1500);
  R.variantlar = await M(() => document.querySelectorAll('[data-varaq] [data-variant]').length);
  R.izoh = await M(() => (document.querySelector('[data-varaq] [data-variant="0"]') || {}).innerText || '');
  await page.screenshot({ path: `${OUT}/konstruktor-1440-variantlar.png` });
  await V('[data-variant="0"] button:has-text("Qo\'llash")').click(); await page.waitForTimeout(500);
  R.tasdiq = await has('Joriy mebel almashtirilsinmi?');
  if (R.tasdiq) { await page.locator('[role=dialog][aria-label="Joriy mebel almashtirilsinmi?"] button', { hasText: "Qo'llash" }).click(); await page.waitForTimeout(800); }
  R.qollandi = await waitText("Konstruksiya qo'llandi", 4000);
  R.mebel = await M(() => window.__app.doc.placements.map(p => p.frg));
  R.moyka = R.mebel.some(c => /^MC-KP-0[78]$/.test(c));
  R.stoleshnitsa = await M(() => window.__app.doc.kitchen && window.__app.doc.kitchen.stoleshnitsa && window.__app.doc.kitchen.stoleshnitsaD);
  for (let i = 0; i < 20 && !(await M(() => window.__app.res && window.__app.res.priceRes)); i++) await page.waitForTimeout(200);
  R.narx = await M(() => window.__app.res.priceRes.total);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/konstruktor-1440-3d.png` });
  await click(/Eshiklarni ochish/); await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}/konstruktor-1440-3d-ochiq.png` });
  await click(/^2D$/); await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/konstruktor-1440-2d-ochiq.png` });

  /* telefon: oyna sig'adi */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
  await M(() => window.scrollTo(0, 0));
  const btn = page.locator('button[data-konstruktor]');
  if (await btn.count()) { await btn.first().scrollIntoViewIfNeeded(); await btn.first().click(); await page.waitForTimeout(400); }
  if (await V('button:has-text("Variantlarni ko\'rish")').count()) { await V('button:has-text("Variantlarni ko\'rish")').click(); await page.waitForTimeout(1200); }
  R.hScroll = await M(() => document.documentElement.scrollWidth > innerWidth + 1);
  await page.screenshot({ path: `${OUT}/konstruktor-390-oyna.png` });

  R.errs = errs;
  R.ok = R.namunaMC && R.oyna && R.variantlar >= 1 && R.tasdiq && /quvur yonida/.test(R.izoh) && R.qollandi && R.moyka && R.stoleshnitsa === 600 &&
    R.narx > 0 && !R.hScroll && errs.length === 0;
}
