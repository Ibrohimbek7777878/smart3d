/* TZ-15: katalogdan ustki shkaf — to'g'ri balandlik (USTKI_Z), pastki ustida, kartada Z maydoni */
export default async function run(page) {
  await page.addInitScript(() => {
    const push = s => { const el = document.documentElement; el.dataset.errs = (el.dataset.errs || '') + s + ' || '; };
    addEventListener('error', e => push((e.message || 'resurs') + ' @' + (e.filename || '') + ':' + (e.lineno || '')), true);
    addEventListener('unhandledrejection', e => push('rej: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
  });
  page.on('dialog', d => d.accept());
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 20000 });
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  await M(() => window.__s3d.openTab('zamer')); await page.waitForTimeout(200);
  await page.click('#pNew'); await page.waitForTimeout(200);
  if (await M(() => !document.getElementById('askModal').hidden)) await page.click('#askOk');
  await page.waitForTimeout(300);
  await M(() => window.__s3d.openTab('catalog')); await page.waitForTimeout(300);
  for (const c of ['MC-KP-02', 'MC-KP-08', 'MC-KU-04', 'MC-KU-07']) { await page.click(`#catGrid .cat-card[data-code="${c}"]`); await page.waitForTimeout(300); }
  const R = {};
  R.joylar = await M(() => window.__s3d.state.doc.placements.map(p => `${p.frg} x=${p.x} z=${p.z}`));
  R.tekshir = await M(() => {
    const P = window.__s3d.state.doc.placements, g = (c) => P.find(p => p.frg === c);
    return { ustkiZ: g('MC-KU-04').z === 1450 && g('MC-KU-07').z === 1450, pastkiZ: g('MC-KP-02').z === 0 && g('MC-KP-08').z === 0,
      ustkiPastkiUstida: g('MC-KU-04').x === g('MC-KP-02').x && g('MC-KU-07').x === g('MC-KP-08').x };
  });
  /* oxirgi qo'yilgan (MC-KU-07) tanlangan — Z ni 1600 ga */
  R.kartadaZ = await M(() => +document.getElementById('icZ').value);
  await page.fill('#icZ', '1600'); await page.dispatchEvent('#icZ', 'change'); await page.waitForTimeout(400);
  R.zOzgardi = await M(() => window.__s3d.state.doc.placements.find(p => p.frg === 'MC-KU-07').z);
  R.validatsiya = await M(() => (window.__s3d.state._res.val.warnings || []).filter(w => /OVERLAP/.test(w.code)).map(w => w.message));
  R.errs = await M(() => document.documentElement.dataset.errs || "(xato yo'q)");
  return R;
}
