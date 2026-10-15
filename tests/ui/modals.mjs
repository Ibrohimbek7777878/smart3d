/* Telefon 360×740: modal oynalar sig'adimi, mebel tanlansa panel yig'iladimi */
export default async function run(page) {
  await page.addInitScript(() => {
    const push = s => { const el = document.documentElement; el.dataset.errs = (el.dataset.errs || '') + s + ' || '; };
    addEventListener('error', e => push((e.message || 'resurs') + ' @' + (e.filename || '') + ':' + (e.lineno || '')), true);
  });
  let nativeDialogs = 0;                                   // TZ-08: brauzerning oddiy oynasi chiqmasligi kerak
  page.on('dialog', d => { nativeDialogs++; d.accept(); });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 3, mobile: true });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 20000 });
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const fits = (sel) => M((sel) => { const r = document.querySelector(sel).getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), inside: r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1 }; }, sel);
  const R = {};
  await M(() => window.__s3d.openTab('smeta'));
  await page.waitForTimeout(400);
  await page.click('#nestCfgBtn');
  R.nestModal = await fits('#nestCfgModal .modal-card');
  await page.click('#ncClose');
  await page.click('#btnSnap360');
  await page.waitForTimeout(2500);
  R.panoDialog = await fits('#panoModal');
  R.panoCanvas = await fits('#panoCanvasContainer canvas');
  await page.click('#panoClose');
  /* TZ-08: "Yangi loyiha" — o'z tasdiq oynamiz: Esc → bekor (mebel qoladi), Tasdiqlash → tozalanadi */
  await M(() => window.__s3d.openTab('zamer')); await page.waitForTimeout(300);
  const n0 = await M(() => window.__s3d.state.doc.placements.length);
  await page.click('#pNew'); await page.waitForTimeout(200);
  R.askModal = await fits('#askModal .modal-card');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  R.askEsc = await M(() => ({ yopildi: document.getElementById('askModal').hidden, mebel: window.__s3d.state.doc.placements.length }));
  await page.click('#pNew'); await page.waitForTimeout(200);
  await page.click('#askOk'); await page.waitForTimeout(400);
  R.askOk = { oldin: n0, keyin: await M(() => window.__s3d.state.doc.placements.length) };
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 20000 });
  /* katalogdan qo'shish — panel ochiq qolishi kerak */
  await M(() => window.__s3d.openTab('catalog'));
  await page.waitForTimeout(400);
  await page.click('#catGrid .cat-card');
  await page.waitForTimeout(300);
  R.addFromCatalog = await M(() => ({ panelOpen: document.getElementById('panel').classList.contains('open'), sel: window.__s3d.state.selectedId }));
  /* sahnadagi mebelga tegish — panel yig'iladi, karta ko'rinadi */
  const pt = await M(() => { const s = window.__s3d, c = s.sp.cam2d, p = s.state.doc.placements[0];
    const r = document.querySelector('#scene canvas').getBoundingClientRect();
    return { x: r.left + (p.x + p.w / 2 - c.left) / (c.right - c.left) * r.width, y: r.top + (c.top - (p.y + p.d / 2)) / (c.top - c.bottom) * r.height }; });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pt.x, y: pt.y, id: 0 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(500);
  R.tapInScene = await M(() => ({ panelOpen: document.getElementById('panel').classList.contains('open'),
    cardVisible: getComputedStyle(document.getElementById('itemCard')).display !== 'none' && !document.getElementById('itemCard').classList.contains('hidden') }));
  R.card = await fits('#itemCard');
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  (await import('fs')).writeFileSync((process.env.QA_OUT || 'tests/ui/out') + '/android-card.png', Buffer.from(shot.data, 'base64'));
  R.nativeDialogs = nativeDialogs;
  R.errs = await M(() => document.documentElement.dataset.errs || "(xato yo'q)");
  return R;
}
