/* TZ-30 (egasi #179): har ekranning o'z manzili. Tekshiriladi: eski havola (app.html#s=reg, #s=login) yangi manzilga almashadi;
 * kirmagan foydalanuvchi himoyalangan manzilda — /kirish?qaytish=…, ro'yxat yoki kirishdan keyin o'sha manzil; ekran almashganda
 * manzil o'zgaradi (/loyihalar, /loyiha/yangi → /loyiha/<id>, /sozlamalar); "orqaga" va "oldinga" — ekran manzil bo'yicha; oyna
 * ochiq bo'lsa "orqaga" avval oynani yopadi; har manzil to'g'ridan-to'g'ri ochiladi (yangilash) va chuqur manzilda ma'lumot
 * (/data/…) yuklanadi; /loyiha/<yo'q> — xabar va /loyihalar; chiqishdan keyin "orqaga" ilova ekraniga qaytarmaydi.
 * Ishlatish: bash tests/ui/web.sh marshrut */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/marshrut-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [], yoq = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  /* chuqur manzilda (/loyiha/5, /sozlamalar/narxlar) nisbiy yo'l bo'lsa — /loyiha/data/… 404: tarmoqda ham, konsolda ham ushlanadi */
  page.on('console', m => { const u = (m.location() || {}).url || ''; if (m.type() === 'error' && /Failed to load resource/.test(m.text()) && !/\/api\//.test(u)) yoq.push('konsol ' + u); });
  page.on('response', r => { const u = new URL(r.url()); if (r.status() >= 400 && !u.pathname.startsWith('/api/') && u.origin === new URL(page.url()).origin) yoq.push(r.status() + ' ' + u.pathname); });
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const base = new URL(page.url()).origin;
  const yol = () => { const u = new URL(page.url()); return u.pathname + u.search; };
  const ekran = () => M(() => window.__app.state.screen);
  const holat = async () => ({ yol: yol(), ekran: await ekran() });
  const kut = async (fn, ms = 10000) => { for (let i = 0; i < ms / 200; i++) { try { if (await fn()) return true; } catch (_) { /* navigatsiya */ } await page.waitForTimeout(200); } return false; };
  const och = async (p) => { await page.goto(base + p); await kut(() => M(() => !!window.__app && window.__app.state.dataReady), 15000); await page.waitForTimeout(1200); return holat(); };
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { await page.locator(`input[placeholder*="${ph}"]`).first().fill(v); };
  /* "orqaga"/"oldinga": ish joyida avval ochiq panel/tanlov yopiladi (TZ-27) — manzil o'zgarguncha (ko'pi 5 marta) */
  const qadam = async (fn) => { const y0 = yol(); for (let i = 0; i < 5; i++) { await fn(); await page.waitForTimeout(900); if (yol() !== y0) break; } return holat(); };
  const orqaga = () => qadam(() => page.goBack());
  const oldinga = () => qadam(() => page.goForward());

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });

  /* 1) eski havolalar → yangi manzil (hash qolmaydi) */
  R.eskiReg = await och('/app.html#s=reg');
  R.eskiReg.hash = new URL(page.url()).hash;
  R.eskiLogin = await och('/app.html?t=' + Date.now() + '#s=login');
  R.oddiyApp = await och('/app.html');

  /* 2) kirmagan — himoyalangan manzil → /kirish?qaytish=…; ro'yxatga o'tilsa ham qaytish saqlanadi; /tg (Telegram'siz) → /kirish */
  R.tg = await och('/tg');
  R.himoya = await och('/loyihalar');
  await click(/^Ro'yxatdan o'tish$/); await page.waitForTimeout(500);
  R.himoyaReg = await holat();
  const email = 'marshrut' + Date.now() + '@test.uz';
  await fill('Jasur', 'Marshrut Usta'); await fill('jasur@', email);
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/);
  await kut(async () => (await ekran()) === 'projects' && yol() === '/loyihalar', 15000);
  R.qaytdi = await holat();

  /* 3) ekran almashganda manzil: yangi loyiha → /loyiha/yangi → saqlangach /loyiha/<id>; sozlamalar */
  await click(/^\+ Yangi loyiha$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  R.yangi = await holat();
  await kut(() => M(() => window.__app.state.sceneOn), 15000);
  await page.locator('[data-tez="kitchen"]').click();
  await kut(() => M(() => window.__app.doc.placements.length > 0), 10000);
  const nMebel = await M(() => window.__app.doc.placements.length);
  await kut(() => /^\/loyiha\/\d+$/.test(yol()), 10000);
  R.saqlandi = await holat();
  const ID = (yol().match(/^\/loyiha\/(\d+)$/) || [])[1];
  R.serverda = ID ? await M(async (id) => (await fetch('/api/projects/' + id)).ok, ID) : false;
  await page.locator('[data-sozlamalar]').first().click(); await page.waitForTimeout(800);
  R.sozlamalar = await holat();

  /* 4) "orqaga" / "oldinga" — manzil bo'yicha ekran */
  R.o1 = await orqaga();                                   // → /loyiha/<id>
  R.o1.mebel = await M(() => window.__app.doc.placements.length);
  R.o2 = await orqaga();                                   // → /loyihalar
  R.f1 = await oldinga();                                  // → /loyiha/<id>
  R.f2 = await oldinga();                                  // → /sozlamalar
  R.o3 = await orqaga();                                   // → /loyiha/<id>

  /* 5) oyna ochiq — "orqaga" avval oynani yopadi, manzil va ekran joyida */
  await page.locator('[data-matn-menyu]').click(); await page.waitForTimeout(400);
  const varaq = await M(() => !!document.querySelector('[data-varaq="ai"]'));
  await page.goBack(); await page.waitForTimeout(900);
  const v = await holat();
  R.oyna = { varaq, yopildi: await M(() => !document.querySelector('[data-varaq="ai"]')), ...v };

  /* 6) to'g'ridan-to'g'ri ochish (yangilash) — har manzil; chuqur manzilda ma'lumot ham */
  R.dLoyiha = await och('/loyiha/' + ID);
  R.dLoyiha.mebel = await M(() => window.__app.doc.placements.length);
  R.dLoyiha.data = await M(() => window.__app.state.dataReady && !window.__app.state.dataErr);
  R.dLoyihalar = await och('/loyihalar');
  R.dSozlamalar = await och('/sozlamalar');
  R.dNarxlar = await och('/sozlamalar/narxlar');
  await page.waitForTimeout(1000);                          // bo'limga silliq aylantirish
  R.dNarxlar.bolim = await M(() => { const el = document.querySelector('[data-set="narxlar"]'); if (!el) return null; const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });
  R.dBuyurtma = await och('/buyurtmalar');
  R.dKirish = await och('/kirish');                         // kirgan — ish joyiga (odatdagi oqim)
  R.dYangi = await och('/loyiha/yangi');
  R.dYangi.mebel = await M(() => window.__app.doc.placements.length);
  R.dYoq = await och('/loyiha/99999999');
  R.dYoq.xabar = await M(() => document.body.innerText.includes('Loyiha topilmadi'));
  await page.screenshot({ path: `${OUT}/marshrut-topilmadi.png` });

  /* 7) chiqish → /kirish; "orqaga" ilova ekraniga qaytarmaydi */
  await och('/sozlamalar');
  await click(/^Chiqish$/); await page.waitForTimeout(400); await click(/^Chiqish$/); await page.waitForTimeout(1200);
  R.chiqdi = await holat();
  await page.goBack(); await page.waitForTimeout(900);
  R.chiqdiOrqaga = await holat();

  /* 8) kirmagan — /loyiha/<id> → /kirish?qaytish=… → kirgach shu loyiha */
  R.kLoyiha = await och('/loyiha/' + ID);
  await fill('jasur@', email); await fill('kamida 8', 'parol12345');
  await click(/^Kirish$/);
  await kut(async () => (await ekran()) === 'app' && yol() === '/loyiha/' + ID, 15000);
  R.kQaytdi = await holat();
  R.kQaytdi.mebel = await M(() => window.__app.doc.placements.length);
  await page.screenshot({ path: `${OUT}/marshrut-loyiha.png` });

  /* 9) haqiqiy server (server/routes/sahifalar.js ILOVA_YOLI): chuqur manzil — app.html (CSP — app.html bilan bir xil), noma'lum — 404;
     kirmagan /sozlamalar/narxlar → /kirish?qaytish=…, ma'lumot /data/… dan (404 yo'q), kirgach — o'sha bo'lim, keyin /loyiha/<id> */
  const SRV = `http://127.0.0.1:${process.env.NPORT}`;
  {
    const g = (p) => page.request.get(SRV + p), csp = (r) => r.headers()['content-security-policy'] || '';
    const a = await g('/app.html'), l = await g('/loyiha/' + ID), n = await g('/sozlamalar/narxlar/'), x = await g('/loyiha/abc');
    R.srv = { loyiha: l.status(), narxlar: n.status(), html: (await l.text()).includes('id="root"'), csp: !!csp(a) && csp(l) === csp(a), yoq: x.status() };
  }
  await page.goto(SRV + '/sozlamalar/narxlar'); await kut(() => M(() => !!window.__app && window.__app.state.dataReady), 15000);
  await M(() => localStorage.setItem('s3d-til', 'uz'));     // boshqa origin — o'z sozlamasi; yangilash: /kirish?qaytish=… saqlanadi
  await page.reload(); await kut(() => M(() => !!window.__app && window.__app.state.dataReady), 15000); await page.waitForTimeout(800);
  R.srvKirish = await holat();
  await fill('jasur@', email); await fill('kamida 8', 'parol12345');
  await click(/^Kirish$/);
  await kut(async () => (await ekran()) === 'settings' && yol() === '/sozlamalar/narxlar', 15000);
  R.srvNarxlar = await holat();
  await page.goto(SRV + '/loyiha/' + ID); await kut(async () => (await ekran()) === 'app', 15000); await page.waitForTimeout(1200);
  R.srvLoyiha = await holat();
  R.srvLoyiha.mebel = await M(() => window.__app.doc.placements.length);

  R.xatolar = errs; R.yoq = yoq;
  const L = '/loyiha/' + ID, is = (h, y, e) => h.yol === y && h.ekran === e;
  R.ok = is(R.eskiReg, '/royxat', 'reg') && !R.eskiReg.hash && is(R.eskiLogin, '/kirish', 'login') && is(R.oddiyApp, '/royxat', 'reg')
    && is(R.tg, '/kirish', 'login') && is(R.himoya, '/kirish?qaytish=%2Floyihalar', 'login') && is(R.himoyaReg, '/royxat?qaytish=%2Floyihalar', 'reg')
    && is(R.qaytdi, '/loyihalar', 'projects')
    && is(R.yangi, '/loyiha/yangi', 'app') && !!ID && is(R.saqlandi, L, 'app') && R.serverda && is(R.sozlamalar, '/sozlamalar', 'settings')
    && is(R.o1, L, 'app') && R.o1.mebel === nMebel && is(R.o2, '/loyihalar', 'projects') && is(R.f1, L, 'app') && is(R.f2, '/sozlamalar', 'settings')
    && is(R.o3, L, 'app') && R.oyna.varaq && R.oyna.yopildi && is(R.oyna, L, 'app')
    && is(R.dLoyiha, L, 'app') && R.dLoyiha.mebel === nMebel && R.dLoyiha.data && is(R.dLoyihalar, '/loyihalar', 'projects')
    && is(R.dSozlamalar, '/sozlamalar', 'settings') && is(R.dNarxlar, '/sozlamalar/narxlar', 'settings') && R.dNarxlar.bolim
    && is(R.dBuyurtma, '/buyurtmalar', 'projects') && is(R.dKirish, L, 'app')
    && R.dYangi.ekran === 'app' && R.dYangi.mebel === 0 && is(R.dYoq, '/loyihalar', 'projects') && R.dYoq.xabar
    && is(R.chiqdi, '/kirish', 'login') && R.chiqdiOrqaga.ekran === 'login'
    && is(R.kLoyiha, '/kirish?qaytish=' + encodeURIComponent(L), 'login') && is(R.kQaytdi, L, 'app') && R.kQaytdi.mebel === nMebel
    && R.srv.loyiha === 200 && R.srv.narxlar === 200 && R.srv.html && R.srv.csp && R.srv.yoq === 404
    && is(R.srvKirish, '/kirish?qaytish=%2Fsozlamalar%2Fnarxlar', 'login') && is(R.srvNarxlar, '/sozlamalar/narxlar', 'settings')
    && is(R.srvLoyiha, L, 'app') && R.srvLoyiha.mebel === nMebel
    && !errs.length && !yoq.length;
}
