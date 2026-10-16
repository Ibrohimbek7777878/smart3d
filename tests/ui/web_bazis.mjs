/* TZ-21: saytga Bazis faylini yuklash — Loyihalarim → "Bazis faylini yuklash" → fayl brauzerda o'qiladi → yangi loyiha:
 * hisobot varag'i (materiallar, kesimga kirmaganlar), 3D, narx, Excel; buzilgan fayl — xato kodi bilan, sahifa buzilmaydi;
 * loyiha serverga saqlanib qayta ochiladi (Bazis moduli tiklanadi). Fayllar git'da yo'q (mijoz ma'lumoti) — bo'lmasa testning
 * shu qismi o'tkazib yuboriladi. Ishlatish: bash tests/ui/web.sh bazis */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
function namuna() {
  const top = join(ROOT, '..', 'Smart3D', 'Smart3D_toplam_2026-10-16', '01_buyurtma_fayllari', '04_bazis');
  if (existsSync(top)) {
    const d = readdirSync(top).find(x => x.startsWith('3311_'));
    if (d) { const f = readdirSync(join(top, d)).find(x => /\.b3d$/i.test(x)); if (f) return join(top, d, f); }
  }
  const mc = join(ROOT, '..', 'Smart3D', 'data1', 'modulniy', 'modulniy', 'kuxnya', 'nijniy korpus', 'moyka 2 fasad.fr3d');
  return existsSync(mc) ? mc : null;
}

