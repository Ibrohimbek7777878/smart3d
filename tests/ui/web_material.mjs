/* TZ-23 E: material va rang tanlash. Tekshiriladi: qismlar (korpus, polka, fasad, orqa, stoleshnitsa), polka standarti 16 mm
 * (egasi #120) va qalinlik filtri (16/18), rang palitrasi (oq) → ERP plitasi → narx va 3D rang, "bitta umumiy material",
 * modul kartasidagi "Material" — faqat shu modul, "Butun loyihaga", saqlash (erpMat), telefon (390) — sig'adi.
 * Ishlatish: bash tests/ui/web.sh material */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/material-xato.png` }).catch(() => {});
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
  const V = (sel) => page.locator('[data-varaq="material"] ' + sel);
  const chip = (blok, matn) => V(`[data-material-${blok}] button`).filter({ hasText: matn }).first();
  const st = () => M(() => { const s = window.__app.state; return { mat: s.matCode, polka: s.polkaCode, fasad: s.fasadCode, orqa: s.orqaCode, jami: window.__app.res && window.__app.res.priceRes.total }; });
  const royxat = () => M(() => [...document.querySelectorAll('[data-varaq="material"] [data-material-royxat] button')].map(b => b.innerText.replace(/\s+/g, ' ')));
  const tanla = async (re) => { const b = V('[data-material-royxat] button').filter({ hasText: re }).first(); await b.click(); await page.waitForTimeout(1200); };

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Material Usta'); await fill('jasur@', 'material' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });   // TZ-25: darhol ish joyi
  await page.waitForTimeout(400);   // TZ-25: bo'sh ish joyi (standart xona)
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);

  /* modul: MC-KP-02 (polkali) — ikki dona */
  for (let i = 0; i < 2; i++) {
    await page.locator('input[placeholder*="shkaf 2 eshik"]').fill('MC-KP-02'); await page.waitForTimeout(500);
    await page.locator('[data-panel] button.h5').first().click(); await page.waitForTimeout(1200);
  }
  R.modullar = await M(() => window.__app.doc.placements.filter(p => p.frg === 'MC-KP-02').length);
  R.boshi = await st();

  /* 1) polka — standart 16 mm, qalinlik filtri */
  await page.locator('[data-panel] button', { hasText: 'Korpus' }).first().click(); await page.waitForTimeout(500);
  R.qismlar = await M(() => [...document.querySelectorAll('[data-material-qism] button')].map(b => b.innerText.trim()));
  await chip('qism', 'Polka').click(); await page.waitForTimeout(300);
  R.polkaJoriy = await M(() => (document.querySelector('[data-material-joriy]') || {}).innerText || '');
  R.polkaQalinlik = await M(() => [...document.querySelectorAll('[data-material-qalinlik] button')].map(b => b.innerText.trim()));
  await chip('qalinlik', '18 mm').click(); await page.waitForTimeout(300);
  R.polka18 = (await royxat()).every(s => / 18(\.0)? mm/.test(s));
  await chip('qalinlik', '16 mm').click(); await page.waitForTimeout(300);
  R.polka16 = (await royxat()).every(s => / 16(\.0)? mm/.test(s));
  R.polkaDetal = await M(() => { const c = window.__app.res.cutlists.flatMap(x => x.parts.filter(p => p.slot === 'polka')); return c.length && c.every(p => p.thickness === 16); });

  /* 2) korpus: rang "Oq" → ERP plitasi (narxli) → narx o'zgaradi, 3D rangi oq */
  await chip('qism', 'Korpus').click(); await page.waitForTimeout(300);
  await chip('rang', 'Oq').click(); await page.waitForTimeout(400);
  R.oqRoyxat = await M(() => [...document.querySelectorAll('[data-material-royxat] button span[style*="border-radius: 6px"]')].slice(0, 20).map(s => getComputedStyle(s).backgroundColor));
  await page.screenshot({ path: `${OUT}/material-1440-korpus.png` });
  await tanla(/so'm/);
  R.korpus = await st();
  R.korpusNomi = await M(() => { const s = window.__app.state, m = window.__app.H.materials.panel_materials.find(x => x.code === s.matCode); return m && m.name; });
  R.narxOzgardi = R.korpus.jami !== R.boshi.jami;
  R.rang3d = await M(() => {
    const s = window.__app.sahna, rang = new Set();
    s.sp.groups.items.traverse(o => { if (o.isMesh && o.userData && o.userData.slot === 'korpus' && o.material && o.material.color) rang.add(o.material.color.getHex()); });
    return [...rang];
  });

  /* 3) bitta umumiy material — korpus, polka, fasad */
  await V('[data-material-umumiy]').click(); await page.waitForTimeout(1000);
  R.umumiy = await st();
  await V('button[aria-label="Yopish"]').click(); await page.waitForTimeout(300);

  /* 4) modul kartasi: "Material" — faqat shu modul fasadi */
  await page.locator('input[placeholder*="shkaf 2 eshik"]').fill('MC-KP-02'); await page.waitForTimeout(400);
  await page.locator('[data-panel] button.h5').first().click(); await page.waitForTimeout(1200);
  R.sel = await M(() => window.__app.state.sel);
  await page.locator('[data-modul-material]').click(); await page.waitForTimeout(500);
  R.modulDoira = await M(() => (document.querySelector('[data-material-joriy]') || {}).innerText || '');
  await chip('qism', 'Fasad').click(); await page.waitForTimeout(300);
  await chip('rang', "To'q yog'och").click(); await page.waitForTimeout(400);
  await tanla(/./);
  R.modulSlot = await M((id) => { const p = window.__app.doc.placements.find(x => x.id === id); return p && p.slots; }, R.sel);
  R.boshqalar = await M((id) => window.__app.doc.placements.filter(x => x.id !== id && x.slots && x.slots.fasad).length, R.sel);
  R.modulFasad = await M((id) => window.__app.res.cutlists.flatMap(c => c.parts).filter(p => p.slot === 'fasad').map(p => p.material), R.sel);
  await page.screenshot({ path: `${OUT}/material-1440-modul.png` });
  /* butun loyihaga */
  await V('[data-material-loyihaga]').click(); await page.waitForTimeout(1000);
  R.loyihaga = await M(() => ({ fasad: window.__app.state.fasadCode, qolgan: window.__app.doc.placements.filter(x => x.slots && x.slots.fasad).length }));
  await V('button[aria-label="Yopish"]').click(); await page.waitForTimeout(300);

  /* 5) saqlash: faqat ishlatilgan ERP materiallari */
  R.saqlash = await M(() => { const p = window.__app.projectPayload(), s = window.__app.state; return { polka: p.polka, kodlar: Object.keys(p.doc.erpMat || {}).sort(), kerak: [...new Set([s.matCode, s.polkaCode, s.fasadCode].filter(c => /^ERP-/.test(c)))].sort() }; });

  /* 6) telefon */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
  await click(/^Mebel$/); await page.waitForTimeout(400);
  await page.locator('[data-panel] button', { hasText: 'Korpus' }).first().click().catch(() => {}); await page.waitForTimeout(500);
  R.tel = await M(() => { const v = document.querySelector('[data-varaq="material"]'); const r = v && v.getBoundingClientRect(); return { bor: !!v, sigadi: !!r && r.left >= 0 && r.right <= innerWidth + 1, hScroll: document.documentElement.scrollWidth > innerWidth + 1 }; });
  await page.screenshot({ path: `${OUT}/material-390.png` });

  R.errs = errs;
  const erp = (c) => /^ERP-/.test(c || '');
  R.ok = R.modullar === 2 && R.boshi.polka === 'LDSP16' && R.qismlar.length === 5 && /16/.test(R.polkaJoriy) &&
    R.polkaQalinlik.includes('16 mm') && R.polkaQalinlik.includes('18 mm') && R.polka18 && R.polka16 && R.polkaDetal &&
    erp(R.korpus.mat) && !!R.korpusNomi && R.narxOzgardi && R.rang3d.includes(0xeeece6) &&
    R.umumiy.mat === R.korpus.mat && R.umumiy.polka === R.korpus.mat && R.umumiy.fasad === R.korpus.mat &&
    !!R.sel && /faqat shu modul/.test(R.modulDoira) && R.modulSlot && erp(R.modulSlot.fasad) && R.boshqalar === 0 &&
    R.loyihaga.fasad === R.modulSlot.fasad && R.loyihaga.qolgan === 0 &&
    R.saqlash.polka && JSON.stringify(R.saqlash.kodlar) === JSON.stringify(R.saqlash.kerak) &&
    R.tel.bor && R.tel.sigadi && !R.tel.hScroll && errs.length === 0;
}
