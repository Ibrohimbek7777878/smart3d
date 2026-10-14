/* Telefon (iPhone 390×844, DPR 3, touch) — barmoq boshqaruvi qabul testi (TZ §4.2) */
export default async function run(page) {
  await page.addInitScript(() => {
    const push = s => { const el = document.documentElement; el.dataset.errs = (el.dataset.errs || '') + s + ' || '; };
    addEventListener('error', e => push((e.message || 'resurs') + ' @' + (e.filename || '') + ':' + (e.lineno || '')), true);
    addEventListener('unhandledrejection', e => push('rej: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
  });
  page.on('dialog', d => d.accept());
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 20000 });
  await page.waitForTimeout(3300);   // boot toast yo'qolsin
  /* asosiy dunyo (main world) — window.__s3d */
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const cam = () => M(() => { const c = window.__s3d.sp.cam2d; return { l: c.left, r: c.right, t: c.top, b: c.bottom, w: c.right - c.left }; });
  const st = () => M(() => ({ price: document.getElementById('totalPrice').firstChild.textContent.trim(),
    card: !document.getElementById('itemCard').classList.contains('hidden'),
    sel: window.__s3d.state.selectedId, mode: window.__s3d.sp.mode }));
  /* placement → ekran nuqtasi (markaz) */
  const screenOf = (id) => M((id) => {
    const s = window.__s3d, c = s.sp.cam2d, p = s.state.doc.placements.find(q => q.id === id) || s.state.doc.placements[0];
    const r = document.querySelector('#scene canvas').getBoundingClientRect();
    const wx = p.x + p.w / 2, wy = p.y + p.d / 2;
    return { id: p.id, x: r.left + (wx - c.left) / (c.right - c.left) * r.width, y: r.top + (c.top - wy) / (c.top - c.bottom) * r.height, px: p.x, py: p.y };
  }, id);
  const touch = async (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p, i) => ({ x: p[0], y: p[1], id: i })) });
  const tap = async (x, y) => { await touch('touchStart', [[x, y]]); await touch('touchEnd', []); await page.waitForTimeout(80); };
  const drag = async (from, to, steps = 8) => {
    await touch('touchStart', [from]);
    for (let i = 1; i <= steps; i++) await touch('touchMove', [[from[0] + (to[0] - from[0]) * i / steps, from[1] + (to[1] - from[1]) * i / steps]]);
    await touch('touchEnd', []);
    await page.waitForTimeout(80);
  };
  const R = {};
  const canvasBox = await M(() => { const r = document.querySelector('#scene canvas').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  /* 1) mebelga tegish → tanlanadi, karta chiqadi */
  const m = await screenOf('p2');
  await tap(m.x, m.y);
  R.tapSelect = await st();
  /* 2) o'lchamni o'zgartirish (min/max ichida, boshqa qiymat) → narx o'zgaradi */
  const p0 = (await st()).price;
  const nw = await M(() => { const s = window.__s3d.state, p = s.doc.placements.find(q => q.id === s.selectedId), f = s.catalog[p.frg];
    const lo = f.min_w || 300, hi = f.max_w || 1200; return p.w + 100 <= hi ? p.w + 100 : Math.max(lo, p.w - 100); });
  await page.fill('#icW', String(nw)); await page.dispatchEvent('#icW', 'change');
  await page.waitForTimeout(600);
  R.resizePrice = { newW: nw, before: p0, after: (await st()).price, changed: p0 !== (await st()).price };
  /* 3) bo'sh joyga tegish → tanlov bekor */
  await tap(canvasBox.x + canvasBox.w / 2, canvasBox.y + 90);
  R.tapEmptyDeselect = await st();
  /* 4) bir barmoq bilan bo'sh joyni surish → pan */
  const c0 = await cam();
  await drag([canvasBox.x + 60, canvasBox.y + 120], [canvasBox.x + 200, canvasBox.y + 180]);
  const c1 = await cam();
  R.pan = { dx_mm: Math.round(c1.l - c0.l), dy_mm: Math.round(c1.t - c0.t), widthSame: Math.abs(c1.w - c0.w) < 1 };
  /* 5) ikki barmoq — pinch (kattalashtirish) */
  const cx = canvasBox.x + canvasBox.w / 2, cy = canvasBox.y + canvasBox.h / 2;
  await touch('touchStart', [[cx - 40, cy], [cx + 40, cy]]);
  for (let i = 1; i <= 8; i++) await touch('touchMove', [[cx - 40 - i * 12, cy], [cx + 40 + i * 12, cy]]);
  await touch('touchEnd', []);
  await page.waitForTimeout(80);
  const c2 = await cam();
  R.pinch = { widthBefore: Math.round(c1.w), widthAfter: Math.round(c2.w), zoomedIn: c2.w < c1.w * 0.6 };
  /* 6) ikki marta tegish → sig'dirish (boshlang'ich kenglikka qaytadi) */
  await tap(cx, canvasBox.y + 100); await tap(cx, canvasBox.y + 100);
  const c3 = await cam();
  R.doubleTapFit = { width: Math.round(c3.w), original: Math.round(c0.w), restored: Math.abs(c3.w - c0.w) < 2 };
  /* 7) mebelni barmoq bilan sudrash → tanlangan mebelning x i o'zgaradi, narx qayta hisoblanadi */
  const xs0 = await M(() => Object.fromEntries(window.__s3d.state.doc.placements.map(p => [p.id, p.x])));
  const m2 = await screenOf('p3');
  await drag([m2.x, m2.y], [m2.x + 60, m2.y], 10);
  await page.waitForTimeout(500);
  R.dragItem = await M((x0) => { const s = window.__s3d.state, p = s.doc.placements.find(q => q.id === s.selectedId);
    return { sel: s.selectedId, x: p.x, icX: document.getElementById('icX').value }; });
  R.dragItem.xBefore = xs0[R.dragItem.sel]; R.dragItem.moved = R.dragItem.x !== xs0[R.dragItem.sel];
  /* 8) har bir tab: panel ochiladi, sahna qisqaradi, canvas mos */
  R.tabs = {};
  for (const t of ['zamer', 'catalog', 'ai', 'smeta', 'export']) {
    await M((t) => window.__s3d.openTab(t), t);
    if (t === 'zamer') { /* zamer allaqachon aktiv edi — yopildi; qayta ochamiz */ if (!(await M(() => document.getElementById('panel').classList.contains('open')))) await M(() => window.__s3d.openTab('zamer')); }
    await page.waitForTimeout(450);
    R.tabs[t] = await M(() => {
      const c = document.querySelector('#scene canvas').getBoundingClientRect(), s = document.getElementById('scene').getBoundingClientRect();
      const pn = document.getElementById('panel').getBoundingClientRect();
      return { open: document.body.classList.contains('panel-open'), stageH: Math.round(s.height), canvasFits: Math.abs(c.height - s.height) < 2,
               stageAbovePanel: s.bottom <= pn.top + 1, hScroll: document.documentElement.scrollWidth > innerWidth + 1 };
    });
  }
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  (await import('fs')).writeFileSync((process.env.QA_OUT || 'tests/ui/out') + '/iphone-export-tab.png', Buffer.from(shot.data, 'base64'));
  /* 9) 3D: bir barmoq — aylantirish */
  await M(() => window.__s3d.openTab('export'));      // panelni yopish
  await page.click('#btn3d');
  await page.waitForTimeout(300);
  const p3a = await M(() => window.__s3d.sp.cam3d.position.toArray().map(Math.round));
  await drag([cx - 80, cy], [cx + 80, cy], 10);
  await page.waitForTimeout(400);
  const p3b = await M(() => window.__s3d.sp.cam3d.position.toArray().map(Math.round));
  R.orbit3d = { before: p3a, after: p3b, rotated: p3a.join() !== p3b.join() };
  R.errs = await M(() => document.documentElement.dataset.errs || '(xato yo\'q)');
  return R;
}
