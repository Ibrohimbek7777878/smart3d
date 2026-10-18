/* TZ-33 B2: Fayllar → "Bazis (.b3d) · SINOV": yo'riqnoma (3 qadam + SINOV matni) → yuklab olish → fayl bizning o'quvchida (b3d.js + daraxt.js)
 * qayta o'qiladi: panel, modul va furnitura soni xabar (toast) bilan teng, hammasi shifrlanmagan; telefonda (390 px) sig'adi.
 * Haqiqiy Bazis'da ochish bu testda yo'q. Ishlatish: bash tests/ui/web.sh eksport_b3d */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/eksport_b3d-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const fs = await import('node:fs');
  const zlib = await import('node:zlib');
  const { daraxt } = await import(new URL('../../app/js/engine/bazis/daraxt.js', import.meta.url).href);
  const inflate = (b) => new Uint8Array(zlib.inflateSync(Buffer.from(b.buffer, b.byteOffset, b.byteLength)));
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'B3d Usta'); await fill('jasur@', 'b3d' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);
  for (let i = 0; i < 60 && !(await M(() => !!(window.__app && window.__app.res && window.__app.res.cutlists && window.__app.res.cutlists.length))); i++) await page.waitForTimeout(250);
  await click(/^Fayllar$/); await page.waitForTimeout(800);
  const btn = (label) => page.locator('[data-panel] button', { hasText: label }).first();
  const T = await M(() => [...document.querySelectorAll('[data-panel] button')].map(b => ({ t: b.textContent.trim(), dis: b.disabled })));
  R.tugma = T.some(b => /^Bazis \(\.b3d\) · SINOV$/.test(b.t) && !b.dis);

  await btn('Bazis (.b3d)').click(); await page.waitForTimeout(500);
  R.yoriq = await M(() => { const v = document.querySelector('[data-varaq="b3dYoriq"]'); return v ? { qadam: v.querySelectorAll('[data-b3d-yoriq] li').length, sinov: /SINOV/.test(v.innerText) && /tekshirilmagan|sinalmagan/.test(v.innerText), matn: v.innerText.slice(0, 200) } : null; });
  await page.screenshot({ path: `${OUT}/eksport_b3d-1440.png` });
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.locator('[data-b3d-yukla]').click()]);
  const bytes = new Uint8Array(fs.readFileSync(await d.path()));
  R.fayl = { nom: d.suggestedFilename(), kb: Math.round(bytes.length / 1024), bz85: String.fromCharCode(...bytes.subarray(0, 4)) };
  await page.waitForTimeout(500);
  R.toast = await M(() => document.body.innerText.split('\n').find(x => /Bazis \(\.b3d\) tayyor/.test(x)) || '');
  const m = /(\d+) modul, (\d+) detal, (\d+) furnitura/.exec(R.toast) || [];
  const q = daraxt(bytes, { inflate });
  const ob = (q && q.objects) || [];
  R.oqildi = { panel: ob.filter(o => o.modelCode === 4002).length, modul: ob.filter(o => o.modelCode === 1005).length, furn: ob.filter(o => o.modelCode === 3001).length, toast: m.slice(1).map(Number) };
  R.bom = await M(() => window.__app.res.cutlists.reduce((a, cl) => a + cl.parts.reduce((s, p) => s + (+p.qty || 1), 0), 0));

  /* telefon (390 px): yo'riqnoma sig'adi */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(800);
  if (!(await page.locator('[data-panel] button', { hasText: 'Bazis (.b3d)' }).count())) { await click(/^Fayllar$/); await page.waitForTimeout(800); }
  const bb = page.locator('[data-panel] button', { hasText: 'Bazis (.b3d)' }).first();
  if (await bb.count()) { await bb.scrollIntoViewIfNeeded(); await bb.click(); await page.waitForTimeout(500); }
  R.tel = await M(() => { const v = document.querySelector('[data-varaq="b3dYoriq"]'); if (!v) return null; const r = v.getBoundingClientRect(), b = v.querySelector('[data-b3d-yukla]').getBoundingClientRect();
    return { eni: Math.round(r.width), ichki: v.scrollWidth <= v.clientWidth + 1, tugma: b.right <= innerWidth + 1 && b.left >= -1, hScroll: document.documentElement.scrollWidth > innerWidth + 1 }; });
  await page.screenshot({ path: `${OUT}/eksport_b3d-390.png` });

  R.errs = errs;
  R.ok = R.tugma && R.yoriq && R.yoriq.qadam === 3 && R.yoriq.sinov && /\.b3d$/.test(R.fayl.nom) && R.fayl.bz85 === 'BZ85' &&
    R.oqildi.panel > 0 && R.oqildi.panel === R.oqildi.toast[1] && R.oqildi.modul === R.oqildi.toast[0] && R.oqildi.furn === R.oqildi.toast[2] && R.oqildi.panel === R.bom &&
    R.tel && R.tel.eni <= 390 && R.tel.ichki && R.tel.tugma && !R.tel.hScroll && errs.length === 0;
}
