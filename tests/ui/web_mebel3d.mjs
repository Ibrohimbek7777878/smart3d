/* egasi #239–#241: yotoqxona garniturи va yumshoq mebel 3D shakli. Tayyor → Yotoqxona qurilsin (karavot MC-KR-04 boshi devorga, garderob,
 * komod, deraza, eshik), karavot/komod/divan bir nechta mesh va rangda (yopiq quti emas), komod tortmalari ochiladi, mehmonxona divani,
 * telefon (390) da sig'adi. Skrinshotlar: tests/ui/out/web/mebel3d-*.png (Read bilan ko'rib baholanadi). Ishlatish: bash tests/ui/web.sh mebel3d */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/mebel3d-xato.png` }).catch(() => {});
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
  const V = (sel, o) => page.locator('[data-varaq="ai"] ' + sel, o);
  const shot = async (nom) => { await page.waitForTimeout(800); await page.screenshot({ path: `${OUT}/mebel3d-${nom}.png` }); };

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Mebel Usta'); await fill('jasur@', 'mebel' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);
  if (await has("O'tkazib yuborish")) { await click(/^O'tkazib yuborish$/); await page.waitForTimeout(300); }

  /* kamera (faqat test): jahon koordinatasida markazga qarab */
  const kamera = (a) => M(([id, dx, dy, dz, kenglik]) => {
    const S = window.__app.sahna, items = S.items.meshes;
    const V3 = items[0].position.constructor, Box = (function () { return null; })();
    let min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
    for (const m of items) { if (id && m.userData.id !== id) continue; m.updateMatrixWorld(true);
      m.traverse(o => { if (o.isMesh && o.geometry && !(o.userData && o.userData.kind === 'hitBox')) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox;
        for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) { const p = new V3(x, y, z).applyMatrix4(o.matrixWorld); min = [Math.min(min[0], p.x), Math.min(min[1], p.y), Math.min(min[2], p.z)]; max = [Math.max(max[0], p.x), Math.max(max[1], p.y), Math.max(max[2], p.z)]; } } }); }
    const c = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2], r = 1;   // dx/dy/dz — mm (jahon o'qlarida)
    S.sp.camera.position.set(c[0] + dx, c[1] + dy, c[2] + dz);
    S.ctl.orbit.target.set(c[0], c[1], c[2]); S.ctl.orbit.update(); S.sp._invalidate();
    return { c, r };
  }, a);
  const tahlil = (frg) => M((frg) => {
    const d = window.__app.doc, p = d.placements.find(x => x.frg === frg); if (!p) return null;
    const m = window.__app.sahna.items.meshes.find(x => x.userData.id === p.id); if (!m) return null;
    const rang = new Set(); let n = 0;
    m.traverse(o => { if (o.isMesh && !(o.userData && o.userData.kind === 'hitBox')) { n++; rang.add(o.material.color.getHex()); } });
    return { id: p.id, n, ranglar: rang.size, tur: m.userData.mebel3d || null, harakat: (m.userData.movers || []).map(v => v.key + ':' + v.type), rot: p.rot };
  }, frg);

  /* 1) AI oynasi → Tayyor so'rovlar → Yotoqxona */
  await page.locator('[data-matn-menyu]').click({ timeout: 5000 }); await page.waitForTimeout(400);
  await V('[data-ai-tab] button', { hasText: "Tayyor so'rovlar" }).click(); await page.waitForTimeout(300);
  await V('[data-tayyor-kat] button', { hasText: 'Yotoqxona' }).click(); await page.waitForTimeout(200);
  R.izoh = await M(() => (document.querySelector('[data-varaq="ai"] [data-prompt="yotoqxona"]') || { innerText: '' }).innerText.replace(/\s+/g, ' '));
  await V('[data-prompt="yotoqxona"]').click(); await page.waitForTimeout(200);
  await V('[data-tayyor-qur]').click(); await page.waitForTimeout(500);
  if (await has('Loyihani almashtirasizmi')) { await click(/^Almashtirish$/); }
  await page.waitForTimeout(2000);
  R.yotoqxona = await M(() => { const d = window.__app.doc; return { n: d.placements.length, frg: d.placements.map(p => p.frg).sort(), w: Math.max(...d.room.outline.map(p => p[0])), d: Math.max(...d.room.outline.map(p => p[1])) }; });
  /* "bajarilmadi" qatori (tumba) AI oynasi/kartasida ko'rinadimi — oynadagi matndan */
  R.tumbaQator = await has('bajarilmadi');
  await page.keyboard.press('Escape'); await page.waitForTimeout(1200);

  /* 2) 3D shakllar */
  R.karavot = await tahlil('MC-KR-04'); R.komod = await tahlil('SP-BD-005'); R.garderob = await tahlil('SP-W-006');
  R.formalar = R.karavot && R.karavot.n > 15 && R.karavot.ranglar > 4 && R.karavot.tur === 'krovat' && R.komod.n > 10 && R.komod.tur === 'komod' && R.komod.harakat.length === 6;

  /* xona umumiy ko'rinishi va karavot, komod yaqin */
  await M(() => window.__app.sahna.items.select(null));
  await kamera([null, 300, 4200, 4200]); await shot('1-xona');
  await kamera([R.karavot.id, 800, 4300, 2300]); await shot('2-karavot');
  await kamera([R.karavot.id, 2900, 2200, 1500]); await shot('2b-karavot-yon');
  await M((id) => { const it = window.__app.sahna.items; it.setOpen(it.moverKeys(id), true); }, R.komod.id);
  await page.waitForTimeout(1500);
  await kamera([R.komod.id, -1600, -1500, 1000]); await shot('3-komod-ochiq');
  await kamera([R.garderob.id, 3400, -1800, 1700]); await shot('3b-shkaf');
  R.tortmaOchildi = await M((id) => { const m = window.__app.sahna.items.meshes.find(x => x.userData.id === id); return (m.userData.movers || []).every(v => v.obj.position.y > 100); }, R.komod.id);
  await M((id) => { const it = window.__app.sahna.items; it.setOpen(it.moverKeys(id), false); }, R.komod.id);
  await M((id) => { const it = window.__app.sahna.items; it.setOpen(it.moverKeys(id), false); }, R.komod.id);

  /* 3) mehmonxona: divan */
  await page.locator('[data-matn-menyu]').click(); await page.waitForTimeout(300);
  await V('[data-tayyor-kat] button', { hasText: 'Mehmonxona' }).click(); await page.waitForTimeout(200);
  await V('[data-prompt="mehmonxona-tv"]').click(); await page.waitForTimeout(200);
  await V('[data-tayyor-qur]').click(); await page.waitForTimeout(500);
  if (await has('Loyihani almashtirasizmi')) { await click(/^Almashtirish$/); }
  await page.waitForTimeout(2000); await page.keyboard.press('Escape'); await page.waitForTimeout(1200);
  R.divan = await tahlil('SP-S-006');
  R.divanOk = !!R.divan && R.divan.n > 10 && R.divan.ranglar > 2 && R.divan.tur === 'divan';
  await M(() => window.__app.sahna.items.select(null));
  await kamera([R.divan.id, 900, -3900, 1900]); await shot('4-divan');
  await kamera([null, 300, 4200, 4200]); await shot('5-mehmonxona');

  /* 4) telefon 390 */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(1200);
  R.tel = await M(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  await kamera([null, 300, 4200, 4200]); await shot('6-telefon-390');
  await page.setViewportSize({ width: 1440, height: 900 });

  R.errs = errs;
  R.ok = R.yotoqxona.n === 5 && ['MC-KR-04', 'SP-BD-005', 'SP-D-001', 'SP-W-006', 'SP-WI-001'].every(c => R.yotoqxona.frg.includes(c)) &&
    R.formalar && R.tortmaOchildi && R.divanOk && R.tel.sw <= R.tel.iw && errs.length === 0;
}
