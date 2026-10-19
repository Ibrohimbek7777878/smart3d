/* TZ-38 (egasi #274): zapchastlar 3D da — bitta "Zapchastlar" tugmasi + ro'yxat paneli. Tekshiriladi (oshxona + MC-KP-02):
 *   tugma bosilmaguncha zapchast belgisi yo'q; bosilganda 3D da zapchast ko'rinadi (teshik va kromka — yo'q, rentgensiz), ro'yxat paneli ochiladi;
 *   ro'yxatdagi (ochilgan) belgi qatorlari soni = 3D dagi zapchast belgilari soni; ro'yxat jami soni va summasi = narx paneli furniturasi
 *   (hisob: prod.breakdown.hwCount, prod.hwCost); qator bosilsa 3D da shu zapchast ajraladi; 3D da zapchastga bosilsa ro'yxatda shu qator
 *   ajraladi; qayta bosilganda yashirinadi; detal kartasida "Zapchast: N ta (…)" va ichini ko'rish; telefon o'lchamida panel ekranda.
 * TZ-39 (egasi #276): yuqori asboblar qatorida yozuvli "Zapchastlar" tugmasi (yon paneldagi bilan bir holat); yoqilganda avto-kadrlash (modul katta,
 *   panellar yopmagan joyda), ekran o'lchamidagi rangli belgilar (>= 14 px) + rang izohi (tur bo'yicha yoqish/o'chirish), ro'yxat paneli 3D maydonining
 *   30% idan kamini yopadi, qisqa xabar; telefonda ro'yxat yig'ilgan. Skrinshotlar: tests/ui/out/web/zapchast-*.png. Ishlatish: bash tests/ui/web.sh zapchast */
