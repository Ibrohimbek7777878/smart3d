/* Modulni almashtirish (egasi #239–#241): oshxona quriladi, bitta modul tanlanadi, kartadagi "Almashtirish" → katalogdan modul bosiladi.
 * Kutilgan: yangi modul eskisining orqa chetida (burilish saqlanadi), eski modul chetga surilgan (o'chmagan), ustma-ust 0, sahnadagi
 * hosila meshlar (stoleshnitsa, sokol) hujjatga mos; Ctrl+Z hammasini bitta qadamda qaytaradi ("Bekor qilindi: modulni almashtirish"),
 * Ctrl+Y qaytaradi; telefon (390 px) — tugma va banner ko'rinadi, sahifa yonga surilmaydi.
 * Ishlatish: bash tests/ui/web.sh almashtir   Skrinshotlar: tests/ui/out/web/almashtir-*.png */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/almashtir-xato.png` }).catch(() => {});
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
  const tarix = () => M(() => window.__app.tarix);
  /* modullar (hosila p.auto'siz): joy, burilish, o'lcham */
  const modullar = () => M(() => window.__app.doc.placements.filter(p => !p.auto).map(p => ({ id: p.id, frg: p.frg, x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, z: +p.z || 0, w: p.w, d: p.d, h: p.h, rot: ((+p.rot || 0) % 360 + 360) % 360 })));
  const toastMatn = () => M(() => { const el = [...document.querySelectorAll('[role=status],[aria-live]')].map(e => e.innerText).find(s => /Almashtirildi|Bekor qilindi|Qaytarildi|Joy yo'q|joy topilmadi/i.test(s)); return el || (document.body.innerText.match(/(Almashtirildi|Bekor qilindi|Qaytarildi)[^\n]*/) || [])[0] || null; });
  /* orqa chet o'rtasi va ustma-ust soni (sahifada hisoblanadi: burilgan to'rtburchak, 0/90/180/270) */
  const geo = (L) => {
    const cs = (r) => ({ 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] })[r] || [Math.cos(r * Math.PI / 180), Math.sin(r * Math.PI / 180)];
    const bb = (p) => { const [c, s] = cs(p.rot); const xs = [], ys = []; for (const [a, b] of [[0, 0], [p.w, 0], [p.w, p.d], [0, p.d]]) { xs.push(p.x + a * c - b * s); ys.push(p.y + a * s + b * c); } return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
    const zk = (a, b) => a.z < b.z + b.h - 0.5 && b.z < a.z + a.h - 0.5;
    let ustma = 0;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      if (!zk(L[i], L[j])) continue;
      const A = bb(L[i]), B = bb(L[j]);
      if (Math.min(A[2], B[2]) - Math.max(A[0], B[0]) > 0.5 && Math.min(A[3], B[3]) - Math.max(A[1], B[1]) > 0.5) ustma++;
    }
    return ustma;
  };
  const ustmaUst = (L) => page.evaluate(`(${geo.toString()})(${JSON.stringify(L)})`);
  const orqa = (p) => { const c = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] }[p.rot] || [1, 0]; return [Math.round(p.x + p.w / 2 * c[0]), Math.round(p.y + p.w / 2 * c[1])]; };
  const nuqta = (id) => M((id) => {
    const s = window.__app.sahna, it = s.items, c = s.sp.renderer.domElement.getBoundingClientRect();
    for (const m of it.meshes.filter(m => !m.userData.auto && (!id || m.userData.id === id))) for (const dz of [0, -0.25, 0.25, 0.45]) {
      const v = m.position.clone(); v.z += dz * m.userData.h; v.project(s.sp.camera);
      const x = c.left + (v.x + 1) / 2 * c.width, y = c.top + (1 - v.y) / 2 * c.height;
      if (x < c.left + 30 || x > c.right - 30 || y < c.top + 90 || y > c.bottom - 12) continue;
      if (document.elementFromPoint(x, y) !== s.sp.renderer.domElement) continue;
      if (it.pickId({ clientX: x, clientY: y }) === m.userData.id) return { id: m.userData.id, x: Math.round(x), y: Math.round(y) };
    }
    return null;
  }, id);
  const sahnaFarq = () => M(() => {
    const s = window.__app.sahna, A = window.__app, H = A.H;
    const sahnada = Object.fromEntries(s.items.meshes.map(m => [m.userData.id, [m.userData.x, m.userData.y, m.userData.rot, m.userData.w]]));
    const kut = Object.fromEntries(H.viewPlacements(A.doc).map(p => [p.id, [p.x, p.y, ((+p.rot || 0) % 360 + 360) % 360, +p.w]]));
    const norm = (a) => [a[0], a[1], ((+a[2] || 0) % 360 + 360) % 360, a[3]];
    const yoq = Object.keys(kut).filter(k => !sahnada[k]), ortiqcha = Object.keys(sahnada).filter(k => !kut[k]);
    const farq = Object.keys(kut).filter(k => sahnada[k] && norm(sahnada[k]).some((v, i) => Math.abs(v - kut[k][i]) > 1.5));
    return { yoq, ortiqcha, farq, auto: s.items.meshes.filter(m => m.userData.auto).length };
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Almash Usta'); await fill('jasur@', 'almash' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 40 && !(await M(() => window.__app && window.__app.doc && window.__app.doc.room)); i++) await page.waitForTimeout(250);
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.sahna && window.__app.res)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1500);

  const oldin = await modullar();
  R.oshxona = { n: oldin.length, auto: (await sahnaFarq()).auto, ustma: await ustmaUst(oldin) };
  if (oldin.length < 3) throw new Error('oshxona qurilmadi');

  /* 1) pastki modul tanlanadi (qator o'rtasidan) → karta, "Almashtirish" tugmasi */
  await M(() => window.__app.sahna.center()); await page.waitForTimeout(500);
  const pastki = oldin.filter(p => p.z < 300).sort((a, b) => a.x - b.x);
  let tanlandi = null;
  for (const p of [pastki[Math.floor(pastki.length / 2)], ...pastki]) {
    const b = p && await nuqta(p.id);
    if (!b) continue;
    await page.mouse.click(b.x, b.y); await page.waitForTimeout(500);
    if ((await M(() => window.__app.state.sel)) === p.id) { tanlandi = p; break; }
  }
  if (!tanlandi) throw new Error('modul tanlanmadi');
  const tugma = page.locator('[data-almashtir]');
  R.tugma = await tugma.count();
  await page.screenshot({ path: `${OUT}/almashtir-1-karta-1440.png` });
  await tugma.first().click(); await page.waitForTimeout(500);
  R.rejim = { banner: await page.locator('[data-almash-rejim]').count(), almash: await M(() => window.__app.state.almash), step: await M(() => window.__app.state.step) };
  await page.screenshot({ path: `${OUT}/almashtir-2-katalog-1440.png` });

  /* 2) katalogdan modul bosiladi */
  const t0 = await tarix();
  await page.locator('[data-panel] button:has-text("so\'m")').first().click(); await page.waitForTimeout(1500);
  const keyin = await modullar();
  const yangi = keyin.find(p => !oldin.some(o => o.id === p.id)), eski = keyin.find(p => p.id === tanlandi.id);
  R.toast = await toastMatn();
  R.almash = { n: [oldin.length, keyin.length], tanlandi, yangi, eski, sel: await M(() => window.__app.state.sel), tarix: await tarix() };
  const oq = yangi ? orqa(yangi) : null, oo = orqa(tanlandi);
  const joyidaQoldi = /joyida qoldi|sig'madi/.test(R.toast || '');
  R.yangiJoyida = !!yangi && yangi.rot === tanlandi.rot && (joyidaQoldi || (Math.abs(oq[0] - oo[0]) <= 2 && Math.abs(oq[1] - oo[1]) <= 2 && yangi.z === tanlandi.z)) ;
  R.eskiChetga = !!eski && (joyidaQoldi || eski.x !== tanlandi.x || eski.y !== tanlandi.y) && eski.w === tanlandi.w;
  R.ustma = await ustmaUst(keyin);
  R.digarlar = oldin.filter(o => o.id !== tanlandi.id).every(o => { const k = keyin.find(p => p.id === o.id); return k && k.x === o.x && k.y === o.y && k.rot === o.rot; });
  R.hosila = await sahnaFarq();
  R.rejimTugadi = (await M(() => window.__app.state.almash)) === null;
  await M(() => window.__app.sahna.center()); await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/almashtir-3-keyin-1440.png` });

  /* 3) Undo — bitta qadam: hammasi qaytadi */
  await page.keyboard.press('Escape');
  await M(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  await page.locator('[data-scene]').first().click({ position: { x: 5, y: 300 }, force: true }).catch(() => {});
  await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  const z = await modullar();
  R.undo = { n: z.length, teng: JSON.stringify(z) === JSON.stringify(oldin), toast: await toastMatn(), tarix: await tarix(), hosila: await sahnaFarq() };
  await page.screenshot({ path: `${OUT}/almashtir-4-undo-1440.png` });
  await page.keyboard.press('Control+y'); await page.waitForTimeout(700);
  const y = await modullar();
  R.redo = { n: y.length, teng: JSON.stringify(y) === JSON.stringify(keyin), toast: await toastMatn() };

  /* 4) telefon 390 */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(900);
  await M(() => window.__app.sahna.center()); await page.waitForTimeout(500);
  const m2 = await modullar();
  let t2 = null;
  for (const p of m2.filter(p => p.z < 300)) {
    const b = await nuqta(p.id);
    if (!b) continue;
    await page.mouse.click(b.x, b.y); await page.waitForTimeout(500);
    if ((await M(() => window.__app.state.sel)) === p.id) { t2 = p; break; }
  }
  R.tel = { tanlandi: !!t2 };
  if (t2) {
    const tg = page.locator('[data-almashtir]').first();
    await tg.scrollIntoViewIfNeeded().catch(() => {});
    R.tel.tugma = await M(() => { const e = document.querySelector('[data-almashtir]'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), ichida: r.left >= 0 && r.right <= innerWidth }; });
    await page.screenshot({ path: `${OUT}/almashtir-5-karta-390.png` });
    await tg.click(); await page.waitForTimeout(700);
    R.tel.banner = await M(() => { const e = document.querySelector('[data-almash-rejim]'); if (!e) return null; const r = e.getBoundingClientRect(); return { ichida: r.left >= 0 && r.right <= innerWidth, w: Math.round(r.width) }; });
    await page.screenshot({ path: `${OUT}/almashtir-6-katalog-390.png` });
    await page.locator('[data-almash-bekor]').first().click().catch(() => {}); await page.waitForTimeout(300);
    R.tel.bekorQilindi = (await M(() => window.__app.state.almash)) === null;
  }
  R.tel.skroll = await M(() => document.documentElement.scrollWidth > innerWidth + 1);
  R.xatolar = errs;

  R.ok = R.tugma === 1 && R.rejim.banner === 1 && R.rejim.almash === tanlandi.id && R.rejim.step === 2
    && !!yangi && keyin.length === oldin.length + 1 && R.yangiJoyida && R.eskiChetga && R.ustma === 0 && R.digarlar
    && R.hosila.yoq.length === 0 && R.hosila.ortiqcha.length === 0 && R.hosila.farq.length === 0 && R.rejimTugadi
    && /^Almashtirildi/.test(R.toast || '') && R.almash.sel === yangi.id && R.almash.tarix.bekor === t0.bekor + 1
    && R.undo.teng && /^Bekor qilindi: modulni almashtirish$/.test(R.undo.toast || '') && R.undo.hosila.farq.length === 0 && R.undo.hosila.yoq.length === 0
    && R.redo.teng
    && R.tel.tanlandi && R.tel.tugma && R.tel.tugma.ichida && R.tel.tugma.h >= 44 - 1 && R.tel.banner && R.tel.banner.ichida && R.tel.bekorQilindi && !R.tel.skroll
    && errs.length === 0;
}
