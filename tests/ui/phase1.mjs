/* Bosqich 1 qabul testi: boot, xatolar, render o'lchami barqarorligi, 360 ochish/yopish */
export default async function run(page) {
  await page.addInitScript(() => {
    const push = s => { const el = document.documentElement; el.dataset.errs = (el.dataset.errs || '') + s + ' || '; };
    addEventListener('error', e => push((e.message || ('resurs: ' + (e.target && (e.target.src || e.target.href)))) + ' @' + (e.filename || '') + ':' + (e.lineno || '')), true);
    addEventListener('unhandledrejection', e => push('rejection: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
  });
  page.on('dialog', d => d.accept());
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 20000 });
  const q = () => page.evaluate(() => {
    const c = document.querySelector('#scene canvas');
    const box = document.getElementById('scene');
    return { bufW: c.width, bufH: c.height, cssW: Math.round(c.getBoundingClientRect().width), boxW: box.clientWidth,
             price: document.getElementById('totalPrice').textContent.trim(), errs: document.documentElement.dataset.errs || '' };
  });
  const before = await q();
  for (let i = 0; i < 3; i++) {
    await page.click('#btnSnap1080');
    await page.waitForTimeout(900);
  }
  const after = await q();
  await page.click('#btnSnap360');
  await page.waitForTimeout(2500);
  const panoOpen = await page.evaluate(() => document.getElementById('panoModal').open && !!document.querySelector('#panoCanvasContainer canvas'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const panoClosed = await page.evaluate(() => !document.getElementById('panoModal').open && !document.querySelector('#panoCanvasContainer canvas'));
  const chips = await page.evaluate(() => [...document.querySelectorAll('#catFilter .chip')].map(c => c.textContent));
  return { before, after, sizeStable: before.bufW === after.bufW && before.bufH === after.bufH, panoOpen, panoClosed, chips, errs: (await q()).errs || '(xato yo\'q)' };
}