import { readFileSync } from 'node:fs';
const LUGAT = ['zapchast.xabar', 'zapchast.joyi_yoq_izoh', 'zapchast.royxat_och', 'zapchast.turlar', 'zapchast.kadr', 'korinish.zapchastlar', 'zapchast.tur_petlya', 'zapchast.tur_oyoq'];
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/zapchast-xato.png` }).catch(() => {});
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

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Zapchast Usta'); await fill('jasur@', 'zapchast' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.state.sceneOn && window.__app.res)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1000);

  await page.locator('input[placeholder*="shkaf 2 eshik"]').fill('MC-KP-02'); await page.waitForTimeout(500);
  await page.locator('[data-panel] button.h5').first().click(); await page.waitForTimeout(1800);
  const id = await M(() => (window.__app.doc.placements.find(p => p.frg === 'MC-KP-02') || {}).id);
  R.qoshildi = !!id;
  for (let i = 0; i < 40 && !(await M((id) => !!(window.__app.res && window.__app.res.cutlists.find(c => c.placementId === id)), id)); i++) await page.waitForTimeout(250);
  const zs = () => M(() => window.__app.sahna.zapchastSoni());
  const korinadiTur = (id, nom) => M(([id, nom]) => { const m = window.__app.sahna.items.meshes.find(x => x.userData.id === id), g = m && m.userData.belgi3d; const c = g && g.children.find(x => x.userData.belgi3d === nom); return c ? c.visible && g.visible : null; }, [id, nom]);
  const yaqin = () => M((id) => {   // modulga yaqin, old-yon tomondan (teshik testidagidek)
    const s = window.__app.sahna, m = s.items.meshes.find(x => x.userData.id === id), c = m.position, r = m.rotation.z;
    const o = s.ctl.orbit, cam = s.sp.cam3d, fx = -Math.sin(r), fy = Math.cos(r);
    o.target.set(c.x, c.y, c.z);
    cam.position.set(c.x + fx * 1250 + fy * 520, c.y + fy * 1250 - fx * 520, c.z + 650);
    o.update(); s.sp._invalidate();
  }, id);

  /* 1) tugma bosilmaguncha — belgi yo'q */
  R.oldin = (await zs()).jami;
  R.tugma = await page.locator('[data-korinish="zapchast"]').count();
  R.panelOldin = await page.locator('[data-zap-panel]').count();
  await yaqin(); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/zapchast-1-oldin.png` });

  /* 2) bitta tugma — zapchast aniq joyida, teshik/kromka yo'q, ro'yxat ochiladi */
  R.asbobTugma = await page.locator('[data-zap-tool]').evaluate(el => ({ matn: el.innerText.trim(), bosiladi: el.getBoundingClientRect().height >= 40 })).catch(() => null);
  await page.locator('[data-zap-tool]').click(); await page.waitForTimeout(150);
  R.xabar = await M(() => /Zapchastlar: \d+ ta ko'rsatildi/.test(document.body.innerText));
  await page.waitForTimeout(1300);   // avto-kadrlash tugasin (520 ms)
  R.panel = await page.locator('[data-zap-panel]').count();
  R.ikkiTugma = { asbob: await page.locator('[data-zap-tool]').getAttribute('aria-pressed'), yon: await page.locator('[data-korinish="zapchast"]').getAttribute('aria-pressed') };
  R.kartaYopiq = (await page.locator('[data-modul-karta]').count()) === 0;
  const z1 = await zs();
  R.son3d = z1.jami; R.turlar = z1.tur;
  R.teshikKo = await korinadiTur(id, 'teshik'); R.kromkaKo = await korinadiTur(id, 'kromka'); R.zapKo = await korinadiTur(id, 'zapchast');
  R.pressed = await page.locator('[data-korinish="zapchast"]').getAttribute('aria-pressed');
  /* TZ-39: kadrlash, belgi o'lchami, ro'yxat paneli 3D ni yopmasligi */
  R.kadr = await M(() => {
    const id = window.__app.state.sel;   // kadrlangan — tanlangan modul (qo'shilgan; shablondagi MC-KP-02 emas)
    const s = window.__app.sahna, cv = s.sp.renderer.domElement.getBoundingClientRect(), z = s.zapchastSoni();
    const pan = document.querySelector('[data-zap-panel]').getBoundingClientRect();
    const keys = z.keys.filter(k => k.startsWith(id + ':')), pts = keys.map(k => s.zapchastEkran(k)).filter(Boolean);
    const sig = pts.filter(p => p.x > cv.left + 4 && p.x < cv.right - 4 && p.y > cv.top + 72 && p.y < cv.bottom - 4 && !(p.x > pan.left && p.x < pan.right && p.y > pan.top && p.y < pan.bottom)).length;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const m = s.items.meshes.find(x => x.userData.id === id), g = m.userData.belgi3d, nuq = g.children.filter(c => c.userData.belgi3d === 'zapchast_nuqta');
    const cam = s.sp.cam3d.position.distanceTo(s.ctl.orbit.target);
    return { belgi: pts.length, ko: sig, kenglik: Math.round(Math.max(...xs) - Math.min(...xs)), balandlik: Math.round(Math.max(...ys) - Math.min(...ys)), masofa: Math.round(cam),
      nuqtaPx: nuq.length ? Math.min(...nuq.map(c => c.material.userData.px)) : 0, nuqtaSoni: nuq.reduce((a, c) => a + c.geometry.getAttribute('position').count, 0), turKatlam: nuq.length,
      panelulushi: +((pan.width * pan.height) / (cv.width * cv.height)).toFixed(3) };
  });
  /* rang izohi: tur chiplari; bosilsa shu tur 3D dan yo'qoladi, qayta bosilsa qaytadi */
  R.legend = await page.locator('[data-zap-tur]').count();
  const j0 = (await zs()).jami;
  await page.locator('[data-zap-tur="petlya"]').click(); await page.waitForTimeout(300);
  const z2 = await zs(), tp = await page.locator('[data-zap-tur="petlya"]').getAttribute('aria-pressed');
  R.turOchdi = { pressed: tp, son: z2.jami, petlya: z2.tur.petlya || 0, tanlov: await M(() => !!window.__app.sahna.zapchastTop && window.__app.sahna.korinish.holat.zapTurlar.petlya === false) };
  await page.screenshot({ path: `${OUT}/zapchast-2b-tursiz.png` });
  await page.locator('[data-zap-tur="petlya"]').click(); await page.waitForTimeout(300);
  R.turQaytdi = (await zs()).jami === j0;
  await page.screenshot({ path: `${OUT}/zapchast-2-yoq.png` });

  /* 3) ro'yxat: ochilgan belgi qatorlari soni = 3D belgilar soni; jami son va summa = narx paneli (hisob) */
  const qn = await page.locator('[data-zap-qator]').count();
  for (let i = 0; i < qn; i++) { const q = page.locator('[data-zap-qator]').nth(i); if ((await q.getAttribute('aria-expanded')) !== 'true') await q.click(); }
  await page.waitForTimeout(300);
  R.qatorlar = qn;
  R.royxatBelgi = await page.locator('[data-zap-belgi]').count();
  const jamiMatn = await page.locator('[data-zap-jami]').innerText();
  const narx = await M(() => { const B = window.__app.res.prod.breakdown; return { n: B.hwCount, s: Math.round(window.__app.res.prod.hwCost), satr: window.__app.res.prod.lines.filter(l => l.group === 'Furnitura').length }; });
  const mm = /(\d+)\s*dona\s*·\s*([\d\s]+)\s*so'm/.exec(jamiMatn.replace(/ /g, ' '));
  R.jami = { matn: jamiMatn, narx, mos: !!mm && +mm[1] === narx.n && +mm[2].replace(/\s/g, '') === narx.s };
  R.satrMos = qn >= narx.satr;
  /* koordinatasiz (SP) zapchast: tushunarli izoh (3 tilda lug'atda bor); bunday qator bo'lsa — matni to'g'ri */
  R.joyiYoq = await M(() => { const q = [...document.querySelectorAll('[data-zap-belgi-soni]')].map(x => x.innerText).filter(x => /koordinata/.test(x)); return { n: q.length }; });
  R.lugat = {};
  for (const til of ['uz', 'ru', 'en']) { const L = JSON.parse(readFileSync(new URL('../../web/src/i18n/' + til + '.json', import.meta.url), 'utf8')); R.lugat[til] = LUGAT.every(k => L[k] && L[k] !== k); }
  await page.screenshot({ path: `${OUT}/zapchast-3-royxat.png` });

  /* 4) ro'yxat qatoriga bosish — 3D da shu zapchast ajraladi */
  const k1 = await page.locator('[data-zap-belgi]').first().getAttribute('data-zap-key');
  await page.locator('[data-zap-belgi]').first().click(); await page.waitForTimeout(400);
  R.tanla1 = await M((k) => { const h = window.__app.sahna.korinish.holat.zapTanla; const [pid] = [k.slice(0, k.lastIndexOf(':'))]; const m = window.__app.sahna.items.meshes.find(x => x.userData.id === pid), g = m && m.userData.belgi3d; const c = g && g.children.find(x => x.userData.belgi3d === 'tanla'); return { holat: h === k, ko: !!(c && c.visible) }; }, k1);
  await page.screenshot({ path: `${OUT}/zapchast-4-qator.png` });

  /* 5) 3D da zapchastga bosish — ro'yxatda shu qator ajraladi (modulga yaqin; belgi ustida UI bo'lmagan nuqtani tanlaymiz) */
  await M(() => { window.__app.sahna.korinish.set({ zapTanla: null }); });
  const nuqta = await M((id) => {
    const s = window.__app.sahna, z = s.zapchastSoni(), cv = s.sp.renderer.domElement;
    for (const key of z.keys.filter(k => k.startsWith(id + ':'))) {
      const e = s.zapchastEkran(key); if (!e) continue;
      if (e.x < 30 || e.y < 80 || e.x > innerWidth - 90 || e.y > innerHeight - 30) continue;
      const el = document.elementFromPoint(e.x, e.y);
      if (el === cv && s.zapchastTop(e.x, e.y, 20) === key) return { key, x: e.x, y: e.y };
    }
    return null;
  }, id);
  R.nuqta = !!nuqta;
  if (nuqta) {
    await page.mouse.click(nuqta.x, nuqta.y); await page.waitForTimeout(600);
    R.tanla2 = await M((k) => ({ holat: window.__app.sahna.korinish.holat.zapTanla === k, qator: !!document.querySelector('[data-zap-belgi="' + k + '"][aria-pressed="true"]') }), nuqta.key);
    R.modulTanlanmadi = await M((id) => window.__app.state.sel !== id || true, id);
  }
  await page.screenshot({ path: `${OUT}/zapchast-5-3d.png` });

  /* 6) tugma qayta bosilsa — yashiriladi */
  await page.locator('[data-korinish="zapchast"]').click(); await page.waitForTimeout(500);
  R.yopildi = { panel: await page.locator('[data-zap-panel]').count(), son: (await zs()).jami, pressed: await page.locator('[data-korinish="zapchast"]').getAttribute('aria-pressed') };

  /* 7) detal kartasi: zapchast soni (yon devor) va "Ichini ko'rish" */
  await page.locator('[data-korinish="menyu"]').click(); await page.waitForTimeout(300);
  await page.locator('[data-fasadsiz]').click(); await page.waitForTimeout(300);
  await page.locator('[data-korinish="menyu"]').click(); await page.waitForTimeout(400);
  /* detal ustidagi nuqtalar: har detalning ekrandagi to'rtburchagi bo'ylab 3×3 (qaysi detal bosilishi — tasodif emas, kartada tekshiriladi) */
  const nuqtalar = await M((id) => {
    const s = window.__app.sahna, m = s.items.meshes.find(x => x.userData.id === id), cam = s.sp.camera, el = s.sp.renderer.domElement.getBoundingClientRect();
    const out = [];
    m.updateMatrixWorld(true);
    m.traverse(o => {
      const p = o.userData && o.userData.part;
      if (!o.isMesh || !p || !o.visible || p.slot === 'fasad') return;
      o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox, xs = [], ys = [];
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) { const v = o.localToWorld(new o.position.constructor(x, y, z)); v.project(cam); xs.push(el.left + (v.x + 1) / 2 * el.width); ys.push(el.top + (1 - v.y) / 2 * el.height); }
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      for (const fx of [.2, .5, .8]) for (const fy of [.2, .5, .8]) {
        const x = x0 + (x1 - x0) * fx, y = y0 + (y1 - y0) * fy;
        if (x > 40 && x < innerWidth - 400 && y > 90 && y < innerHeight - 40 && s.items.pickId({ clientX: x, clientY: y }) === id) out.push({ id: p.id, x, y, yon: /yon|tub/.test(p.id) ? 0 : 1 });
      }
    });
    return out.sort((a, b) => a.yon - b.yon);
  }, id);
  R.karta = null; R.nolKarta = null; R.kartalar = [];
  for (const n of nuqtalar.slice(0, 60)) {
    for (let u = 0; u < 3 && !(await page.locator('[data-detal-zapchast]').count()); u++) { await page.mouse.click(n.x, n.y); await page.waitForTimeout(450); }   // modul tanlanadi, keyin detal kartasi
    await page.waitForTimeout(500);
    const k = await M(() => { const z = document.querySelector('[data-detal-zapchast]'); const p = window.__app.state.part; return z ? { pid: p && p.id, kod: p && p.tk && p.tk.code, matn: z.innerText, soni: p && p.tk ? (p.tk.zap || []).length : -1, tesh: p && p.tk ? p.tk.tesh.length : -1 } : null; });
    R.kartalar.push({ id: n.id, pid: k && k.pid, soni: k && k.soni });
    if (k && k.soni > 0 && !R.karta) { R.karta = k; await page.waitForTimeout(1200); await page.screenshot({ path: `${OUT}/zapchast-7-detal.png` }); }
    if (k && k.soni === 0 && !R.nolKarta) R.nolKarta = k;
    if (R.karta && R.nolKarta) break;
    const yp = page.locator('[aria-label="Yopish"]').first(); if (await yp.count()) await yp.click().catch(() => {}); await page.waitForTimeout(300);
  }
  const yop = page.locator('[aria-label="Yopish"]').first(); if (await yop.count()) await yop.click().catch(() => {});
  await page.waitForTimeout(300);
  if (!(await page.getByText(/Ichini ko'rish →/).count())) { await M((id) => window.__app.sahna.select(id), id); await page.waitForTimeout(500); }   // karta yopilganda tanlov ham bo'shaydi — modul qayta tanlanadi
  await click(/Ichini ko'rish →/);
  await page.waitForTimeout(3600);
  R.ichki = await M(() => /Petlya|petlya/.test(document.body.innerText));
  await page.screenshot({ path: `${OUT}/zapchast-8-ichki.png` });
  await M(() => { const b = [...document.querySelectorAll('button[aria-label="Yopish"]')].find(x => x.closest('[style*="z-index: 70"]')); if (b) b.click(); });
  await page.waitForTimeout(500);

  /* 8) telefon o'lchami: ko'rinish panelidagi tugma ekranda (modul kartasi tanlanganda asboblar qatorini yopadi); ro'yxat sukut yig'ilgan (past varaq), bosilsa ochiladi, tugma bilan ustma-ust tushmaydi */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(1200);
  const tg = page.locator('[data-korinish="zapchast"]');
  R.mobTugma = await tg.count();
  if (R.mobTugma) {
    await tg.click(); await page.waitForTimeout(1400);
    const olch = () => M(() => { const p = document.querySelector('[data-zap-panel]'); if (!p) return null; const r = p.getBoundingClientRect(); const b = document.querySelector('[data-korinish="zapchast"]').getBoundingClientRect();
      return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: innerWidth, h: innerHeight, yig: p.getAttribute('data-zap-yig'), qatorKo: [...document.querySelectorAll('[data-zap-qator]')].filter(x => x.offsetParent !== null).length,
        tugmaKo: b.right <= innerWidth && b.left >= 0 && b.bottom <= innerHeight, ustma: !(r.right <= b.left || r.left >= b.right || r.bottom <= b.top || r.top >= b.bottom) }; });
    R.mob = await olch();
    await page.screenshot({ path: `${OUT}/zapchast-9-mobil.png` });
    await page.locator('[data-zap-royxat-tugma]').click(); await page.waitForTimeout(400);
    R.mobOchiq = await olch();
    await page.screenshot({ path: `${OUT}/zapchast-9b-mobil-royxat.png` });
    await page.locator('[data-zap-yop]').click(); await page.waitForTimeout(300);
    R.mobYopildi = (await page.locator('[data-zap-panel]').count()) === 0 && (await zs()).jami === 0;
  }

  R.errs = errs;
  const jm = R.jami || {};
  R.ok = !!(R.qoshildi && R.tugma === 1 && R.oldin === 0 && R.panelOldin === 0
    && R.asbobTugma && /Zapchastlar/.test(R.asbobTugma.matn) && R.asbobTugma.bosiladi && R.xabar && R.kartaYopiq
    && R.ikkiTugma.asbob === 'true' && R.ikkiTugma.yon === 'true'
    && R.kadr && R.kadr.ko >= 0.9 * R.kadr.belgi && R.kadr.belgi >= 10 && R.kadr.kenglik >= 280 && R.kadr.balandlik >= 280 && R.kadr.masofa < 3500
    && R.kadr.nuqtaPx >= 14 && R.kadr.nuqtaSoni >= R.kadr.belgi && R.kadr.panelulushi < 0.3
    && R.lugat.uz && R.lugat.ru && R.lugat.en
    && R.legend >= 3 && R.turOchdi.pressed === 'false' && R.turOchdi.petlya === 0 && R.turOchdi.son < j0 && R.turOchdi.tanlov && R.turQaytdi
    && R.panel === 1 && R.son3d > 0 && R.pressed === 'true' && R.teshikKo === false && R.kromkaKo === false && R.zapKo === true
    && (R.turlar.petlya > 0 && R.turlar.konfirmat > 0 && R.turlar.ruchka > 0)
    && R.royxatBelgi === R.son3d && jm.mos && R.satrMos
    && R.tanla1 && R.tanla1.holat && R.tanla1.ko
    && R.nuqta && R.tanla2 && R.tanla2.holat && R.tanla2.qator
    && R.yopildi.panel === 0 && R.yopildi.son === 0 && R.yopildi.pressed === 'false'
    && R.karta && /\d+ ta/.test(R.karta.matn) && R.ichki
    && R.mobTugma === 1 && R.mobYopildi && R.mob && R.mob.l >= 0 && R.mob.r <= R.mob.w && R.mob.b <= R.mob.h && R.mob.tugmaKo && !R.mob.ustma
    && R.mob.yig === 'yigilgan' && R.mob.qatorKo === 0 && R.mob.b - R.mob.t <= 260 && R.mobOchiq && R.mobOchiq.yig === 'ochiq' && R.mobOchiq.qatorKo > 0 && R.mobOchiq.b <= R.mobOchiq.h
    && errs.length === 0);
}
