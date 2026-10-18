/* TZ-24 A: o'z modulini chizish. Tekshiriladi: "O'z modulingizni chizish" → tur (shkaf) → xonaga qo'shiladi, 3D da;
 * bo'limni tanlash, polka qo'shish, gorizontal bo'lish, bo'lgichni sudrash (32 mm qadam), o'lcham (eni 1500), ogohlantirish
 * (keng polka), narx; "Mening modullarim"ga saqlash va qayta qo'yish; loyiha saqlanib qayta ochilganda chizma tiklanadi;
 * modul kartasida "Chizmani tahrirlash"; telefon (390). Ishlatish: bash tests/ui/web.sh chizish */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/chizish-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const has = async (s) => (await M(() => document.body.innerText)).includes(s);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const waitText = async (s, ms = 10000) => { for (let i = 0; i < ms / 200; i++) { if (await has(s)) return true; await page.waitForTimeout(200); } return false; };
  const P = (sel, o) => page.locator('[data-chizish] ' + sel, o);
  const ch = () => M(() => { const d = window.__app.doc, k = Object.keys(d.chizmalar || {}); const p = d.placements.find(x => x.frg === k[0]); return { kodlar: k, p: p && { w: p.w, h: p.h, z: p.z }, n: d.placements.length }; });

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Chizuvchi Usta'); await fill('jasur@', 'chizish' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });   // TZ-25: darhol ish joyi
  await page.waitForTimeout(400);   // TZ-25: bo'sh ish joyi (standart xona)
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);
  if (await has("O'tkazib yuborish")) { await click(/^O'tkazib yuborish$/); await page.waitForTimeout(300); }

  /* 1) yangi modul — shkaf */
  await page.locator('[data-chizish-yangi]').click(); await page.waitForTimeout(400);
  R.turlar = await M(() => document.querySelectorAll('[data-chizish-tur]').length);
  await P('[data-chizish-tur="shkaf"]').click(); await page.waitForTimeout(1200);
  R.yaratildi = await ch();
  R.svg = await M(() => ({ bolim: document.querySelectorAll('[data-bolim]').length, bolgich: document.querySelectorAll('[data-bolgich]').length }));
  R.sahnada = await M((k) => { let n = 0; window.__app.sahna.sp.groups.items.traverse(o => { if (o.userData && o.userData.frg === k) n++; }); return n; }, R.yaratildi.kodlar[0]);

  /* 2) bo'lim 1 → gorizontal ×2; bo'lim 0 → polka + */
  await P('[data-bolim="1"]').click(); await page.waitForTimeout(200);
  await P('[data-bolish] button', { hasText: 'Gorizontal ×2' }).click(); await page.waitForTimeout(500);
  R.bolindi = await M(() => document.querySelectorAll('[data-bolgich]').length);
  await P('[data-bolim="0"]').click(); await page.waitForTimeout(200);
  const polka0 = await M(() => +document.querySelector('[data-sanoq="polka"] span:nth-of-type(2)').textContent);
  await P('[data-sanoq="polka"] button[aria-label="Oshirish"]').click(); await page.waitForTimeout(400);
  R.polka = [polka0, await M(() => +document.querySelector('[data-sanoq="polka"] span:nth-of-type(2)').textContent)];

  /* 3) bo'lgichni sudrash — 32 mm qadam */
  const g = await M(() => { const e = document.querySelector('[data-bolgich=":0"]'); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await page.mouse.move(g[0], g[1]); await page.mouse.down(); await page.mouse.move(g[0] + 30, g[1], { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(500);
  R.surildi = await M(() => { const s = window.__app.doc.chizmalar; const k = Object.keys(s)[0]; return s[k].ch.tugun[0].bo[0][0]; });
  await page.screenshot({ path: `${OUT}/chizish-1440.png` });

  /* 4) o'lcham — eni 1500; keng — ogohlantirish */
  await P('[data-olcham="w"]').fill('1500'); await P('[data-olcham="w"]').press('Enter'); await page.waitForTimeout(600);
  R.eni = (await ch()).p.w;
  await P('[data-olcham="w"]').fill('2600'); await P('[data-olcham="w"]').press('Enter'); await page.waitForTimeout(600);
  R.ogoh = await M(() => (document.querySelector('[data-chizish-ogoh]') || {}).innerText || '');
  await P('[data-olcham="w"]').fill('1200'); await P('[data-olcham="w"]').press('Enter'); await page.waitForTimeout(600);
  R.narx = await M(() => (document.querySelector('[data-chizish-narx]') || {}).innerText || '');

  /* 5) mening modullarimga → qayta qo'yish */
  await P('[data-modullarimga]').click(); await page.waitForTimeout(1000);
  await P('[data-chizish-yop]').click(); await page.waitForTimeout(300);
  await page.locator('[data-chizish-yangi]').click(); await page.waitForTimeout(1200);
  R.modullarim = await M(() => document.querySelectorAll('[data-modulim]').length);
  await P('[data-modulim="0"]').click(); await page.waitForTimeout(1000);
  R.ikkinchi = await ch();
  await P('[data-chizish-yop]').click(); await page.waitForTimeout(300);

  /* 6) modul kartasi — "Chizmani tahrirlash" */
  R.karta = await page.locator('[data-chizma-tahrir]').count();

  /* 7) saqlanadi va qayta ochilganda tiklanadi */
  await page.waitForTimeout(3500);
  await page.locator('[data-sarlavha="loyihalar"]').click(); await page.waitForTimeout(1500);
  await page.locator('main button.h2').first().click(); await page.waitForTimeout(2500);
  for (let i = 0; i < 30 && !(await M(() => window.__app.res && window.__app.res.priceRes)); i++) await page.waitForTimeout(250);
  R.qayta = await M(() => { const d = window.__app.doc, k = Object.keys(d.chizmalar || {}); return { k: k.length, katalogda: k.every(x => !!window.__app.H.catalog[x]), n: d.placements.length, narx: window.__app.res.priceRes.total }; });

  /* 8) telefon */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
  await click(/^Mebel$/); await page.waitForTimeout(400);
  await page.locator('[data-chizish-yangi]').click(); await page.waitForTimeout(400);
  await P('[data-chizish-tur="tumba"]').click(); await page.waitForTimeout(1000);
  R.tel = await M(() => ({ hScroll: document.documentElement.scrollWidth > innerWidth + 1, svg: !!document.querySelector('[data-chizma-svg]') }));
  await page.locator('[data-chizma-svg]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/chizish-390.png` });

  R.errs = errs;
  R.ok = R.turlar === 5 && R.yaratildi.kodlar.length === 1 && R.yaratildi.p && R.yaratildi.p.w === 1200 && R.svg.bolim >= 3 && R.svg.bolgich === 1 && R.sahnada > 0 &&
    R.bolindi === 2 && R.polka[1] === R.polka[0] + 1 && R.surildi > 0 && R.surildi % 32 === 0 &&
    R.eni === 1500 && /juda keng/.test(R.ogoh) && /so'm/.test(R.narx) &&
    R.modullarim === 1 && R.ikkinchi.kodlar.length === 2 && R.karta === 1 &&
    R.qayta.k === 2 && R.qayta.katalogda && R.qayta.n === 2 && R.qayta.narx > 0 && !R.tel.hScroll && R.tel.svg && errs.length === 0;
}
