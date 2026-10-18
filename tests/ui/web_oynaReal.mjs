/* Egasi #236: REAL oyna/eshik (taxta emas) va joylashtirish (tomon, burchak, balandlik).
 * Tekshiriladi: SP-WI-001 qo'shilsa — guruhda shaffof shisha + rama bor, sukut z=900; SP-D-001 — qanot+ruchka+korobka;
 * Old/Orqa/Chap/O'ng → rot 0/180/90/270; burchak maydoni; balandlik maydoni va tezkor (Pol/Ustki/Shift ostida), xona balandligidan chiqmaydi;
 * ◀▶ siljitganda barcha child mesh birga yuradi; Ctrl+Z qaytaradi.  Ishlatish: bash tests/ui/web.sh oynaReal */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/oynaReal-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { await page.locator(`input[placeholder*="${ph}"]`).first().fill(v); };
  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Oyna Usta'); await fill('jasur@', 'oyna' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn && window.__app.sahna)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1500);

  const qosh = async (kod) => {
    await page.locator('input[placeholder*="shkaf 2 eshik"]').fill(kod); await page.waitForTimeout(600);
    await page.locator('[data-panel] button.h5').first().click(); await page.waitForTimeout(1500);
    return M((k) => { const ps = window.__app.doc.placements.filter(p => p.frg === k); return ps.length ? ps[ps.length - 1].id : null; }, kod);
  };
  const info = (id) => M((id) => {
    const p = window.__app.doc.placements.find(x => x.id === id), m = window.__app.sahna.items.meshes.find(x => x.userData.id === id);
    const ch = []; m.traverse(c => { if (c.isMesh && c.material && c.material.visible !== false) ch.push(c); });
    const wp = ch.map(c => { const v = c.getWorldPosition(c.position.clone()); return [v.x, v.y, v.z]; });
    return { z: p.z, rot: p.rot || 0, x: p.x, y: p.y, h: p.h, n: ch.length, wp,
      shisha: ch.filter(c => c.material.transparent && c.material.opacity <= 0.3).length, ramka: ch.filter(c => c.userData.derazaTur === 'ramka').length,
      qanot: ch.filter(c => c.userData.derazaTur === 'qanot').length, ruchka: ch.filter(c => c.userData.derazaTur === 'ruchka').length,
      taxta: ch.filter(c => c.userData.panelId && !String(c.userData.panelId).startsWith('dz-')).length, wallH: window.__app.doc.room.wall_height };
  }, id);
  const tanla = async (id) => { await M((id) => window.__app.sahna.items.select(id), id); await page.waitForTimeout(500); };

  /* 1) OYNA */
  const wid = await qosh('SP-WI-001'); R.wid = wid;
  await tanla(wid);
  let a = await info(wid);
  R.oyna = { z: a.z, shisha: a.shisha, ramka: a.ramka, taxta: a.taxta, n: a.n };
  R.oynaOk = !!wid && a.z === 900 && a.shisha >= 2 && a.ramka >= 4 && a.taxta === 0;
  await M(() => window.__app.sahna.korinish.yonalish && window.__app.sahna.korinish.yonalish('old'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/oynaReal-1-oyna.png` });

  /* 2) tomon tugmalari */
  const tom = {};
  for (const [k, r] of [['orqa', 180], ['chap', 90], ['ong', 270], ['old', 0]]) {
    await page.locator(`[data-tomon="${k}"]`).click(); await page.waitForTimeout(400);
    tom[k] = (await info(wid)).rot === r;
  }
  R.tomon = tom; R.tomonOk = Object.values(tom).every(Boolean);

  /* 3) erkin burchak */
  const ri = page.locator('[data-rot-input]'); await ri.fill('45'); await ri.blur(); await page.waitForTimeout(400);
  R.burchak45 = (await info(wid)).rot === 45;
  await ri.fill('405'); await ri.blur(); await page.waitForTimeout(400);
  R.burchakOrash = (await info(wid)).rot === 45;
  await page.locator('[data-tomon="old"]').click(); await page.waitForTimeout(300);

  /* 4) balandlik: maydon, tezkor, chegara */
  const zi = page.locator('[data-z-input]'); await zi.fill('1100'); await zi.blur(); await page.waitForTimeout(400);
  a = await info(wid); R.z1100 = a.z === 1100;
  await zi.fill('99999'); await zi.blur(); await page.waitForTimeout(400);
  a = await info(wid); R.zChegara = a.z === a.wallH - a.h;
  await page.locator('[data-z-tez="pol"]').click(); await page.waitForTimeout(300);
  R.zPol = (await info(wid)).z === 0;
  await page.locator('[data-z-tez="oyna"]').click(); await page.waitForTimeout(300);
  R.zOyna = (await info(wid)).z === 900;
  await page.locator('[data-z-tez="shift"]').click(); await page.waitForTimeout(300);
  a = await info(wid); R.zShift = a.z === a.wallH - a.h;
  await page.locator('[data-z-tez="oyna"]').click(); await page.waitForTimeout(300);

  /* 5) siljitganda barcha child mesh birga yuradi */
  const b0 = await info(wid);
  await page.getByRole('button', { name: /O'ngga 50|Правее|Right 50/ }).first().click().catch(() => {});
  await page.waitForTimeout(600);
  const b1 = await info(wid);
  const siljish = b1.wp.map((v, i) => Math.hypot(v[0] - b0.wp[i][0], v[1] - b0.wp[i][1], v[2] - b0.wp[i][2]));
  R.siljish = { min: Math.min(...siljish), max: Math.max(...siljish), n: siljish.length };
  R.siljishOk = b1.x !== b0.x || b1.y !== b0.y ? (R.siljish.max - R.siljish.min < 0.5 && R.siljish.min > 1) : false;

  /* 6) Bekor qilish */
  await page.locator('[data-z-tez="pol"]').click(); await page.waitForTimeout(400);
  await M(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  await page.keyboard.press('Control+z'); await page.waitForTimeout(600);
  R.undoOk = (await info(wid)).z === 900;

  /* 7) ESHIK */
  const did = await qosh('SP-D-001'); await tanla(did);
  const d = await info(did);
  R.eshik = { qanot: d.qanot, ruchka: d.ruchka, ramka: d.ramka, taxta: d.taxta, z: d.z };
  R.eshikOk = !!did && d.qanot === 1 && d.ruchka >= 2 && d.ramka >= 3 && d.taxta === 0 && d.z === 0;
  await page.screenshot({ path: `${OUT}/oynaReal-2-eshik.png` });

  R.pageErrors = errs;
  R.ok = !!(R.oynaOk && R.tomonOk && R.burchak45 && R.burchakOrash && R.z1100 && R.zChegara && R.zPol && R.zOyna && R.zShift && R.siljishOk && R.undoOk && R.eshikOk && errs.length === 0);
}
