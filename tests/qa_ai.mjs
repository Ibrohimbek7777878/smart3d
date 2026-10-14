/* A1/A2/F6 brauzer QA: AI U/L konstruksiyasi, ⚠️ rejimi, Three.js geometriya o'sishi */
export default async function run(page) {
  const R = {}; let STEP = 'init';
  try { await _run(page, R, (s) => { STEP = s; }); }
  catch (e) { R.__err = String(e && e.stack || e).split('\n').slice(0, 3).join(' | '); R.__step = STEP; }
  return R;
}
async function _run(page, R, step) {
  step('init');
  await page.addInitScript(() => {
    const push = s => { const el = document.documentElement; el.dataset.errs = (el.dataset.errs || '') + s + ' || '; };
    addEventListener('error', e => push((e.message || 'resurs') + ' @' + (e.filename || '') + ':' + (e.lineno || '')), true);
    addEventListener('unhandledrejection', e => push('rejection: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
  });
  page.on('dialog', d => d.accept());
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 25000 });

  /* PATCHRIGHT: page.evaluate(fn, arg, false) — MAIN world (window.__s3d uchun);
     ikkisiz evaluate ISOLATED worldda ishlaydi va window global ko'rinmaydi. */
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const FP = `
    var fp = p => {
      const deg = (((p.rot || 0) % 360) + 360) % 360;
      const [c, s] = deg === 0 ? [1, 0] : deg === 90 ? [0, 1] : deg === 180 ? [-1, 0] : deg === 270 ? [0, -1]
        : [Math.cos(deg * Math.PI / 180), Math.sin(deg * Math.PI / 180)];
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const [px, py] of [[0, 0], [p.w, 0], [p.w, p.d], [0, p.d]]) {
        const X = p.x + px * c - py * s, Y = p.y + px * s + py * c;
        x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
      }
      return { x0, y0, x1, y1 };
    };
    var zOk = (a, b) => {
      if ((a.h || 0) > 0 && (b.h || 0) > 0) {
        const az = [a.z || 0, (a.z || 0) + a.h], bz = [b.z || 0, (b.z || 0) + b.h];
        if (az[1] <= bz[0] || bz[1] <= az[0]) return false;
      }
      return true;
    };
    var check = (pl, W, D) => {
      const bad = [], out = [];
      for (let i = 0; i < pl.length; i++) for (let j = i + 1; j < pl.length; j++) {
        if (!zOk(pl[i], pl[j])) continue;
        const a = fp(pl[i]), b = fp(pl[j]);
        if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) bad.push(pl[i].id + '↔' + pl[j].id);
      }
      for (const p of pl) { const f = fp(p); if (f.x0 < -1 || f.y0 < -1 || f.x1 > W + 1 || f.y1 > D + 1) out.push(p.id); }
      return { total: pl.length, overlaps: bad, outside: out };
    };
  `;

  step('f6');
  /* ── F6: xona o'lchamini8 marta o'zgartirib, GPU geometriyasi o'zgarishi ── */
  const info = () => M(() => window.__s3d.sp._info());
  const g0 = await info();
  for (let i = 0; i < 8; i++) {
    await M((i) => {
      document.getElementById('zW').value = 4000 + i * 100;
      document.getElementById('zD').value = 3000 + i * 50;
      document.getElementById('zApply').click();
    }, i);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(800);
  const g1 = await info();
  R.f6 = { before: g0, after: g1, leak: g1.geometries - g0.geometries, ok: g1.geometries <= g0.geometries + 8 };

  step('u');
  /* ── A1/A2: U shakl ── */
  await M(() => { window.__s3d.state.doc.placements.length = 0; window.__s3d.openTab('ai'); });
  await page.waitForTimeout(300);
  await page.fill('#aiText', "oshxona 3.6 x 3 metr, U shakl, burchakka moyka, o'ng devorga xolodilnik");
  await page.click('#btnBuild');
  await page.waitForFunction(() => document.querySelector('#aiOut .msg'), null, { timeout: 20000 });
  await page.waitForTimeout(600);
  R.u = await M((FP) => {
    eval(FP);
    const s = window.__s3d, pl = s.state.doc.placements;
    const W = s.state.doc.room.outline[1][0], D = s.state.doc.room.outline[2][1];
    const c = check(pl, W, D);
    c.wing = pl.filter(p => p.rot === 90 && Math.abs(fp(p).x1 - (W - 50)) < 1).length;
    c.leftWing = pl.filter(p => p.rot === 270 && Math.abs(fp(p).x0 - 50) < 1).length;
    c.out = document.getElementById('aiOut').textContent.trim().slice(0, 200);
    return c;
  }, FP);
  await page.screenshot({ path: (process.env.QA_OUT || '/tmp/opencode') + '/qa_ai_u.png' });

  step('l');
  /* ── A2: L shakl ── */
  await M(() => { window.__s3d.state.doc.placements.length = 0; window.__s3d.openTab('ai'); });
  await page.waitForTimeout(300);
  await page.fill('#aiText', "oshxona 4 x 3 metr, L shakl, burchakka moyka, tepasiga osma shkaf, o'ng devorga xolodilnik");
  await page.click('#btnBuild');
  await page.waitForTimeout(2500);
  R.l = await M((FP) => {
    eval(FP);
    const s = window.__s3d, pl = s.state.doc.placements;
    const W = s.state.doc.room.outline[1][0], D = s.state.doc.room.outline[2][1];
    const c = check(pl, W, D);
    c.upper = pl.filter(p => p.z >= 1000).length;
    c.leftWall = pl.filter(p => p.rot === 270 && Math.abs(fp(p).x0 - 50) < 1).length;
    c.out = document.getElementById('aiOut').textContent.trim().slice(0, 200);
    return c;
  }, FP);
  await page.screenshot({ path: (process.env.QA_OUT || '/tmp/opencode') + '/qa_ai_l.png' });

  step('assumed');
  /* ── A1: o'lchamsiz matn → ⚠️ (✅ emas) ── */
  await M(() => { window.__s3d.state.doc.placements.length = 0; window.__s3d.openTab('ai'); });
  await page.waitForTimeout(300);
  await page.fill('#aiText', 'bu yerda hech qanday o\'lcham yo\'q');
  await page.click('#btnBuild');
  await page.waitForTimeout(2500);
  R.assumed = await M(() => {
    const t = document.getElementById('aiOut').textContent;
    return { warn: t.includes('⚠️'), ok: t.includes('✅'), text: t.trim().slice(0, 200) };
  });

  step('a3');
  /* ── A3: qurilgan L hujjatida soxta W_OVERLAP yo'q ── */
  R.a3 = await M(async () => {
    try {
      const rules = await import('/js/engine/rules.js');
      const v = rules.validateDoc(window.__s3d.state.doc, {});
      return { overlap: v.warnings.filter(w => w.code === 'W_OVERLAP').length,
               warnings: v.warnings.map(w => w.code), err: null };
    } catch (e) { return { overlap: null, warnings: [], err: String(e) }; }
  });

  R.errs = await M(() => document.documentElement.dataset.errs || "(xato yo'q)");
  return R;
}
