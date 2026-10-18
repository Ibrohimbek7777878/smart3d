/* #234: 3D pastki qism miltillashi (z-fighting). Oshxonani qurib, 3 kamera holatida (yaqin-past, uzoq, yuqoridan)
 * HARAKATSIZ sahnaning ikki kadrini piksel-piksel solishtiradi. Kamera holati AYNAN bir xil, faqat near (chuqurlik buferining
 * aniqligi, 20 marta yomonlashtiriladi — 16-bit GPU'ni taqlid) o'zgaradi: haqiqiy kamera harakatida z-fighting aynan shu sababli miltillaydi. Geometriya va qirralar (antialias)
 * bir xil bo'lgani uchun farq faqat chuqurlik "urishgan" piksellarda chiqadi — farq < 0.1% bo'lishi shart.
 * Ishlatish: bash tests/ui/web.sh miltillash */
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/miltillash-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const OUT = process.env.QA_OUT;
  const fs = await import('node:fs');
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { await page.locator(`input[placeholder*="${ph}"]`).first().fill(v); };
  const PREFIX = process.env.MILT_PREFIX || 'miltillash';

  await page.setViewportSize({ width: 1280, height: 800 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'Milt Usta'); await fill('jasur@', 'milt' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);
  for (let i = 0; i < 60 && !(await M(() => !!(window.__app && window.__app.state.sceneOn && window.__app.sahna && window.__app.res && window.__app.res.cutlists && window.__app.res.cutlists.length))); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(2500);
  R.rejim = await M(() => window.__app.sahna.sp.mode);
  if (R.rejim !== '3d') { await M(() => window.__app.sahna.setMode('3d')); await page.waitForTimeout(800); }

  /* 3 kamera holati: kameraga to'g'ridan-to'g'ri joylashtiramiz (orbit markazi bilan) */
  const holatlar = {
    yaqin_past: (bb) => ({ pos: [bb.cx - 600, bb.minY + 1500, 60], tgt: [bb.cx - 900, bb.minY + 300, 100] }),
    uzoq:       (bb) => ({ pos: [bb.cx + 6000, bb.maxY + 7000, 3200], tgt: [bb.cx, bb.minY + 600, 600] }),
    yuqori:     (bb) => ({ pos: [bb.cx - 80, bb.minY + 1200, 6500], tgt: [bb.cx, bb.minY + 500, 0] }),
    ropara:     (bb) => ({ pos: [bb.cx - 600, bb.minY + 4200, 900], tgt: [bb.cx - 600, bb.minY, 450] }),
    ropara_past:(bb) => ({ pos: [bb.cx - 400, bb.minY + 2300, 260], tgt: [bb.cx - 800, bb.minY + 300, 80] }),
    pol_osti:   (bb) => ({ pos: [bb.cx - 600, bb.minY + 3500, -260], tgt: [bb.cx - 600, bb.minY + 300, 250] }),
    pol_sathi:  (bb) => ({ pos: [bb.cx - 600, bb.minY + 3500, 60], tgt: [bb.cx - 600, bb.minY + 300, 120] }),
    past_burchak: (bb) => ({ pos: [bb.minX + 2300, bb.minY + 1600, 25], tgt: [bb.minX + 500, bb.minY + 400, 60] })
  };
  const kamera = (nom) => M(([nom, src]) => {
    const s = window.__app.sahna, sp = s.sp, bb = sp.bbox;
    const h = (new Function('return ' + src))()(bb);
    sp.cam3d.position.set(h.pos[0], h.pos[1], h.pos[2]);
    s.ctl.orbit.target.set(h.tgt[0], h.tgt[1], h.tgt[2]);
    s.ctl.orbit.update();
    sp.cam3d.lookAt(h.tgt[0], h.tgt[1], h.tgt[2]);
    sp.cam3d.updateProjectionMatrix();
    sp._invalidate();
  }, [nom, holatlar[nom].toString()]);
  /* near/far ni k marta o'zgartirib qayta chizadi (kamera joyida). controls.js har kadrda near/far ni o'zi qayta hisoblaydi,
     shuning uchun k to'g'ridan-to'g'ri renderer.render ichida (chizish oldidan) qo'llanadi */
  const nearFar = (k) => M((k) => {
    const sp = window.__app.sahna.sp, r = sp.renderer;
    if (!r.__orig) {
      r.__orig = r.render.bind(r);
      r.render = function (sc, cam) {
        const kk = window.__nk;
        if (!kk || kk === 1 || !cam.isPerspectiveCamera) return r.__orig(sc, cam);
        const n = cam.near, f = cam.far;
        cam.near = n * kk; cam.updateProjectionMatrix();
        try { return r.__orig(sc, cam); } finally { cam.near = n; cam.far = f; cam.updateProjectionMatrix(); }
      };
    }
    window.__nk = k; sp._invalidate();
    return { near: +(sp.cam3d.near * k).toFixed(1), far: +sp.cam3d.far.toFixed(0) };
  }, k);

  const canvasBuf = async () => (await page.locator('canvas').first().screenshot());
  R.farq = {};
  let okHammasi = true;
  for (const nom of Object.keys(holatlar)) {
    await kamera(nom); await page.waitForTimeout(700);
    const nf = await nearFar(1); await page.waitForTimeout(400);
    const a = await canvasBuf();
    fs.writeFileSync(`${OUT}/${PREFIX}-${nom}.png`, a);
    await nearFar(Number(process.env.MILT_K || 0.05)); await page.waitForTimeout(400);
    const b = await canvasBuf();
    fs.writeFileSync(`${OUT}/${PREFIX}-${nom}-2.png`, b);
    const f = await M(async ([x, y]) => {
      const dec = async (u) => { const im = new Image(); im.src = u; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
      const A = await dec('data:image/png;base64,' + x), B = await dec('data:image/png;base64,' + y);
      let d = 0; const n = A.length / 4;
      for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 24) d++;
      return { foiz: +(100 * d / n).toFixed(4), piksel: d };
    }, [a.toString('base64'), b.toString('base64')]);
    R.farq[nom] = Object.assign(f, nf);
    if (!(f.foiz < 0.1)) okHammasi = false;
  }
  R.chuqurlikBit = await M(() => { const g = window.__app.sahna.sp.renderer.getContext(); return g.getParameter(g.DEPTH_BITS); });
  R.xatolar = errs;
  R.ok = okHammasi && errs.length === 0;
}
