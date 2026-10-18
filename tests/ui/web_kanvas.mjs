export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/kanvas-xato.png` }).catch(() => {});
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
  const fill = async (ph, v) => { await page.locator(`input[placeholder*="${ph}"]`).first().fill(v); };
  const YARIM = 50;
  const pl = () => M(() => window.__app.doc.placements.filter(p => !p.auto).map(p => ({ id: p.id, x: p.x, y: p.y, w: p.w, d: p.d, rot: p.rot || 0 })));

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Kanvas Usta'); await fill('jasur@', 'kanvas' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn && window.__app.sahna && window.__app.res !== undefined)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(2500);
  const kartalar = page.locator('[data-panel] button:has-text("so\'m")');
  await kartalar.first().click(); await page.waitForTimeout(1000);
  await kartalar.first().click(); await page.waitForTimeout(1000);

  /* Muammo 2: Erkin maydon — modullar pol ramkasi ichida va pol ustida (bir koordinata tizimi) */
  await click(/^Xona$/); await page.waitForTimeout(900);
  await page.locator('[data-maydon-rejim="erkin"]').click(); await page.waitForTimeout(1200);
  R.pol = await M(() => {
    const s = window.__app.sahna, T = s.sp.THREE || null;
    const g = s.sp.scene.children.find(c => c.name === 'maydon');
    const pol = g.children.find(c => c.userData && c.userData.kind === 'maydon');
    pol.geometry.computeBoundingBox();
    const pb = pol.geometry.boundingBox, p = pol.position;
    const box = { x0: p.x + pb.min.x, x1: p.x + pb.max.x, y0: p.y + pb.min.y, y1: p.y + pb.max.y, z: p.z };
    let zmin = 1e9, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const m of s.sp.groups.items.children) {
      const u = m.userData; if (!u || u.id == null || !(u.w > 0)) continue;
      zmin = Math.min(zmin, u.z); x0 = Math.min(x0, u.x); y0 = Math.min(y0, u.y); x1 = Math.max(x1, u.x + u.w); y1 = Math.max(y1, u.y + u.d);
    }
    return { box, mod: { zmin, x0, x1, y0, y1 } };
  });
  const P = R.pol;
  R.polOk = P.mod.zmin >= 0 && P.box.z < 0 && P.mod.x0 > P.box.x0 && P.mod.x1 < P.box.x1 && P.mod.y0 > P.box.y0 && P.mod.y1 < P.box.y1;
  await page.locator('[data-korinish="yuqori"]').click().catch(() => {}); await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/maydon-yuqoridan.png` });
  await click(/^Mebel$/); await page.waitForTimeout(500);

  /* Muammo 1: canvas konteynerni to'liq egallaydi — dpr 0.8 / 1 / 1.25 / 2 */
  const cdp = await page.context().newCDPSession(page);
  const olch = () => M(() => {
    const c = document.querySelector('canvas'); const h = c.parentElement;
    const a = c.getBoundingClientRect(), b = h.getBoundingClientRect();
    const l = h.querySelector('div'); 
    return { dpr: window.devicePixelRatio, c: [a.x, a.y, a.width, a.height].map(Math.round), h: [b.x, b.y, b.width, b.height].map(Math.round),
      buf: [c.width, c.height] };
  });
  R.dpr = {};
  R.dprOk = true;
  for (const d of [0.8, 1, 1.25, 2]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: d, mobile: false });
    await page.waitForTimeout(900);
    await M(() => window.__app.sahna.sp._invalidate()); await page.waitForTimeout(400);   // eng kamida keyingi kadr dpr ni yangilaydi
    const o = await olch(); o.pr = await M(() => window.__app.sahna.sp.renderer.getPixelRatio()); R.dpr[d] = o;
    const ok = o.c.every((v, i) => Math.abs(v - o.h[i]) <= 1) && Math.abs(o.buf[0] - o.c[2] * d) <= 2;
    R.dprOk = R.dprOk && ok;
    if (d === 0.8) await page.screenshot({ path: `${OUT}/kanvas-dpr08.png` });
  }
  /* tanlash: modulni bosish (dpr 0.8 da) */
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 0.8, mobile: false });
  await page.waitForTimeout(700);
  await page.locator('[data-korinish="izo"]').click().catch(() => {}); await page.waitForTimeout(1000);
  const nuq = await M(() => {
    const s = window.__app.sahna, m = s.sp.groups.items.children.find(c => c.userData && c.userData.id != null);
    const v = m.position.clone(); v.project(s.sp.camera);
    const r = document.querySelector('canvas').getBoundingClientRect();
    return { x: r.x + (v.x + 1) / 2 * r.width, y: r.y + (1 - v.y) / 2 * r.height, id: m.userData.id };
  });
  await page.mouse.click(nuq.x, nuq.y); await page.waitForTimeout(600);
  R.tanlash = await M(() => ({ sel: window.__app.sahna.items.getSelected() }));
  R.tanlashId = nuq.id;
  /* egasi holati: sahifa dpr 0.8 BILAN yuklanadi (Firefox 80% masshtab) */
  await page.reload(); await page.waitForTimeout(500);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.sahna && document.querySelector('canvas'))); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1500);
  R.yuklash08 = await olch();
  R.yuklash08Ok = R.yuklash08.c.every((v, i) => Math.abs(v - R.yuklash08.h[i]) <= 1);
  await page.screenshot({ path: `${OUT}/kanvas-dpr08.png` });
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  R.errs = errs;
  R.tanlashOk = R.tanlash.sel === R.tanlashId;
  R.ok = !!R.polOk && !!R.dprOk && R.tanlashOk && errs.length === 0;
}
