/* TZ-25: bosh ish joyi (Bazis kabi bitta ekran). Tekshiriladi: ro'yxatdan o'tgach darhol ish joyi (so'rovnomasiz, standart
 * xona 5000 × 4000 — egasi #152, oldin 3600 × 3000); asboblar, matn qatori, "tez boshlash" (oshxona); 3D da sichqoncha bilan aylantirganda sahna chiziladi
 * (TZ-23 A1); devor chizish — matn qatoridan uzunlik bilan va sichqoncha bilan (45° yopishish, 10 mm, birinchi nuqtaga
 * qaytib yopish); o'lcham yozuvini bosib uzunlik; devorni sudrash; eshikni palitradan devorga sudrash, eni, devor bo'ylab
 * surish; sahifa qayta ochilsa — oxirgi loyiha ish joyida; telefon (390): asboblar qatori, matn qatori, panel — pastki varaq.
 * Ishlatish: bash tests/ui/web.sh ishjoyi */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/ishjoyi-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const has = async (s) => (await M(() => document.body.innerText)).includes(s);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const xona = () => M(() => { const r = window.__app.doc.room; return { o: r.outline, t: (r.openings || []).map(x => ({ w: x.wall, ty: x.type, of: x.offset, en: x.width })) }; });
  /* olam (mm) → ekran (px), 2D kamera */
  const ekran = (p) => M((p) => { const s = window.__app.sahna.sp, c = s.cam2d, r = s.renderer.domElement.getBoundingClientRect();
    return [r.left + (p[0] - c.left) / (c.right - c.left) * r.width, r.top + (c.top - p[1]) / (c.top - c.bottom) * r.height]; }, p);
  const bos = async (p) => { const e = await ekran(p); await page.mouse.move(e[0], e[1]); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(150); };
  const qator = page.locator('[data-matn]');
  const buyruq = async (s) => { await qator.fill(s); await qator.press('Enter'); await page.waitForTimeout(200); };

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Ishjoyi Usta'); await fill('jasur@', 'ishjoyi' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/);
  await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(800);

  /* 1) darhol ish joyi: so'rovnoma yo'q, standart xona, mebelsiz; asboblar va matn qatori */
  R.boshlanish = await M(() => ({ ekran: window.__app.state.screen, savol: document.body.innerText.includes('Nima yasaymiz'), xona: window.__app.doc.room.outline,
    mebel: window.__app.doc.placements.length, asbob: document.querySelectorAll('[data-asbob]').length, qator: !!document.querySelector('[data-matn]'),
    tez: !!document.querySelector('[data-tez="kitchen"]'), aiTugma: !!document.querySelector('button[aria-label="AI"]') }));
  await page.screenshot({ path: `${OUT}/ishjoyi-1440-bosh.png` });

  /* 2) tez boshlash — oshxona (avtomatik konstruktor) */
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(1200);
  R.oshxona = await M(() => window.__app.doc.placements.length);
  R.tezYoq = await M(() => !document.querySelector('[data-tez="kitchen"]'));

  /* 3) TZ-23 A1: 3D da sichqoncha bilan aylantirish — sahna har harakatda chiziladi */
  await M(() => { const s = window.__app.sahna.sp, r = s.renderer, f = r.render.bind(r); window.__chiz = 0; r.render = (a, b) => { window.__chiz++; f(a, b); }; });
  const kb = await M(() => { const b = window.__app.sahna.sp.renderer.domElement.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
  const k0 = await M(() => window.__app.sahna.sp.camera.position.toArray().map(Math.round));
  await page.mouse.move(kb[0], kb[1]); await page.mouse.down();
  for (let i = 1; i <= 15; i++) { await page.mouse.move(kb[0] + i * 10, kb[1] + i * 2); await page.waitForTimeout(16); }
  const chizSudrash = await M(() => window.__chiz);
  await page.mouse.up(); await page.waitForTimeout(300);
  R.aylantirish = { chizildi: chizSudrash, kamera: [k0, await M(() => window.__app.sahna.sp.camera.position.toArray().map(Math.round))] };
  await page.mouse.move(kb[0], kb[1]);
  await M(() => { window.__chiz = 0; }); await page.mouse.wheel(0, -300); await page.waitForTimeout(400);
  R.gildirak = await M(() => window.__chiz);

  /* 4) devor chizish — matn qatoridan: (0,0) dan 4000 → 3000 → 4000 → bo'sh Enter (yopiladi) */
  await page.locator('[data-asbob="devor"]').click(); await page.waitForTimeout(600);
  R.devor2d = await M(() => window.__app.sahna.sp.mode);
  R.izoh = await M(() => !!document.querySelector('[data-asbob-izoh]'));
  await buyruq('4000'); await buyruq('3000'); await buyruq('4000');
  R.chizilmoqda = await M(() => document.querySelectorAll('[data-chizma-qatlam] circle').length);
  await buyruq('');
  await page.waitForTimeout(600);
  R.qatordan = await xona();
  R.qatordanAsbob = await M(() => document.querySelector('[data-asbob="tanlash"]').getAttribute('aria-pressed'));

  /* 5) devor chizish — sichqoncha: 45° yopishish, 10 mm, oxirgi devor birinchi nuqta ustuniga tekislanadi, birinchi nuqtaga bosib yopish */
  await page.locator('[data-asbob="devor"]').click(); await page.waitForTimeout(500);
  await bos([503, 498]); await bos([2507, 530]); await bos([2512, 2003]);
  const ox = await ekran([500, 2000]); await page.mouse.move(ox[0] + 5, ox[1] + 3); await page.waitForTimeout(150);
  R.kursorYorliq = await M(() => (document.querySelector('[data-devor-kursor]') || {}).textContent || '');
  await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(150);
  await bos([505, 503]);
  await page.waitForTimeout(600);
  R.sichqoncha = await xona();
  await page.screenshot({ path: `${OUT}/ishjoyi-1440-devor.png` });

  /* 6) o'lcham yozuvi → uzunlik 3000 (keyingi devor parallel ko'chadi) */
  await page.locator('[data-devor-olcham="0"]').click(); await page.waitForTimeout(200);
  await page.locator('[data-devor-maydon="0"]').fill('3000'); await page.locator('[data-devor-maydon="0"]').press('Enter'); await page.waitForTimeout(500);
  R.uzunlik = await xona();

  /* 7) devorni sudrash: o'ng devor (x=3500) +500 mm — devorning mebelsiz joyidan ushlanadi */
  const yy = await M(() => { const s = window.__app.sahna, c = s.sp.cam2d, r = s.sp.renderer.domElement.getBoundingClientRect();
    for (let y = 600; y <= 1900; y += 50) { const x = r.left + (3500 - c.left) / (c.right - c.left) * r.width, sy = r.top + (c.top - y) / (c.top - c.bottom) * r.height;
      if (!s.items.hitTest({ clientX: x, clientY: sy })) return y; } return 1250; });
  const a1 = await ekran([3500, yy]), a2 = await ekran([4000, yy]);
  await page.mouse.move(a1[0], a1[1]); await page.mouse.down(); await page.mouse.move(a2[0], a2[1], { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(600);
  R.surildi = await xona();

  /* 8) eshik — palitradan devorga sudrab (0-devor o'rtasi), eni 1000, keyin devor bo'ylab +300 */
  await page.locator('[data-asbob="teshik"]').click(); await page.waitForTimeout(400);
  R.palitra = await M(() => document.querySelectorAll('[data-palitra]').length);
  const pb = await M(() => { const b = document.querySelector('[data-palitra="door"]').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
  const dv = await ekran([2250, 500]);
  await page.mouse.move(pb[0], pb[1]); await page.mouse.down(); await page.mouse.move(dv[0], dv[1], { steps: 10 }); await page.mouse.up(); await page.waitForTimeout(600);
  R.eshik = await xona();
  R.karta = await M(() => !!document.querySelector('[data-teshik-karta]'));
  await page.locator('[data-teshik-en]').fill('1000'); await page.locator('[data-teshik-en]').press('Enter'); await page.waitForTimeout(400);
  R.eshikEni = (await xona()).t[0];
  await page.locator('[data-asbob="tanlash"]').click(); await page.waitForTimeout(300);
  /* eshik devorning ichki yarmidan (chiziqdan 30 mm) ushlanadi: oldingi xonadagi oshxona modullari orqasi devordan 3 mm (#152) —
     ular y = 503 gacha yetadi va 500 chizig'ining o'zida bosish mebelga tushadi (7-qadamdagidek mebelsiz joydan) */
  const t0 = (await xona()).t[0], e1 = await ekran([500 + t0.of + t0.en / 2, 530]), e2 = await ekran([500 + t0.of + t0.en / 2 + 300, 530]);
  await page.mouse.move(e1[0], e1[1]); await page.mouse.down(); await page.mouse.move(e2[0], e2[1], { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(500);
  R.eshikSurildi = [t0.of, (await xona()).t[0].of];
  await page.screenshot({ path: `${OUT}/ishjoyi-1440-eshik.png` });

  /* 9) panel: kompyuterda boshida katalog ochiq; yopiladi, Mebel bilan ochiladi; Fayllar — tepadan */
  if (await M(() => !!document.querySelector('[data-panel-yop]'))) { await page.locator('[data-panel-yop]').click(); await page.waitForTimeout(300); }
  await page.locator('[data-asbob="mebel"]').click(); await page.waitForTimeout(300);
  const pOchiq = await M(() => !!document.querySelector('[data-panel]'));
  await page.locator('[data-panel-yop]').click(); await page.waitForTimeout(300);
  const pYopiq = await M(() => !document.querySelector('[data-panel]'));
  await page.locator('[data-sarlavha="fayllar"]').click(); await page.waitForTimeout(300);
  R.panel = { ochiq: pOchiq, yopiq: pYopiq, fayllar: await M(() => window.__app.state.step === 4 && !!document.querySelector('[data-panel]')) };

  /* 10) sahifa qayta ochilsa — oxirgi loyiha ish joyida (ro'yxat emas) */
  await page.waitForTimeout(2600);                         // avtomatik saqlash (2 s)
  const eski = await xona();
  await page.reload(); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 }); await page.waitForTimeout(1500);
  R.qaytaOchildi = { ekran: await M(() => window.__app.state.screen), bir: JSON.stringify((await xona()).o) === JSON.stringify(eski.o), mebel: await M(() => window.__app.doc.placements.length) };

  /* 11) telefon (390): asboblar — gorizontal qator, matn qatori ko'rinadi, toshish yo'q; panel — kanva va asboblar orasida */
  if (await M(() => !!document.querySelector('[data-panel-yop]'))) { await page.locator('[data-panel-yop]').click(); await page.waitForTimeout(300); }
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(900);
  R.tel = await M(() => {
    const q = (s) => document.querySelector(s), b = (s) => q(s) && q(s).getBoundingClientRect();
    const a = b('[data-asboblar]'), m = b('[data-matn-qatori]'), k = b('[data-kanva]');
    return { toshish: document.documentElement.scrollWidth - innerWidth, asbobQator: a && a.height < 90 && a.top > k.top, matn: m && m.bottom <= innerHeight + 1 && m.top > a.top, kanva: k && k.height > 300 };
  });
  await page.screenshot({ path: `${OUT}/ishjoyi-390.png` });
  await page.locator('[data-asbob="mebel"]').click(); await page.waitForTimeout(400);
  R.telPanel = await M(() => { const b = (s) => document.querySelector(s) && document.querySelector(s).getBoundingClientRect(), p = b('[data-panel]'), a = b('[data-asboblar]'), m = b('[data-matn-qatori]');
    return !!p && p.height > 200 && p.bottom <= a.top + 1 && m.bottom <= innerHeight + 1 && m.top >= a.bottom - 1 && document.documentElement.scrollWidth <= innerWidth; });
  await page.screenshot({ path: `${OUT}/ishjoyi-390-panel.png` });
  await page.locator('[data-panel-yop]').click(); await page.waitForTimeout(300);
  await page.setViewportSize({ width: 1440, height: 900 });

  R.xatolar = errs;
  const o = R.qatordan.o, s = R.sichqoncha.o, u = R.uzunlik.o, v = R.surildi.o;
  R.ok = R.boshlanish.ekran === 'app' && !R.boshlanish.savol && JSON.stringify(R.boshlanish.xona) === '[[0,0],[5000,0],[5000,4000],[0,4000]]' && R.boshlanish.mebel === 0
    && R.boshlanish.asbob >= 10 && R.boshlanish.qator && R.boshlanish.tez && !R.boshlanish.aiTugma
    && R.oshxona > 2 && R.tezYoq
    && R.aylantirish.chizildi >= 10 && JSON.stringify(R.aylantirish.kamera[0]) !== JSON.stringify(R.aylantirish.kamera[1]) && R.gildirak >= 1
    && R.devor2d === '2d' && R.izoh && R.chizilmoqda >= 4
    && JSON.stringify(o) === '[[0,0],[4000,0],[4000,3000],[0,3000]]' && R.qatordanAsbob === 'true'
    && JSON.stringify(s) === '[[500,500],[2510,500],[2510,2000],[500,2000]]' && /^2010/.test(R.kursorYorliq)
    && JSON.stringify(u) === '[[500,500],[3500,500],[3500,2000],[500,2000]]'
    && JSON.stringify(v) === '[[500,500],[4000,500],[4000,2000],[500,2000]]'
    && R.palitra === 2 && R.eshik.t.length === 1 && R.eshik.t[0].w === 0 && R.eshik.t[0].ty === 'door' && R.eshik.t[0].en === 900 && R.karta
    && R.eshikEni.en === 1000 && R.eshikSurildi[1] - R.eshikSurildi[0] === 300
    && R.panel.ochiq && R.panel.yopiq && R.panel.fayllar
    && R.qaytaOchildi.ekran === 'app' && R.qaytaOchildi.bir && R.qaytaOchildi.mebel === R.oshxona
    && R.tel.toshish <= 0 && R.tel.asbobQator && R.tel.matn && R.tel.kanva && R.telPanel
    && !errs.length;
}
