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
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
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

  /* 2b) TZ zoom: silliq, kursor tomonga, bir qadam chegarasi, inertsiyada chizish, chegaralar, near/far, anisotropiya */
  {
    const r = await M(() => { const c = window.__app.sahna.sp.renderer.domElement.getBoundingClientRect(); return { x: c.left, y: c.top, w: c.width, h: c.height }; });
    const mx = r.x + r.w * 0.7, my = r.y + r.h * 0.45;
    await page.mouse.move(mx, my); await page.waitForTimeout(300);
    /* kadr yozuvchi: har chizilgan kadrda vaqt va masofa */
    await M(() => {
      const s = window.__app.sahna, sp = s.sp, o = s.ctl.orbit;
      window.__zk = []; window.__zon = true;
      sp.on('render', () => { if (window.__zon) window.__zk.push({ t: performance.now(), d: sp.cam3d.position.distanceTo(o.target) }); });
    });
    const D = () => M(() => { const s = window.__app.sahna; return s.sp.cam3d.position.distanceTo(s.ctl.orbit.target); });
    /* kursor nuri (zoomdan oldin) */
    const nur = await M(([mx, my]) => {
      const s = window.__app.sahna, cam = s.sp.cam3d, T = s.sp.THREE, c = s.sp.renderer.domElement.getBoundingClientRect();
      const v = new T.Vector3(((mx - c.left) / c.width) * 2 - 1, -((my - c.top) / c.height) * 2 + 1, 0.5).unproject(cam).sub(cam.position).normalize();
      return { dir: v.toArray(), p: cam.position.toArray() };
    }, [mx, my]);
    await page.screenshot({ path: `${OUT}/zoom-1-oldin.png` });
    const dA = await D();
    await M(() => { window.__zk.length = 0; });
    await page.mouse.wheel(0, -100);            // bitta qadam
    await page.waitForTimeout(1500);
    const dB = await D();
    const zk1 = await M(() => window.__zk.slice());
    const p1 = await M(() => window.__app.sahna.sp.cam3d.position.toArray());
    const dv = p1.map((v, i) => v - nur.p[i]); const dl = Math.hypot(...dv) || 1;
    const kos = dv.reduce((a, v, i) => a + (v / dl) * nur.dir[i], 0);
    let maxGap = 0; for (let i = 1; i < zk1.length; i++) maxGap = Math.max(maxGap, zk1[i].t - zk1[i - 1].t);
    let mono = true; for (let i = 1; i < zk1.length; i++) if (zk1[i].d > zk1[i - 1].d + 0.01) mono = false;
    /* oxirgi o'zgarish chizilganmi: inertsiya to'xtaganda kamera yana siljimaydi */
    R.zoomQadam = { oldin: Math.round(dA), keyin: Math.round(dB), foiz: +(((dA - dB) / dA) * 100).toFixed(1), kadrlar: zk1.length, maxBosh: Math.round(maxGap), mono, kursorKos: +kos.toFixed(4) };
    /* o'rtada skrinshot: tez 4 qadam */
    await M(() => { window.__zk.length = 0; });
    for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(25); }
    await page.waitForTimeout(40);
    await page.screenshot({ path: `${OUT}/zoom-2-orta.png` });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/zoom-3-keyin.png` });
    const dC = await D();
    R.zoomTez = { d: Math.round(dC), jami: +(((dB - dC) / dB) * 100).toFixed(1) };
    /* klaviatura + va − */
    await page.locator('body').click({ position: { x: 3, y: 3 } }).catch(() => {});
    const dk0 = await D();
    await page.keyboard.press('+'); await page.waitForTimeout(900);
    const dk1 = await D();
    await page.keyboard.press('-'); await page.waitForTimeout(900);
    const dk2 = await D();
    R.zoomKey = { plus: +(((dk0 - dk1) / dk0) * 100).toFixed(1), minus: +(((dk2 - dk1) / dk1) * 100).toFixed(1) };
    /* bir xil qadam: dpr 0.8 / 1 / 2 × Firefox satr (deltaMode=1, 3) va piksel (100; 4 × 25 hodisa) */
    {
      const cdp = await page.context().newCDPSession(page);
      R.zoomMuhit = {};
      for (const dpr of [0.8, 1, 2]) {
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: dpr, mobile: false });
        await page.waitForTimeout(500);
        for (const [nom, dm, dy, n, maxH] of [['satr3', 1, 3, 1, 0.08], ['px100', 0, 100, 1, 0.08], ['px4x25', 0, 4, 25, 0.08]]) {
          await page.mouse.move(mx, my);
          const a = await D();
          await M(([dm, dy, n, mx, my]) => {
            const cv = window.__app.sahna.sp.renderer.domElement;
            for (let i = 0; i < n; i++) cv.dispatchEvent(new WheelEvent('wheel', { deltaMode: dm, deltaY: -dy, clientX: mx, clientY: my, bubbles: true, cancelable: true }));
          }, [dm, dy, n, mx, my]);
          await page.waitForTimeout(1300);
          const b = await D();
          R.zoomMuhit[`dpr${dpr}_${nom}`] = +(((a - b) / a) * 100).toFixed(1);
          await page.mouse.move(mx, my);
          await M(([dm, dy, n, mx, my]) => { const cv = window.__app.sahna.sp.renderer.domElement; for (let i = 0; i < n; i++) cv.dispatchEvent(new WheelEvent('wheel', { deltaMode: dm, deltaY: dy, clientX: mx, clientY: my, bubbles: true, cancelable: true })); }, [dm, dy, n, mx, my]);
          await page.waitForTimeout(1300);
        }
      }
      await cdp.send('Emulation.clearDeviceMetricsOverride'); await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(400);
    }
    /* chegaralar: 40 qadam uzoqlash, keyin 120 qadam yaqinlash */
    await page.mouse.move(mx, my);
    for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 100); await page.waitForTimeout(30); }
    await page.waitForTimeout(1500);
    const dFar = await D();
    const farKam = await M(() => { const c = window.__app.sahna.sp.cam3d; return { near: c.near, far: c.far, maxD: window.__app.sahna.ctl.orbit.maxDistance }; });
    await page.screenshot({ path: `${OUT}/zoom-4-uzoq.png` });
    for (let i = 0; i < 120; i++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(25); }
    await page.waitForTimeout(1500);
    const dNear = await D();
    const nearKam = await M(() => { const c = window.__app.sahna.sp.cam3d; return { near: c.near, far: c.far }; });
    await page.screenshot({ path: `${OUT}/zoom-5-yaqin.png` });
    R.zoomChegara = { uzoq: Math.round(dFar), maxD: Math.round(farKam.maxD), yaqin: Math.round(dNear), farNear: farKam, yaqinNear: nearKam };
    /* TZ zoom chegarasi: bitta modul qoldiriladi; maks. uzoqlashganda modul ekranda >= 8% balandlik; maks. yaqinlashganda
       kamera eng yaqin sirtdan >= 380 mm va mebel qutisi ichida emas */
    await M(() => {
      const g = window.__app.sahna.sp.groups.items; let k = 0;
      for (const ch of g.children) { if (ch.userData && ch.userData.kind === 'hitBox') continue; if (k++ > 0) ch.visible = false; }
      window.__app.sahna.sp._invalidate();
    });
    await page.waitForTimeout(500);
    const olch = () => M(() => {
      const s = window.__app.sahna, sp = s.sp, T = sp.THREE, cam = sp.cam3d, p = cam.position;
      const g = sp.groups.items; let bx = null; let minB = Infinity, ichida = false;
      for (const ch of g.children) {
        if (!ch.visible || (ch.userData && ch.userData.kind === 'hitBox')) continue;
        const b = new T.Box3().setFromObject(ch); if (b.isEmpty()) continue;
        bx = bx || b.clone(); bx.union(b);
        if (b.containsPoint(p)) ichida = true;
        minB = Math.min(minB, b.distanceToPoint(p));
      }
      const ms = []; const kor = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
      for (const gr of [sp.groups.items, sp.groups.walls3d]) gr.traverse(o => { if (o.isMesh && !(o.userData && o.userData.kind === 'hitBox') && kor(o)) ms.push(o); });
      const rc = new T.Raycaster(); let minR = Infinity;
      const dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
      const cd = new T.Vector3(); cam.getWorldDirection(cd); dirs.push(cd.toArray());
      for (const d of dirs) { rc.set(p, new T.Vector3(...d).normalize()); rc.near = 0; rc.far = 2000; const h = rc.intersectObjects(ms, false); if (h.length) minR = Math.min(minR, h[0].distance); }
      /* modul ekrandagi balandligi: qutining 8 burchagi proyeksiyasi */
      let balandlik = 0;
      if (bx) {
        let y0 = 9, y1 = -9;
        for (const x of [bx.min.x, bx.max.x]) for (const y of [bx.min.y, bx.max.y]) for (const z of [bx.min.z, bx.max.z]) { const v = new T.Vector3(x, y, z).project(cam); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
        balandlik = (y1 - y0) / 2;
      }
      return { balandlik: +balandlik.toFixed(3), minQutiga: Math.round(minB), minNur: Math.round(minR), ichida, maxD: Math.round(s.ctl.orbit.maxDistance) };
    });
    await page.mouse.move(mx, my);
    for (let i = 0; i < 80; i++) { await page.mouse.wheel(0, 100); await page.waitForTimeout(30); }
    await page.waitForTimeout(1500);
    const uzoqO = await olch();
    await page.screenshot({ path: `${OUT}/zoom-chegara-uzoq.png` });
    /* yaqinlashish: kursor modul ustida va chetda, ikki holat; kamera hech qachon ichiga kirmasin */
    let minYaqin = Infinity, ichidaBor = false;
    for (const [fx, fy] of [[0.5, 0.5], [0.7, 0.45], [0.35, 0.6]]) {
      await page.mouse.move(r.x + r.w * fx, r.y + r.h * fy);
      for (let i = 0; i < 100; i++) {
        await page.mouse.wheel(0, -100); await page.waitForTimeout(20);
        if (i % 10 === 9) { const o = await olch(); minYaqin = Math.min(minYaqin, o.minQutiga, o.minNur); if (o.ichida) ichidaBor = true; }
      }
      await page.waitForTimeout(1200);
      const o = await olch(); minYaqin = Math.min(minYaqin, o.minQutiga, o.minNur); if (o.ichida) ichidaBor = true;
    }
    const yaqinO = await olch();
    await page.screenshot({ path: `${OUT}/zoom-chegara-yaqin.png` });
    R.zoomChegara2 = { uzoq: uzoqO, yaqin: yaqinO, minYaqin, ichidaBor };
    R.zoomAniso = await M(() => {
      const sp = window.__app.sahna.sp; let n = 0, k = 0;
      sp.scene.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) if (m.map) { n++; if (m.map.anisotropy > 1) k++; } });
      return { aniso: sp._aniso(), tekstura: n, anisoBilan: k };
    });
    await M(() => { window.__zon = false; });
    await btn('yon-izo').click(); await page.waitForTimeout(700);
  }

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

  /* 2c) aylantirish va surishda kamera mebel qutisiga 400 mm dan yaqin kirmaydi (silliq, sakramaydi) */
  R.kameraMebel = await M(() => {
    const s = window.__app.sahna, sp = s.sp, o = s.ctl.orbit, cam = sp.cam3d, T = sp.THREE, qs = [];
    for (const ch of sp.groups.items.children) { if (!ch.visible || (ch.userData && ch.userData.kind === 'hitBox')) continue; const b = new T.Box3().setFromObject(ch); if (!b.isEmpty()) qs.push(b); }
    const eng = (p) => Math.min(...qs.map(b => b.distanceToPoint(p)));
    const b0 = qs[0], c = b0.getCenter(new T.Vector3()), r = { n: qs.length, minAyl: 1e9, sakrash: 0, minPan: 1e9, ichkari: 1e9 };
    /* a) nishon modul markazida, kamera 900 mm radiusda 360° aylanadi (har 5°) — zaxira buzilmasin, qadam katta emas */
    o.target.copy(c); let oldin = null;
    for (let a = 0; a < 360; a += 5) {
      const q = a * Math.PI / 180;
      cam.position.set(c.x + 900 * Math.cos(q), c.y + 900 * Math.sin(q), c.z + 300); o.update();
      r.minAyl = Math.min(r.minAyl, b0.distanceToPoint(cam.position));
      if (oldin) r.sakrash = Math.max(r.sakrash, cam.position.distanceTo(oldin)); oldin = cam.position.clone();
    }
    /* b) kamera to'g'ridan-to'g'ri mebel ichiga qo'yilsa — tashqariga chiqariladi */
    cam.position.copy(c); o.update(); r.ichkari = eng(cam.position);
    /* c) surish: kamerani va nishonni birga mebel ustiga siljitish */
    for (let k = 0; k <= 10; k++) {
      const p = new T.Vector3().lerpVectors(new T.Vector3(b0.min.x - 3000, c.y, c.z + 600), new T.Vector3(c.x, c.y, c.z + 600), k / 10);
      cam.position.copy(p); o.target.set(p.x + 800, p.y, c.z); o.update();
      r.minPan = Math.min(r.minPan, eng(cam.position));
    }
    return r;
  });
  R.kameraMebelOk = R.kameraMebel.n > 0 && R.kameraMebel.minAyl >= 395 && R.kameraMebel.ichkari >= 395 && R.kameraMebel.minPan >= 395 && R.kameraMebel.sakrash < 1500;
  await btn('yon-izo').click(); await page.waitForTimeout(700);

  R.errs = errs;
  R.ok = R.orbit.min === 0 && Math.abs(R.orbit.max - Math.PI) < 1e-6 && R.orbit.pan && R.orbit.yaqin <= 300 && R.orbit.kursor && R.polOsti && R.panel &&
    R.yuqori.z > 3 * Math.hypot(R.yuqori.x, R.yuqori.y) && R.old.y > 3 * Math.abs(R.old.x) && R.old.y > 3 * Math.abs(R.old.z) && R.yaqinlashdi && R.menyu &&
    R.qirrali.q > 0 && R.qirrali.q === R.qirrali.n && R.karkas.faces === 0 && R.karkas.q > 0 && R.rentgen.shaffof > 0 && R.fonOq === 0xffffff &&
    !R.xonasiz.devor && !R.xonasiz.pol && R.fasadsiz.fasadYoq > 0 && R.boyalgan.q === 0 && R.boyalgan.faces === R.boyalgan.n && R.boyalgan.shaffof === 0 &&
    R.orto && R.perspektiva && Math.abs(R.yurishKoz - 1600) < 2 && R.yurdi > 200 && R.yurishIzoh && R.qaytdi && R.menyuYopildi &&
    R.olcham > 50 && R.olchamYozuv && R.saqlandi.fon === 0xffffff && R.saqlandi.chizish === 'boyalgan' && R.saqlandi.xona === false &&
    R.tel.menyu && R.tel.sigadi && R.tel.panel && !R.tel.ustma && !R.tel.hScroll && R.bazis.chizish === 'qirrali' && R.bazis.xona === false && R.bazis.devor === false &&
    R.zoomQadam.foiz >= 3 && R.zoomQadam.foiz <= 7 && R.zoomQadam.kursorKos > 0.98 && R.zoomQadam.kadrlar >= 6 && R.zoomQadam.maxBosh <= 150 && R.zoomQadam.mono &&
    R.zoomTez.jami > 5 && R.zoomTez.jami <= 27 && R.zoomKey.plus > 7 && R.zoomKey.plus < 13 && R.zoomKey.minus > 7 && R.zoomKey.minus < 14 && Object.values(R.zoomMuhit).length === 9 && Object.values(R.zoomMuhit).every(v => v >= 3 && v <= 7) &&
    R.zoomChegara.uzoq <= R.zoomChegara.maxD + 1 && R.zoomChegara.uzoq >= 3000 && R.zoomChegara.yaqin >= 299 &&
    R.zoomChegara.farNear.far > R.zoomChegara.uzoq && R.zoomChegara.farNear.near > R.zoomChegara.yaqinNear.near && R.zoomChegara.farNear.far / R.zoomChegara.farNear.near < 2000 &&
    R.zoomChegara2.uzoq.balandlik >= 0.08 && R.zoomChegara2.minYaqin >= 380 && !R.zoomChegara2.ichidaBor && !R.zoomChegara2.yaqin.ichida &&
    R.kameraMebelOk &&
    R.zoomAniso.aniso > 1 && R.zoomAniso.anisoBilan === R.zoomAniso.tekstura &&
    errs.length === 0;
}
