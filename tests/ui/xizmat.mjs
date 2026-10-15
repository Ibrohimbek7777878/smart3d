/* TZ-03 (qoida S3): xizmatni usta tanlaydi — prisadka belgisi, narx, saqlash/yuklash */
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
  const snap = () => M(() => {
    const r = window.__s3d.state._res, row = [...document.querySelectorAll('#smWorkshopTable tbody td:first-child')].find(t => /Prisadka/.test(t.textContent));
    return { belgi: document.getElementById('xzTeshik').checked, info: document.getElementById('xzTeshikInfo').textContent.trim(),
      ogohlantirish: !document.getElementById('xzNote').classList.contains('hidden'), holeCost: r.prod.holeCost,
      taklif: r.prod.xizmat_taklif.teshik.amount, jami: r.priceRes.total, tannarx: r.prod.totalCost, qator: row && row.textContent };
  });
  const R = {};
  await M(() => window.__s3d.openTab('smeta')); await page.waitForTimeout(400);
  R.standart = await snap();
  await page.click('#xzTeshik'); await page.waitForTimeout(500);
  R.tanlandi = await snap();
  R.tannarxFarqi = R.tanlandi.tannarx - R.standart.tannarx;
  R.farqTaklifgaTeng = R.tannarxFarqi === R.standart.taklif;
  /* saqlash → qayta yuklash → tanlov eslab qolinadi */
  await M(() => window.__s3d.openTab('zamer')); await page.waitForTimeout(200);
  await page.click('#pSave'); await page.waitForTimeout(300);
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 20000 });
  await M(() => window.__s3d.openTab('zamer')); await page.waitForTimeout(200);
  await page.click('#pLoad'); await page.waitForTimeout(600);
  await M(() => window.__s3d.openTab('smeta')); await page.waitForTimeout(300);
  R.yuklangandan = await snap();
  await page.click('#xzTeshik'); await page.waitForTimeout(500);
  R.olindi = await snap();
  R.errs = await M(() => document.documentElement.dataset.errs || "(xato yo'q)");
  return R;
}
