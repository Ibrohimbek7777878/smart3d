/* TZ-09 6-bosqich: "Fayllar" — har tugma haqiqiy fayl beradi (nom, hajm), hisobot oynasi ochiladi, logo bor.
 * Biesse/Homag — "tez orada" (bosilmaydi); BPJ — TZ-33 B1 dan hamma uchun ("Bazis (.bpj) · SINOV", web_eksport_skp.mjs). Ishlatish: bash tests/ui/web.sh fayllar */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/fayllar-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const has = async (t) => (await M(() => document.body.innerText)).includes(t);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const waitText = async (t, ms = 10000) => { for (let i = 0; i < ms / 200; i++) { if (await has(t)) return true; await page.waitForTimeout(200); } return false; };

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Fayl Usta'); await fill('jasur@', 'fayl' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });   // TZ-25: darhol ish joyi
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);   // TZ-25: tez boshlash — oshxona
  for (let i = 0; i < 60 && !(await M(() => /\d/.test((document.querySelector('header button[class], header button') || {}).textContent || '') && window.__app && window.__app.res)); i++) await page.waitForTimeout(250);
  await click(/^Fayllar$/); await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/fayllar-1440.png` });

  const btn = (label) => page.locator('[data-panel] button', { hasText: label }).first();
  const yukla = async (label) => {
    try {
      const [d] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), btn(label).click()]);
      const p = await d.path();
      const fs = await import('node:fs');
      if (/\.png$/.test(d.suggestedFilename())) await d.saveAs(`${OUT}/fayllar-rasm.png`);   // ko'zdan kechirish uchun
      return { nom: d.suggestedFilename(), hajm: p ? fs.statSync(p).size : 0 };
    } catch (e) { return { xato: String(e.message).split('\n')[0] }; }
  };
  /* OBJ: tanlanmagan — butun loyiha ("o floor" bor); modul tanlangan — faqat shu modul (xonasiz), fayl nomida modul nomi */
  const objOqi = async (label) => {
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), btn(label).click()]);
    const fs = await import('node:fs'); const m = fs.readFileSync(await d.path(), 'utf8');
    return { nom: d.suggestedFilename(), xona: /^o floor/m.test(m), modullar: (m.match(/^o (?!floor|wall_|rozetka|quvur)/gm) || []).length, mtl: (m.match(/^mtllib (.+)$/m) || [])[1] };
  };
  R.objButun = await objOqi('OBJ — butun loyiha'); await page.waitForTimeout(800);
  await page.locator('[data-ishjoyi] , body').first().evaluate(() => 0).catch(() => {});
  await click(/^Tanlash$/); await page.waitForTimeout(300);
  const xy = await M(() => { const s = window.__app.sahna, T = s.sp.THREE, pl = s.sp.groups.items.children.find(c => c.visible && !(c.userData && c.userData.kind === 'hitBox'));
    const b = new T.Box3().setFromObject(pl), c = b.getCenter(new T.Vector3()).project(s.sp.cam3d), r = s.sp.renderer.domElement.getBoundingClientRect();
    return { x: r.left + (c.x + 1) / 2 * r.width, y: r.top + (1 - c.y) / 2 * r.height }; });
  await page.mouse.click(xy.x, xy.y); await page.waitForTimeout(500);
  R.tanlandi = await M(() => window.__app.state.sel != null);
  await click(/^Fayllar$/); await page.waitForTimeout(800);
  R.objTugma = await M(() => [...document.querySelectorAll('[data-panel] button')].map(b => b.textContent.trim()).filter(x => /^OBJ/.test(x)));
  R.objModul = R.tanlandi ? await objOqi('OBJ — tanlangan modul') : null;
  R.objOk = R.objButun.xona && R.objButun.modullar >= 1 && R.tanlandi && !!R.objModul && !R.objModul.xona && R.objModul.modullar === 1 &&
    /\.obj$/.test(R.objModul.nom) && R.objModul.nom !== 'smart3d-model.obj' && R.objModul.mtl === R.objModul.nom.replace(/\.obj$/, '.mtl') && R.objTugma.join() === 'OBJ — tanlangan modul';
  R.fayllar = {};
  for (const l of ['Excel smeta', 'Detallar (CSV)', 'Loyiha fayli', 'Smeta (CSV)', 'Teshiklar (JSON)', 'GLB (3D/AR)', 'GibLab', 'DXF', 'G-code', 'PTP', 'NC', 'XNC', 'Altendorf', 'Rasm']) {
    R.fayllar[l] = await yukla(l);
    await page.waitForTimeout(300);
  }
  /* hisobot (yangi oyna) — logo va jami */
  try {
    const [pop] = await Promise.all([page.context().waitForEvent('page', { timeout: 15000 }), btn('Hisobot (PDF)').click()]);
    await pop.waitForLoadState('domcontentloaded');
    const t = await pop.evaluate(() => document.body.innerText, null, false);
    R.hisobot = { logo: /Smart3D/.test(t) && /by Bittada/.test(t), jami: (t.match(/JAMI: ([\d ]+) so'm/) || [])[1] || null };
    await pop.close();
  } catch (e) { R.hisobot = { xato: String(e.message).split('\n')[0] }; }
  R.tezOrada = await M(() => [...document.querySelectorAll('[data-panel] button')].filter(b => /tez orada/.test(b.textContent)).map(b => b.textContent.trim() + (b.disabled ? ' [o\'chiq]' : ' [ochiq!]')));
  R.errs = errs;
  const yaxshi = R.objOk && Object.values(R.fayllar).every(f => f.nom && f.hajm > 0);
  R.ok = yaxshi && R.hisobot && R.hisobot.logo && !!R.hisobot.jami && R.tezOrada.length === 2 && R.tezOrada.every(x => /o'chiq/.test(x)) && errs.length === 0;
}
