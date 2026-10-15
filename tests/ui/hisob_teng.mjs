/* TZ-09: yangi frontend hisob ko'prigi (web/src/app/bridge/hisob.js) eski sayt bilan AYNAN bir xil natija beradimi.
 * Eski sayt (app/index.html) ochiladi, uning hisobi (__s3d.state._res) va ko'prik shu loyiha uchun hisoblagan natija
 * to'liq solishtiriladi: kotirovka, tannarx, raskroy, kesim ro'yxati, ogohlantirishlar. Ishlatish: tests/ui/hisob_teng.sh */
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
  const M = (fn, arg) => page.evaluate(fn, arg, false);   // MAIN world (__s3d ko'rinadi)

  const solishtir = () => M(async () => {
    const s = window.__s3d.state;
    if (!window.__hisob) {
      const m = await import('/web/src/app/bridge/hisob.js');
      window.__hisob = m.createHisob(await m.loadData(n => fetch('/app/data/' + n).then(r => r.json())));
    }
    const y = window.__hisob.recalc(s.doc, { materialCode: s.materialCode, fasadCode: s.fasadCode, sheet: s.sheet, nestCfg: s.nestCfg });
    const e = s._res;
    const qisqa = x => ({ jami: x.priceRes.total, tannarx: x.prod.totalCost, modul: x.priceRes.lines.length,
      detal: x.cutlists.reduce((a, c) => a + c.parts.length, 0), narxsiz: x.priceRes.missing.length,
      xato: x.val.errors.length, ogoh: x.val.warnings.length + x.priceRes.warnings.length });
    /* created_at — hisob bajarilgan vaqt (raskroy qoldig'i), har hisobda boshqacha; narxga aloqasi yo'q */
    const J = (x) => JSON.stringify(x, (k, v) => (k === 'created_at' ? undefined : v));
    /* birinchi farq qilgan joy (yo'l + ikki qiymat) — farq bo'lsa sababini ko'rsatish uchun */
    const farq = (a, b, yol) => {
      if (J(a) === J(b)) return null;
      if (a && b && typeof a === 'object' && typeof b === 'object') {
        for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const f = farq(a[k], b[k], yol + '.' + k); if (f) return f; }
      }
      return yol + ': ' + J(a)?.slice(0, 120) + ' ≠ ' + J(b)?.slice(0, 120);
    };
    const farqlar = ['priceRes', 'prod', 'nest', 'cutlists', 'val'].map(k => farq(e[k], y[k], k)).filter(Boolean);
    return { eski: qisqa(e), yangi: qisqa(y), teng: farqlar.length === 0, farqlar };
  });

  const R = {};
  R.namuna = await solishtir();

  await M(() => window.__s3d.openTab('smeta')); await page.waitForTimeout(300);
  await page.click('#xzTeshik'); await page.waitForTimeout(700);
  R.prisadka = await solishtir();

  for (const [k, t] of [['ai_U', "oshxona 3.6 x 3 metr, U shakl, burchakka moyka, o'ng devorga xolodilnik"],
                        ['ai_L', "oshxona 4 x 3 metr, L shakl, burchakka moyka, tepasiga osma shkaf, o'ng devorga xolodilnik"],
                        ['ai_garderob', '4.2x3.1 xona, 1 garderob, 1 stol']]) {
    /* qa_ai.mjs bilan bir xil usul: avval bo'sh xona (tasdiq oynasi chiqmasin), keyin AI */
    await M(() => { window.__s3d.state.doc.placements.length = 0; window.__s3d.openTab('ai'); });
    await page.waitForTimeout(300);
    await page.fill('#aiText', t);
    await page.click('#btnBuild');
    await page.waitForTimeout(150);
    if (await page.evaluate(() => !document.getElementById('askModal').hidden, null, false)) await page.click('#askOk');
    await page.waitForFunction(() => document.querySelector('#aiOut .msg'), null, { timeout: 20000 });
    await page.waitForTimeout(900);
    R[k] = await solishtir();
  }

  /* real ERP plitasi tanlanganda (haqiqiy narx va varaq o'lchami) */
  await M(() => window.__s3d.openTab('catalog')); await page.waitForTimeout(300);
  const n = await page.locator('#sheetSel option').count();
  if (n > 3) { await page.selectOption('#sheetSel', { index: 3 }); await page.waitForTimeout(800); R.erp_plita = await solishtir(); }
  else R.erp_plita = 'plita ro\'yxati bo\'sh';

  R.hammasi_teng = Object.values(R).every(v => v && v.teng === true);
  R.errs = await M(() => document.documentElement.dataset.errs || "(xato yo'q)");
  return R;
}
