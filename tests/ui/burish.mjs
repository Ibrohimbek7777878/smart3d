/* TZ-08 (3-qism): mebelni burish dastagi — sichqoncha va barmoq (qoida 6.2) */
export default async function run(page) {
  await page.addInitScript(() => {
    const push = s => { const el = document.documentElement; el.dataset.errs = (el.dataset.errs || '') + s + ' || '; };
    addEventListener('error', e => push((e.message || 'resurs') + ' @' + (e.filename || '') + ':' + (e.lineno || '')), true);
    addEventListener('unhandledrejection', e => push('rej: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
  });
  page.on('dialog', d => d.accept());
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  /* mebel markazi (dunyo) va ekran nuqtalari */
  const info = () => M(() => {
    const s = window.__s3d, c = s.sp.cam2d, p = s.state.doc.placements.find(q => q.id === s.state.selectedId);
    const rect = document.querySelector('#scene canvas').getBoundingClientRect();
    const r = (p.rot || 0) * Math.PI / 180;
    const cx = p.x + p.w / 2 * Math.cos(r) - p.d / 2 * Math.sin(r), cy = p.y + p.w / 2 * Math.sin(r) + p.d / 2 * Math.cos(r);
    const toS = (x, y) => ({ x: rect.left + (x - c.left) / (c.right - c.left) * rect.width, y: rect.top + (c.top - y) / (c.top - c.bottom) * rect.height });
    const h = document.querySelector('.rot-handle'), hb = h.getBoundingClientRect();
    return { id: p.id, rot: p.rot || 0, cx: Math.round(cx), cy: Math.round(cy), cs: toS(cx, cy),
      hs: { x: hb.left + hb.width / 2, y: hb.top + hb.height / 2 }, hw: Math.round(hb.width), hv: getComputedStyle(h).display !== 'none' && hb.width > 0,
      cam: [c.left, c.right, c.top, c.bottom].map(Math.round).join(',') };
  });
  /* ekranda markaz atrofida +90° (soat strelkasiga teskari) aylantirilgan nuqta */
  const turn = (i, deg) => { const a = -deg * Math.PI / 180, dx = i.hs.x - i.cs.x, dy = i.hs.y - i.cs.y;
    return { x: i.cs.x + dx * Math.cos(a) - dy * Math.sin(a), y: i.cs.y + dx * Math.sin(a) + dy * Math.cos(a) }; };
  const selectFirst = async (tapper) => {
    const pt = await M(() => { const s = window.__s3d, c = s.sp.cam2d, p = s.state.doc.placements[0];
      const r = document.querySelector('#scene canvas').getBoundingClientRect();
      return { x: r.left + (p.x + p.w / 2 - c.left) / (c.right - c.left) * r.width, y: r.top + (c.top - (p.y + p.d / 2)) / (c.top - c.bottom) * r.height }; });
    await tapper(pt); await page.waitForTimeout(400);
  };
  const R = {};

  /* ── kompyuter: sichqoncha ── */
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 20000 });
  await selectFirst(async (pt) => { await page.mouse.click(pt.x, pt.y); });
  const a0 = await info();
  await page.mouse.move(a0.hs.x, a0.hs.y); await page.mouse.down();
  for (const k of [20, 45, 70, 90]) { const t = turn(a0, k); await page.mouse.move(t.x, t.y, { steps: 4 }); }
  await page.mouse.up(); await page.waitForTimeout(500);
  const a1 = await info();
  R.sichqoncha = { dastak: a0.hv, dastakPx: a0.hw, rot: `${a0.rot} → ${a1.rot}`, burildi90: a1.rot === (a0.rot + 90) % 360,
    markazJoyida: Math.hypot(a1.cx - a0.cx, a1.cy - a0.cy) <= 2, kameraSiljimadi: a0.cam === a1.cam };
  await page.click('#btn3d'); await page.waitForTimeout(500);
  R.uchD_dastakYashirin = await M(() => getComputedStyle(document.querySelector('.rot-handle')).display === 'none');
  await page.click('#btn2d'); await page.waitForTimeout(400);

  /* ── telefon: barmoq ── */
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 20000 });
  const touch = async (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [] });
  await selectFirst(async (pt) => { await touch('touchStart', pt); await touch('touchEnd'); });
  const b0 = await info();
  await touch('touchStart', b0.hs);
  for (const k of [15, 30, 45, 60, 75, 90]) { await touch('touchMove', turn(b0, k)); await page.waitForTimeout(30); }
  await touch('touchEnd'); await page.waitForTimeout(500);
  const b1 = await info();
  R.barmoq = { dastak: b0.hv, dastakPx: b0.hw, rot: `${b0.rot} → ${b1.rot}`, burildi90: b1.rot === (b0.rot + 90) % 360,
    markazJoyida: Math.hypot(b1.cx - b0.cx, b1.cy - b0.cy) <= 2, kameraSiljimadi: b0.cam === b1.cam };
  await page.screenshot({ path: (process.env.QA_OUT || 'tests/ui/out') + '/burish-telefon.png' });
  R.errs = await M(() => document.documentElement.dataset.errs || "(xato yo'q)");
  return R;
}
