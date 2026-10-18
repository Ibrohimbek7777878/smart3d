/* Egasi #151, #152: modulni sichqoncha/barmoq bilan surish (3D), devordan DEVOR_ORALIQ mm, standart xona 5 × 4 m.
 * Tekshiriladi: yangi ish joyi xonasi 5000 × 4000; avtomatik oshxonada har modul devor yuzasidan 3 mm (devor ichiga kirish 0);
 * 3D da modul ustida sichqoncha bilan tortish — placement.x/y o'zgaradi, z va kamera o'zgarmaydi; Esc — joyiga qaytadi;
 * devor tomon tortilsa — devorga 3 mm qolguncha yopishadi, ichiga kirmaydi, qo'shni modulga kirmaydi; bo'sh joyda tortish —
 * kamera aylanadi; planshet (touch): ~300 ms ushlab surish (pointerType 'touch'), ushlamasdan siljitish — kamera.
 * #153: devorsiz ko'rinishda (xona o'chiq) pol maydoni chegarasi — modul yo'q: 5000 × 4000, bor: modullar qutisi + 1000 mm
 * har tomondan; ramka va o'lcham yozuvi; modul surilsa — kengayadi; "Markazga" — butun maydon ekranda.
 * Ishlatish: bash tests/ui/web.sh surish   Skrinshotlar: tests/ui/out/web/surish-*.png */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/surish-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

