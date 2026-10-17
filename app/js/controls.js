/* static/client_erp/js/sunpin/sp-controls.js — SUNPIN KAMERA VA REJIM BOSHQARUVI.
 *
 * VAZIFA (S-D3):
 *   · 3D uchun `OrbitControls` (aylanish, siljish, masshtab);
 *   · 2D uchun o'z qo'limizda pan + zoom (frustum mm'da — B4);
 *   · `N` yoki `2D|3D` tugmasi bilan rejim almashuvi — **qayta qurish yo'q**;
 *   · `F` — kamerani chizma ga sig'dirish; `Escape` — tanlovni bekor qilish.
 *
 * MUHIM (qo'llanma):
 *   `N` tugmasi **matn maydonida** yozilganda rejimni almashtirMASIN —
 *   aks holda loyiha nomi yozilayotganda sahnа birdan 3D ga o'tadi.
 *
 * ISHLATISH:
 *   import { attachControls } from './sp-controls.js';
 *   const ui = attachControls(sp, { container: document.body });
 *   ui.setModeButtons(btn2d, btn3d);
 */
import { OrbitControls } from '../vendor/three/addons/controls/OrbitControls.js';

/** Klaviatura yozilayotgan elementlarda `N`/`F` ishlamasin. */
function isTypingTarget(el) {
  if (!el) return false;
  const tag = (el.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable === true;
}

export function attachControls(sp, opts = {}) {
  if (!sp) throw new Error('sp-controls: sp-scene kerak');
  const el = sp.renderer.domElement;           // 2D zoom chegarasi — scene.zoomAt() da

  /* ── 3D: OrbitControls (faqat 3D rejimda ishlaydi) ─────────────────── */
  const orbit = new OrbitControls(sp.cam3d, el);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.12;
  orbit.target.set(0, 0, 0);
  orbit.minDistance = 500;
  orbit.maxDistance = 60000;
  orbit.zoomToCursor = true;                   // kursor turgan nuqtaga yaqinlashadi (r160)
  orbit.zoomSpeed = 1;                         // qadam o'zimizning wheel boshqaruvida (pastda) — shu yerda emas
  orbit.enabled = false;                       // 2Dda o'chiq
  if (sp.theme && sp.theme.orbit) Object.assign(orbit, sp.theme.orbit);   // TZ-09: mavzu (masofa, burchak chegarasi)
  const MAX_BAZA = orbit.maxDistance;          // sahna o'lchamiga moslangan chegara shundan oshmaydi
  sp._controls = orbit;
  /* TZ-23 A1 tuzatish (egasi #132): sahna faqat "qayta chiz" buyrug'ida chiziladi — kamera sichqoncha, g'ildirak yoki
     barmoq bilan o'zgarganda ham shu buyruq beriladi (oldin berilmasdi: aylantirganda ekran qotib turardi) */
  orbit.addEventListener('change', () => sp._invalidate());

  /* ── 2D: sichqoncha va barmoq (TZ-SAYT-BARQARORLIK-RESPONSIVE §4.2) ──
   *  · bo'sh joyni sudrash (1 barmoq / chap tugma) — pan; o'rta tugma yoki Shift — har doim pan;
   *  · 2 barmoq — pinch-zoom + pan; g'ildirak — zoom;
   *  · ikki marta tegish / dblclick bo'sh joyda — sig'dirish.
   *  Mebel ustidagi bosish items.js ga qoldiriladi (opts.hitTest). */
  const pts = new Map();                        // faol pointerlar: id → {x, y}
  let panning = false, pinch = null;
  let lastTap = { t: 0, x: 0, y: 0 };

  function onWheel(e) {
    if (sp.mode !== '2d') return;               // 3Dda OrbitControls ishlaydi
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    sp.zoomAt(factor, e.clientX, e.clientY);
  }

  function pinchState() {
    const [a, b] = Array.from(pts.values());
    return { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }

  function onPointerDown(e) {
    if (sp.mode !== '2d') return;               // 3D — OrbitControls'ning ishi
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    el.setPointerCapture && el.setPointerCapture(e.pointerId);
    if (pts.size === 2) { panning = false; pinch = pinchState(); return; }   // ikkinchi barmoq
    if (pts.size > 2) return;
    const forcePan = e.button === 1 || e.shiftKey;
    if (!forcePan && opts.hitTest && opts.hitTest(e)) return;              // mebel — items.js
    panning = true;
    if (e.pointerType !== 'mouse') {            // ikki marta tegish — sig'dirish
      const now = performance.now();
      if (now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
        sp.fit(); lastTap.t = 0;
      } else lastTap = { t: now, x: e.clientX, y: e.clientY };
    }
  }
  function onPointerMove(e) {
    const prev = pts.get(e.pointerId);
    if (!prev || sp.mode !== '2d') return;
    const cur = { x: e.clientX, y: e.clientY };
    pts.set(e.pointerId, cur);
    if (pinch && pts.size >= 2) {
      const now = pinchState();
      sp.panBy(now.mx - pinch.mx, now.my - pinch.my);
      sp.zoomAt(now.dist / pinch.dist, now.mx, now.my);
      pinch = now;
    } else if (panning) {
      sp.panBy(cur.x - prev.x, cur.y - prev.y);
    }
  }
  function onPointerUp(e) {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    try { el.releasePointerCapture && el.releasePointerCapture(e.pointerId); } catch (err) { /* jim */ }
    if (pts.size < 2) pinch = null;
    if (pts.size === 0) panning = false;        // pinch'dan keyin qolgan barmoq pan qilmaydi (sakrash yo'q)
  }
  function onDblClick(e) {
    if (sp.mode === '2d' && !(opts.hitTest && opts.hitTest(e))) sp.fit();
  }

  el.addEventListener('wheel', onWheel, { passive: false });

  /* ── 3D zoom: silliq va boshqariladigan (TZ zoom, egasi 2026-10-17: "juda tez va sifatsiz") ─────────────────────
   *  Oldin: OrbitControls har g'ildirak hodisasida masofani DARHOL 5% (dpr=1) yoki 2.5% (dpr=2) ga o'zgartirardi — tez
   *  aylantirganda sakrash, trackpadda esa tartibsiz. Endi:
   *   · g'ildirak/pinch hodisasi "kutilayotgan zoom" (logarifm) ga qo'shiladi: 1 qadam (deltaY=100 yoki Firefox satr 3×33) ≈ 4.5%,
   *     bir hodisa ≤ 8%, jami to'plangan ≤ 22% (tez aylantirganda kamera "uchib ketmaydi");
   *   · har kadrda kutilayotganning bir qismi (eksponensial, τ=75 ms, kadr tezligiga bog'liq emas) OrbitControls'ga
   *     sintetik wheel sifatida beriladi — kursor nuqtasiga yaqinlashish (zoomToCursor) o'z holicha ishlaydi;
   *   · kadrlar OrbitControls 'change' → _invalidate orqali chiziladi, to'xtaguncha (inertsiya so'nguncha). */
  const ZOOM = { qadam: 0.00045, pinch: 0.004, hodisa: 0.08, jami: 0.25, tau: 75, klaviatura: 0.105 };
  const LN095 = Math.log(1 / 0.95);
  let pend = 0, zx = 0, zy = 0, zt = 0, synth = false;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function zoomQosh(l, x, y) {
    pend = clamp(pend + l, -ZOOM.jami, ZOOM.jami); zx = x; zy = y;
    sp._startLoop(); sp._invalidate();
  }
  function onWheel3D(e) {
    if (synth || sp.mode !== '3d' || !orbit.enabled || !orbit.enableZoom) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? el.clientHeight : 1);
    zoomQosh(clamp(-dy * (e.ctrlKey ? ZOOM.pinch : ZOOM.qadam), -ZOOM.hodisa, ZOOM.hodisa), e.clientX, e.clientY);
  }
  el.addEventListener('wheel', onWheel3D, { passive: false, capture: true });
  /* ── Zoom chegaralari: uzoqda sahna nuqtadek bo'lmasin, yaqinda kamera mebel/devor ichiga kirmasin ───────────── */
  const YAQIN_MIN = 400;                       // mm: kamera istalgan sirtdan shuncha yaqin kelmaydi
  const T = sp.THREE, _box = new T.Box3(), _sph = new T.Sphere(), _ray = new T.Raycaster(), _v = new T.Vector3(), _bs = [];
  let sahnaR = null, sahnaT = 0;
  const korinadi = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
  /** Ko'rinuvchi modullar qutilari (hitBox'siz) */
  function modulQutilar() {
    _bs.length = 0;
    const g = sp.groups && sp.groups.items; if (!g) return _bs;
    for (const ch of g.children) {
      if (!ch.visible || (ch.userData && ch.userData.kind === 'hitBox')) continue;
      const b = new T.Box3().setFromObject(ch); if (!b.isEmpty()) _bs.push(b);
    }
    return _bs;
  }
  function sahnaOlcha() {
    const qs = modulQutilar(); _box.makeEmpty();
    for (const b of qs) _box.union(b);
    const w = sp.groups && sp.groups.walls3d;
    if (w && w.children.length) { const wb = new T.Box3().setFromObject(w); if (!wb.isEmpty()) _box.union(wb); }
    if (_box.isEmpty()) { sahnaR = null; return; }
    _box.getBoundingSphere(_sph);
    const cam = sp.cam3d, vf = (cam.fov * Math.PI) / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * (cam.aspect || 1));
    const dFit = _sph.radius / Math.sin(Math.min(vf, hf) / 2);
    sahnaR = { maxD: clamp(dFit * 1.3, 3000, MAX_BAZA) };
  }
  /** Kamera hozirgi joyida mebel yoki devordan >= YAQIN_MIN uzoqdami (ichida emas) */
  function bosh() {
    const cam = sp.cam3d, p = cam.position;
    for (const b of modulQutilar()) {
      if (b.clone().expandByScalar(YAQIN_MIN - 20).containsPoint(p)) return false;
    }
    const nishon = [];
    const add = (g) => g && g.traverse(o => { if (o.isMesh && !(o.userData && o.userData.kind === 'hitBox') && korinadi(o)) nishon.push(o); });
    add(sp.groups.items); add(sp.groups.walls3d);
    const c = sp.renderer.domElement.getBoundingClientRect();
    const nurlar = [[0, 0], [((zx - c.left) / c.width) * 2 - 1, -((zy - c.top) / c.height) * 2 + 1]];
    for (const [nx, ny] of nurlar) {
      _v.set(nx, ny, 0.5).unproject(cam).sub(p).normalize();
      _ray.set(p, _v); _ray.near = 0; _ray.far = YAQIN_MIN;
      if (_ray.intersectObjects(nishon, false).length) return false;
    }
    return true;
  }
  function zoomKadr() {
    if (sp.mode !== '3d') { pend = 0; return; }
    /* sahna o'lchamiga mos chegara: sahnani (xona + modullar) ekranga to'liq sig'diradigan masofa × 1.3 (kamida 3 m) */
    const bb = sp.bbox, diag = Math.hypot(bb.w, bb.h, 2700);
    const nowMs = performance.now();
    if (nowMs - sahnaT > 250 || !sahnaR) { sahnaT = nowMs; sahnaOlcha(); }
    orbit.maxDistance = sahnaR ? sahnaR.maxD : clamp(diag * 3 + 3000, 6000, MAX_BAZA);
    if (pend) {
      const now = performance.now(), dt = clamp(zt ? now - zt : 16, 1, 50); zt = now;
      let part = pend * (1 - Math.exp(-dt / ZOOM.tau));
      if (Math.abs(pend) < 0.003) part = pend;
      pend -= part; if (pend === part) pend = 0;
      const dy = -Math.sign(part) * Math.abs(part) / LN095 * 100;     // getZoomScale(dy) = 0.95^(|dy|/100)
      const oldPos = sp.cam3d.position.clone(), oldTgt = orbit.target.clone();
      synth = true;
      try { el.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, clientX: zx, clientY: zy, bubbles: true, cancelable: true })); }
      finally { synth = false; }
      if (part > 0) {                           // yaqinlashish: sirtga/ichiga kirib ketmasin — chegarada silliq to'xta
        orbit.update();
        if (!bosh()) { sp.cam3d.position.copy(oldPos); orbit.target.copy(oldTgt); orbit.update(); pend = 0; }
      }
    } else zt = 0;
    /* near/far masofaga qarab: uzoqda z-fighting bo'lmasin, yaqinda kesilib qolmasin */
    const cam = sp.cam3d;
    if (!sp.orto && cam.isPerspectiveCamera) {
      const R = diag / 2, c = _c.set(bb.cx, bb.cy, 1000), dc = cam.position.distanceTo(c);
      const near = clamp(dc > R ? (dc - R) * 0.5 : dc * 0.01, 5, 2000);
      const far = dc + R * 2 + 1000;
      if (Math.abs(near - cam.near) > cam.near * 0.02 || Math.abs(far - cam.far) > cam.far * 0.02) {
        cam.near = near; cam.far = far; cam.updateProjectionMatrix();
        sp._invalidate();
      }
    }
  }
  const _c = new sp.THREE.Vector3();
  sp.on('frame', zoomKadr);
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('dblclick', onDblClick);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  /* ── Klaviatura: N (rejim), F (sig'dirish), Esc (bekor) ───────────── */
  function onKeyDown(e) {
    if (isTypingTarget(e.target)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === 'n' || e.key === 'N' || e.key === 'т' || e.key === 'Т') {
      e.preventDefault();
      const ms = sp.toggle();
      updateButtons();
      opts.onToggle && opts.onToggle(sp.mode, ms);
    } else if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') {
      e.preventDefault();
      sp.fit();
    } else if (e.key === 'Escape') {
      opts.onEscape && opts.onEscape();
    } else if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_' || e.code === 'NumpadAdd' || e.code === 'NumpadSubtract') {
      const ichkari = e.key === '+' || e.key === '=' || e.code === 'NumpadAdd';
      const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (sp.mode === '3d' && orbit.enabled) { e.preventDefault(); zoomQosh((ichkari ? 1 : -1) * ZOOM.klaviatura, x, y); }
      else if (sp.mode === '2d') { e.preventDefault(); sp.zoomAt(ichkari ? 1.25 : 0.8, x, y); }
    }
  }
  window.addEventListener('keydown', onKeyDown);

  /* ── Rejim almashganda OrbitControls'ni yoqish/o'chirish ───────────── */
  sp.on('toggle', () => {
    orbit.enabled = sp.mode === '3d';
    pend = 0;
    if (sp.mode === '3d') {
      const t = sp.camTarget ? sp.camTarget() : [sp.bbox.cx, sp.bbox.cy, 0];   // TZ-09: mavzu o'z markazini beradi
      orbit.target.set(t[0], t[1], t[2]);
      orbit.update();
      sp._startLoop();                       // damping uchun doimiy sikl
    } else {
      sp._stopLoop();
      sp._render();
    }
  });

  /* ── Tugmalar (ixtiyoriy) ─────────────────────────────────────────── */
  let btn2d = null, btn3d = null;
  function updateButtons() {
    if (btn2d) btn2d.classList.toggle('is-active', sp.mode === '2d');
    if (btn3d) btn3d.classList.toggle('is-active', sp.mode === '3d');
  }
  function setModeButtons(b2, b3) {
    btn2d = b2 || null; btn3d = b3 || null;
    if (btn2d) btn2d.addEventListener('click', () => { sp.setMode('2d'); updateButtons(); });
    if (btn3d) btn3d.addEventListener('click', () => { sp.setMode('3d'); updateButtons(); });
    updateButtons();
  }

  /* Boshlang'ich holatga moslashtir */
  orbit.enabled = sp.mode === '3d';
  if (sp.mode === '3d') sp._startLoop();
  updateButtons();

  return {
    orbit,
    get mode() { return sp.mode; },
    setModeButtons,
    updateButtons,
    /** Sahna tashqarisidan (masalan undo) kamera tiklash */
    fit() { sp.fit(); },
    dispose() {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('wheel', onWheel3D, { capture: true });
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      orbit.dispose();
    }
  };
}