export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/bazis-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const txt = () => M(() => document.body.innerText);
  const has = async (t) => (await txt()).includes(t);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { const el = page.locator(`input[placeholder*="${ph}"]`).first(); await el.fill(v); };
  const waitText = async (t, ms = 10000) => { for (let i = 0; i < ms / 200; i++) { if (await has(t)) return true; await page.waitForTimeout(200); } return false; };
  const fayl = namuna();
  R.fayl = fayl ? fayl.split('/').pop().replace(/^.*?(\.\w+)$/, 'namuna$1') : null;

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Bazis Usta'); await fill('jasur@', 'bazis' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });   // TZ-25: darhol ish joyi
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);   // TZ-25: tez boshlash — oshxona
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.res)); i++) await page.waitForTimeout(250);
  await page.locator('[data-sarlavha="loyihalar"]').click(); await waitText('Loyihalarim');
  R.tugma = await M(() => !!document.querySelector('label[data-bazis-yukla]'));
  await page.screenshot({ path: `${OUT}/bazis-1440-loyihalar.png`, clip: { x: 0, y: 0, width: 1440, height: 160 } });

  /* 1) buzilgan fayl — xato kodi, sahifa ishlaydi */
  const inp = () => page.locator('label[data-bazis-yukla] input[type=file]');
  await inp().setInputFiles({ name: 'buzuq.b3d', mimeType: 'application/octet-stream', buffer: Buffer.from('bu bazis fayli emas'.repeat(50)) });
  R.buzuqKod = await (async () => { for (let i = 0; i < 40; i++) { const k = await M(() => { const e = document.querySelector('[data-kod]'); return e && e.textContent; }); if (k) return k; await page.waitForTimeout(250); } return null; })();
  await inp().setInputFiles({ name: 'rasm.png', mimeType: 'image/png', buffer: Buffer.from([137, 80, 78, 71]) });
  await page.waitForTimeout(600);
  R.turKod = await M(() => [...document.querySelectorAll('[data-kod]')].map(e => e.textContent));

  /* 1b) .bpj (Bazis skripti eksporti, JSON) — sun'iy namuna, har doim mavjud */
  const bpj = { version: '4.2', script: 'BazisUniversalExport', objects: [0, 1].map(i => ({ id: i + 1, name: 'bok', dimensions: { dl: 700, dw: 450, dp: 16 },
    material: { name: 'ЛДСП Кроношпан 4,575 Белый гладкий 16мм' },
    contour: { outer: [[0, 0, 700, 0], [700, 0, 700, 450], [700, 450, 0, 450], [0, 450, 0, 0]].map(([x1, y1, x2, y2]) => ({ type: 'line', x1, y1, x2, y2 })) },
    butts: [{ elemIndex: 2, material: 'Кромка 19/1', thickness: 1 }],
    transform: { origin: { x: i * 584, y: 0, z: 0 }, axisX: { x: 0, y: 1, z: 0 }, axisY: { x: 0, y: 0, z: 1 }, axisZ: { x: 1, y: 0, z: 0 } } })), furnitures: [] };
  await inp().setInputFiles({ name: 'namuna.bpj', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bpj)) });
  R.bpj = await (async () => { for (let i = 0; i < 60; i++) { if (await M(() => !!document.querySelector('[data-varaq="bazis"]'))) return await M(() => window.__app.doc.bazis && window.__app.doc.bazis.hisobot.detal); await page.waitForTimeout(250); } return null; })();
  if (await page.locator('[data-varaq="bazis"]').count()) { await page.locator('[data-varaq="bazis"] button', { hasText: 'Yopish' }).last().click(); await page.waitForTimeout(400); }
  await page.locator('[data-sarlavha="loyihalar"]').click(); await waitText('Loyihalarim');

  if (!fayl) { R.skip = 'namuna Bazis fayli yo\'q (data1 / Smart3D_toplam)'; R.errs = errs; R.ok = R.tugma && R.buzuqKod && R.bpj === 2 && errs.length === 0; return; }

  /* 2) haqiqiy fayl → yangi loyiha va hisobot */
  const t0 = Date.now();
  await inp().setInputFiles({ name: 'namuna' + fayl.slice(fayl.lastIndexOf('.')), mimeType: 'application/octet-stream', buffer: readFileSync(fayl) });
  R.hisobot = await (async () => { for (let i = 0; i < 120; i++) { if (await M(() => !!document.querySelector('[data-varaq="bazis"]'))) return true; await page.waitForTimeout(250); } return false; })();
  R.ms = Date.now() - t0;
  R.matn = (await M(() => (document.querySelector('[data-varaq="bazis"]') || {}).innerText || '')).slice(0, 600);
  await page.screenshot({ path: `${OUT}/bazis-1440-hisobot.png` });
  R.doc = await M(() => ({ n: window.__app.doc.placements.length, frg: (window.__app.doc.placements[0] || {}).frg, bazis: !!window.__app.doc.bazis }));
  await page.locator('[data-varaq="bazis"] button', { hasText: 'Yopish' }).last().click(); await page.waitForTimeout(800);
  for (let i = 0; i < 30 && !(await M(() => window.__app.res && window.__app.res.priceRes && window.__app.res.priceRes.total > 0)); i++) await page.waitForTimeout(250);
  R.narx = await M(() => window.__app.res.priceRes.total);
  R.detal = await M(() => window.__app.res.prod && window.__app.res.prod.breakdown && window.__app.res.prod.breakdown.sheetsCount);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/bazis-1440-3d.png` });
  /* TZ-23 A5: egri panel (o'z konturi), oyoq va ruchkalar, material rangi (oq dekor) */
  R.aniq = await M(() => {
    const s = window.__app.sahna, fr = window.__app.doc.bazis.fragment; let shakl = 0, furn = 0; const rang = new Set();
    s.sp.groups.items.traverse(o => {
      if (!o.isMesh) return;
      if (o.geometry && o.geometry.type === 'ExtrudeGeometry') shakl++;
      if (o.userData && o.userData.kind === 'furn') furn++;
      if (o.userData && o.userData.slot && o.material && o.material.color) rang.add(o.material.color.getHex());
    });
    return { shakl, furn, rang: [...rang], kutilgan: { shakl: (fr.bazisShakl || []).length, furn: (fr.bazisFurn || []).length } };
  });

  /* TZ-23 B: "Eshiklarni ochish" o'rniga — fasadsiz ko'rinish, izoh bilan */
  R.fasadsizTugma = await click(/^Fasadsiz ko'rish$/); await page.waitForTimeout(400);
  R.fasadsiz = await M(() => { let n = 0; window.__app.sahna.sp.groups.items.traverse(o => { if (o.isMesh && o.userData && o.userData.slot === 'fasad' && !o.visible) n++; }); return n; });
  R.fasadsizIzoh = await has('petlya tomoni');
  await click(/^Fasadlarni ko'rsatish$/); await page.waitForTimeout(400);
  R.fasadQaytdi = await M(() => !window.__app.sahna.korinish.holat.fasadsiz && !document.body.innerText.includes('Fasadlarni ko\'rsatish'));

  /* 3) Mebel qadamida "Bazis hisoboti" qayta ochiladi */
  R.qaytaTugma = await M(() => !!document.querySelector('button[data-bazis-hisobot]'));

  /* 3b) TZ-23 E: Bazis materialini almashtirish — ERP dekori → narx va kesim; asliga qaytish; qayta almashtirib saqlanadi */
  const almashtir = async () => {
    await page.locator('button[data-bazis-hisobot]').first().click(); await page.waitForTimeout(500);
    await page.locator('[data-bazis-material="0"] button').click(); await page.waitForTimeout(500);
    await page.locator('[data-varaq="material"] [data-material-royxat] button', { hasText: "so'm" }).first().click(); await page.waitForTimeout(1500);
  };
  await almashtir();
  R.almash = await M(() => { const b = window.__app.doc.bazis, a = b.almash || {}, k = Object.keys(a)[0]; const fr = window.__app.H.catalog[b.fragment.code];
    return { k, v: a[k], qismlar: fr.parts.filter(p => p.material_code === a[k]).length, narx: window.__app.res.priceRes.total }; });
  await page.screenshot({ path: `${OUT}/bazis-1440-almash.png` });
  await page.locator('[data-material-asli]').click(); await page.waitForTimeout(1500);
  R.asli = await M(() => ({ almash: !!window.__app.doc.bazis.almash, narx: window.__app.res.priceRes.total }));
  await page.locator('[data-varaq="material"] button[aria-label="Yopish"]').click(); await page.waitForTimeout(300);
  await almashtir();
  await page.locator('[data-varaq="material"] button[aria-label="Yopish"]').click(); await page.waitForTimeout(300);
  R.narxAlmash = await M(() => window.__app.res.priceRes.total);

  /* 4) Fayllar → Excel smeta */
  await click(/^Fayllar$/); await page.waitForTimeout(800);
  const dl = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
  await page.locator('[data-panel] button', { hasText: 'Excel smeta' }).first().click();
  R.excel = !!(await dl);

  /* 5) saqlanadi va qayta ochilganda Bazis moduli tiklanadi */
  await page.waitForTimeout(3500);
  R.serverda = await M(async () => (await (await fetch('/api/projects')).json()).length);
  await page.locator('[data-sarlavha="loyihalar"]').click(); await page.waitForTimeout(1500);
  await page.locator('main button.h2').first().click(); await page.waitForTimeout(2500);
  for (let i = 0; i < 30 && !(await M(() => window.__app.res && window.__app.res.priceRes)); i++) await page.waitForTimeout(250);
  R.qayta = await M(() => ({ bazis: !!window.__app.doc.bazis, narx: window.__app.res.priceRes.total, almash: !!(window.__app.doc.bazis && window.__app.doc.bazis.almash) }));

  /* telefon: hisobot sig'adi */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
  await M(() => window.scrollTo(0, 0));
  await click(/^Mebel$/); await page.waitForTimeout(500);
  if (await page.locator('button[data-bazis-hisobot]').count()) { await page.locator('button[data-bazis-hisobot]').first().click(); await page.waitForTimeout(500); }
  R.hScroll = await M(() => document.documentElement.scrollWidth > innerWidth + 1);
  await page.screenshot({ path: `${OUT}/bazis-390-hisobot.png` });

  R.errs = errs;
  R.ok = R.tugma && /S3D-BAZIS-10[34]/.test(R.buzuqKod || '') && R.turKod.some(k => k === 'S3D-BAZIS-101') && R.bpj === 2 && R.hisobot && R.doc.n === 1 && /^BZ-/.test(R.doc.frg) && R.doc.bazis &&
    R.narx > 0 && R.qaytaTugma && R.excel && R.serverda >= 1 && R.qayta.bazis && R.qayta.almash && Math.abs(R.qayta.narx - R.narxAlmash) < 1 && !R.hScroll &&
    R.fasadsizTugma && R.fasadsiz > 0 && R.fasadsizIzoh && R.fasadQaytdi &&
    R.aniq.shakl === R.aniq.kutilgan.shakl && R.aniq.furn > 0 && R.aniq.kutilgan.furn > 0 && R.aniq.rang.includes(0xeeece6) &&
    /^ERP-/.test(R.almash.v || '') && R.almash.qismlar > 0 && R.almash.narx !== R.narx && !R.asli.almash && Math.abs(R.asli.narx - R.narx) < 1 && errs.length === 0;
}
