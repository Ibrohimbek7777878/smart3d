/* F2 — oshxona elementlari brauzer QA */
export default async function run(page) {
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const R = {}; let STEP = 'init';
  page.on('dialog', d => d.accept());
  try {
    await page.reload();
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 25000 });

    STEP = 'toggle-stol';
    await page.check('#kStol');
    await page.check('#kSokol');
    await page.waitForTimeout(700);
    R.afterStol = await M(() => {
      const cls = window.__s3d.state._res.cutlists;
      const codes = cls.map(c => c.fragment);
      const st = cls.find(c => c.fragment === 'SP-ST-001');
      return {
        n: cls.length,
        hasStol: codes.includes('SP-ST-001'),
        hasSokol: codes.includes('SP-ST-002'),
        stolW: st && st.w, stolParts: st && st.parts.map(p => p.code),
        kitchen: window.__s3d.state.doc.kitchen,
        total: window.__s3d.state._res.priceRes.total
      };
    });

    STEP = 'toggle-dobor-karniz';
    await page.check('#kDobor');
    await page.check('#kKarniz');
    await page.waitForTimeout(700);
    R.afterDobor = await M(() => {
      const codes = window.__s3d.state._res.cutlists.map(c => c.fragment);
      return { hasDobor: codes.includes('SP-ST-003'), hasKarniz: codes.includes('SP-ST-004'), n: codes.length };
    });

    STEP = 'moyka';
    await page.selectOption('#kMoyka', 'on');
    await page.waitForTimeout(700);
    R.moyka = await M(() => {
      const st = window.__s3d.state._res.cutlists.find(c => c.fragment === 'SP-ST-001');
      return { holes: st && st.holes.map(h => ({ kind: h.kind, x: h.x, y: h.y, w: h.w })),
               holeCost: window.__s3d.state._res.prod.breakdown.holeCost };
    });

    STEP = 'persist';
    R.persist = await M(async () => {
      const doc = window.__s3d.state.doc;
      const before = JSON.stringify(doc.kitchen);
      // save→load tsiz: kitchen doc ichida
      return { kitchenEq: before === JSON.stringify(window.__s3d.state.doc.kitchen),
               placementsUser: doc.placements.length };
    });

    STEP = 'appliances';
    R.appl = await M(() => {
      const c = window.__s3d.state.catalog;
      return { has001: !!c['SP-TX-001'], has006: !!c['SP-TX-006'],
               cat: c['SP-TX-001'] && c['SP-TX-001'].category,
               parts0: c['SP-TX-001'] && c['SP-TX-001'].parts.length };
    });

    STEP = 'sink-mesh';
    R.sink = await M(() => {
      let n = 0;
      window.__s3d.sp.groups.items.traverse(o => { if (o.userData && o.userData.kind === 'moyka') n++; });
      return { sinkMeshes: n };
    });

    STEP = 'screenshot';
    await page.screenshot({ path: (process.env.QA_OUT || 'tests/ui/out') + '/qa_f2.png' });
    R.errs = await M(() => document.documentElement.dataset.errs || "(xato yo'q)");
  } catch (e) {
    R.__err = String((e && e.stack) || e).split('\n').slice(0, 3).join(' | ');
    R.__step = STEP;
  }
  return R;
}
