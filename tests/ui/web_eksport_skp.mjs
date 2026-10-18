/* TZ-33: Fayllar → "SketchUp (.skp)", "SketchUp Pro (.dae)" (OBJ yonida) va "Bazis (.bpj) · SINOV" (hamma uchun, 3 qadamli yo'riqnoma).
 * Tekshiriladi: tugmalar ko'rinadi; .skp va .dae yuklab olinadi va qayta o'qiladi (openskp 1.3.0 — komponentlar = modullar, xona yo'q,
 * qatlamlar; .dae — COLLADA 1.4.1, detal va furnitura soni .skp bilan teng); tanlangan modul — faqat u; Bazis yo'riqnomasi 3 qadam va
 * .bpj yuklanadi; telefon (390 px) — menyu va yo'riqnoma sig'adi. Ishlatish: bash tests/ui/web.sh eksport_skp */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/eksport_skp-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const fs = await import('node:fs');
  const { parseSkp } = await import(new URL('../../web/node_modules/openskp/dist/index.mjs', import.meta.url).href);
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Skp Usta'); await fill('jasur@', 'skp' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }   // #209: telefon maydoni ro'yxatda yo'q
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);   // tez boshlash — oshxona
  for (let i = 0; i < 60 && !(await M(() => !!(window.__app && window.__app.res && window.__app.res.cutlists && window.__app.res.cutlists.length))); i++) await page.waitForTimeout(250);
  await click(/^Fayllar$/); await page.waitForTimeout(800);
  const btn = (label) => page.locator('[data-panel] button', { hasText: label }).first();
  const tugmalar = () => M(() => [...document.querySelectorAll('[data-panel] button')].map(b => ({ t: b.textContent.trim(), dis: b.disabled })));
  const T = await tugmalar();
  R.tugmalar = T.filter(b => /SketchUp|Bazis|^OBJ/.test(b.t)).map(b => b.t + (b.dis ? ' [o\'chiq]' : ''));
  R.joylar = await M(() => window.__app.H.viewPlacements(window.__app.doc).length);

  const yukla = async (label) => {
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), btn(label).click()]);
    const b = fs.readFileSync(await d.path());
    return { nom: d.suggestedFilename(), b };
  };
  const skpOqi = (b) => {
    const S = parseSkp(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    let detal = 0, furn = 0;
    for (const i of S.root.instances) { const md = S.definitions.get(i.refIdx); for (const x of md.instances) (x.layer === 'Furnitura' ? furn++ : detal++); }
    return { modul: S.root.instances.length, ildizYuza: S.root.faces.length, detal, furn, qatlam: S.layers.map(l => l.name).filter(n => n !== 'Layer0'), material: S.materials.length };
  };
  /* .dae: modul ta'riflari (library_nodes — har biri o'z qatorida) × sahnadagi joylashuvlari — .skp bilan bir xil sanaladi */
  const daeOqi = (s) => {
    const def = {};
    for (const q of s.split('\n')) { const m = /^(?:<library_nodes>)?<node id="(mod\d+)"/.exec(q); if (m) def[m[1]] = { d: (q.match(/<node id="d\d+"/g) || []).length, n: (q.match(/<node id="n\d+"/g) || []).length }; }
    const joy = [...s.matchAll(/<node id="j\d+"[^>]*>(?:<matrix>[^<]*<\/matrix>)<instance_node url="#(mod\d+)"\/>/g)].map(m => def[m[1]] || { d: NaN, n: NaN });
    return {
      versiya: (/<COLLADA[^>]*version="([^"]+)"/.exec(s) || [])[1], meter: (/<unit[^>]*meter="([^"]+)"/.exec(s) || [])[1], up: (/<up_axis>([^<]+)</.exec(s) || [])[1],
      detal: joy.reduce((a, x) => a + x.d, 0), furn: joy.reduce((a, x) => a + x.n, 0), modul: joy.length, tarif: Object.keys(def).length,
      yopiq: (s.match(/<node\b/g) || []).length === (s.match(/<\/node>/g) || []).length
    };
  };

  /* butun loyiha */
  const s1 = await yukla('SketchUp (.skp) — butun loyiha'); await page.waitForTimeout(500);
  R.skp = Object.assign({ nom: s1.nom, kb: Math.round(s1.b.length / 1024) }, skpOqi(s1.b));
  R.toast = await M(() => document.body.innerText.split('\n').find(x => /SketchUp \(\.skp\) tayyor/.test(x)) || '');
  const d1 = await yukla('SketchUp Pro (.dae) — butun loyiha'); await page.waitForTimeout(500);
  R.dae = Object.assign({ nom: d1.nom, kb: Math.round(d1.b.length / 1024) }, daeOqi(d1.b.toString('utf8')));
  fs.writeFileSync(`${OUT}/eksport_skp-loyiha.skp`, s1.b); fs.writeFileSync(`${OUT}/eksport_skp-loyiha.dae`, d1.b);
  await page.screenshot({ path: `${OUT}/eksport_skp-1440.png` });

  /* tanlangan modul */
  await click(/^Tanlash$/); await page.waitForTimeout(300);
  const xy = await M(() => { const s = window.__app.sahna, Th = s.sp.THREE, pl = s.sp.groups.items.children.find(c => c.visible && !(c.userData && c.userData.kind === 'hitBox'));
    const b = new Th.Box3().setFromObject(pl), c = b.getCenter(new Th.Vector3()).project(s.sp.cam3d), r = s.sp.renderer.domElement.getBoundingClientRect();
    return { x: r.left + (c.x + 1) / 2 * r.width, y: r.top + (1 - c.y) / 2 * r.height }; });
  await page.mouse.click(xy.x, xy.y); await page.waitForTimeout(500);
  R.tanlandi = await M(() => window.__app.state.sel != null);
  await click(/^Fayllar$/); await page.waitForTimeout(800);
  if (R.tanlandi) {
    const s2 = await yukla('SketchUp (.skp) — tanlangan modul'); await page.waitForTimeout(400);
    R.skpModul = Object.assign({ nom: s2.nom }, skpOqi(s2.b));
    const d2 = await yukla('SketchUp Pro (.dae) — tanlangan modul'); await page.waitForTimeout(400);
    R.daeModul = Object.assign({ nom: d2.nom }, daeOqi(d2.b.toString('utf8')));
  }

  /* Bazis (.bpj): yo'riqnoma (3 qadam) → yuklab olish */
  await btn('Bazis (.bpj)').click(); await page.waitForTimeout(500);
  R.bpjYoriq = await M(() => { const v = document.querySelector('[data-varaq="bpjYoriq"]'); return v ? { qadam: v.querySelectorAll('[data-bpj-yoriq] li').length, matn: v.innerText.slice(0, 400) } : null; });
  await page.screenshot({ path: `${OUT}/eksport_skp-bpj-1440.png` });
  try {
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.locator('[data-bpj-yukla]').click()]);
    const j = JSON.parse(fs.readFileSync(await d.path(), 'utf8'));
    R.bpj = { nom: d.suggestedFilename(), panel: j.meta && j.meta.totalPanels };
  } catch (e) { R.bpj = { xato: String(e.message).split('\n')[0] }; }
  await page.waitForTimeout(500);

  /* telefon (390 px): menyu va yo'riqnoma sig'adi */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(800);
  if (!(await page.locator('[data-panel] button', { hasText: 'SketchUp (.skp)' }).count())) { await click(/^Fayllar$/); await page.waitForTimeout(800); }
  const sigadi = () => M(() => {
    const W = innerWidth, bs = [...document.querySelectorAll('[data-panel] button')].filter(b => /SketchUp|Bazis/.test(b.textContent));
    const p = document.querySelector('[data-panel]');
    return { soni: bs.length, chiqadi: bs.filter(b => { const r = b.getBoundingClientRect(); return r.left < -1 || r.right > W + 1; }).map(b => b.textContent.trim()),
      hScroll: document.documentElement.scrollWidth > W + 1, panelScroll: p ? p.scrollWidth > p.clientWidth + 1 : null };
  });
  const sk = page.locator('[data-panel] button', { hasText: 'SketchUp (.skp)' }).first();
  if (await sk.count()) await sk.scrollIntoViewIfNeeded();
  R.tel = await sigadi();
  await page.screenshot({ path: `${OUT}/eksport_skp-390.png` });
  const bp = page.locator('[data-panel] button', { hasText: 'Bazis (.bpj)' }).first();
  if (await bp.count()) { await bp.scrollIntoViewIfNeeded(); await bp.click(); await page.waitForTimeout(500); }
  R.telYoriq = await M(() => { const v = document.querySelector('[data-varaq="bpjYoriq"]'); if (!v) return null; const r = v.getBoundingClientRect(), b = v.querySelector('[data-bpj-yukla]').getBoundingClientRect();
    return { eni: Math.round(r.width), ichki: v.scrollWidth <= v.clientWidth + 1, tugma: b.right <= innerWidth + 1 && b.left >= -1, hScroll: document.documentElement.scrollWidth > innerWidth + 1 }; });
  await page.screenshot({ path: `${OUT}/eksport_skp-390-bpj.png` });

  R.errs = errs;
  const t = (re) => T.some(b => re.test(b.t) && !b.dis);
  R.ok = t(/^SketchUp \(\.skp\) — butun loyiha$/) && t(/^SketchUp Pro \(\.dae\) — butun loyiha$/) && t(/^Bazis \(\.bpj\) · SINOV$/) &&
    /\.skp$/.test(R.skp.nom) && R.skp.modul === R.joylar && R.skp.ildizYuza === 0 && R.skp.detal > R.skp.modul && R.skp.furn > 0 &&
    ['Korpus', 'Fasad', 'Orqa devor', 'Furnitura'].every(n => R.skp.qatlam.includes(n)) && /tayyor/.test(R.toast) &&
    /\.dae$/.test(R.dae.nom) && R.dae.versiya === '1.4.1' && R.dae.meter === '0.0254' && R.dae.up === 'Z_UP' && R.dae.yopiq &&
    R.dae.modul === R.skp.modul && R.dae.detal === R.skp.detal && R.dae.furn === R.skp.furn &&
    R.tanlandi && R.skpModul && R.skpModul.modul === 1 && R.skpModul.nom !== R.skp.nom && R.daeModul && R.daeModul.modul === 1 && R.daeModul.detal === R.skpModul.detal &&
    R.bpjYoriq && R.bpjYoriq.qadam === 3 && /BazisUniversalImport/.test(R.bpjYoriq.matn) && /\.b3d/.test(R.bpjYoriq.matn) && R.bpj && /\.bpj$/.test(R.bpj.nom || '') && R.bpj.panel > 0 &&
    R.tel.soni >= 3 && !R.tel.chiqadi.length && !R.tel.hScroll && R.tel.panelScroll === false &&
    R.telYoriq && R.telYoriq.eni <= 390 && R.telYoriq.ichki && R.telYoriq.tugma && !R.telYoriq.hScroll && errs.length === 0;
}
