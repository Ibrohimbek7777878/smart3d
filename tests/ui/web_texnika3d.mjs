/* egasi #232: o'rnatma texnika 3D — muzlatgich, duxovka, gaz plita, chimeney, idish yuvish, mikroto'lqinli qora quti emas:
 * har texnika bir nechta mesh (korpus, eshik, ruchka, shisha, tugma …), eshiklari ochiladi (yon sharnir — rotation.z, pastki sharnir —
 * rotation.x), "Modul materiali" orqali qismlar rangi o'zgaradi (3D material rangi + loyihada saqlanadi), telefon (390) da sig'adi.
 * Skrinshotlar: tests/ui/out/web/texnika3d-*.png. Ishlatish: bash tests/ui/web.sh texnika3d */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/texnika3d-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

const MATN = 'Kuxnya 4800 mm, gaz plita va vityajka 600 mm, xolodilnik, posudomoyka, duxovka kolonnada';

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const kut = async (fn, arg, ms = 10000) => { for (let i = 0; i < ms / 200; i++) { const v = await M(fn, arg); if (v) return v; await page.waitForTimeout(200); } return null; };

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Texnika Usta'); await fill('jasur@', 'tx' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);

  /* 1) oshxona: AI matni (kalitsiz tahlilchi) */
  const qator = page.locator('[data-matn]');
  await qator.fill(MATN); await qator.press('Enter');
  if (await kut(() => document.body.innerText.includes('Loyihani almashtirasizmi?'), null, 2500)) await click(/^Almashtirish$/);
  await kut(() => window.__app.res && window.__app.doc.placements.some(p => /^SP-TX-/.test(p.frg)));
  await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
  /* katalogdan yetishmagan texnika turlari qo'shiladi (SP-TX-001/003/004/005 …) — kartada "o'rnatma texnika" */
  const bor0 = await M(() => window.__app.doc.placements.filter(p => /^SP-TX-/.test(p.frg)).map(p => p.frg));
  R.katalogdanOldin = bor0.slice();
  for (const [kod, soz] of [['SP-TX-004', 'muzlatgich'], ['SP-TX-001', 'pech'], ['SP-TX-003', 'Mikro'], ['SP-TX-005', 'Plita']]) {
    if (bor0.includes(kod)) continue;
    const q = page.locator('[data-panel] input[type=search], [data-panel] input[placeholder*="Qidir"], [data-panel] input[type=text]').first();
    if (await q.count()) { await q.fill(soz); await page.waitForTimeout(500); }
    const kart = page.locator('[data-panel] button').filter({ hasText: /o'rnatma texnika/ }).filter({ hasText: new RegExp(soz, 'i') }).first();
    if (await kart.count()) { await kart.click(); await page.waitForTimeout(900); }
  }
  const TX = await M(() => window.__app.doc.placements.filter(p => /^SP-TX-/.test(p.frg)).map(p => ({ id: p.id, frg: p.frg, w: p.w, d: p.d, h: p.h, z: p.z })));
  R.texnika = TX.map(p => p.frg).sort();
  R.xilma = [...new Set(TX.map(p => p.frg))].length;

  /* 2) har texnika: bir nechta mesh va bir nechta rang (qora bitta quti emas), eshiklari bor */
  const tahlil = (id) => M((id) => {
    const m = window.__app.sahna.items.meshes.find(x => x.userData.id === id);
    if (!m) return null;
    const rang = new Set(); let n = 0;
    m.traverse(o => { if (o.isMesh && !(o.userData && o.userData.kind === 'hitBox')) { n++; rang.add(o.material.color.getHex()); } });
    return { n, ranglar: rang.size, tur: m.userData.texnika, harakat: (m.userData.movers || []).map(v => v.key + ':' + v.type) };
  }, id);
  R.mesh = {};
  for (const p of TX) R.mesh[p.frg] = await tahlil(p.id);
  R.hammasiBirnecha = TX.length > 0 && TX.every(p => R.mesh[p.frg] && R.mesh[p.frg].n > 4 && R.mesh[p.frg].ranglar > 1);
  const ESHIKLI = ['SP-TX-001', 'SP-TX-002', 'SP-TX-003', 'SP-TX-004', 'SP-TX-008'];
  R.eshikliOk = TX.filter(p => ESHIKLI.includes(p.frg)).every(p => R.mesh[p.frg].harakat.length >= 1);

  /* kamerani texnikaga yo'naltirish (faqat test; sahna kodi o'zgarmaydi) va skrinshot */
  const kamera = (id) => M((id) => {
    const a = window.__app.sahna, m = a.items.meshes.find(x => x.userData.id === id), u = m.userData;
    m.updateMatrixWorld(true);
    const V = m.position.constructor, loc = (x, y, z) => new V(x, y, z).applyMatrix4(m.matrixWorld);
    const t = loc(0, 0, 0), dd = Math.max(u.h, u.w * 1.6) * 2.0 + u.d, c = loc(dd * 0.28, u.d / 2 + dd, Math.max(u.h * 0.25, 120));
    a.sp.camera.position.copy(c); a.ctl.orbit.target.copy(t); a.ctl.orbit.update(); a.sp._invalidate();
  }, id);
  const shot = async (nom) => { await page.waitForTimeout(700); await page.screenshot({ path: `${OUT}/texnika3d-${nom}.png` }); };

  /* 3) eshik ochish: "Ochish · eshiklar" tugmasi — mover obj aylanadi (yon: rotation.z, pastki: rotation.x) */
  R.ochish = {};
  for (const p of TX) {
    const nom = p.frg.replace('SP-TX-', '');
    await M((id) => { const it = window.__app.sahna.items; it.setOpen(it.moverKeys(null), false); window.__app.sahna.select(id); }, p.id);
    await page.waitForTimeout(400);
    if (nom === '004' || nom === '001' || nom === '008') { await kamera(p.id); await M(() => window.__app.sahna.items.select(null)); await shot(nom + '-yopiq'); await M((id) => window.__app.sahna.select(id), p.id); await page.waitForTimeout(400); }
    const tugma = page.locator('button:has-text("· eshiklar")').first();
    const bor = await tugma.count();
    if (bor) await tugma.click();
    await page.waitForTimeout(1400);
    R.ochish[nom] = await M((id) => {
      const m = window.__app.sahna.items.meshes.find(x => x.userData.id === id);
      return (m.userData.movers || []).map(v => ({ k: v.key, t: v.type, rx: +v.obj.rotation.x.toFixed(2), rz: +v.obj.rotation.z.toFixed(2) }));
    }, p.id);
    R.ochish[nom + '_tugma'] = bor;
    await kamera(p.id); await M(() => window.__app.sahna.items.select(null));
    await shot(nom === '005' || nom === '006' ? nom : nom + '-ochiq');
  }
  const burildi = (arr) => arr && arr.length && arr.every(v => (v.t === 'door' ? Math.abs(v.rz) > 0.3 : Math.abs(v.rx) > 0.8));
  R.eshikOchildi = TX.filter(p => ESHIKLI.includes(p.frg)).every(p => burildi(R.ochish[p.frg.replace('SP-TX-', '')]));

  /* 3b) modul surilganda (kartadagi "O'ngga 50 mm") texnikaning HAMMA meshi birga siljiydi — hech biri eski joyda qolmaydi */
  const dm = TX.find(p => p.frg === 'SP-TX-001') || TX[0];
  await M((id) => { const it = window.__app.sahna.items; it.setOpen(it.moverKeys(null), false); window.__app.sahna.select(id); }, dm.id);
  await page.waitForTimeout(500);
  const markazlar = (id) => M((id) => {
    const m = window.__app.sahna.items.meshes.find(x => x.userData.id === id), out = [];
    m.updateMatrixWorld(true);
    m.traverse(o => { if (o.isMesh && !(o.userData && o.userData.kind === 'hitBox')) { const b = new o.position.constructor(); const bb = o.geometry.boundingBox || (o.geometry.computeBoundingBox(), o.geometry.boundingBox); bb.getCenter(b); out.push(b.applyMatrix4(o.matrixWorld).toArray()); } });
    return out;
  }, id);
  const m0 = await markazlar(dm.id);
  const ong = page.locator('button[aria-label="O\'ngga 50 mm"]');
  if (await ong.count()) { for (let i = 0; i < 4; i++) { await ong.click(); await page.waitForTimeout(150); } }
  await page.waitForTimeout(800);
  const m1 = await markazlar(dm.id);
  const d = m0.map((a, i) => (m1[i] || [0, 0, 0]).map((v, k) => Math.round(v - a[k])));
  R.surish = { n: m0.length, m1: m1.length, siljish: d[0], hammasiBir: m0.length > 5 && m0.length === m1.length && d.every(x => x.every((v, k) => Math.abs(v - d[0][k]) <= 1)) && d[0].some(v => Math.abs(v) >= 150) };

  /* 4) rang: muzlatgich — korpus qora, eshik bronza; 3D material rangi o'zgaradi va loyihada saqlanadi */
  const mz = TX.find(p => p.frg === 'SP-TX-004') || TX[0];
  await M((id) => window.__app.sahna.select(id), mz.id);
  await page.waitForTimeout(500);
  const rangi = (id, slot) => M(([id, slot]) => {
    const m = window.__app.sahna.items.meshes.find(x => x.userData.id === id); let v = null;
    m.traverse(o => { if (o.isMesh && o.userData && o.userData.texnikaSlot === slot && v == null) v = o.material.color.getHex(); });
    return v;
  }, [id, slot]);
  R.rang0 = [await rangi(mz.id, 'korpus'), await rangi(mz.id, 'eshik')];
  R.palitra = await page.locator('[data-texnika-rang]').count();
  await page.locator('[data-texnika-rang="korpus:#1b1d20"]').click(); await page.waitForTimeout(900);
  await page.locator('[data-texnika-rang="eshik:#8e6b45"]').click(); await page.waitForTimeout(900);
  R.rang1 = [await rangi(mz.id, 'korpus'), await rangi(mz.id, 'eshik')];
  R.saqlandi = await M((id) => { const p = window.__app.doc.placements.find(x => x.id === id); return p && p.texnikaRang; }, mz.id);
  R.payload = await M(() => JSON.stringify(window.__app.projectPayload()).includes('texnikaRang'));
  /* o'zi tanlagan rang (input[type=color]) */
  await page.locator('[data-texnika-oz="ruchka"]').evaluate((el) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, '#ff3366'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(900);
  R.ozRang = await rangi(mz.id, 'ruchka');
  await M((id) => window.__app.sahna.select(id), mz.id);
  await kamera(mz.id); await M(() => window.__app.sahna.items.select(null)); await shot('004-rangli');
  await M((id) => window.__app.sahna.select(id), mz.id); await page.waitForTimeout(400);
  /* hisob o'zgarmaydi: texnika kesim ro'yxatida yo'q, narx rang bilan o'zgarmaydi */
  R.narxRang = await M(() => window.__app.res.priceRes.total);

  /* 5) telefon 390 */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1200);
  R.tel = await M(() => {
    const k = document.querySelector('[data-texnika-ranglar]'); const r = k && k.getBoundingClientRect();
    return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, karta: r ? [Math.round(r.left), Math.round(r.right)] : null };
  });
  await shot('390-karta');
  await page.setViewportSize({ width: 1440, height: 900 });

  /* 6) qayta yuklash: rang tiklanadi (loyiha saqlangan) */
  await page.waitForTimeout(2500);
  await page.reload(); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 }); await page.waitForTimeout(2500);
  R.qayta = await M(() => { const p = window.__app && window.__app.doc && window.__app.doc.placements.find(x => /^SP-TX-004$/.test(x.frg)); return p ? (p.texnikaRang || null) : 'doc-yoq'; });

  R.xatolar = errs;
  R.ok = R.xilma >= 4 && R.hammasiBirnecha && R.eshikliOk && R.eshikOchildi && R.surish.hammasiBir
    && R.rang0[0] !== 0x1b1d20 && R.rang1[0] === 0x1b1d20 && R.rang1[1] === 0x8e6b45 && R.ozRang === 0xff3366
    && R.saqlandi && R.saqlandi.korpus === 0x1b1d20 && R.payload && R.qayta && R.qayta.korpus === 0x1b1d20 && R.qayta.eshik === 0x8e6b45
    && R.tel.sw <= R.tel.iw && R.tel.karta && R.tel.karta[0] >= 0 && R.tel.karta[1] <= R.tel.iw
    && !errs.length;
}
