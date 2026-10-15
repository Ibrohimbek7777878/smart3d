/* F1 quvur/rozetka brauzer QA */
export default async function run(page) {
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const R = {}; let STEP = 'init';
  page.on('dialog', d => d.accept());
  try {
    await page.reload();
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 25000 });

    STEP = 'qoshish';
    await page.selectOption('#uType', 'pipe');
    await page.selectOption('#uWall', '1');
    await page.fill('#uOffset', '700');
    await page.fill('#uZ', '450');
    await page.click('#uAdd');
    await page.selectOption('#uType', 'outlet');
    await page.selectOption('#uWall', '2');
    await page.fill('#uOffset', '1200');
    await page.fill('#uZ', '300');
    await page.click('#uAdd');
    R.added = await M(() => {
      const u = window.__s3d.state.doc.room.utilities || [];
      return { n: u.length, first: u[0], second: u[1] };
    });

    STEP = 'oChirish';
    await page.click('#uList .chip [data-delu]');
    R.afterDel = await M(() => (window.__s3d.state.doc.room.utilities || []).length);

    STEP = 'L-ga-otish';
    await page.click('#zShapes .chip[data-shape="l"]');
    await page.waitForTimeout(300);
    R.onL = await M(() => ({
      uWallOpts: document.getElementById('uWall').options.length,
      uWallVal: document.getElementById('uWall').value,
      utilN: (window.__s3d.state.doc.room.utilities || []).length
    }));

    STEP = 'validatsiya';
    R.val = await M(async () => {
      const { validateDoc } = await import('/js/engine/rules.js');
      const doc = window.__s3d.state.doc;
      const res = validateDoc(doc);
      return { utilErrs: res.errors.filter(e => e.code && e.code.startsWith('E_UTIL')).length, allErrs: res.errors.length };
    });

    STEP = 'screenshot';
    await page.screenshot({ path: (process.env.QA_OUT || 'tests/ui/out') + '/qa_util.png' });
    R.errs = await M(() => document.documentElement.dataset.errs || "(xato yo'q)");
  } catch (e) {
    R.__err = String((e && e.stack) || e).split('\n').slice(0, 3).join(' | ');
    R.__step = STEP;
  }
  return R;
}
