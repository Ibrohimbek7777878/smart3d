/* Responsive matritsa: har qurilmada o'lchov + skrinshot (TZ §4 qabul) */
const OUT = process.env.QA_OUT || 'tests/ui/out';
const DEVICES = [
  { id: 'android-360', w: 360, h: 740, dpr: 3, mobile: true },
  { id: 'iphone-390', w: 390, h: 844, dpr: 3, mobile: true },
  { id: 'phone-land-844', w: 844, h: 390, dpr: 3, mobile: true },
  { id: 'ipad-768', w: 768, h: 1024, dpr: 2, mobile: true },
  { id: 'ipad-land-1024', w: 1024, h: 768, dpr: 2, mobile: true },
  { id: 'laptop-1366', w: 1366, h: 768, dpr: 1, mobile: false },
  { id: 'desktop-1920', w: 1920, h: 1080, dpr: 1, mobile: false },
];
export default async function run(page) {
  const fs = await import('fs'); fs.mkdirSync(OUT, { recursive: true });
  await page.addInitScript(() => {
    const push = s => { const el = document.documentElement; el.dataset.errs = (el.dataset.errs || '') + s + ' || '; };
    addEventListener('error', e => push((e.message || 'resurs') + ' @' + (e.filename || '') + ':' + (e.lineno || '')), true);
    addEventListener('unhandledrejection', e => push('rej: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
  });
  page.on('dialog', d => d.accept());
  const cdp = await page.context().newCDPSession(page);
  const only = (process.env.QA_ONLY || '').split(',').filter(Boolean);
  const res = {};
  for (const d of DEVICES) {
    if (only.length && !only.includes(d.id)) continue;
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: d.w, height: d.h, deviceScaleFactor: d.dpr, mobile: d.mobile });
    await cdp.send('Emulation.setTouchEmulationEnabled', d.mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });

    await page.reload();
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 20000 });
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const vw = innerWidth, vh = innerHeight;
      const c = document.querySelector('#scene canvas'), sc = document.getElementById('scene');
      const cr = c.getBoundingClientRect(), sr = sc.getBoundingClientRect();
      const dpr = devicePixelRatio;
      const tabs = [...document.querySelectorAll('.tab')].map(t => t.getBoundingClientRect());
      const tabsOk = tabs.every(r => r.left >= 0 && r.right <= vw + 1 && r.bottom <= vh + 1 && r.top >= 0 && r.width > 0);
      const small = [...document.querySelectorAll('button, select, input, [contenteditable]')]
        .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 36 || r.width < 36); })
        .map(el => (el.id || el.className || el.tagName) + ':' + Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height));
      const price = document.getElementById('totalPrice').getBoundingClientRect();
      const ctl = [...document.querySelectorAll('#viewCtl .pill')].map(b => b.getBoundingClientRect());
      const ctlOk = ctl.every(r => r.left >= 0 && r.right <= vw + 1);
      return {
        dpr, vw, vh, hScroll: document.documentElement.scrollWidth > vw + 1 || document.body.scrollWidth > vw + 1,
        canvasCss: Math.round(cr.width) + 'x' + Math.round(cr.height), sceneBox: Math.round(sr.width) + 'x' + Math.round(sr.height),
        canvasFits: Math.abs(cr.width - sr.width) < 2 && Math.abs(cr.height - sr.height) < 2,
        bufOk: Math.abs(c.width - sr.width * Math.min(dpr, 2)) < 3,
        tabsOk, ctlOk, priceVisible: price.width > 0 && price.right <= vw + 1,
        smallTargets: small.length, smallSample: small.slice(0, 6),
        errs: document.documentElement.dataset.errs || ''
      };
    });
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${OUT}/${d.id}.png`, Buffer.from(shot.data, 'base64'));
    res[d.id] = m;
  }
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  return res;
}
