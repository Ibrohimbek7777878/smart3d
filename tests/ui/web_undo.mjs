/* Bekor qilish / qaytarish (egasi, 2026-10-17): Ctrl+Z, Ctrl+Shift+Z / Ctrl+Y va sarlavhadagi ikki ikon tugma.
 * Tekshiriladi: bo'sh ish joyida tugmalar o'chiq; katalogdan modul → Ctrl+Z → yo'q (tanlov tozalanadi) → Ctrl+Y → bor;
 * 3D da sichqoncha bilan surish (bitta qadam) → Ctrl+Z → eski joy; o'lcham (+) → Ctrl+Z; material → Ctrl+Z; o'chirish → tugma bilan
 * bekor; kamera va tanlov tarixga kirmaydi; 51 qadamdan keyin eng eskisi tushadi (50 qadam); matn maydoni fokusda Ctrl+Z
 * bizning tarixni chaqirmaydi; toast "Bekor qilindi: …" (3 tilda); yangi loyiha — tarix bo'sh.
 * Ishlatish: bash tests/ui/web.sh undo   Skrinshotlar: tests/ui/out/web/undo-*.png */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/undo-xato.png` }).catch(() => {});
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
  const modullar = () => M(() => window.__app.doc.placements.filter(p => !p.auto).map(p => ({ id: p.id, x: p.x, y: p.y, w: p.w, rot: p.rot || 0 })));
  /* ko'rinib turgan guruh (kompyuterda — sarlavhada, telefonda — 3D ustida) tugmalari: yoqilganmi */
  const tugma = () => M(() => { const g = [...document.querySelectorAll('[data-tarix]')].find(x => x.offsetParent);
    return g ? Object.fromEntries([...g.querySelectorAll('[data-tarix-tugma]')].map(b => [b.dataset.tarixTugma, !b.disabled])) : {}; });
  const toastMatn = () => M(() => { const el = [...document.querySelectorAll('[role=status],[aria-live]')].map(e => e.innerText).find(s => /Bekor qilindi|Qaytarildi|Отменено|Повторено|Undone|Redone/.test(s)); return el || (document.body.innerText.match(/(Bekor qilindi|Qaytarildi): [^\n]+/) || [])[0] || null; });
  const bos = async (k) => { await page.locator('[data-scene]').first().click({ position: { x: 5, y: 300 }, force: true }).catch(() => {}); await page.keyboard.press(k); await page.waitForTimeout(450); };
  const kZ = async () => { await page.keyboard.press('Control+z'); await page.waitForTimeout(400); };
  const kY = async () => { await page.keyboard.press('Control+y'); await page.waitForTimeout(400); };
  const kSZ = async () => { await page.keyboard.press('Control+Shift+z'); await page.waitForTimeout(400); };
  const blur = () => M(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  const kam = () => M(() => { const c = window.__app.sahna.sp.camera.position; return [c.x, c.y, c.z].map(v => Math.round(v)).join(','); });
  /* modul ekranda: markazi proyeksiyasi, shu nuqtada aynan shu modul bosiladi (raycast) — web_surish.mjs dagi kabi */
  const nuqta = (id) => M((id) => {
    const s = window.__app.sahna, it = s.items, c = s.sp.renderer.domElement.getBoundingClientRect();
    for (const m of it.meshes.filter(m => !m.userData.auto && (!id || m.userData.id === id))) for (const dz of [0, -0.25, 0.25, 0.45]) {
      const v = m.position.clone(); v.z += dz * m.userData.h; v.project(s.sp.camera);
      const x = c.left + (v.x + 1) / 2 * c.width, y = c.top + (1 - v.y) / 2 * c.height;
      if (x < c.left + 30 || x > c.right - 30 || y < c.top + 90 || y > c.bottom - 12) continue;
      if (document.elementFromPoint(x, y) !== s.sp.renderer.domElement) continue;   // ustida toast yoki karta yo'q
      if (it.pickId({ clientX: x, clientY: y }) === m.userData.id) return { id: m.userData.id, x: Math.round(x), y: Math.round(y) };
    }
    return null;
  }, id);
  /* modulni tanlash (kamera markazga — modul ekranda) */
  const tanla = async (id) => {
    if (await M(() => window.__app.state.sel)) return;
    await M(() => window.__app.sahna.center()); await page.waitForTimeout(500);
    const b = await nuqta(id);
    if (!b) throw new Error('tanlash: modul ekranda emas');
    await page.mouse.click(b.x, b.y); await page.waitForTimeout(500);
  };
  const sichqoncha = async (a, dx, dy) => {
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(a.x + dx * i / 12, a.y + dy * i / 12); await page.waitForTimeout(16); }
    await page.mouse.up(); await page.waitForTimeout(600);
  };

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Undo Usta'); await fill('jasur@', 'undo' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn && window.__app.sahna)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1500);

  /* 0) bo'sh ish joyi — tarix bo'sh, ikkala tugma o'chiq; Ctrl+Z hech narsa qilmaydi */
  R.bosh = { tarix: await tarix(), tugma: await tugma() };
  await bos('Control+z');
  R.boshOk = R.bosh.tarix.bekor === 0 && R.bosh.tarix.qayta === 0 && R.bosh.tugma.bekor === false && R.bosh.tugma.qayta === false
    && (await modullar()).length === 0;

  /* 1) katalogdan modul → Ctrl+Z → yo'q (tanlov tozalanadi) → Ctrl+Y → bor */
  const kartalar = page.locator('[data-panel] button:has-text("so\'m")');
  await kartalar.first().click(); await page.waitForTimeout(1300);
  const m1 = await modullar();
  R.qoshish = { n: m1.length, tarix: await tarix(), tugma: await tugma(), sel: await M(() => window.__app.state.sel) };
  await blur(); await kZ();
  const m1z = await modullar();
  R.qoshishZ = { n: m1z.length, sel: await M(() => window.__app.state.sel), tarix: await tarix(), toast: await toastMatn(), tugma: await tugma() };
  await page.screenshot({ path: `${OUT}/undo-1-bekor-1440.png` });
  await kY();
  const m1y = await modullar();
  R.qoshishY = { n: m1y.length, id: (m1y[0] || {}).id, toast: await toastMatn(), tarix: await tarix() };
  R.qoshishOk = m1.length === 1 && R.qoshish.tarix.bekor === 1 && R.qoshish.tugma.bekor === true && m1z.length === 0 && R.qoshishZ.sel === null
    && /^Bekor qilindi: modul qo'shish$/.test(R.qoshishZ.toast || '') && R.qoshishZ.tugma.qayta === true && R.qoshishZ.tugma.bekor === false
    && m1y.length === 1 && m1y[0].id === m1[0].id && /^Qaytarildi: modul qo'shish$/.test(R.qoshishY.toast || '');

  /* 2) kamera (Markazga, aylantirish) va tanlov — tarixga kirmaydi */
  const t2 = await tarix();
  await M(() => window.__app.sahna.center()); await page.waitForTimeout(400);
  const k0 = await kam();
  const bj = await M(() => {
    const s = window.__app.sahna, it = s.items, c = s.sp.renderer.domElement.getBoundingClientRect();
    for (let fy = 0.2; fy < 0.85; fy += 0.05) for (let fx = 0.15; fx < 0.85; fx += 0.05) {
      const x = c.left + c.width * fx, y = c.top + c.height * fy;
      if (!it.hitTest({ clientX: x, clientY: y }) && document.elementFromPoint(x, y) === s.sp.renderer.domElement) return { x: Math.round(x), y: Math.round(y) };
    }
    return null;
  });
  if (!bj) throw new Error("bo'sh joy topilmadi");
  await sichqoncha(bj, 160, 0);
  R.kamera = { oldin: k0, keyin: await kam(), tarix: await tarix() };
  R.kameraOk = R.kamera.oldin !== R.kamera.keyin && R.kamera.tarix.bekor === t2.bekor;
  await M(() => window.__app.sahna.center()); await page.waitForTimeout(500);

  /* 3) 3D da sichqoncha bilan surish — tortish bitta qadam; Ctrl+Z → eski joy, Ctrl+Shift+Z → yangi joy */
  const a = await nuqta(m1y[0].id);
  if (!a) throw new Error('ekranda modul topilmadi');
  const s0 = (await modullar())[0], t3 = await tarix();
  await sichqoncha(a, 0, 120);
  const s1 = (await modullar())[0], t3b = await tarix();
  await blur(); await kZ();
  const s2 = (await modullar())[0], toastS = await toastMatn();
  await kSZ();
  const s3 = (await modullar())[0];
  R.surish = { oldin: s0, keyin: s1, bekor: s2, qayta: s3, qadam: t3b.bekor - t3.bekor, toast: toastS };
  R.surishOk = (s1.x !== s0.x || s1.y !== s0.y) && R.surish.qadam === 1 && s2.x === s0.x && s2.y === s0.y && s3.x === s1.x && s3.y === s1.y
    && /^Bekor qilindi: modulni surish$/.test(toastS || '');

  /* 4) o'lcham (+ tugma) → Ctrl+Z */
  await tanla(m1y[0].id);
  const w0 = (await modullar())[0].w;
  await page.locator('button[aria-label="Oshirish"]').first().click(); await page.waitForTimeout(500);
  const w1 = (await modullar())[0].w;
  await blur(); await kZ();
  const w2 = (await modullar())[0].w, toastO = await toastMatn();
  R.olcham = { oldin: w0, keyin: w1, bekor: w2, toast: toastO };
  R.olchamOk = w1 === w0 + 10 && w2 === w0 && /^Bekor qilindi: modul o'lchami$/.test(toastO || '');

  /* 5) material (Mebel → Korpus → birinchi plitka) → Ctrl+Z */
  const mat = () => M(() => { const p = window.__app.projectPayload(); return JSON.stringify({ m: p.material, f: p.fasad, pk: p.polka, o: p.orqa, s: p.stol, sh: p.sheet && p.sheet.sku, sl: p.doc.placements.map(x => x.slots || null) }); });
  const mt0 = await mat();
  await page.locator('[data-panel] button', { hasText: 'Korpus' }).first().click(); await page.waitForTimeout(600);
  const plitka = page.locator('[data-varaq="material"] [data-material-plitka] > button');
  let mt1 = mt0;
  for (let i = 0, n = await plitka.count(); i < Math.min(n, 4) && mt1 === mt0; i++) { await plitka.nth(i).click(); await page.waitForTimeout(900); mt1 = await mat(); }
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await blur(); await kZ();
  const mt2 = await mat(), toastM = await toastMatn();
  R.material = { oldin: mt0, keyin: mt1, bekor: mt2, toast: toastM };
  R.materialOk = mt1 !== mt0 && mt2 === mt0 && /^Bekor qilindi: material tanlash$/.test(toastM || '');

  /* 6) o'chirish → sarlavhadagi "Bekor qilish" tugmasi → modul qaytadi */
  await tanla(m1y[0].id);
  await page.locator('button[aria-label*="O\'chirish"]').first().click(); await page.waitForTimeout(400);
  await page.getByRole('button', { name: /^O'chirish$/ }).last().click(); await page.waitForTimeout(700);
  const d1 = (await modullar()).length;
  await page.locator('[data-tarix="sarlavha"] [data-tarix-tugma="bekor"]').click(); await page.waitForTimeout(600);
  const d2 = (await modullar()).length;
  R.ochirish = { keyin: d1, bekor: d2, toast: await toastMatn() };
  R.ochirishOk = d1 === 0 && d2 === 1 && /^Bekor qilindi: modulni o'chirish$/.test(R.ochirish.toast || '');

  /* 7) matn maydoni fokusda — Ctrl+Z bizning tarixni chaqirmaydi (brauzer o'zi matnni qaytaradi) */
  const inp = page.locator('header input').first();
  const t7 = await tarix(), m7 = JSON.stringify(await modullar());
  await inp.click(); await inp.press('End'); await inp.type(' X'); await page.waitForTimeout(200);
  await inp.press('Control+z'); await page.waitForTimeout(400);
  R.input = { tarix: [t7, await tarix()], teng: JSON.stringify(await modullar()) === m7, fokus: await M(() => document.activeElement && document.activeElement.tagName) };
  R.inputOk = R.input.tarix[1].bekor === t7.bekor && R.input.tarix[1].qayta === t7.qayta && R.input.teng && R.input.fokus === 'INPUT';
  await blur();

  /* 8) 51 qadam (o'lcham +/− va burish navbatma-navbat — ketma-ket bir xil amal emas, birlashmaydi) → tarixda 50;
   *    50 marta Ctrl+Z → 1-qadamdan keyingi holat (eng eskisi — boshlang'ich holat — tushib ketgan) */
  await tanla(m1y[0].id);
  const plus = page.locator('button[aria-label="Oshirish"]').first(), minus = page.locator('button[aria-label="Kamaytirish"]').first();
  const bur = page.locator('button[aria-label="90 gradus burish"]').first();
  let birinchi = null;
  for (let i = 0; i < 51; i++) {
    await (i % 2 ? bur : i % 4 === 0 ? plus : minus).click(); await page.waitForTimeout(60);
    if (i === 0) birinchi = (await modullar())[0];
  }
  await page.waitForTimeout(400);
  const t8 = await tarix();
  await blur();
  for (let i = 0; i < 50; i++) { await page.keyboard.press('Control+z'); await page.waitForTimeout(40); }
  await page.waitForTimeout(600);
  const t8b = await tarix(), m8 = (await modullar())[0];
  R.max = { tarix: t8, keyin: t8b, birinchi, holat: m8, tugma: await tugma() };
  R.maxOk = t8.bekor === 50 && t8.qayta === 0 && t8b.bekor === 0 && t8b.qayta === 50 && m8.w === birinchi.w && m8.rot === birinchi.rot && R.max.tugma.bekor === false;

  /* 9) telefon (390) — tugmalar 3D ustidagi qatorda ko'rinadi (sarlavha tor), sahifa yonga surilmaydi */
  await kY(); await kY();
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(900);
  await kZ();
  R.tel = await M(() => {
    const g = document.querySelector('[data-tarix="sahna"]'), r = g && g.getBoundingClientRect(), inp = document.querySelector('header input');
    const b = g ? [...g.querySelectorAll('[data-tarix-tugma]')].map(x => { const q = x.getBoundingClientRect(); return { w: Math.round(q.width), h: Math.round(q.height), x: Math.round(q.left), ichida: q.right <= innerWidth && q.left >= 0 && q.top >= 0, yoq: !x.disabled }; }) : [];
    return { guruh: r ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null, tugmalar: b,
      sarlavhada: !!(document.querySelector('[data-tarix="sarlavha"]') || {}).offsetParent, nomEni: inp ? Math.round(inp.getBoundingClientRect().width) : null, skroll: document.documentElement.scrollWidth > innerWidth };
  });
  R.telOk = !!R.tel.guruh && R.tel.guruh.w > 0 && !R.tel.sarlavhada && R.tel.tugmalar.length === 2 && R.tel.tugmalar.every(b => b.ichida && b.w >= 32 && b.h >= 32 && b.yoq) && !R.tel.skroll;
  /* telefonda tugma bilan ham: qaytarish */
  const tq = (await tarix()).qayta;
  await page.locator('[data-tarix="sahna"] [data-tarix-tugma="qayta"]').click(); await page.waitForTimeout(500);
  R.telTugma = { oldin: tq, keyin: (await tarix()).qayta };
  R.telOk = R.telOk && R.telTugma.keyin === tq - 1;
  await kZ();
  await page.screenshot({ path: `${OUT}/undo-390.png` });
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/undo-1440.png` });

  /* 9b) Xona paneli: Devorli xona → Erkin maydon → Ctrl+Z → Devorli; Ctrl+Y → Erkin */
  await click(/^Xona$/); await page.waitForTimeout(900);
  const my0 = await M(() => window.__app.doc.maydon || 'devorli');
  await page.locator('[data-maydon-rejim="erkin"]').click(); await page.waitForTimeout(900);
  const my1 = await M(() => window.__app.doc.maydon);
  await blur(); await kZ();
  const my2 = await M(() => window.__app.doc.maydon || 'devorli'), toastMy = await toastMatn();
  await kY();
  const my3 = await M(() => window.__app.doc.maydon);
  R.maydon = { oldin: my0, keyin: my1, bekor: my2, qayta: my3, toast: toastMy };
  R.maydonOk = my0 === 'devorli' && my1 === 'erkin' && my2 === 'devorli' && my3 === 'erkin' && /^Bekor qilindi: Devorli xona \/ Erkin maydon$/.test(toastMy || '');

  /* 10) yangi loyiha — tarix bo'sh */
  await page.locator('[data-sarlavha="loyihalar"]').click(); await page.waitForTimeout(800);
  await click(/^\+ Yangi loyiha$/); await page.waitForTimeout(1500);
  R.yangi = { tarix: await tarix(), n: (await modullar()).length, tugma: await tugma() };
  R.yangiOk = R.yangi.tarix.bekor === 0 && R.yangi.tarix.qayta === 0 && R.yangi.tugma.bekor === false && R.yangi.tugma.qayta === false;

  R.xatolar = errs;
  R.ok = R.boshOk && R.qoshishOk && R.kameraOk && R.surishOk && R.olchamOk && R.materialOk && R.ochirishOk && R.inputOk && R.maxOk && R.telOk && R.maydonOk && R.yangiOk && !errs.length;
}
