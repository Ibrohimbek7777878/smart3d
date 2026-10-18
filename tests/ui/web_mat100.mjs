/* #182: material varag'i — "Asosiy 100" va material to'liq o'zgarishi (brauzer). Tekshiriladi:
 *   1) modul kartasidan (SP-K-001, "Faqat shu modul") — "Tanlandi" qatorida "loyihadan · dekor tanlanmagan" izohi (nega plitka belgilanmagan);
 *   2) "Asosiy 100" bo'limi — rang oilasi bo'yicha guruhlar, 100 dekor, "≈" (taxminiy rang) belgisi; telefon 390 — sig'adi;
 *   3) tanlab olingan 5 dekor (oq, bej, kulrang, och va to'q yog'och): korpus/fasad, modul va butun loyiha — doc'ga yoziladi, "Tanlandi"
 *      yangilanadi, plitka belgilanadi, 3D rangi = rang_hex (yog'och — o'z rangidagi tekstura), polka korpusga ergashadi,
 *      kesim ro'yxati materiali = ERP kodi, narx o'zgaradi; qidiruv — Asosiy 100 da ham;
 *   4) loyiha saqlanib, sahifa qayta yuklanib ochilganda — tanlovlar va 3D rangi tiklanadi.
 * Ishlatish: bash tests/ui/web.sh mat100. Skrinshotlar: tests/ui/out/web/mat100-*.png */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/mat100-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const V = (sel) => page.locator('[data-varaq="material"] ' + sel);
  const chip = (blok, matn) => V(`[data-material-${blok}] button`).filter({ hasText: matn }).first();
  const yop = async () => { await V('button[aria-label="Yopish"]').click(); await page.waitForTimeout(300); };
  /* joylashuv holati: slotlar, kesim materiali, 3D (rang yoki tekstura rangi), "Tanlandi", belgilangan plitka, narx */
  const holat = (id) => M((id) => {
    const A = window.__app, p = A.doc.placements.find(x => x.id === id), cl = A.res.cutlists.find(c => c.placementId === id);
    const mat = {}; for (const x of cl.parts) (mat[x.slot] = mat[x.slot] || new Set()).add(x.material);
    const rang = {}; A.sahna.sp.groups.items.children.filter(g => g.userData && g.userData.id === id).forEach(g => g.traverse(o => {
      if (o.isMesh && o.userData && o.userData.slot && o.material) (rang[o.userData.slot] = rang[o.userData.slot] || new Set()).add(o.material.userData && o.material.userData.rang != null ? o.material.userData.rang : 'std'); }));
    const S = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, [...v]]));
    const j = document.querySelector('[data-material-joriy]');
    return { slots: p.slots || null, pj: { korpus: A.state.matCode, polka: A.state.polkaCode, fasad: A.state.fasadCode }, mat: S(mat), rang: S(rang),
      joriy: j ? j.innerText.replace(/\n/g, ' | ') : '', on: [...document.querySelectorAll('[data-material-asosiy] [data-material-plitka][data-on="1"]')].map(x => x.querySelector('button').getAttribute('aria-label')),
      jami: A.res.priceRes.total, erp: Object.keys(A.doc.erpMat || {}) };
  }, id);
  const dekor = (o) => M((o) => window.__app.H.dekorAsosiy.items.find(e => e.o === o), o);
  const kodNomi = (c) => M((c) => { const m = window.__app.H.materials.panel_materials.find(x => x.code === c); return m && m.name; }, c);
  const tanla = async (nom) => { await V(`[data-material-asosiy] [data-material-plitka] > button[aria-label="${nom}"]`).first().click(); await page.waitForTimeout(1200); };

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Asosiy Usta'); await fill('jasur@', 'mat100' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);
  for (const kod of ['MC-KP-02', 'SP-K-001']) {
    await page.locator('input[placeholder*="shkaf 2 eshik"]').fill(kod); await page.waitForTimeout(500);
    await page.locator('[data-panel] button.h5').first().click(); await page.waitForTimeout(1200);
  }
  const pl = await M(() => window.__app.doc.placements.map(p => ({ id: p.id, frg: p.frg })));
  const mc = pl.find(p => p.frg === 'MC-KP-02').id, sp = pl.find(p => p.frg === 'SP-K-001').id;
  R.sel = await M(() => window.__app.state.sel) === sp;

  /* 1) modul kartasi → Material: "Faqat shu modul", o'z tanlovi yo'q — izoh */
  await page.locator('[data-modul-material]').click(); await page.waitForTimeout(600);
  R.boshi = await holat(sp);
  R.izoh = /loyihadan/.test(R.boshi.joriy) && /dekor tanlanmagan/.test(R.boshi.joriy) && /faqat shu modul/.test(R.boshi.joriy);
  /* 2) Asosiy 100 */
  R.asosiy = await M(() => { const s = document.querySelector('[data-material-asosiy]'); if (!s) return null;
    const pl = [...s.querySelectorAll('[data-material-plitka]')];
    return { n: pl.length, guruh: [...s.querySelectorAll('[data-material-asosiy-guruh]')].map(x => x.dataset.materialAsosiyGuruh), taxminiy: s.querySelectorAll('[data-material-taxminiy]').length,
      rangsiz: pl.filter(x => getComputedStyle(x.querySelector('[data-material-namuna]')).backgroundColor === 'rgba(0, 0, 0, 0)').length,
      mashhurUstida: !!document.querySelector('[data-material-mashhur]') && (document.querySelector('[data-material-mashhur]').compareDocumentPosition(s) & 4) > 0 }; });
  await page.screenshot({ path: `${OUT}/mat100-1440-asosiy.png` });
  await V('[data-material-asosiy]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/mat100-1440-asosiy-guruhlar.png` });

  /* 3) 5 dekor: [o, qism, modul, doira] */
  const REJA = [[1, 'Korpus', sp, 'modul'], [3, 'Korpus', sp, 'modul'], [7, 'Fasad', sp, 'modul'], [11, 'Korpus', sp, 'loyiha'], [30, 'Fasad', mc, 'loyiha']];
  R.tanlov = [];
  for (const [o, qism, id, doira] of REJA) {
    const e = await dekor(o);
    await chip('qism', qism).click(); await page.waitForTimeout(300);
    await chip('doira', doira === 'modul' ? 'Faqat shu modul' : 'Butun loyiha').click(); await page.waitForTimeout(300);
    const old = await holat(id);
    await tanla(e.dekor);
    const h = await holat(id), slot = qism === 'Korpus' ? 'korpus' : 'fasad';
    const kod = doira === 'modul' ? h.slots && h.slots[slot] : h.pj[slot];
    const nom = await kodNomi(kod), hexN = parseInt(e.rang_hex.slice(1), 16);
    const slotlar = slot === 'korpus' ? ['korpus', 'polka'] : ['fasad'];
    const r = { o, dekor: e.dekor, qism: slot, doira, kod, yuza: e.yuza,
      doc: e.kodlar.includes(kod) && h.erp.includes(kod),
      tanlandi: !!nom && h.joriy.includes(nom) && !/dekor tanlanmagan/.test(h.joriy),
      plitka: h.on.length === 1 && h.on[0] === e.dekor,
      rang3d: slotlar.every(s => (h.rang[s] || []).length === 1 && h.rang[s][0] === hexN),
      kesim: slotlar.every(s => (h.mat[s] || []).length === 1 && h.mat[s][0] === kod),
      narx: h.jami !== old.jami };
    R.tanlov.push(r);
    if (o === 7) {
      await page.screenshot({ path: `${OUT}/mat100-1440-tanlandi.png` });
      await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
      R.tel = await M(() => { const v = document.querySelector('[data-varaq="material"]'), r = v && v.getBoundingClientRect(), a = document.querySelector('[data-material-asosiy]');
        const ar = a && a.getBoundingClientRect();
        return { sigadi: !!r && r.left >= 0 && r.right <= innerWidth + 1, asosiy: !!ar && ar.right <= innerWidth + 1, hScroll: document.documentElement.scrollWidth > innerWidth + 1 }; });
      await page.screenshot({ path: `${OUT}/mat100-390-asosiy.png` });
      await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(400);
    }
  }
  /* qidiruv — Asosiy 100 da ham, boshqa ranglarda ham */
  await chip('qism', 'Korpus').click(); await page.waitForTimeout(300);
  await V('[data-material-qidiruv]').fill('Сонома'); await page.waitForTimeout(600);
  R.qidiruv = await M(() => ({ asosiy: [...document.querySelectorAll('[data-material-asosiy] [data-material-plitka] > button')].map(b => b.getAttribute('aria-label')),
    royxat: document.querySelectorAll('[data-material-royxat] [data-material-plitka]').length, fokus: document.activeElement && document.activeElement.hasAttribute('data-material-qidiruv') }));
  await page.screenshot({ path: `${OUT}/mat100-1440-qidiruv.png` });
  await V('[data-material-qidiruv]').fill(''); await page.waitForTimeout(300);
  await yop();
  await page.screenshot({ path: `${OUT}/mat100-1440-3d.png` });

  /* 4) saqlash → sahifa qayta yuklanadi → loyiha ochiladi */
  R.oldin = { sp: await holat(sp), mc: await holat(mc) };
  await page.waitForTimeout(3500);                                   // avtomatik saqlash
  await page.reload(); await page.waitForTimeout(2500);
  for (let i = 0; i < 40 && !(await M(() => window.__app && window.__app.state.dataReady)); i++) await page.waitForTimeout(250);
  if (await page.locator('[data-sarlavha="loyihalar"]').count()) { await page.locator('[data-sarlavha="loyihalar"]').click(); await page.waitForTimeout(1500); }
  await page.locator('main button.h2').first().click(); await page.waitForTimeout(2500);
  for (let i = 0; i < 40 && !(await M(() => window.__app.res && window.__app.res.priceRes && window.__app.sahna)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(800);
  R.keyin = { sp: await holat(sp), mc: await holat(mc) };
  const teng = (a, b) => JSON.stringify([a.slots, a.pj, a.mat, a.rang, a.jami]) === JSON.stringify([b.slots, b.pj, b.mat, b.rang, b.jami]);
  R.tiklandi = teng(R.oldin.sp, R.keyin.sp) && teng(R.oldin.mc, R.keyin.mc);
  await page.screenshot({ path: `${OUT}/mat100-1440-qayta.png` });

  /* 5) Bazis moduli (.bpj): modul kartasidagi "Material" — Bazis materiallari ro'yxati (o'z materiali, "Almashtirish") */
  await page.locator('[data-sarlavha="loyihalar"]').click(); await page.waitForTimeout(1500);
  const bpj = { version: '4.2', script: 'BazisUniversalExport', objects: [0, 1].map(i => ({ id: i + 1, name: 'bok', dimensions: { dl: 700, dw: 450, dp: 16 },
    material: { name: 'ЛДСП Кроношпан 4,575 Белый гладкий 16мм' },
    contour: { outer: [[0, 0, 700, 0], [700, 0, 700, 450], [700, 450, 0, 450], [0, 450, 0, 0]].map(([x1, y1, x2, y2]) => ({ type: 'line', x1, y1, x2, y2 })) },
    butts: [], transform: { origin: { x: i * 584, y: 0, z: 0 }, axisX: { x: 0, y: 1, z: 0 }, axisY: { x: 0, y: 0, z: 1 }, axisZ: { x: 1, y: 0, z: 0 } } })), furnitures: [] };
  await page.locator('label[data-bazis-yukla] input[type=file]').setInputFiles({ name: 'namuna.bpj', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bpj)) });
  for (let i = 0; i < 60 && !(await M(() => !!document.querySelector('[data-varaq="bazis"]'))); i++) await page.waitForTimeout(250);
  await page.locator('[data-varaq="bazis"] button', { hasText: 'Yopish' }).last().click(); await page.waitForTimeout(1500);
  const bz = await M(() => (window.__app.doc.placements[0] || {}).id);
  R.bazisSel = await M(() => window.__app.state.sel);
  if (!R.bazisSel) {   // 3D da modulni bosish (markaz)
    const c = await M(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    for (const [x, y] of [[527, 590], [596, 560], [c[0], c[1] + 100]]) { await page.mouse.click(x, y); await page.waitForTimeout(400); if (await M(() => window.__app.state.sel)) break; }
    R.bazisSel = await M(() => window.__app.state.sel);
  }
  if (R.bazisSel === bz && await page.locator('[data-modul-material]').count()) {
    await page.locator('[data-modul-material]').click(); await page.waitForTimeout(700);
    R.bazisVaraq = await M(() => ({ bazis: !!document.querySelector('[data-varaq="bazis"]'), material: !!document.querySelector('[data-varaq="material"]') }));
    await page.screenshot({ path: `${OUT}/mat100-1440-bazis.png` });
  }

  R.errs = errs;
  R.ok = R.sel && R.izoh && !!R.asosiy && R.asosiy.n === 100 && R.asosiy.guruh.length >= 5 && R.asosiy.taxminiy > 0 && R.asosiy.rangsiz === 0 && R.asosiy.mashhurUstida &&
    R.tanlov.length === 5 && R.tanlov.every(x => x.doc && x.tanlandi && x.plitka && x.rang3d && x.kesim && x.narx) &&
    R.tel && R.tel.sigadi && R.tel.asosiy && !R.tel.hScroll &&
    R.qidiruv.asosiy.length >= 1 && R.qidiruv.asosiy.every(n => /Сонома/i.test(n)) && R.qidiruv.royxat >= 1 && R.qidiruv.fokus &&
    R.tiklandi && !!R.bazisVaraq && R.bazisVaraq.bazis && !R.bazisVaraq.material && errs.length === 0;
}
