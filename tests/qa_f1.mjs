/* F1 brauzer QA: L shakl poligoni — jadval, apply, devorlar soni, teshik, xatolar */
export default async function run(page) {
  const R = {}; const STEP = { s: 'init' };
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  await page.addInitScript(() => {
    const push = s => { const el = document.documentElement; el.dataset.errs = (el.dataset.errs || '') + s + ' || '; };
    addEventListener('error', e => push((e.message || 'resurs') + ' @' + (e.filename || '') + ':' + (e.lineno || '')), true);
    addEventListener('unhandledrejection', e => push('rejection: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
  });
  page.on('dialog', d => d.accept());
  try {
    await page.reload();
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 25000 });

    STEP.s = 'rect-boshlangich';
    R.rect0 = await M(() => ({
      pts: [...document.querySelectorAll('#zPts [data-row]')].length,
      wallOpts: document.getElementById('oWall').options.length,
      outline: window.__s3d.state.doc.room.outline.length
    }));

    STEP.s = 'W-D-input-rectify';
    await page.fill('#zW', '5000');
    await page.fill('#zD', '4000');
    R.rectified = await M(() => [...document.querySelectorAll('#zPts .px')].map(i => i.value));

    STEP.s = 'L-shakl';
    await page.click('#zShapes .chip[data-shape="l"]');
    await page.waitForTimeout(400);
    R.L = await M(() => {
      const s = window.__s3d;
      const o = s.state.doc.room.outline;
      return {
        outlineLen: o.length,
        outline: o.map(p => [p[0], p[1]]),
        wallOpts: document.getElementById('oWall').options.length,
        wallLabels: [...document.getElementById('oWall').options].map(o => o.textContent),
        zW: document.getElementById('zW').value, zD: document.getElementById('zD').value,
        ptsRows: document.querySelectorAll('#zPts [data-row]').length
      };
    });

    STEP.s = 'teshik-edge5';
    await page.selectOption('#oWall', '5');
    await page.click('#oAdd');
    R.opening = await M(() => {
      const op = window.__s3d.state.doc.room.openings[0];
      return op ? { wall: op.wall, width: op.width, offset: op.offset } : null;
    });

    STEP.s = 'qoldir-dan-keyin-apply';
    await page.click('#zApply');
    await page.waitForTimeout(300);
    R.afterApply = await M(() => ({ outlineLen: window.__s3d.state.doc.room.outline.length }));

    STEP.s = 'nuqta-qoshish';
    await page.click('#zPtAdd');
    R.afterAdd = await M(() => document.querySelectorAll('#zPts [data-row]').length);

    STEP.s = 'rectga-qaytish';
    await page.click('#zShapes .chip[data-shape="rect"]');
    await page.waitForTimeout(300);
    R.backRect = await M(() => ({ outline: window.__s3d.state.doc.room.outline.length,
      wallOpts: document.getElementById('oWall').options.length }));

    R.errs = await M(() => document.documentElement.dataset.errs || "(xato yo'q)");
    await page.screenshot({ path: (process.env.QA_OUT || '/tmp/opencode') + '/qa_f1_l.png' });
  } catch (e) {
    R.__err = String((e && e.stack) || e).split('\n').slice(0, 3).join(' | ');
    R.__step = STEP.s;
  }
  return R;
}
