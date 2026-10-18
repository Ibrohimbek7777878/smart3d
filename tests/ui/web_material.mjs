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
  const filtr = async () => { if (!(await V('[data-material-filtr-panel]').count())) { await V('[data-material-filtr]').click(); await page.waitForTimeout(250); } };
  const dot = (nom) => V(`[data-material-rang] button[aria-label^="${nom}"]`).first();
  const st = () => M(() => { const s = window.__app.state; return { mat: s.matCode, polka: s.polkaCode, fasad: s.fasadCode, orqa: s.orqaCode, jami: window.__app.res && window.__app.res.priceRes.total }; });
  const plitkalar = () => M(() => [...document.querySelectorAll('[data-varaq="material"] [data-material-plitka]')].map(el => ({ nom: el.innerText.replace(/\s+/g, ' '), on: el.dataset.on === '1', chips: [...el.querySelectorAll('[data-material-qalinlik] button')].map(b => b.innerText.trim()), pressed: [...el.querySelectorAll('[data-material-qalinlik] button[aria-pressed=true]')].map(b => b.innerText.trim()) })));
  const boshqa = async () => { const b = V('[data-material-boshqa]'); if (await b.count()) { await b.click(); await page.waitForTimeout(400); } };
  const tanla = async (re) => { const b = V('[data-material-plitka] > button').filter({ hasText: re }).first(); await b.click(); await page.waitForTimeout(1200); };

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Material Usta'); await fill('jasur@', 'material' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
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
  /* #151: sodda ko'rinish — tepada "Ko'p ishlatiladigan" (8-12 dekor, narxli), qidiruv/rang/filtr "Boshqa ranglar" orqasida */
  R.mashhur = await M(() => { const m = document.querySelector('[data-material-mashhur]'); const pl = m ? [...m.querySelectorAll('[data-material-plitka]')] : [];
    return { n: pl.length, narxsiz: pl.filter(x => /narx yo'q/i.test(x.innerText)).length, boshqa: !!document.querySelector('[data-material-boshqa]'),
      yashirin: !!document.querySelector('[data-material-qidiruv]') && !document.querySelector('[data-material-rang]') && !document.querySelector('[data-material-filtr]') }; });
  const tiles = () => M(() => [...document.querySelectorAll('[data-material-mashhur] [data-material-plitka]')].map(x => ({ t: x.innerText.replace(/\s+/g, ' ').trim(), ch: [...x.querySelectorAll('[data-material-qalinlik] button')].map(b => b.innerText.trim()) })));
  R.jadvalKorpus = await tiles();
  R.kashemir = R.jadvalKorpus.some(x => /^Кашемир /.test(x.t) && /525 000/.test(x.t));   // ERP: ЛДСП Ультрадекор 5,796 Кашемир UR 16мм
  R.birChip = R.jadvalKorpus.every(x => new Set(x.ch).size === x.ch.length);
  await page.screenshot({ path: `${OUT}/material-sodda-1440.png` });
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/material-sodda-390.png` });
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(300);
  await chip('qism', 'Orqa devor').click(); await page.waitForTimeout(400);
  R.jadvalOrqa = await tiles();
  await chip('qism', 'Korpus').click(); await page.waitForTimeout(400);
  /* 1 bosish: mashhur dekor → korpus ERP plitasi */
  await V('[data-material-mashhur] [data-material-plitka] > button').first().click(); await page.waitForTimeout(1000);
  R.mashhurTanla = await st();
  /* "Boshqa ranglar" → to'liq ko'rinish; narxsiz plitalar ro'yxatda yo'q */
  R.boshqaSoni = await M(() => { const b = document.querySelector('[data-material-boshqa]'); const m = b && b.innerText.match(/·\s*(\d+)/); return m ? +m[1] : -1; });
  await boshqa();
  /* "Yana ko'rsatish" — plitkalar soni jami dekorlarga yetguncha (150 tadan) */
  const royxatSoni = () => M(() => document.querySelectorAll('[data-material-royxat] [data-material-plitka]').length);
  R.yanaBoshi = await royxatSoni();
  for (let i = 0; i < 20 && await V('[data-material-yana]').count(); i++) { await V('[data-material-yana]').click(); await page.waitForTimeout(300); }
  R.yanaSoni = await royxatSoni();
  R.yanaTugmaYoq = !(await V('[data-material-yana]').count());
  R.yanaJami = R.boshqaSoni > 150 && R.yanaBoshi === 150 && R.yanaSoni === R.boshqaSoni && R.yanaTugmaYoq;
  R.yanaBoshi150 = R.boshqaSoni > 150 ? R.yanaBoshi : R.yanaBoshi === R.boshqaSoni;
  /* qism almashsa chek 150 ga qaytadi */
  await chip('qism', 'Polka').click(); await page.waitForTimeout(300);
  R.chekQaytdi = (await royxatSoni()) <= 150;   // yangi qism — chek yana 150 (oldingi 300+ emas)
  R.toliq = await M(() => !!document.querySelector('[data-material-qidiruv]') && !!document.querySelector('[data-material-rang]') && !document.querySelector('[data-material-mashhur]'));
  R.narxsizYoq = await M(() => ![...document.querySelectorAll('[data-material-royxat] [data-material-plitka]')].some(x => /narx yo'q/i.test(x.innerText)));
  await page.screenshot({ path: `${OUT}/material-sodda-boshqa-1440.png` });
  await chip('qism', 'Polka').click(); await page.waitForTimeout(300);
  R.polkaJoriy = await M(() => (document.querySelector('[data-material-joriy]') || {}).innerText || '');
  await filtr();
  R.polkaQalinlik = await M(() => [...document.querySelectorAll('[data-material-filtr-panel] button')].map(b => b.innerText.trim()));
  await V('[data-material-filtr-panel] button').filter({ hasText: /^18 mm$/ }).first().click(); await page.waitForTimeout(400);
  R.polka18 = await (async () => { const l = await plitkalar(); return l.length > 0 && l.every(x => x.pressed.length === 1 && x.pressed[0] === '18 mm'); })();
  await V('[data-material-filtr-panel] button').filter({ hasText: /^18 mm$/ }).first().click(); await page.waitForTimeout(300);   // filtrni olib tashlash
  await V('[data-material-filtr-panel] button').filter({ hasText: /^16 mm$/ }).first().click(); await page.waitForTimeout(400);
  R.polka16 = await (async () => { const l = await plitkalar(); return l.length > 0 && l.every(x => x.pressed.length === 1 && x.pressed[0] === '16 mm'); })();
  await V('[data-material-filtr-panel] button').filter({ hasText: /^16 mm$/ }).first().click(); await page.waitForTimeout(300);
  R.sukut16 = await (async () => { const l = (await plitkalar()).filter(x => x.chips.includes('16 mm')); return l.length > 0 && l.every(x => x.pressed[0] === '16 mm'); })();   // sukut — 16 mm
  R.polkaDetal = await M(() => { const c = window.__app.res.cutlists.flatMap(x => x.parts.filter(p => p.slot === 'polka')); return c.length && c.every(p => p.thickness === 16); });

  /* 2) korpus: rang "Oq" → ERP plitasi (narxli) → narx o'zgaradi, 3D rangi oq */
  await chip('qism', 'Korpus').click(); await page.waitForTimeout(300);
  await dot('Oq').click(); await page.waitForTimeout(400);
  R.oqBolim = await M(() => [...document.querySelectorAll('[data-material-bolim]')].map(b => b.dataset.materialBolim));
  R.oqNamuna = await M(() => [...document.querySelectorAll('[data-material-namuna]')].slice(0, 20).map(s => getComputedStyle(s).backgroundColor));
  await page.screenshot({ path: `${OUT}/material-1440-korpus.png` });
  await tanla(/so'm/);
  R.tanlandiQator = await M(() => (document.querySelector('[data-material-joriy]') || {}).innerText || '');
  R.on = (await plitkalar()).filter(x => x.on).length;
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
  await boshqa();
  R.modulDoira = await M(() => (document.querySelector('[data-material-joriy]') || {}).innerText || '');
  await chip('qism', 'Fasad').click(); await page.waitForTimeout(300);
  await dot("To'q yog'och").click(); await page.waitForTimeout(400);
  await tanla(/./);
  R.modulSlot = await M((id) => { const p = window.__app.doc.placements.find(x => x.id === id); return p && p.slots; }, R.sel);
  R.boshqalar = await M((id) => window.__app.doc.placements.filter(x => x.id !== id && x.slots && x.slots.fasad).length, R.sel);
  R.modulFasad = await M((id) => window.__app.res.cutlists.flatMap(c => c.parts).filter(p => p.slot === 'fasad').map(p => p.material), R.sel);
  await page.screenshot({ path: `${OUT}/material-1440-modul.png` });
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/material-390-modul.png` });
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(300);
  /* butun loyihaga */
  await chip('doira', 'Butun loyiha').click(); await page.waitForTimeout(300);
  await tanla(/so'm/);
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
  R.ok = R.modullar === 2 && R.boshi.polka === 'LDSP16' && R.qismlar.length === 5 && /16 mm/.test(R.polkaJoriy) &&
    R.polkaQalinlik.includes('16 mm') && R.polkaQalinlik.includes('18 mm') && R.polka18 && R.polka16 && R.sukut16 && R.polkaDetal &&
    R.oqBolim.length === 1 && R.oqBolim[0] === 'oq' && R.oqNamuna.length > 0 && R.oqNamuna.every(c => c !== 'rgba(0, 0, 0, 0)') && R.on === 1 && /Tanlandi/.test(R.tanlandiQator) &&
    erp(R.korpus.mat) && !!R.korpusNomi && R.narxOzgardi && R.rang3d.includes(0xeeece6) &&
    R.umumiy.mat === R.korpus.mat && R.umumiy.polka === R.korpus.mat && R.umumiy.fasad === R.korpus.mat &&
    !!R.sel && /faqat shu modul/.test(R.modulDoira) && R.modulSlot && erp(R.modulSlot.fasad) && R.boshqalar === 0 &&
    R.loyihaga.fasad === R.modulSlot.fasad && R.loyihaga.qolgan === 0 &&
    R.saqlash.polka && JSON.stringify(R.saqlash.kodlar) === JSON.stringify(R.saqlash.kerak) &&
    R.kashemir && R.birChip && R.mashhur.n >= 8 && R.mashhur.n <= 12 && R.mashhur.narxsiz === 0 && R.mashhur.boshqa && R.mashhur.yashirin && erp(R.mashhurTanla.mat) && R.toliq && R.narxsizYoq && R.yanaJami && R.yanaBoshi150 && R.chekQaytdi &&
    R.tel.bor && R.tel.sigadi && !R.tel.hScroll && errs.length === 0;
}
