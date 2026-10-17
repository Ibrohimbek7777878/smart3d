/* TZ-31 B: VR (WebXR) — Meta IWER (Quest 3 emulyatori, npm iwer 2.5.0) bilan. Tekshiriladi: VR tugmasi ko'rinadi, sessiyaga kirish,
 * ildiz masshtab 0.001 va x bo'yicha -90° (Z→Y), pult va nur, polga select → teleport, chiqqach kamera/near/far/ildiz/sikl qaytadi.
 * Ishlatish: bash tests/ui/web.sh vr */
import { readFileSync } from 'node:fs';
export default async function run(page) {
  const R = {};
  try { await asosiy(page, R); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/vr-xato.png` }).catch(() => {});
    R.ok = false;
  }
  return R;
}

async function asosiy(page, R) {
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const has = async (s) => (await M(() => document.body.innerText)).includes(s);
  const click = async (re) => { const l = page.getByText(re); const n = await l.count(); if (n) await l.nth(n - 1).click(); return n > 0; };
  const fill = async (ph, v) => { await page.locator(`input[placeholder*="${ph}"]`).first().fill(v); };
  const iwer = readFileSync('web/node_modules/iwer/build/iwer.min.js', 'utf8');
  await page.addInitScript({ content: iwer + `;(() => { const d = new IWER.XRDevice(IWER.metaQuest3); d.installRuntime({ forceInstall: true }); window.__dev = d; })();` });

  await page.setViewportSize({ width: 1440, height: 900 });
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'VR Usta'); await fill('jasur@', 'vr' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); await tel.click(); await tel.type('9' + String(Date.now()).slice(-8));
  await fill('kamida 8', 'parol12345');
  await click(/^Ro'yxatdan o'tish$/); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.sahna && window.__app.res)); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1200);

  const vrBtn = page.locator('button[aria-label="VR"]');
  for (let i = 0; i < 25 && !(await vrBtn.count()); i++) await page.waitForTimeout(200);
  R.tugma = (await vrBtn.count()) > 0;

  const holat = () => M(() => { const s = window.__app.sahna, c = s.sp.camera, sc = s.sp.scene;
    return { cam: c.position.toArray(), near: c.near, far: c.far, up: c.up.toArray(), fov: c.fov, orbit: s.ctl.orbit.enabled, sc: sc.scale.toArray(), rot: sc.rotation.toArray().slice(0, 3), pos: sc.position.toArray(), vr: s.vr.holat(), xr: s.sp.renderer.xr.isPresenting, bb: [s.sp.bbox.cx, s.sp.bbox.cy] }; });
  await page.waitForTimeout(2500);                          // kamera silliq to'xtasin (damping)
  const oldin = await holat();
  await vrBtn.dispatchEvent('click');
  await page.waitForFunction(() => window.__app.sahna.sp.renderer.xr.isPresenting, null, { timeout: 8000 });
  await page.waitForTimeout(800);
  const ichida = await holat();
  R.kirdi = ichida.xr && ichida.vr.on;
  R.masshtab = ichida.sc.every(v => Math.abs(v - 0.001) < 1e-9);
  R.rotX = Math.abs(ichida.rot[0] + Math.PI / 2) < 1e-6;
  /* xona markazi (cx, cy mm) → dunyo (0, 0, 0): pos = -R*s*(cx, cy, 0) = (-s*cx, 0, s*cy) */
  R.markaz = Math.abs(ichida.pos[0] + ichida.bb[0] / 1000) < 1e-6 && Math.abs(ichida.pos[2] - ichida.bb[1] / 1000) < 1e-6 && Math.abs(ichida.pos[1]) < 1e-9;
  R.nearFar = ichida.near < 1 && ichida.far <= 200 && ichida.orbit === false;
  R.pult = ichida.vr.pult === 2;
  const kadr = await M(async () => { const r = window.__app.sahna.sp.renderer, a = r.info.render.frame; await new Promise(f => setTimeout(f, 700)); return r.info.render.frame - a; });
  R.kadrlar = kadr; R.siklTirik = kadr > 3;
  R.yorliq = await M(() => window.__app.sahna.sp.labelRenderer.domElement.style.display) === 'none';

  /* pult polga qaratiladi: o'ng qo'l (0.2, 1.2, -0.3), pastga ~46° → pol nuqtasi z ≈ -1.5 */
  await M(() => { const c = window.__dev.controllers.right; c.position.set(0.2, 1.2, -0.3); const a = -0.8; c.quaternion.set(Math.sin(a / 2), 0, 0, Math.cos(a / 2)); });
  await page.waitForTimeout(400);
  const pol0 = (await holat()).pos;
  R.tanla = await M(() => { const r = window.__app.sahna.sp.renderer.xr.getController(1); r.updateMatrixWorld(true); return window.__app.sahna.vr.tanla(r); });   // 1 = o'ng
  await page.waitForTimeout(300);
  const pol1 = (await holat()).pos;
  R.teleport = !!R.tanla && R.tanla.tur === 'pol' && Math.hypot(pol1[0] - pol0[0], pol1[2] - pol0[2]) > 0.5;
  R.teleportSiljish = [pol1[0] - pol0[0], pol1[2] - pol0[2]].map(v => +v.toFixed(2));
  /* haqiqiy tugma bosish (IWER trigger → select hodisasi) ham teleport qiladi */
  await M(() => { const c = window.__dev.controllers.right; c.updateButtonValue('trigger', 1); });
  await page.waitForTimeout(250);
  await M(() => { window.__dev.controllers.right.updateButtonValue('trigger', 0); });
  await page.waitForTimeout(400);
  const pol2 = (await holat()).pos;
  R.selectTugma = Math.hypot(pol2[0] - pol1[0], pol2[2] - pol1[2]) > 0.3;

  /* pult modulga qaratiladi (tepadan): mavjud tanlash — onTap → roomTap → ep.sel */
  R.modul = await M(() => { const s = window.__app.sahna, sp = s.sp, T = sp.THREE; const m = s.items.meshes.find(x => !x.userData.auto); sp.scene.updateMatrixWorld(true);
    const c = new T.Box3().setFromObject(m).getCenter(new T.Vector3()), e = c.clone().add(new T.Vector3(0, 1.2, 0));
    const ctl = sp.renderer.xr.getController(1), lk = new T.Matrix4().lookAt(e, c, new T.Vector3(0, 0, -1));
    ctl.matrix.copy(lk).setPosition(e); ctl.matrixWorldNeedsUpdate = true; ctl.updateMatrixWorld(true);
    const r = s.vr.tanla(ctl); return { r, sel: window.__app.state.sel }; });
  R.modulTanlandi = !!R.modul.r && R.modul.r.tur === 'modul' && R.modul.sel === R.modul.r.id;

  await M(() => window.__app.sahna.sp.renderer.xr.getSession().end());
  await page.waitForFunction(() => !window.__app.sahna.sp.renderer.xr.isPresenting, null, { timeout: 8000 });
    await page.waitForTimeout(500);
  const keyin = await holat();
  const teng = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-6);
  R.qaytdi = teng(keyin.cam, oldin.cam) && keyin.fov === oldin.fov && keyin.near === oldin.near && keyin.far === oldin.far && teng(keyin.up, oldin.up) && keyin.orbit === oldin.orbit
    && teng(keyin.sc, oldin.sc) && teng(keyin.pos, oldin.pos) && teng(keyin.rot, oldin.rot) && !keyin.vr.on;
  R.yorliqQaytdi = await M(() => window.__app.sahna.sp.labelRenderer.domElement.style.display) !== 'none';
  R.chiqqachKadr = await M(() => { const s = window.__app.sahna.sp; s._invalidate(); return s.renderer.info.render.frame; }) >= 0;
  R.xatolar = errs.length;
  R.ok = !!(R.tugma && R.kirdi && R.masshtab && R.rotX && R.markaz && R.nearFar && R.pult && R.siklTirik && R.yorliq && R.teleport && R.modulTanlandi && R.qaytdi && R.yorliqQaytdi && errs.length === 0);
  if (!R.ok) { R.oldin = oldin; R.ichida = ichida; R.keyin = keyin; R.errs = errs; }
}
