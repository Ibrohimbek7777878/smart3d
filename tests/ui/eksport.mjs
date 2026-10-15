/* TZ-01: stanok eksportlari — Biesse/Homag yashirin, sinalmaganlarida SINOV belgisi va ogohlantirish */
export default async function run(page) {
  await page.addInitScript(() => {
    const push = s => { const el = document.documentElement; el.dataset.errs = (el.dataset.errs || '') + s + ' || '; };
    addEventListener('error', e => push((e.message || 'resurs') + ' @' + (e.filename || '') + ':' + (e.lineno || '')), true);
    addEventListener('unhandledrejection', e => push('rej: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
  });
  page.on('dialog', d => d.accept());
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const R = {};
  for (const [nom, w, h] of [['telefon-390', 390, 844], ['kompyuter-1366', 1366, 768]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.reload();
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 20000 });
    await M(() => window.__s3d.openTab('export')); await page.waitForTimeout(500);
    R[nom] = await M(() => {
      const vis = id => { const el = document.getElementById(id); return !!(el && el.offsetParent); };
      const sinov = [...document.querySelectorAll('#exDxf .sinov, #exNc .sinov, #exGcode .sinov, #exPtp .sinov, #exAltendorf .sinov')].filter(e => e.offsetParent).length;
      return { biesse: vis('exCix'), homag: vis('exMpr'), bpj: vis('exBpj'), sinovBelgi: sinov,
        tekshiruvdaBiesse: /Biesse|Homag/.test(document.getElementById('exCheck').textContent),
        hScroll: document.documentElement.scrollWidth > innerWidth };
    });
    await M(() => document.getElementById('exDxf').scrollIntoView({ block: 'center' }));
    await page.screenshot({ path: (process.env.QA_OUT || 'tests/ui/out') + `/eksport-${nom}.png` });
  }
  /* DXF yuklash — xabarda SINOV */
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exDxf')]);
  R.dxfFayl = dl.suggestedFilename();
  R.xabar = await M(() => [...document.querySelectorAll('#toast .toast')].map(t => t.textContent).join(' | '));
  R.errs = await M(() => document.documentElement.dataset.errs || "(xato yo'q)");
  return R;
}
