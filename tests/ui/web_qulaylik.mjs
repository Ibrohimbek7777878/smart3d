/* TZ-27 (egasi #137): muharrir qulayliklari. Tekshiriladi: eshiklar 45° dan ko'p ochilmaydi; yurish rejimida modul bosilsa —
 * tanlanadi; "orqaga" (brauzer tugmasi) — avval varaq yopiladi, keyin oldingi ekran, ilovadan chiqmaydi; "Davom ettirish (N)" —
 * chala qolgan loyihani ochadi; "Loyihalarim" tepasida "Davom ettirish" qatori. Ishlatish: bash tests/ui/web.sh qulaylik */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/qulaylik-xato.png` }).catch(() => {});
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
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const ekran = () => M(() => window.__app.state.screen);

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Qulaylik Usta'); await fill('jasur@', 'qulay' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);
  R.davomBosh = await M(() => !document.querySelector('[data-tez="davom"]'));       // hali chala ish yo'q
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(1200);
  const nMebel = await M(() => window.__app.doc.placements.length);

  /* 1) eshiklar: hammasi ochilganda — 45° dan oshmaydi */
  await click(/^Eshiklarni ochish$/); await page.waitForTimeout(1800);
  R.eshikMax = await M(() => { let m = 0; window.__app.sahna.sp.groups.items.traverse(o => { for (const mv of (o.userData && o.userData.movers) || []) if (mv.type === 'door') m = Math.max(m, Math.abs(mv.obj.rotation.z)); }); return Math.round(m * 180 / Math.PI * 10) / 10; });
  await page.screenshot({ path: `${OUT}/qulaylik-eshik.png` });
  await click(/^Hammasini yopish$/); await page.waitForTimeout(800);

  /* 2) yurish rejimi: modulni bosish — tanlanadi */
  await page.locator('[data-korinish="menyu"]').click(); await page.waitForTimeout(300);
  await page.locator('[data-kamera="yurish"]').click(); await page.waitForTimeout(700);
  const nuqta = await M(() => {
    const s = window.__app.sahna, r = s.sp.renderer.domElement.getBoundingClientRect();
    const el = s.sp.renderer.domElement;
    for (let y = r.top + 40; y < r.bottom - 40; y += 30) for (let x = r.left + 40; x < r.right - 40; x += 30) if (document.elementFromPoint(x, y) === el && s.items.hitTest({ clientX: x, clientY: y })) return [x, y];
    return null;
  });
  if (nuqta) { await page.mouse.move(nuqta[0], nuqta[1]); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(500); }
  R.yurishTanlov = { nuqta: !!nuqta, sel: await M(() => window.__app.state.sel) };
  /* yurishdan chiqish — "orqaga" bilan (rejim o'chadi) */
  await page.goBack(); await page.waitForTimeout(500);
  R.orqagaYurish = await M(() => window.__app.sahna.korinish.holat.kamera);

  /* 3) "orqaga": varaq yopiladi → tanlov → panel → loyihalar sahifasi; ilovadan chiqmaydi */
  await page.locator('[data-matn-menyu]').click(); await page.waitForTimeout(400);
  const varaqBor = await M(() => !!document.querySelector('[data-varaq="ai"]'));
  await page.goBack(); await page.waitForTimeout(400);
  R.orqagaVaraq = { bor: varaqBor, yopildi: await M(() => !document.querySelector('[data-varaq="ai"]')), ekran: await ekran() };
  for (let i = 0; i < 4 && (await ekran()) === 'app'; i++) { await page.goBack(); await page.waitForTimeout(500); }
  R.orqagaEkran = { ekran: await ekran(), url: page.url().includes('app.html') };
  await page.goBack(); await page.waitForTimeout(800);
  R.orqagaQayta = { ekran: await ekran(), mebel: await M(() => window.__app.doc.placements.length) };

  /* 4) "Davom ettirish": loyiha saqlanadi → yangi loyiha → chip (1) → ochiladi */
  await page.waitForTimeout(2600);                                         // avtomatik saqlash
  await page.locator('[data-sarlavha="loyihalar"]').click(); await page.waitForTimeout(1200);
  R.loyihalarQator = await M(() => document.querySelectorAll('[data-davom-qator] [data-davom]').length);
  await click(/^\+ Yangi loyiha$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 }); await page.waitForTimeout(1500);
  R.chip = await M(() => (document.querySelector('[data-tez="davom"]') || {}).textContent || '');
  await page.locator('[data-tez="davom"]').click(); await page.waitForTimeout(500);
  R.varaqQator = await M(() => document.querySelectorAll('[data-davom-royxat] [data-davom]').length);
  await page.screenshot({ path: `${OUT}/qulaylik-davom.png` });
  await page.locator('[data-davom-royxat] [data-davom]').first().click(); await page.waitForTimeout(2000);
  R.davomOchildi = await M(() => window.__app.doc.placements.length);

  R.xatolar = errs;
  R.ok = R.davomBosh && R.eshikMax > 10 && R.eshikMax <= 45.1
    && R.yurishTanlov.nuqta && !!R.yurishTanlov.sel && R.orqagaYurish === 'orbit'
    && R.orqagaVaraq.bor && R.orqagaVaraq.yopildi && R.orqagaVaraq.ekran === 'app'
    && R.orqagaEkran.ekran === 'projects' && R.orqagaEkran.url && R.orqagaQayta.ekran === 'app' && R.orqagaQayta.mebel === nMebel
    && R.loyihalarQator >= 1 && /\(1\)/.test(R.chip) && R.varaqQator === 1 && R.davomOchildi === nMebel
    && !errs.length;
}
