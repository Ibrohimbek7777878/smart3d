/* TZ-HAQIQIY-MODULLAR A5: MebelCity modullari brauzerda — katalog, joylash, smeta, cheklov */
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
  const R = {};
  await M(() => window.__s3d.openTab('catalog')); await page.waitForTimeout(300);
  R.catalog = await M(() => ({ jami: Object.keys(window.__s3d.state.catalog).length,
    mcKartalar: document.querySelectorAll('#catGrid .cat-card[data-code^="MC-"]').length,
    kp02: document.querySelector('#catGrid .cat-card[data-code="MC-KP-02"]')?.innerText.replace(/\s+/g, ' ') }));
  const before = await M(() => window.__s3d.state.doc.placements.length);
  for (const c of ['MC-KP-02', 'MC-KU-04']) { await page.click(`#catGrid .cat-card[data-code="${c}"]`); await page.waitForTimeout(400); }
  await page.waitForTimeout(800);
  R.joylandi = await M(() => window.__s3d.state.doc.placements.length) - before;
  R.smeta = await M(() => {
    const r = window.__s3d.state._res;
    const hw = r.prod.lines.filter(l => l.group === 'Furnitura' && (l.id || /^BZ-/.test(l.code)));
    return { tannarx: r.prod.totalCost, jami: r.priceRes.total, mcZapchast: hw.length,
      namuna: hw.slice(0, 4).map(l => `${l.name} × ${l.qty} = ${l.amount}`), narxsiz: r.prod.missing.length };
  });
  /* oxirgi qo'shilgan (MC-KU-04) tanlangan: eni 800 → narx o'zgaradi; eni 1500 → max 1070 ga siqiladi */
  const total = () => M(() => window.__s3d.state._res.priceRes.total);
  const setW = async (v) => { await page.fill('#icW', String(v)); await page.dispatchEvent('#icW', 'change'); await page.waitForTimeout(900); };
  const t600 = await total();
  await setW(800);
  const t800 = await total();
  await setW(1500);
  R.olcham = { tanlangan: await M(() => { const s = window.__s3d.state; return s.doc.placements.find(q => q.id === s.selectedId)?.frg; }),
    narx600: t600, narx800: t800, ozgardi: t800 > t600, eni1500: await M(() => +document.getElementById('icW').value) };
  R.cheklov = await M(() => {
    const s = window.__s3d.state, p = s.doc.placements.find(q => q.frg === 'MC-KP-02');
    const f = s.catalog['MC-KP-02'];
    return { min_w: f.min_w, max_w: f.max_w, min_h: f.min_h, max_h: f.max_h, min_d: f.min_d, max_d: f.max_d, h: p && p.h };
  });
  await M(() => window.__s3d.openTab('plan')); await page.waitForTimeout(600);
  await page.screenshot({ path: (process.env.QA_OUT || 'tests/ui/out') + '/mc.png' });
  R.errs = await M(() => document.documentElement.dataset.errs || "(xato yo'q)");
  return R;
}
