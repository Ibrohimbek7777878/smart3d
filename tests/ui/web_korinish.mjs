/* TZ-23 (A, D): 3D ko'rinish — Bazis-Cloud darajasida. Tekshiriladi: erkin aylantirish (pol ostidan ham, siljitish, yaqin
 * masofa), yo'nalishlar (yuqori, old), +/−, chizish rejimlari (qirralar, sim karkas, rentgen), fon, devor-pol, fasadsiz,
 * orto va yurish kamerasi, o'lchash (ikki nuqta → mm), tanlov eslab qolinadi, Bazis loyihasida standart (qirralar, xonasiz),
 * telefon (390) — panel va menyu sig'adi. Ishlatish: bash tests/ui/web.sh korinish */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/korinish-xato.png` }).catch(() => {});
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
  const btn = (d) => page.locator(`[data-korinish="${d}"]`).first();
  const kam = () => M(() => { const s = window.__app.sahna, c = s.sp.camera, t = s.ctl.orbit.target; return { x: c.position.x - t.x, y: c.position.y - t.y, z: c.position.z - t.z, d: c.position.distanceTo(t), cz: c.position.z, orto: !!c.isOrthographicCamera }; });

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Korinish Usta'); await fill('jasur@', 'korinish' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });   // TZ-25: darhol ish joyi
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);   // TZ-25: tez boshlash — oshxona
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.sahna && window.__app.res)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1200);

  /* 1) erkin aylantirish: cheklov yo'q — pol ostidan ham, siljitish, yaqin masofa */
  R.orbit = await M(() => { const o = window.__app.sahna.ctl.orbit; return { min: o.minPolarAngle, max: o.maxPolarAngle, pan: o.enablePan, yaqin: o.minDistance, kursor: o.zoomToCursor }; });
  R.polOsti = await M(() => {
    const s = window.__app.sahna, o = s.ctl.orbit, c = s.sp.cam3d, t = o.target;
    c.position.set(t.x, t.y + 3000, t.z - 2500); o.update();
    return c.position.z < t.z - 1000;
  });
  R.panel = await M(() => !!document.querySelector('[data-korinish-panel]'));

  /* 2) yo'nalishlar va zoom */
  await btn('yon-yuqori').click(); await page.waitForTimeout(700);
  R.yuqori = await kam();
  await btn('yon-old').click(); await page.waitForTimeout(700);
  R.old = await kam();
  const d0 = (await kam()).d;
  await btn('yaqin').click(); await page.waitForTimeout(500);
  R.yaqinlashdi = (await kam()).d < d0 - 1;
  await btn('yon-izo').click(); await page.waitForTimeout(700);

  /* 3) menyu: chizish rejimlari, rentgen, fon, xona, fasadsiz */
  await btn('menyu').click(); await page.waitForTimeout(300);
  R.menyu = await M(() => !!document.querySelector('[data-korinish-menyu]'));
  const meshHolat = () => M(() => {
    const s = window.__app.sahna; let n = 0, q = 0, faces = 0, shaffof = 0, fasadYoq = 0;
    s.sp.groups.items.traverse(o => {
      if (!o.isMesh || (o.userData && o.userData.kind === 'hitBox')) return;
      n++;
      if (o.userData.qirraObj && o.userData.qirraObj.visible) q++;
      if (o.material && o.material.visible !== false) faces++;
      if (o.material && o.material.transparent && o.material.opacity < 0.3) shaffof++;
      if (o.userData && o.userData.slot === 'fasad' && !o.visible) fasadYoq++;
    });
    return { n, q, faces, shaffof, fasadYoq, bg: s.sp.scene.background ? s.sp.scene.background.getHex() : null,
      devor: s.sp.groups.walls3d.visible, pol: s.sp.groups.floor.visible };
  });
  await page.locator('[data-chizish="qirrali"]').click(); await page.waitForTimeout(300);
  R.qirrali = await meshHolat();
  await page.screenshot({ path: `${OUT}/korinish-1440-menyu.png` });
  await page.locator('[data-chizish="karkas"]').click(); await page.waitForTimeout(300);
  R.karkas = await meshHolat();
  await page.locator('[data-chizish="qirrali"]').click();
  await page.locator('[data-rentgen]').click(); await page.waitForTimeout(300);
  R.rentgen = await meshHolat();
  await page.locator('[data-fon="oq"]').click(); await page.waitForTimeout(200);
  R.fonOq = (await meshHolat()).bg;
  await page.locator('[data-xona]').click(); await page.waitForTimeout(200);
  R.xonasiz = await meshHolat();
  await page.locator('[data-fasadsiz]').click(); await page.waitForTimeout(200);
  R.fasadsiz = await meshHolat();
  await page.screenshot({ path: `${OUT}/korinish-1440-rentgen.png` });
  await page.locator('[data-fasadsiz]').click(); await page.locator('[data-rentgen]').click();
  await page.locator('[data-chizish="boyalgan"]').click(); await page.waitForTimeout(300);
  R.boyalgan = await meshHolat();

  /* 4) kamera: orto va yurish */
  await page.locator('[data-kamera="orto"]').click(); await page.waitForTimeout(300);
  R.orto = (await kam()).orto;
  await page.locator('[data-kamera="orbit"]').click(); await page.waitForTimeout(300);
  R.perspektiva = !(await kam()).orto;
  const oldin = await M(() => window.__app.sahna.sp.cam3d.position.toArray());
  await page.locator('[data-kamera="yurish"]').click(); await page.waitForTimeout(400);   // menyu ochiq — tanlangach yopiladi
  R.yurishKoz = Math.round(await M(() => window.__app.sahna.sp.cam3d.position.z));
  const p0 = await M(() => window.__app.sahna.sp.cam3d.position.toArray());
  await page.keyboard.down('w'); await page.waitForTimeout(500); await page.keyboard.up('w');
  const p1 = await M(() => window.__app.sahna.sp.cam3d.position.toArray());
  R.yurdi = Math.round(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]));
  R.yurishIzoh = await has('WASD');
  await btn('menyu').click(); await page.waitForTimeout(200);
  await page.locator('[data-kamera="orbit"]').click(); await page.waitForTimeout(300);
  const qaytdi = await M(() => window.__app.sahna.sp.cam3d.position.toArray());
  R.qaytdi = Math.round(Math.hypot(qaytdi[0] - oldin[0], qaytdi[1] - oldin[1], qaytdi[2] - oldin[2])) < 5;
  await btn('menyu').click(); await page.waitForTimeout(200);          // menyu yopiladi
  R.menyuYopildi = await M(() => !document.querySelector('[data-korinish-menyu]'));

  /* 5) o'lchash: modul ustidagi ikki nuqta */
  await btn('olchash').click(); await page.waitForTimeout(200);
  const nuqtalar = await M(() => {
    const s = window.__app.sahna, T = s.sp.THREE, c = s.sp.camera, r = s.sp.renderer.domElement.getBoundingClientRect();
    let m = null;
    s.sp.groups.items.traverse(o => { if (!m && o.isMesh && o.userData && o.userData.slot === 'fasad') m = o; });
    const b = new T.Box3().setFromObject(m), cen = b.getCenter(new T.Vector3()), sz = b.getSize(new T.Vector3());
    const ekr = (v) => { const p = v.clone().project(c); return [r.left + (p.x + 1) / 2 * r.width, r.top + (1 - p.y) / 2 * r.height]; };
    const a = cen.clone(), bb = cen.clone(); a.z -= sz.z * 0.3; bb.z += sz.z * 0.3;
    return [ekr(a), ekr(bb)];
  });
  for (const [x, y] of nuqtalar) { await page.mouse.click(x, y); await page.waitForTimeout(250); }
  R.olcham = await M(() => { const e = document.querySelector('[data-olcham]'); return e ? +e.getAttribute('data-olcham') : null; });
  R.olchamYozuv = await has('Masofa:');
  await page.screenshot({ path: `${OUT}/korinish-1440-olchash.png` });
  await btn('olchash').click();

  /* 6) eslab qolinadi */
  R.saqlandi = await M(() => JSON.parse(localStorage.getItem('s3d-korinish') || '{}'));

  /* 7) telefon */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
  await btn('menyu').click(); await page.waitForTimeout(300);
  R.tel = await M(() => {
    const m = document.querySelector('[data-korinish-menyu]'), p = document.querySelector('[data-korinish-panel]');
    const rm = m && m.getBoundingClientRect(), rp = p && p.getBoundingClientRect();
    return { menyu: !!m, sigadi: !!rm && rm.left >= 0 && rm.right <= innerWidth + 1, panel: !!rp && rp.right <= innerWidth && rp.left > 0, ustma: !!rm && !!rp && rm.right > rp.left + 1, hScroll: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  await page.screenshot({ path: `${OUT}/korinish-390-menyu.png` });
  await btn('menyu').click(); await page.setViewportSize({ width: 1440, height: 900 });

  /* 8) Bazis loyihasi — standart: qirralar bilan, xonasiz (saqlangan tanlov bo'lmasa) */
  await M(() => localStorage.removeItem('s3d-korinish'));
  await page.locator('[data-sarlavha="loyihalar"]').click(); await waitText('Loyihalarim');
  const bpj = { version: '4.2', script: 'BazisUniversalExport', objects: [0, 1].map(i => ({ id: i + 1, name: 'bok', dimensions: { dl: 700, dw: 450, dp: 16 },
    material: { name: 'ЛДСП Кроношпан 4,575 Белый гладкий 16мм' },
    contour: { outer: [[0, 0, 700, 0], [700, 0, 700, 450], [700, 450, 0, 450], [0, 450, 0, 0]].map(([x1, y1, x2, y2]) => ({ type: 'line', x1, y1, x2, y2 })) },
    butts: [], transform: { origin: { x: i * 584, y: 0, z: 0 }, axisX: { x: 0, y: 1, z: 0 }, axisY: { x: 0, y: 0, z: 1 }, axisZ: { x: 1, y: 0, z: 0 } } })), furnitures: [] };
  await page.locator('label[data-bazis-yukla] input[type=file]').setInputFiles({ name: 'namuna.bpj', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bpj)) });
  for (let i = 0; i < 60 && !(await M(() => !!document.querySelector('[data-varaq="bazis"]'))); i++) await page.waitForTimeout(250);
  await page.locator('[data-varaq="bazis"] button', { hasText: 'Yopish' }).last().click().catch(() => {});
  for (let i = 0; i < 40 && !(await M(() => window.__app.sahna && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(800);
  R.bazis = await M(() => { const s = window.__app.sahna; return { chizish: s.korinish.holat.chizish, xona: s.korinish.holat.xona, devor: s.sp.groups.walls3d.visible }; });
  await page.screenshot({ path: `${OUT}/korinish-1440-bazis.png` });

  R.errs = errs;
  R.ok = R.orbit.min === 0 && Math.abs(R.orbit.max - Math.PI) < 1e-6 && R.orbit.pan && R.orbit.yaqin <= 300 && R.orbit.kursor && R.polOsti && R.panel &&
    R.yuqori.z > 3 * Math.hypot(R.yuqori.x, R.yuqori.y) && R.old.y > 3 * Math.abs(R.old.x) && R.old.y > 3 * Math.abs(R.old.z) && R.yaqinlashdi && R.menyu &&
    R.qirrali.q > 0 && R.qirrali.q === R.qirrali.n && R.karkas.faces === 0 && R.karkas.q > 0 && R.rentgen.shaffof > 0 && R.fonOq === 0xffffff &&
    !R.xonasiz.devor && !R.xonasiz.pol && R.fasadsiz.fasadYoq > 0 && R.boyalgan.q === 0 && R.boyalgan.faces === R.boyalgan.n && R.boyalgan.shaffof === 0 &&
    R.orto && R.perspektiva && Math.abs(R.yurishKoz - 1600) < 2 && R.yurdi > 200 && R.yurishIzoh && R.qaytdi && R.menyuYopildi &&
    R.olcham > 50 && R.olchamYozuv && R.saqlandi.fon === 0xffffff && R.saqlandi.chizish === 'boyalgan' && R.saqlandi.xona === false &&
    R.tel.menyu && R.tel.sigadi && R.tel.panel && !R.tel.ustma && !R.tel.hScroll && R.bazis.chizish === 'qirrali' && R.bazis.xona === false && R.bazis.devor === false &&
    errs.length === 0;
}
