/* TZ-23 (A, D): 3D ko'rinish — Bazis-Cloud darajasida. Muharrir sahnasi (services/sahna.js) ustida ishlaydi, dvigatel
 * (app/js/scene.js, items.js, controls.js) mantig'i o'zgarmaydi — faqat ko'rinish:
 *   kamera   — aylanish (orbit, to'liq erkin: istalgan burchak, pol ostidan ham, siljitish, kursorga yaqinlashish),
 *              yurish (xona ichida ko'z balandligida: sichqoncha/barmoq — qarash, WASD/strelka yoki joystik — yurish),
 *              orto (perspektivasiz);
 *   yo'nalish — izometriya, old, yuqori, chap, o'ng (modelga sig'diriladi, silliq o'tish); +/−; to'liq ekran;
 *   fon      — rang yoki dizayn foni (null);
 *   chizish  — bo'yalgan, qirralar bilan, sim karkas, effektlar (soya); rentgen — alohida (shaffof panellar);
 *   xona     — devor va pol ko'rinadimi; fasadsiz — eshik va tortma fasadlari yashiriladi (ichi ko'rinadi);
 *   o'lchash — ikki nuqta orasidagi masofa (mm), sahnada chiziq va yozuv.
 * Ikki marta bosish — shu joyga yaqinlashish. */
import * as THREE from 'three';
import { CSS2DObject } from '../../../app/vendor/three/addons/renderers/CSS2DRenderer.js';

export const YONALISH = {
  izo: [0.55, 0.75, 0.5], old: [0, 1, 0], yuqori: [0, 0.001, 1], chap: [1, 0, 0], ong: [-1, 0, 0]
};
const KOZ = 1600;                                   // yurish: ko'z balandligi, mm
const QADAM = 1400;                                 // yurish tezligi, mm/s

const formatMm = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' mm';