const ORALIQ = 3, YARIM = 50;   // DEVOR_ORALIQ (engine/devorOraliq.js) va devor qalinligining yarmi (100/2)

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };

  /* sahifada: placement holati, devor oraliqlari (to'rtburchak xona, o'qqa parallel), ustma-ust juftlar */
  const holat = () => M(([ORALIQ, YARIM]) => {
    const d = window.__app.doc, o = d.room.outline;
    const xs = o.map(p => p[0]), ys = o.map(p => p[1]);
    const X0 = Math.min(...xs), X1 = Math.max(...xs), Y0 = Math.min(...ys), Y1 = Math.max(...ys);
    const fp = (p) => {
      const r = ((+p.rot || 0) % 360 + 360) % 360, c = [1, 0, -1, 0][r / 90] ?? Math.cos(r * Math.PI / 180), s = [0, 1, 0, -1][r / 90] ?? Math.sin(r * Math.PI / 180);
      const P = [[0, 0], [p.w, 0], [p.w, p.d], [0, p.d]].map(([a, b]) => [p.x + a * c - b * s, p.y + a * s + b * c]);
      return { x0: Math.min(...P.map(q => q[0])), x1: Math.max(...P.map(q => q[0])), y0: Math.min(...P.map(q => q[1])), y1: Math.max(...P.map(q => q[1])) };
    };
    const pl = d.placements.filter(p => !p.auto);
    const oraliq = pl.map(p => { const f = fp(p); return [f.x0 - X0 - YARIM, f.y0 - Y0 - YARIM, X1 - YARIM - f.x1, Y1 - YARIM - f.y1].filter(g => g < 60); });
    const zK = (a, b) => (+a.z || 0) < (+b.z || 0) + (+b.h || 0) - 0.5 && (+b.z || 0) < (+a.z || 0) + (+a.h || 0) - 0.5;
    const ustma = [];
    for (let i = 0; i < pl.length; i++) for (let j = i + 1; j < pl.length; j++) {
      const A = fp(pl[i]), B = fp(pl[j]);
      if (zK(pl[i], pl[j]) && Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0) > 0.5 && Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0) > 0.5) ustma.push(pl[i].id + '~' + pl[j].id);
    }
    return { pl: Object.fromEntries(pl.map(p => [p.id, { x: p.x, y: p.y, z: p.z }])), oraliq: Object.fromEntries(pl.map((p, i) => [p.id, oraliq[i]])), ustma, n: pl.length };
  }, [ORALIQ, YARIM]);
  const kam = () => M(() => { const c = window.__app.sahna.sp.camera.position; return [c.x, c.y, c.z].map(v => Math.round(v)).join(','); });
  /* modul ekranda: markazi proyeksiyasi, shu nuqtada aynan shu modul bosiladi (raycast) */
  const nuqta = (f) => M((f) => {
    const s = window.__app.sahna, it = s.items, c = s.sp.renderer.domElement.getBoundingClientRect();
    const ms = it.meshes.filter(m => !m.userData.auto && (f.id ? m.userData.id === f.id : (f.ustki ? m.userData.z >= 1000 : m.userData.z < 1000 && m.userData.h < 1200)));
    for (const m of ms) for (const dz of [0, -0.25, 0.25]) {
      const v = m.position.clone(); v.z += dz * m.userData.h;
      v.project(s.sp.camera);
      const x = c.left + (v.x + 1) / 2 * c.width, y = c.top + (1 - v.y) / 2 * c.height;
      if (x < c.left + 30 || x > c.right - 30 || y < c.top + 90 || y > c.bottom - 60) continue;
      if (it.pickId({ clientX: x, clientY: y }) === m.userData.id) return { id: m.userData.id, x: Math.round(x), y: Math.round(y) };
    }
    return null;
  }, f);
  const boshJoy = () => M(() => {
    const s = window.__app.sahna, it = s.items, c = s.sp.renderer.domElement.getBoundingClientRect();
    for (let fy = 0.2; fy < 0.85; fy += 0.05) for (let fx = 0.15; fx < 0.85; fx += 0.05) {
      const x = c.left + c.width * fx, y = c.top + c.height * fy;
      if (!it.hitTest({ clientX: x, clientY: y }) && document.elementFromPoint(x, y) === s.sp.renderer.domElement) return { x: Math.round(x), y: Math.round(y) };
    }
    return null;
  });
  const sichqoncha = async (a, dx, dy, esc = false) => {
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(a.x + dx * i / 12, a.y + dy * i / 12); await page.waitForTimeout(16); }
    if (esc) { await page.keyboard.press('Escape'); await page.waitForTimeout(100); }
    await page.mouse.up(); await page.waitForTimeout(500);
  };
  const oraliqOk = (h) => Object.values(h.oraliq).every(g => g.every(v => v >= ORALIQ - 0.5));
  /* #153: maydon — yozuv, chegara, modullar qutisi, burchaklar ekranda (kanva ichida) */
  const maydon = () => M(() => {
    const s = window.__app.sahna, k = s.korinish, b = k.maydonQuti, el = document.querySelector('[data-maydon]');
    const g = s.sp.scene.getObjectByName('maydon');
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const m of s.items.meshes) { const u = m.userData; const r = (u.rot || 0) * Math.PI / 180, c = Math.cos(r), sn = Math.sin(r);
      for (const [a, q] of [[0, 0], [u.w, 0], [u.w, u.d], [0, u.d]]) { const X = u.x + a * c - q * sn, Y = u.y + a * sn + q * c; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); } }
    let korinadi = null;
    if (b) { korinadi = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]].every(([x, y]) => { const v = g.children[0].position.clone().set(x, y, 0).project(s.sp.camera); return Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1; }); }
    return { faol: k.maydonFaol(), yozuv: el ? el.getAttribute('data-maydon') : null, quti: b, chegara: !!(g && g.visible && g.children.some(c => c.isLineLoop)), korinadi,
      modul: isFinite(x0) ? { x0: Math.round(x0), y0: Math.round(y0), x1: Math.round(x1), y1: Math.round(y1) } : null };
  });
  const xonaQoy = async (on) => { await M((on) => window.__app.sahna.korinish.set({ xona: on }), on); await page.waitForTimeout(200); };

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Surish Usta'); await fill('jasur@', 'surish' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 40 && !(await M(() => window.__app && window.__app.doc && window.__app.doc.room)); i++) await page.waitForTimeout(250);

  /* 1) standart xona — 5 × 4 m (egasi #152), balandlik 2700 */
  R.xona = await M(() => ({ o: window.__app.doc.room.outline, h: window.__app.doc.room.wall_height, n: window.__app.doc.placements.length }));
  R.xonaOk = JSON.stringify(R.xona.o) === '[[0,0],[5000,0],[5000,4000],[0,4000]]' && R.xona.h === 2700;
  /* 1b) #153: modul yo'q, devorsiz ko'rinish — standart maydon 5000 × 4000, chegara va yozuv bilan, "Markazga" — to'liq ko'rinadi */
  for (let i = 0; i < 40 && !(await M(() => !!(window.__app.sahna && window.__app.sahna.korinish))); i++) await page.waitForTimeout(250);
  await xonaQoy(false); await M(() => window.__app.sahna.center()); await page.waitForTimeout(800);
  R.maydonBosh = await maydon();
  R.maydonBoshOk = R.maydonBosh.faol && R.maydonBosh.yozuv === '5000x4000' && R.maydonBosh.chegara && R.maydonBosh.korinadi === true;
  await page.screenshot({ path: `${OUT}/surish-0-maydon-bosh.png` });
  await xonaQoy(true);
  R.maydonYoqoldi = await M(() => !document.querySelector('[data-maydon]') && !window.__app.sahna.sp.scene.getObjectByName('maydon').visible);

  /* 2) tez boshlash — oshxona (avtomatik konstruktor): har modul devordan 3 mm, devorga kirish 0, ustma-ust yo'q */
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.sahna && window.__app.res)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1200);
  const h0 = await holat();
  const hammasi = Object.values(h0.oraliq).flat();
  R.oshxona = { n: h0.n, oraliqlar: [...new Set(hammasi.map(v => Math.round(v * 10) / 10))], ustma: h0.ustma };
  R.oshxonaOk = h0.n > 4 && hammasi.length > 0 && oraliqOk(h0) && hammasi.some(v => Math.abs(v - ORALIQ) < 0.5) && !h0.ustma.length;
  R.rejim = await M(() => window.__app.sahna.sp.mode);
  await page.screenshot({ path: `${OUT}/surish-1-oshxona.png` });

  /* 3) 3D: sichqoncha bilan modul ustida tortish — modul suriladi, kamera aylanmaydi */
  const a = await nuqta({});
  if (!a) throw new Error('ekranda pastki modul topilmadi');
  R.modul = a.id;
  const k0 = await kam();
  await sichqoncha(a, 0, 140);                             // ekranda pastga — xona ichiga (devordan uzoqlashadi)
  const h1 = await holat(), p0 = h0.pl[a.id], p1 = h1.pl[a.id];
  R.sichqoncha = { oldin: p0, keyin: p1, kamera: [k0, await kam()], sel: await M(() => window.__app.state.sel) };
  R.sichqonchaOk = (p1.x !== p0.x || p1.y !== p0.y) && p1.z === p0.z && R.sichqoncha.kamera[0] === R.sichqoncha.kamera[1] && oraliqOk(h1) && !h1.ustma.length;
  await page.screenshot({ path: `${OUT}/surish-2-sichqoncha.png` });

  /* 4) Esc — surish bekor, modul joyiga qaytadi */
  const b = await nuqta({ id: a.id });
  if (b) await sichqoncha(b, 90, 40, true);
  const h2 = await holat();
  R.esc = { oldin: p1, keyin: h2.pl[a.id] };
  R.escOk = !!b && h2.pl[a.id].x === p1.x && h2.pl[a.id].y === p1.y;

  /* 5) devor tomon (ekranda yuqoriga, uzoq) — devorga 3 mm da to'xtaydi (magnit yo'q, egasi #156): oraliq aynan 3 mm, devor ichiga va qo'shni modulga kirmaydi */
  const c = await nuqta({ id: a.id });
  if (c) await sichqoncha(c, 0, -420);
  const h3 = await holat();
  R.devor = { joy: h3.pl[a.id], oraliq: h3.oraliq[a.id], ustma: h3.ustma };
  R.devorOk = !!c && h3.oraliq[a.id].some(v => Math.abs(v - ORALIQ) < 0.5) && oraliqOk(h3) && !h3.ustma.length;

  /* 6) bo'sh joyda tortish — kamera aylanadi, modullar joyida */
  const e0 = await boshJoy(), k1 = await kam();
  if (e0) await sichqoncha(e0, 160, 0);
  const h4 = await holat();
  R.boshJoy = { nuqta: e0, kamera: [k1, await kam()] };
  R.boshJoyOk = !!e0 && R.boshJoy.kamera[0] !== R.boshJoy.kamera[1] && JSON.stringify(h4.pl) === JSON.stringify(h3.pl);

  /* 7) ustki modul ham suriladi — balandligi (z) o'zgarmaydi */
  await M(() => { const s = window.__app.sahna; s.center(); });
  await page.waitForTimeout(700);
  const u = await nuqta({ ustki: true });
  if (u) await sichqoncha(u, 0, 120);                       // ekranda pastga — devordan uzoqlashadi (qatordagi qo'shniga emas)
  const h5 = await holat();
  R.ustki = u ? { id: u.id, oldin: h4.pl[u.id], keyin: h5.pl[u.id] } : null;
  R.ustkiOk = !!u && (h5.pl[u.id].x !== h4.pl[u.id].x || h5.pl[u.id].y !== h4.pl[u.id].y) && h5.pl[u.id].z === h4.pl[u.id].z && oraliqOk(h5) && !h5.ustma.length;

  /* 7b) #153: devorsiz — maydon = modullar qutisi + 1000 mm; modul surilsa — chegara kengayadi (modul doim ichida, 1 m zaxira) */
  await xonaQoy(false); await M(() => window.__app.sahna.center()); await page.waitForTimeout(800);
  const my0 = await maydon();
  const qutiTeng = (m) => m.quti && m.modul && m.quti.x0 === m.modul.x0 - 1000 && m.quti.y0 === m.modul.y0 - 1000 && m.quti.x1 === m.modul.x1 + 1000 && m.quti.y1 === m.modul.y1 + 1000;
  await page.screenshot({ path: `${OUT}/surish-4-maydon.png` });
  const mm = await nuqta({});
  if (mm) await sichqoncha(mm, 0, 200);
  await M(() => window.__app.sahna.center()); await page.waitForTimeout(800);
  const my1 = await maydon();
  R.maydon = { oldin: my0, keyin: my1 };
  R.maydonOk = my0.faol && my0.chegara && qutiTeng(my0) && my0.korinadi === true && my0.yozuv === (my0.quti.x1 - my0.quti.x0) + 'x' + (my0.quti.y1 - my0.quti.y0)
    && !!mm && qutiTeng(my1) && JSON.stringify(my1.quti) !== JSON.stringify(my0.quti) && my1.korinadi === true;
  await page.screenshot({ path: `${OUT}/surish-5-maydon-surildi.png` });
  await xonaQoy(true); await M(() => window.__app.sahna.center()); await page.waitForTimeout(700);

  /* 8) planshet (touch): ushlab turib surish — pointerType 'touch'; ushlamasdan siljitish — kamera aylanadi */
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1180, height: 820, deviceScaleFactor: 2, mobile: true });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.waitForTimeout(900);
  await M(() => { window.__pt = []; window.__app.sahna.sp.renderer.domElement.addEventListener('pointerdown', e => window.__pt.push(e.pointerType), true); window.__app.sahna.center(); });
  await page.waitForTimeout(700);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i })) });
  const barmoq = async (q, dx, dy, ushla) => {
    await touch('touchStart', [[q.x, q.y]]);
    if (ushla) await page.waitForTimeout(ushla);
    for (let i = 1; i <= 12; i++) { await touch('touchMove', [[q.x + dx * i / 12, q.y + dy * i / 12]]); await page.waitForTimeout(16); }
    await touch('touchEnd', []); await page.waitForTimeout(500);
  };
  const t0 = await nuqta({});
  const ht0 = await holat();
  if (t0) await barmoq(t0, 0, 120, 450);
  const ht1 = await holat();
  R.touch = t0 ? { id: t0.id, oldin: ht0.pl[t0.id], keyin: ht1.pl[t0.id], pt: await M(() => window.__pt.slice()) } : null;
  R.touchOk = !!t0 && (ht1.pl[t0.id].x !== ht0.pl[t0.id].x || ht1.pl[t0.id].y !== ht0.pl[t0.id].y) && R.touch.pt.includes('touch') && oraliqOk(ht1) && !ht1.ustma.length;
  await page.screenshot({ path: `${OUT}/surish-3-touch.png` });
  const t1 = await nuqta({}), kt = await kam();
  if (t1) await barmoq(t1, 140, 0, 0);
  const ht2 = await holat();
  R.touchKamera = { kamera: [kt, await kam()], ozgarmadi: JSON.stringify(ht2.pl) === JSON.stringify(ht1.pl) };
  R.touchKameraOk = !!t1 && R.touchKamera.kamera[0] !== R.touchKamera.kamera[1] && R.touchKamera.ozgarmadi;
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await cdp.send('Emulation.clearDeviceMetricsOverride');

  R.errs = errs;
  R.ok = R.xonaOk && R.maydonBoshOk && R.maydonYoqoldi && R.maydonOk && R.oshxonaOk && R.rejim === '3d' && R.sichqonchaOk && R.escOk && R.devorOk && R.boshJoyOk && R.ustkiOk && R.touchOk && R.touchKameraOk && !errs.length;
}
