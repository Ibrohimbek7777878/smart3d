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
  orbit.enabled = false;                       // 2Dda o'chiq
  if (sp.theme && sp.theme.orbit) Object.assign(orbit, sp.theme.orbit);   // TZ-09: mavzu (masofa, burchak chegarasi)
  sp._controls = orbit;

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
    }
  }
  window.addEventListener('keydown', onKeyDown);

  /* ── Rejim almashganda OrbitControls'ni yoqish/o'chirish ───────────── */
  sp.on('toggle', () => {
    orbit.enabled = sp.mode === '3d';
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