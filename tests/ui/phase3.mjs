/* Bosqich 3 qabul testi: material → narx, yagona jami (UI = jadval = Excel), narxsiz belgisi */
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
  const digits = (t) => +String(t).replace(/[^\d]/g, '');
  const snap = () => M(() => {
    const r = window.__s3d.state._res;
    return { header: document.getElementById('totalPrice').firstChild.textContent.trim(),
             table: document.querySelector('#smTable tfoot td.num').textContent.trim(),
             linesSum: r.priceRes.lines.reduce((s, l) => s + l.amount, 0), total: r.priceRes.total,
             cost: r.prod.totalCost, missing: r.prod.missing.length,
             warn: !!document.querySelector('#smMsgs .msg.warn') && document.getElementById('smMsgs').textContent.includes("to'liq emas") };
  });
  const R = {};
  R.start = await snap();
  await M(() => window.__s3d.openTab('catalog')); await page.waitForTimeout(300);
  await page.selectOption('#matSel', 'LDSP16'); await page.waitForTimeout(300);
  R.korpusLDSP16 = await snap();
  await page.selectOption('#fasadSel', 'MDF18'); await page.waitForTimeout(300);
  R.fasadMDF18 = await snap();
  R.consistent = [R.start, R.korpusLDSP16, R.fasadMDF18].every(x => digits(x.header) === x.total && digits(x.table) === x.total && x.linesSum === x.total);
  R.changes = { korpus: R.korpusLDSP16.total !== R.start.total, fasad: R.fasadMDF18.total !== R.korpusLDSP16.total };
  /* ERP varag'i: qidiruv "egger" → birinchi LDSP varaq — korpus narxi o'zgaradi */
  await page.fill('#sheetQ', 'Эггер 18'); await page.waitForTimeout(300);
  const opt = await M(() => [...document.querySelectorAll('#sheetSel option')].find(o => +o.value >= 0 && /ЛДСП/.test(o.textContent))?.value);
  if (opt) { await page.selectOption('#sheetSel', opt); await page.waitForTimeout(300); }
  R.erpSheet = { picked: !!opt, korpus: await M(() => window.__s3d.state.materialCode), after: (await snap()).total };
  R.catalogPrice = await M(() => document.querySelector('#catGrid .cc-price')?.textContent);
  /* Excel — yuklab olib, yakuniy summani tekshiramiz */
  await M(() => window.__s3d.openTab('export'));
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exXlsx')]);
  const out = (process.env.QA_OUT || 'tests/ui/out') + '/smeta.xlsx';
  await dl.saveAs(out);
  R.xlsxSaved = out;
  R.uiTotalForXlsx = (await snap()).total;
  R.errs = await M(() => document.documentElement.dataset.errs || "(xato yo'q)");
  return R;
}
