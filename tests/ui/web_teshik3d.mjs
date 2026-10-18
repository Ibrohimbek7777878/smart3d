/* egasi #167: teshik, kromka va zapchast joylari 3D da. Tekshiriladi (D6 li MC modul — MC-KP-02, 2 eshik, polka, ruchka):
 *   oddiy ko'rinishda belgilar yo'q; rentgen yoqilganda — teshik soni = kesim ro'yxatidagi joyli teshiklar soni (har teshik × nusxa),
 *   kromka tasmalari soni = kromkali qirralar soni (yozuv tomoni × detal nusxasi), zapchast belgilari bor; menyudagi
 *   "Teshiklar / Kromka / Zapchast" tanlovi yashiradi/ko'rsatadi; detal kartasida "Teshiklar: N ta (…)" va "Kromka: …";
 *   "Ichini ko'rish"da teshik va zapchast belgilari. Skrinshotlar: tests/ui/out/web/teshik3d-*.png.
 * Ishlatish: bash tests/ui/web.sh teshik3d */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/teshik3d-xato.png` }).catch(() => {});
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

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Teshik Usta'); await fill('jasur@', 'teshik' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);   // oshxona — ko'p modul, ko'p teshik (tezlik)
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn && window.__app.res)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1000);

  /* MC-KP-02 — D6: petlya kosasi, planka, polka ushlagich, ruchka; konfirmat */
  await page.locator('input[placeholder*="shkaf 2 eshik"]').fill('MC-KP-02'); await page.waitForTimeout(500);
  await page.locator('[data-panel] button.h5').first().click(); await page.waitForTimeout(1800);
  const id = await M(() => (window.__app.doc.placements.find(p => p.frg === 'MC-KP-02') || {}).id);
  R.qoshildi = !!id;
  for (let i = 0; i < 40 && !(await M((id) => !!(window.__app.res && window.__app.res.cutlists.find(c => c.placementId === id)), id)); i++) await page.waitForTimeout(250);

  /* kutilgan sonlar — kesim ro'yxatidan, 3D dan mustaqil */
  R.kutilgan = await M((id) => {
    const cl = window.__app.res.cutlists.find(c => c.placementId === id), nus = {};
    for (const p of cl.parts) nus[p.code] = (nus[p.code] || 0) + 1;
    let teshik = 0;
    for (const h of cl.holes) if (!h.narx_uchun && h.part && h.kind !== 'cutout') teshik += Math.max(1, Math.round(+h.qty || 1)) * (h.ref ? 1 : (nus[h.part] || 0));
    const kromka = cl.edges.reduce((a, e) => a + e.sides.length * (nus[e.code] || 0), 0);
    return { teshik, kromka, d6: cl.holes.filter(h => /^d6_/.test(h.kind)).length, jami: cl.holes.length };
  }, id);
  const son = () => M((id) => window.__app.sahna.belgiSoni(id), id);

  /* 1) oddiy ko'rinish — belgilar yo'q */
  R.oddiy = await son();
  await page.screenshot({ path: `${OUT}/teshik3d-1-oddiy.png` });

  /* 2) rentgen (menyu) — sonlar kesim ro'yxati bilan teng */
  await page.locator('[data-korinish="menyu"]').click(); await page.waitForTimeout(300);
  await page.locator('[data-rentgen]').click(); await page.waitForTimeout(600);
  R.chiplar = await page.locator('[data-belgi]').count();
  await page.screenshot({ path: `${OUT}/teshik3d-2-menyu.png` });
  R.rentgen = await son();
  await page.locator('[data-korinish="menyu"]').click(); await page.waitForTimeout(300);
  /* modulga yaqin (old-yon tomondan) */
  await M((id) => {
    const s = window.__app.sahna, m = s.items.meshes.find(x => x.userData.id === id), c = m.position, r = m.rotation.z;
    const o = s.ctl.orbit, cam = s.sp.cam3d, fx = -Math.sin(r), fy = Math.cos(r);
    o.target.set(c.x, c.y, c.z);
    cam.position.set(c.x + fx * 1250 + fy * 520, c.y + fy * 1250 - fx * 520, c.z + 650);
    o.update(); s.sp._invalidate();
  }, id);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/teshik3d-3-rentgen.png` });

  /* 2b) tezlik: butun oshxona rentgenda — belgilar bilan va belgilarsiz (bir kadr chizish vaqti, chizish chaqiruvlari) */
  const olch = () => M(() => {
    const s = window.__app.sahna, r = s.sp.renderer;
    r.render(s.sp.scene, s.sp.camera); const calls = r.info.render.calls;
    const t0 = performance.now(); for (let i = 0; i < 20; i++) r.render(s.sp.scene, s.sp.camera);
    let teshik = 0; for (const m of s.items.meshes) { const g = m.userData.belgi3d; if (g && g.visible) teshik += g.userData.son.teshik; }
    return { ms: Math.round((performance.now() - t0) / 20 * 10) / 10, calls, modul: s.items.meshes.length, teshik };
  });
  R.tezlikBilan = await olch();
  await page.locator('[data-korinish="menyu"]').click(); await page.waitForTimeout(300);
  for (const b of ['teshik', 'kromka', 'zapchast']) { await page.locator(`[data-belgi="${b}"]`).click(); await page.waitForTimeout(150); }
  R.tezlikBelgisiz = await olch();
  for (const b of ['teshik', 'kromka', 'zapchast']) { await page.locator(`[data-belgi="${b}"]`).click(); await page.waitForTimeout(150); }
  await page.locator('[data-korinish="menyu"]').click(); await page.waitForTimeout(300);

  /* 3) tanlov: teshiklarni yashirish va qaytarish */
  await page.locator('[data-korinish="menyu"]').click(); await page.waitForTimeout(300);
  await page.locator('[data-belgi="teshik"]').click(); await page.waitForTimeout(300);
  R.teshikYashirin = await M((id) => { const m = window.__app.sahna.items.meshes.find(x => x.userData.id === id); const g = m.userData.belgi3d; const t = g.children.find(c => c.userData.belgi3d === 'teshik'); return !t.visible; }, id);
  await page.locator('[data-belgi="teshik"]').click(); await page.waitForTimeout(300);
  R.teshikQaytdi = await M((id) => { const m = window.__app.sahna.items.meshes.find(x => x.userData.id === id); const g = m.userData.belgi3d; const t = g.children.find(c => c.userData.belgi3d === 'teshik'); return t.visible; }, id);
  /* fasadsiz — ichki detallarni bosish uchun */
  await page.locator('[data-fasadsiz]').click(); await page.waitForTimeout(300);
  await page.locator('[data-korinish="menyu"]').click(); await page.waitForTimeout(400);

  /* 4) detal kartasi: yon devorni bosish (modul tanlanadi, keyin detal) */
  const nuqtalar = await M((id) => {
    const s = window.__app.sahna, m = s.items.meshes.find(x => x.userData.id === id), cam = s.sp.camera, el = s.sp.renderer.domElement.getBoundingClientRect();
    const out = [];
    m.updateMatrixWorld(true);
    m.traverse(o => {
      const p = o.userData && o.userData.part;
      if (!o.isMesh || !p || !o.visible || p.slot === 'fasad') return;
      const v = o.getWorldPosition(o.position.clone()); v.project(cam);
      const x = el.left + (v.x + 1) / 2 * el.width, y = el.top + (1 - v.y) / 2 * el.height;
      if (s.items.pickId({ clientX: x, clientY: y }) === id) out.push({ id: p.id, x, y, yon: /yon/.test(p.id) ? 0 : 1 });   // shu modul bosiladi
    });
    return out.sort((a, b) => a.yon - b.yon);
  }, id);
  R.karta = null;
  for (const n of nuqtalar) {
    await page.mouse.click(n.x, n.y); await page.waitForTimeout(350);
    await page.mouse.click(n.x, n.y); await page.waitForTimeout(700);
    const k = await M(() => { const t = document.querySelector('[data-detal-teshik]'), e = document.querySelector('[data-detal-kromka]'); return t ? { teshik: t.innerText, kromka: e && e.innerText } : null; });
    if (k && /\d+ ta/.test(k.teshik)) { R.karta = k; break; }
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/teshik3d-4-detal.png` });
  /* kartadagi mini-3D aylanadi — ikki holatda (ichki yuza ham ko'rinsin) */
  const kb = await M(() => { const e = document.querySelector('[data-detal-teshik]'), c = e && e.closest('[style*="z-index: 6"]'); const r = c && c.getBoundingClientRect(); return r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null; });
  if (kb) for (const [i, ms] of [[1, 1500], [2, 2500]]) { await page.waitForTimeout(ms); await page.screenshot({ path: `${OUT}/teshik3d-4-detal-karta${i}.png`, clip: kb }); }
  /* karta yopiladi */
  const yop = page.locator('[aria-label="Yopish"]').first(); if (await yop.count()) await yop.click().catch(() => {});
  await page.waitForTimeout(300);

  /* 5) "Ichini ko'rish" — teshik va zapchast belgilari */
  if (!(await click(/Ichini ko'rish →/))) {
    const m = nuqtalar[0]; if (m) { await page.mouse.click(m.x, m.y); await page.waitForTimeout(400); }
    await click(/Ichini ko'rish →/);
  }
  await page.waitForTimeout(3600);
  R.ichki = await M(() => /Petlya|petlya/.test(document.body.innerText));
  await page.screenshot({ path: `${OUT}/teshik3d-5-ichki.png` });

  /* 6) qo'lda chizilgan modul (egasi skrinshotidagidek: "Tepa (tom)") — kromka va teshiklar kartada */
  await M(() => { const b = [...document.querySelectorAll('button[aria-label="Yopish"]')].find(x => x.closest('[style*="z-index: 70"]')); if (b) b.click(); });
  await page.waitForTimeout(500);
  await page.locator('[data-chizish-yangi]').first().click(); await page.waitForTimeout(500);
  await page.locator('[data-chizish] [data-chizish-tur="erkin"]').click(); await page.waitForTimeout(1500);
  await page.locator('[data-chizish] [data-chizish-yop]').click().catch(() => {}); await page.waitForTimeout(800);
  const cid = await M(() => { const d = window.__app.doc; const p = d.placements.find(x => d.chizmalar && d.chizmalar[x.frg]); return p && p.id; });
  for (let i = 0; i < 40 && !(await M((id) => !!(window.__app.res && window.__app.res.cutlists.find(c => c.placementId === id)), cid)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(600);
  R.chizma = await M((id) => window.__app.sahna.belgiSoni(id), cid);
  R.chizmaKutilgan = await M((id) => {
    const cl = window.__app.res.cutlists.find(c => c.placementId === id), nus = {};
    for (const p of cl.parts) nus[p.code] = (nus[p.code] || 0) + 1;
    let teshik = 0;
    for (const h of cl.holes) if (!h.narx_uchun && h.part) teshik += Math.max(1, Math.round(+h.qty || 1)) * (h.ref ? 1 : (nus[h.part] || 0));
    return { teshik, kromka: cl.edges.reduce((a, e) => a + e.sides.length * (nus[e.code] || 0), 0) };
  }, cid);
  await M((id) => {
    const s = window.__app.sahna, m = s.items.meshes.find(x => x.userData.id === id), c = m.position, r = m.rotation.z;
    const o = s.ctl.orbit, cam = s.sp.cam3d, fx = -Math.sin(r), fy = Math.cos(r);
    o.target.set(c.x, c.y, c.z + 300);
    cam.position.set(c.x + fx * 2600 + fy * 900, c.y + fy * 2600 - fx * 900, c.z + 2200);
    o.update(); s.sp._invalidate();
  }, cid);
  await page.waitForTimeout(700);
  const tom = await M((id) => {
    const s = window.__app.sahna, m = s.items.meshes.find(x => x.userData.id === id), cam = s.sp.camera, el = s.sp.renderer.domElement.getBoundingClientRect();
    let out = null;
    m.updateMatrixWorld(true);
    m.traverse(o => {
      const p = o.userData && o.userData.part;
      if (out || !o.isMesh || !p || !/^qopqoq/.test(p.id)) return;
      const v = o.getWorldPosition(o.position.clone()); v.project(cam);
      out = { x: el.left + (v.x + 1) / 2 * el.width, y: el.top + (1 - v.y) / 2 * el.height };
    });
    return out;
  }, cid);
  if (tom) {
    await page.mouse.click(tom.x, tom.y); await page.waitForTimeout(400);
    await page.mouse.click(tom.x, tom.y); await page.waitForTimeout(1500);
    R.chizmaKarta = await M(() => { const t = document.querySelector('[data-detal-teshik]'), e = document.querySelector('[data-detal-kromka]'); return t ? { nom: t.closest('[style*="z-index"]').querySelector('span').innerText, teshik: t.innerText, kromka: e && e.innerText } : null; });
  }
  await page.screenshot({ path: `${OUT}/teshik3d-6-chizma.png` });

  R.errs = errs;
  const rt = R.rentgen || {};
  R.ok = !!(R.qoshildi && R.kutilgan.d6 > 0 && (!R.oddiy || R.oddiy.korinadi === false) && rt.korinadi === true
    && rt.teshik === R.kutilgan.teshik && rt.kromka === R.kutilgan.kromka && rt.zapchast > 0 && R.chiplar === 3
    && R.tezlikBilan.teshik > 200 && R.tezlikBilan.calls - R.tezlikBelgisiz.calls <= 4 * R.tezlikBilan.modul && R.tezlikBilan.ms < Math.max(40, R.tezlikBelgisiz.ms * 2.5)
    && R.chizma && R.chizma.teshik === R.chizmaKutilgan.teshik && R.chizma.kromka === R.chizmaKutilgan.kromka
    && R.chizmaKarta && /old/.test(R.chizmaKarta.kromka)
    && R.teshikYashirin && R.teshikQaytdi && R.karta && /\d+ ta/.test(R.karta.teshik) && R.karta.kromka && R.karta.kromka !== '—' && errs.length === 0);
}
