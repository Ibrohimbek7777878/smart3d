/* #235: modul siljitilganda uning BARCHA qismlari (yon devor, planka, ruchka, stoleshnitsa/sokol, yorliq...) birga siljiydi;
 * Esc — hammasi eski joyda. Sahnadagi har obyektning jahon koordinatasi oldin/keyin solishtiriladi.
 * Ishlatish: bash tests/ui/web.sh surishQism */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/surishQism-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  /* modul ekranda: markazi proyeksiyasi, shu nuqtada aynan shu modul bosiladi (raycast) */
  const nuqta = (f) => M((f) => {
    const s = window.__app.sahna, it = s.items, c = s.sp.renderer.domElement.getBoundingClientRect();
    const ms = it.meshes.filter(m => !m.userData.auto && (f.id ? m.userData.id === f.id : (f.ustki ? m.userData.z >= 1000 : m.userData.z < 1000 && m.userData.h < 1200)));
    for (const m of ms) for (const dz of [0, -0.25, 0.25]) {
      const v = m.position.clone(); v.z += dz * m.userData.h;
      v.project(s.sp.camera);
      const x = c.left + (v.x + 1) / 2 * c.width, y = c.top + (1 - v.y) / 2 * c.height;
      if (x < c.left + 30 || x > c.right - 30 || y < c.top + 90 || y > c.bottom - 60) continue;
      if (it.pickId({ clientX: x, clientY: y }) === m.userData.id) return { id: m.userData.id, x: Math.round(x), y: Math.round(y) };
    }
    return null;
  }, f);
  const sichqoncha = async (a, dx, dy, esc = false) => {
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(a.x + dx * i / 12, a.y + dy * i / 12); await page.waitForTimeout(16); }
    if (esc) { await page.keyboard.press('Escape'); await page.waitForTimeout(100); }
    await page.mouse.up(); await page.waitForTimeout(500);
  };
  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Surish Usta'); await fill('jasur@', 'surish' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 40 && !(await M(() => window.__app && window.__app.doc && window.__app.doc.room)); i++) await page.waitForTimeout(250);

  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.sahna && window.__app.res)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1500);

  /* sahnadagi har mesh: id → joy; kutilgan: hozirgi hujjatdan hosil bo'lgan (stoleshnitsa, sokol, dobor, karniz) joylar */
  const joy = () => M(() => {
    const s = window.__app.sahna, A = window.__app;
    const sahnada = Object.fromEntries(s.items.meshes.map(m => [m.userData.id, [m.userData.x, m.userData.y, m.userData.rot, m.userData.w]]));
    const H = A.project && A.project.H || A.H;
    const kut = H ? Object.fromEntries(H.viewPlacements(A.doc).map(p => [p.id, [p.x, p.y, ((+p.rot || 0) % 360 + 360) % 360, +p.w]])) : null;
    return { sahnada, kut, auto: s.items.meshes.filter(m => m.userData.auto).map(m => m.userData.id) };
  });
  const farq = (a, b) => Object.keys(b).filter(k => !a[k] || a[k].some((v, i) => Math.abs(v - b[k][i]) > 1.5));
  const surish = async (a, esc) => {
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(a.x, a.y + 140 * i / 12); await page.waitForTimeout(16); }
    await page.waitForTimeout(120);                 // kadr (rAF) — hosila qismlar yangilanadi; qayta hisob (220 ms) hali yurmagan
    const mid = await joy();
    if (esc) { await page.keyboard.press('Escape'); await page.waitForTimeout(150); }
    const esc1 = esc ? await joy() : null;
    await page.mouse.up(); await page.waitForTimeout(600);
    return { mid, esc1, son: await joy() };
  };
  const bosh = await joy();
  R.autoSoni = bosh.auto.length;
  const a = await nuqta({});
  if (!a) throw new Error('modul topilmadi');
  const r1 = await surish(a, false);
  R.modul = a.id;
  R.surildi = r1.mid.sahnada[a.id][0] !== bosh.sahnada[a.id][0] || r1.mid.sahnada[a.id][1] !== bosh.sahnada[a.id][1];
  R.suraylikdaQolgan = farq(r1.mid.sahnada, r1.mid.kut);          // sudrash DAVOMIDA: hosila qism kutilgan joyda emas
  R.oxiridaQolgan = farq(r1.son.sahnada, r1.son.kut);
  await page.screenshot({ path: `${process.env.QA_OUT}/surishQism-1.png` });
  /* Esc: asl joyga — hamma qism */
  const b = await nuqta({ id: a.id });
  const j0 = await joy();
  const r2 = b ? await surish(b, true) : null;
  R.escQolgan = r2 ? farq(r2.esc1.sahnada, j0.sahnada) : ['nuqta yo\'q'];
  R.escOxiri = r2 ? farq(r2.son.sahnada, j0.sahnada) : ['nuqta yo\'q'];
  R.ok = R.autoSoni > 0 && R.surildi && !R.suraylikdaQolgan.length && !R.oxiridaQolgan.length && !R.escQolgan.length && !R.escOxiri.length;
}