export function createKorinish(sahna, host) {
  const { sp, ctl } = sahna;
  const orbit = ctl.orbit;
  const opts = {};
  const el = sp.renderer.domElement;
  const holat = { kamera: 'orbit', fon: null, chizish: 'boyalgan', rentgen: false, xona: true, fasadsiz: false, olchash: false };
  const qirraMat = new THREE.LineBasicMaterial({ color: 0x15191e, transparent: true, opacity: 0.9 });
  const olchashMat = new THREE.LineBasicMaterial({ color: 0xff7a45, depthTest: false, transparent: true });
  const nuqtaMat = new THREE.MeshBasicMaterial({ color: 0xff7a45, depthTest: false });
  const gOlch = new THREE.Group(); gOlch.name = 'olchash'; gOlch.renderOrder = 10;
  sp.scene.add(gOlch);
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();

  /* ── mebel meshlari (yashirin urilish qutisisiz) ── */
  function meshlar(fn) {
    sp.groups.items.traverse(o => {
      if (!o.isMesh || (o.userData && (o.userData.kind === 'hitBox' || o.userData.olchash)) || !o.material) return;
      fn(o);
    });
  }
  const fasadMi = (o) => (o.userData && (o.userData.slot === 'fasad' || (o.userData.part && o.userData.part.slot === 'fasad')));

  /* ── chizish rejimi va rentgen ── */
  function qirralar(on) {
    meshlar(o => {
      if (o.material.isMeshBasicMaterial) return;
      let q = o.userData.qirraObj;
      if (on && !q) {
        q = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 25), qirraMat);
        q.userData = { qirra: true };
        q.raycast = () => {};                           // tanlash va o'lchashga xalaqit bermasin
        o.add(q); o.userData.qirraObj = q;
      }
      if (q) q.visible = on;
    });
  }
  function materiallar() {
    const karkas = holat.chizish === 'karkas', rentgen = holat.rentgen;
    const seen = new Set();
    meshlar(o => {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (seen.has(m) || m.isMeshBasicMaterial) continue;
        seen.add(m);
        if (!m.userData.k0) m.userData.k0 = { transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite, visible: m.visible };
        const k = m.userData.k0;
        m.visible = karkas ? false : k.visible;
        m.transparent = rentgen ? true : k.transparent;
        m.opacity = rentgen ? 0.22 : k.opacity;
        m.depthWrite = rentgen ? false : k.depthWrite;
        m.needsUpdate = true;
      }
    });
  }
  function effekt(on) {
    const r = sp.renderer;
    r.shadowMap.enabled = on;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    let kuchli = null;
    sp.scene.traverse(o => { if (o.isDirectionalLight && (!kuchli || o.intensity > kuchli.intensity)) kuchli = o; });
    sp.scene.traverse(o => { if (o.isDirectionalLight) o.castShadow = on && o === kuchli; });
    if (kuchli && on) {
      const bb = sp.bbox, d = Math.max(bb.w, bb.h, 3000);
      const sc = kuchli.shadow.camera;
      sc.left = -d; sc.right = d; sc.top = d; sc.bottom = -d; sc.near = 10; sc.far = 40000;
      sc.updateProjectionMatrix();
      const tel = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
      kuchli.shadow.mapSize.set(tel ? 1024 : 2048, tel ? 1024 : 2048);
      kuchli.shadow.bias = -0.0005;
      if (kuchli.shadow.map) { kuchli.shadow.map.dispose(); kuchli.shadow.map = null; }
    }
    sp.groups.floor.traverse(o => { if (o.isMesh) o.receiveShadow = on; });
    meshlar(o => { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { m.needsUpdate = true; }); });
  }
  function xonaFasad() {
    sp.groups.walls3d.visible = holat.xona && sp.mode === '3d';
    sp.groups.floor.visible = holat.xona || sp.mode === '2d';
    sp.groups.items.traverse(o => { if (fasadMi(o) && (o.isMesh || o.isGroup)) o.visible = !holat.fasadsiz; });
  }
  function fon() {
    sp.scene.background = holat.fon == null ? null : new THREE.Color(holat.fon);
  }
  /** hammasi — joriy holat bo'yicha (mebel qayta qurilganda ham chaqiriladi) */
  function qollash() {
    qirralar(holat.chizish === 'qirrali' || holat.chizish === 'karkas' || holat.rentgen);
    materiallar();
    effekt(holat.chizish === 'effekt');
    xonaFasad();
    fon();
    sp._invalidate();
  }

  /* ── model qutisi (bo'sh bo'lsa — xona) ── */
  function modelQuti() {
    const b = new THREE.Box3();
    meshlar(o => { if (o.visible) b.expandByObject(o); });
    if (b.isEmpty()) {
      const bb = sp.bbox;
      b.set(new THREE.Vector3(bb.minX, bb.minY, 0), new THREE.Vector3(bb.maxX, bb.maxY, 2700));
    }
    return b;
  }

  /* ── silliq o'tish (kamera va nishon) ── */
  let otish = null;
  function oting(pos, tgt, ms = 420) {
    const cam = sp.cam3d;
    otish = { p0: cam.position.clone(), t0: orbit.target.clone(), p1: pos.clone(), t1: tgt.clone(), s: performance.now(), ms };
    sp._startLoop();
  }
  function kadr() {
    if (otish) {
      const k = Math.min(1, (performance.now() - otish.s) / otish.ms), e = k * k * (3 - 2 * k);
      sp.cam3d.position.lerpVectors(otish.p0, otish.p1, e);
      orbit.target.lerpVectors(otish.t0, otish.t1, e);
      sp.cam3d.lookAt(orbit.target);
      if (sp.orto) sp.setOrto(true, orbit.target);
      if (k >= 1) otish = null;
      sp._invalidate();
    }
    if (holat.kamera === 'yurish') yurishKadr();
  }
  sp.on('frame', kadr);

  /** ko'rinish yo'nalishi: model butunligicha ko'rinadi */
  function yonalish(nom) {
    if (holat.kamera === 'yurish') kamera('orbit');
    if (sp.mode !== '3d') return;
    const d = YONALISH[nom] || YONALISH.izo;
    const b = modelQuti(), c = b.getCenter(new THREE.Vector3()), r = b.getSize(new THREE.Vector3()).length() / 2;
    const fov = THREE.MathUtils.degToRad(sp.cam3d.fov);
    const masofa = Math.max(800, r / Math.sin(fov / 2) * 1.08);
    const dir = new THREE.Vector3(d[0], d[1], d[2]).normalize();
    oting(c.clone().addScaledVector(dir, masofa), c);
  }
  function zoom(k) {
    if (sp.mode !== '3d' || holat.kamera === 'yurish') return;
    if (sp.orto) { const c = sp.cam3o; c.zoom = Math.max(0.05, Math.min(40, c.zoom * (k > 0 ? 1.25 : 0.8))); c.updateProjectionMatrix(); sp._invalidate(); return; }
    const cam = sp.cam3d, t = orbit.target;
    const dist = cam.position.distanceTo(t) * (k > 0 ? 0.8 : 1.25);
    const dir = v1.copy(cam.position).sub(t).normalize();
    oting(t.clone().addScaledVector(dir, Math.max(orbit.minDistance, Math.min(orbit.maxDistance, dist))), t, 220);
  }
  function toliqEkran() {
    const doc = document;
    if (doc.fullscreenElement) { doc.exitFullscreen && doc.exitFullscreen(); return false; }
    const h = host.closest('[data-scene]') || host;
    if (h.requestFullscreen) { h.requestFullscreen().catch(() => {}); return true; }
    return false;
  }

  /* ── ray: mebel (va xona) nuqtasi ── */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function nuqta(e, bilanXona) {
    const r = el.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, sp.camera);
    const ob = [];
    meshlar(o => { if (o.visible && o.material.visible !== false) ob.push(o); });
    if (bilanXona && holat.xona) { sp.groups.floor.traverse(o => o.isMesh && ob.push(o)); sp.groups.walls3d.traverse(o => o.isMesh && o.visible && ob.push(o)); }
    const h = ray.intersectObjects(ob, false)[0];
    return h ? { p: h.point.clone(), mebel: !!h.object.parent && !sp.groups.floor.children.includes(h.object) && !sp.groups.walls3d.children.includes(h.object) } : null;
  }

  /* ikki marta bosish — shu joyga yaqinlashish */
  function onDbl(e) {
    if (sp.mode !== '3d' || holat.kamera !== 'orbit' || holat.olchash) return;
    const n = nuqta(e, false);
    if (!n) return;
    const dir = v1.copy(sp.cam3d.position).sub(orbit.target).normalize();
    oting(n.p.clone().addScaledVector(dir, 1800), n.p);
  }
  el.addEventListener('dblclick', onDbl);

  /* ── o'lchash ── */
  let olA = null, bosish = null;
  function olchashTozala() {
    for (const c of gOlch.children.slice()) {
      gOlch.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.isCSS2DObject && c.element && c.element.parentNode) c.element.parentNode.removeChild(c.element);
    }
    olA = null;
    sp._invalidate();
  }
  function marker(p) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(14, 12, 8), nuqtaMat);
    m.position.copy(p); m.renderOrder = 11; m.userData = { olchash: true };
    gOlch.add(m);
  }
  function olchashNuqta(p) {
    if (!olA || gOlch.children.length >= 4) { olchashTozala(); olA = p; marker(p); sp._invalidate(); return null; }
    marker(p);
    const chiziq = new THREE.Line(new THREE.BufferGeometry().setFromPoints([olA, p]), olchashMat);
    chiziq.renderOrder = 12;
    gOlch.add(chiziq);
    const mm = olA.distanceTo(p);
    const div = document.createElement('div');
    div.textContent = formatMm(mm);
    div.setAttribute('data-olcham', String(Math.round(mm)));
    div.style.cssText = 'padding:3px 8px;border-radius:8px;background:rgba(15,34,41,.9);border:1px solid #FF7A45;color:#fff;font:700 13px/1.2 "JetBrains Mono",monospace;white-space:nowrap;pointer-events:none';
    const yozuv = new CSS2DObject(div);
    yozuv.position.copy(olA).add(p).multiplyScalar(0.5);
    gOlch.add(yozuv);
    olA = null;
    sp._invalidate();
    return Math.round(mm);
  }
  let oxirgiOlcham = null;
  /* capture bosqichida: mebel ustidagi bosish sudrashga o'tmaydi; bo'sh joyni sudrash — aylantirish (orbit) */
  function onCaptureDown(e) {
    if (holat.kamera === 'yurish') { yurishDown(e); return; }
    if (!holat.olchash || sp.mode !== '3d') return;
    const n = nuqta(e, true);
    bosish = { x: e.clientX, y: e.clientY, n };
    if (n && n.mebel) { e.stopPropagation(); e.preventDefault(); }
  }
  function onUp(e) {
    if (holat.kamera === 'yurish') { yurishUp(e); return; }
    if (!holat.olchash || !bosish) return;
    const b = bosish; bosish = null;
    if (Math.hypot(e.clientX - b.x, e.clientY - b.y) > 6 || !b.n) return;
    const mm = olchashNuqta(b.n.p);
    if (mm != null) oxirgiOlcham = mm;
    if (opts.onOlcham && mm != null) opts.onOlcham(mm);
  }
  host.addEventListener('pointerdown', onCaptureDown, true);
  window.addEventListener('pointerup', onUp);

  /* ── yurish (birinchi shaxs) ── */
  let saqla = null, yaw = 0, pitch = 0, qarash = null, tugma = new Set(), joy = null, joyEl = null, oldingiVaqt = 0;
  function yurishKirish() {
    saqla = { pos: sp.cam3d.position.clone(), tgt: orbit.target.clone() };
    orbit.enabled = false;
    sp._controls = null;                              // orbit.update() kamerani o'z nishoniga qaratmasin (sahna sikli)
    if (sp.orto) sp.setOrto(false);
    const bb = sp.bbox, cam = sp.cam3d;
    const dir = v1.copy(orbit.target).sub(cam.position); dir.z = 0;
    if (dir.lengthSq() < 1) dir.set(0, -1, 0);
    dir.normalize();
    yaw = Math.atan2(dir.y, dir.x); pitch = -0.08;
    const x = Math.min(bb.maxX - 300, Math.max(bb.minX + 300, orbit.target.x - dir.x * 1200));
    const y = Math.min(bb.maxY - 300, Math.max(bb.minY + 300, orbit.target.y - dir.y * 1200));
    cam.position.set(x, y, KOZ);
    qarashQoy();
    oldingiVaqt = performance.now();
    if (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) joystik(true);
    sp._startLoop();
  }
  function yurishChiqish() {
    joystik(false);
    tugma.clear(); qarash = null;
    if (saqla) { sp.cam3d.position.copy(saqla.pos); orbit.target.copy(saqla.tgt); sp.cam3d.lookAt(saqla.tgt); saqla = null; }
    sp._controls = orbit;
    orbit.enabled = sp.mode === '3d';
    orbit.update();
    sp._invalidate();
  }
  function qarashQoy() {
    const cam = sp.cam3d;
    const f = v2.set(Math.cos(yaw) * Math.cos(pitch), Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch));
    cam.lookAt(v1.copy(cam.position).add(f));
    sp._invalidate();
  }
  function yurishDown(e) {
    if (sp.mode !== '3d') return;
    if (joyEl && joyEl.contains(e.target)) return;
    e.stopPropagation(); e.preventDefault();
    qarash = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }
  function yurishMove(e) {
    if (!qarash || e.pointerId !== qarash.id) return;
    yaw -= (e.clientX - qarash.x) * 0.0045;
    pitch = Math.max(-1.35, Math.min(1.35, pitch - (e.clientY - qarash.y) * 0.0045));
    qarash.x = e.clientX; qarash.y = e.clientY;
    qarashQoy();
  }
  function yurishUp(e) { if (qarash && e.pointerId === qarash.id) qarash = null; }
  window.addEventListener('pointermove', yurishMove);
  const KEY = { w: 'f', W: 'f', ArrowUp: 'f', s: 'b', S: 'b', ArrowDown: 'b', a: 'l', A: 'l', ArrowLeft: 'l', d: 'r', D: 'r', ArrowRight: 'r', 'ц': 'f', 'ы': 'b', 'ф': 'l', 'в': 'r' };
  function onKey(e) {
    if (holat.kamera !== 'yurish') return;
    const tg = (e.target && e.target.tagName || '').toLowerCase();
    if (tg === 'input' || tg === 'textarea') return;
    const k = KEY[e.key];
    if (!k) return;
    e.preventDefault();
    if (e.type === 'keydown') tugma.add(k); else tugma.delete(k);
  }
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  function onWheel(e) {
    if (holat.kamera !== 'yurish') return;
    e.preventDefault(); e.stopPropagation();
    yur(e.deltaY < 0 ? 300 : -300, 0);
  }
  host.addEventListener('wheel', onWheel, { passive: false, capture: true });
  function yur(oldga, yonga) {
    const cam = sp.cam3d, bb = sp.bbox;
    const fx = Math.cos(yaw), fy = Math.sin(yaw);
    cam.position.x = Math.min(bb.maxX - 150, Math.max(bb.minX + 150, cam.position.x + fx * oldga + fy * yonga));
    cam.position.y = Math.min(bb.maxY - 150, Math.max(bb.minY + 150, cam.position.y + fy * oldga - fx * yonga));
    qarashQoy();
  }
  function yurishKadr() {
    const now = performance.now(), dt = Math.min(0.1, (now - oldingiVaqt) / 1000);
    oldingiVaqt = now;
    let f = 0, s = 0;
    if (tugma.has('f')) f += 1; if (tugma.has('b')) f -= 1; if (tugma.has('l')) s -= 1; if (tugma.has('r')) s += 1;
    if (joy) { f += joy.f; s += joy.s; }
    if (f || s) yur(f * QADAM * dt, s * QADAM * dt);
  }
  /* telefon: chap pastda joystik */
  function joystik(on) {
    if (!on) { if (joyEl) { joyEl.remove(); joyEl = null; } joy = null; return; }
    if (joyEl) return;
    joyEl = document.createElement('div');
    joyEl.setAttribute('data-joystik', '');
    joyEl.style.cssText = 'position:absolute;left:16px;bottom:16px;width:112px;height:112px;border-radius:50%;background:rgba(23,50,57,.75);border:1px solid rgba(255,255,255,.18);z-index:5;touch-action:none';
    const dot = document.createElement('div');
    dot.style.cssText = 'position:absolute;left:36px;top:36px;width:40px;height:40px;border-radius:50%;background:#5FE1C4;opacity:.9;pointer-events:none';
    joyEl.appendChild(dot);
    const q = { id: null };
    const yangila = (e) => {
      const r = joyEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2);
      const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      joy = { f: -dy, s: dx };
      dot.style.left = (36 + dx * 36) + 'px'; dot.style.top = (36 + dy * 36) + 'px';
    };
    joyEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); q.id = e.pointerId; joyEl.setPointerCapture(e.pointerId); yangila(e); });
    joyEl.addEventListener('pointermove', (e) => { if (q.id === e.pointerId) yangila(e); });
    const tamom = (e) => { if (q.id !== e.pointerId) return; q.id = null; joy = null; dot.style.left = '36px'; dot.style.top = '36px'; };
    joyEl.addEventListener('pointerup', tamom); joyEl.addEventListener('pointercancel', tamom);
    (host.closest('[data-scene]') || host).appendChild(joyEl);
  }

  /* ── kamera rejimi ── */
  function kamera(k) {
    if (!['orbit', 'yurish', 'orto'].includes(k) || k === holat.kamera) return;
    const oldin = holat.kamera;
    holat.kamera = k;
    if (oldin === 'yurish') yurishChiqish();
    if (oldin === 'orto' && sp.cam3o) { sp.cam3d.position.copy(sp.cam3o.position); sp.cam3d.quaternion.copy(sp.cam3o.quaternion); }
    if (k === 'yurish') { yurishKirish(); return; }
    const cam = sp.setOrto(k === 'orto', orbit.target);
    orbit.object = cam;
    orbit.update();
    sp._invalidate();
  }

  /* rejim (2D/3D) almashsa — xona va kamera qayta qo'llanadi */
  sp.on('toggle', () => {
    if (sp.mode !== '3d' && holat.kamera === 'yurish') { holat.kamera = 'orbit'; yurishChiqish(); }
    if (sp.mode === '3d' && holat.kamera === 'orto') orbit.object = sp.cam3o || sp.cam3d;
    xonaFasad();
  });

  return {
    holat,
    /** qisman holat: { kamera, fon, chizish, rentgen, xona, fasadsiz, olchash } */
    set(p) {
      if (p.kamera) kamera(p.kamera);
      if ('fon' in p) holat.fon = p.fon;
      if (p.chizish) holat.chizish = p.chizish;
      if ('rentgen' in p) holat.rentgen = !!p.rentgen;
      if ('xona' in p) holat.xona = !!p.xona;
      if ('fasadsiz' in p) holat.fasadsiz = !!p.fasadsiz;
      if ('olchash' in p) { holat.olchash = !!p.olchash; if (!holat.olchash) olchashTozala(); }
      qollash();
    },
    qollash, yonalish, zoom, toliqEkran,
    onOlcham(fn) { opts.onOlcham = fn; },
    get oxirgiOlcham() { return oxirgiOlcham; },
    dispose() {
      yurishChiqish(); olchashTozala();
      el.removeEventListener('dblclick', onDbl);
      host.removeEventListener('pointerdown', onCaptureDown, true);
      host.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointermove', yurishMove);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      sp.scene.remove(gOlch);
      qirraMat.dispose(); olchashMat.dispose(); nuqtaMat.dispose();
    }
  };
}
