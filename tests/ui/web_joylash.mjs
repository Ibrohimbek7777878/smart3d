/* Egasi #156: yangi modul devorga yopishmaydi; surishda magnit yo'q; "Devorli xona" | "Erkin maydon" loyiha sozlamasi.
 * Tekshiriladi: katalogdan "+" — modul orqa devor yuzasidan ≥ 3000 mm va eni bo'yicha o'rtada (YANGI_MODUL_DEVORDAN);
 * 2-modul 1-sining ustiga tushmaydi; surishda devorga yaqinlashganda SAKRAMAYDI (oraliq qiymatlari ketma-ket kamayadi),
 * devordan 3 mm da to'xtaydi; Xona panelida Devorli | Erkin almashadi, doc.maydon saqlanadi (payload, qayta ochish),
 * Erkin maydonda devor chizilmaydi, ko'rinish tugmasi "Devor va pol" o'chiq; yangi modul maydon o'rtasiga.
 * Ishlatish: bash tests/ui/web.sh joylash   Skrinshotlar: tests/ui/out/web/joylash-*.png */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/joylash-xato.png` }).catch(() => {});
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
  const YARIM = 50;
  const pl = () => M(() => window.__app.doc.placements.filter(p => !p.auto).map(p => ({ id: p.id, x: p.x, y: p.y, w: p.w, d: p.d, rot: p.rot || 0 })));

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Joylash Usta'); await fill('jasur@', 'joylash' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn && window.__app.sahna && window.__app.res !== undefined)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(2500);

  /* 1) katalogdan "+": birinchi modul orqa devordan ≥ 3000, eni bo'yicha o'rtada */
  const kartalar = page.locator('[data-panel] button:has-text("so\'m")');
  R.kartalar = await kartalar.count();
  await kartalar.first().click(); await page.waitForTimeout(1200);
  let a = (await pl())[0];
  R.birinchi = { ...a, devordan: a.y - YARIM, ortaX: (5000 - a.w) / 2 };
  R.birinchiOk = R.kartalar > 0 && a.y - YARIM >= 3000 && Math.abs(a.x - (5000 - a.w) / 2) <= 1;
  await page.screenshot({ path: `${OUT}/joylash-1-katalogdan.png` });

  /* 2) ikkinchisi — 1-sining ustiga tushmaydi, yoniga */
  await kartalar.first().click(); await page.waitForTimeout(1000);
  const ikki = await pl();
  const [p1, p2] = ikki;
  R.ikkinchi = ikki;
  R.ikkinchiOk = ikki.length === 2 && !(Math.min(p1.x + p1.w, p2.x + p2.w) - Math.max(p1.x, p2.x) > 0.5 && Math.min(p1.y + p1.d, p2.y + p2.d) - Math.max(p1.y, p2.y) > 0.5);
  await page.screenshot({ path: `${OUT}/joylash-2-ikkinchi.png` });

  /* 3) surish: yuqoridan ko'rinish, 1-modulni orqa devor tomon sekin tortish — SAKRAMAYDI, devorga 3 mm da to'xtaydi */
  const korinadi = async () => { await M(() => window.__app.sahna.korinish.yonalish('yuqori')); await page.waitForTimeout(700);
    for (let i = 0; i < 14; i++) {
      const pxmm = await M(() => { const s = window.__app.sahna, a = s.sp.camera, V = (y) => { const v = a.position.clone().set(2500, y, 0).project(a); return v.y; }; const c = s.sp.renderer.domElement.getBoundingClientRect();
        return Math.abs(V(0) - V(1000)) / 2 * c.height / 1000; });
      if (pxmm < 0.12) break;
      await M(() => window.__app.sahna.korinish.zoom(-1)); await page.waitForTimeout(250);
    } };
  await korinadi();
  const nuqta = (id) => M((id) => {
    const s = window.__app.sahna, it = s.items, c = s.sp.renderer.domElement.getBoundingClientRect();
    const m = it.meshes.find(m => m.userData.id === id);
    for (const dz of [0.5, 0, 1]) { const v = m.position.clone(); v.z += (dz - 0.5) * m.userData.h; v.project(s.sp.camera);
      const x = c.left + (v.x + 1) / 2 * c.width, y = c.top + (1 - v.y) / 2 * c.height;
      if (it.pickId({ clientX: x, clientY: y }) === id) return { x: Math.round(x), y: Math.round(y), top: c.top }; }
    return null;
  }, id);
  /* p2 — devorga yaqinroq modul (p1 uning oldida). Avval qo'pol (devorga ~400 mm), keyin sekin: 3 px qadam */
  const yOf = (id) => M((id) => window.__app.doc.placements.find(p => p.id === id).y, id);
  const sur = async (id, qadam, maqsad, ortiq) => {
    const q = await nuqta(id);
    if (!q) throw new Error('modul ekranda topilmadi');
    const tr = [];
    await page.mouse.move(q.x, q.y); await page.mouse.down();
    let kech = 0;
    for (let i = 1; i <= 400; i++) {
      await page.mouse.move(q.x, Math.max(q.top + 5, q.y - i * qadam)); await page.waitForTimeout(10);
      const y = await yOf(id); tr.push(y);
      if (y <= maqsad && ++kech > ortiq) break;
    }
    await page.mouse.up(); await page.waitForTimeout(400);
    return tr;
  };
  for (let k = 0; k < 8 && (await yOf(p2.id)) > 400; k++) await sur(p2.id, 6, 300, 0);
  await korinadi();
  const yTraj = await sur(p2.id, 1, 53, 15);
  const yOxir = yTraj[yTraj.length - 1], yMin = Math.min(...yTraj);
  const oraliqlar = yTraj.map(y => y - YARIM);
  const sakrash = Math.max(...oraliqlar.slice(1).map((v, i) => oraliqlar[i] - v));        // ketma-ket ikki qadam orasida eng katta kamayish
  const yaqinda = oraliqlar.filter(v => v > 3.5 && v < 65);                                // devordan 3…65 mm da oraliq holatlar bo'lishi kerak (magnit yutib yubormaydi)
  R.surish = { yOxir, yMin, oraliqOxir: yOxir - YARIM, sakrash, yaqindaN: yaqinda.length, yaqinda: [...new Set(yaqinda)].slice(0, 6) };
  R.surishOk = yOxir - YARIM === 3 && yMin >= 53 && yaqinda.length > 0;
  await page.screenshot({ path: `${OUT}/joylash-3-surish-devorga.png` });

  /* 4) Xona paneli: Devorli | Erkin */
  await click(/^Xona$/); await page.waitForTimeout(900);
  R.tanlov = await M(() => [...document.querySelectorAll('[data-maydon-rejim]')].map(b => [b.dataset.maydonRejim, b.getAttribute('aria-checked'), b.textContent.trim()]));
  await page.screenshot({ path: `${OUT}/joylash-4-xona-devorli.png` });
  await page.locator('[data-maydon-rejim="erkin"]').click(); await page.waitForTimeout(1200);
  R.erkin = await M(() => { const s = window.__app.sahna; return { maydon: window.__app.doc.maydon, devor: s.sp.groups.walls3d.visible, maydonFaol: s.korinish.maydonFaol(),
    payload: window.__app.projectPayload().doc.maydon, tanlov: [...document.querySelectorAll('[data-maydon-rejim]')].map(b => b.getAttribute('aria-checked')) }; });
  R.erkinOk = R.erkin.maydon === 'erkin' && R.erkin.devor === false && R.erkin.maydonFaol === true && R.erkin.payload === 'erkin' && R.erkin.tanlov.join() === 'false,true';
  await page.screenshot({ path: `${OUT}/joylash-5-erkin.png` });

  /* 4b) Erkin maydonda "Devor va pol" tugmasi o'chiq (ziddiyat yo'q) */
  await page.locator('[data-korinish="menyu"]').click(); await page.waitForTimeout(500);
  R.tugma = await M(() => { const b = document.querySelector('[data-xona]'); return b ? { dis: b.disabled, checked: b.getAttribute('aria-checked') } : 'menyu yopiq'; });
  R.tugmaOk = !!R.tugma && R.tugma.dis === true && R.tugma.checked === 'false';
  await page.screenshot({ path: `${OUT}/joylash-5b-erkin-menyu.png` });
  await page.locator('[data-korinish="menyu"]').click(); await page.waitForTimeout(300);

  /* 5) Erkin maydonda yangi modul: devor yo'q; mavjud modullar qutisi markaziga/yoniga, ustma-ust emas */
  await click(/^Mebel$/); await page.waitForTimeout(800);
  await page.locator('[data-panel] button:has-text("so\'m")').first().click(); await page.waitForTimeout(1000);
  const e3 = await pl();
  const n = e3[e3.length - 1], boshq = e3.slice(0, -1);
  const kes = (A, B) => Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x) > 0.5 && Math.min(A.y + A.d, B.y + B.d) - Math.max(A.y, B.y) > 0.5;
  R.erkinModul = { n, soni: e3.length };
  R.erkinModulOk = e3.length === 3 && !boshq.some(b => kes(n, b));
  await page.screenshot({ path: `${OUT}/joylash-6-erkin-modul.png` });

  /* 6) saqlanadi: sahifani qayta yuklash — loyiha (avtomatik saqlash) qayta ochilganda Erkin tiklanadi */
  await page.waitForTimeout(2500);
  const pay = await M(() => JSON.stringify(window.__app.projectPayload().doc.maydon));
  await page.reload(); await page.waitForTimeout(3000);
  R.qaytaOchildi = await M(() => ({ maydon: window.__app.doc && window.__app.doc.maydon, n: window.__app.doc && window.__app.doc.placements.length, ekran: window.__app.state.screen }));
  R.saqlashOk = pay === '"erkin"' && R.qaytaOchildi.maydon === 'erkin';

  /* 7) Devorliga qaytish: devorlar qaytadi */
  await click(/^Xona$/); await page.waitForTimeout(900);
  await page.locator('[data-maydon-rejim="devorli"]').click(); await page.waitForTimeout(1200);
  R.devorli = await M(() => ({ maydon: window.__app.doc.maydon, devor: window.__app.sahna.sp.groups.walls3d.visible, payload: window.__app.projectPayload().doc.maydon }));
  R.devorliOk = R.devorli.maydon === 'devorli' && R.devorli.devor === true;
  await page.screenshot({ path: `${OUT}/joylash-7-devorli-qaytdi.png` });

  R.errs = errs;
  R.ok = !!(R.birinchiOk && R.ikkinchiOk && R.surishOk && R.erkinOk && R.tugmaOk && R.erkinModulOk && R.saqlashOk && R.devorliOk && !errs.length);
}
