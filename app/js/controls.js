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
  const el = sp.renderer.domElement;
  const MIN_SCALE = 0.05, MAX_SCALE = 40;      // 2D zoom chegarasi

  /* ── 3D: OrbitControls (faqat 3D rejimda ishlaydi) ─────────────────── */
  const orbit = new OrbitControls(sp.cam3d, el);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.12;
  orbit.target.set(0, 0, 0);
  orbit.minDistance = 500;
  orbit.maxDistance = 60000;
  orbit.enabled = false;                       // 2Dda o'chiq
  sp._controls = orbit;

  /* ── 2D: g'ildirak = zoom, chapdrag = pan ─────────────────────────── */
  let dragging = false, lastX = 0, lastY = 0, pointerId = null;
  let scale2d = 1;                              // hozirgi zoom (cheklash uchun)

  function onWheel(e) {
    if (sp.mode !== '2d') return;               // 3Dda OrbitControls ishlaydi
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    sp.zoomAt(factor, e.clientX, e.clientY);
  }

  function onPointerDown(e) {
    if (sp.mode !== '2d') return;               // 3D — OrbitControls'ning ishi
    // O'ng tugma yoki o'rta tugma = ko'chirish; chap tugma = tanlash (S-D4)
    if (e.button !== 0 && e.button !== 1) return;
    dragging = true; pointerId = e.pointerId;
    lastX = e.clientX; lastY = e.clientY;
    el.setPointerCapture && el.setPointerCapture(pointerId);
  }
  function onPointerMove(e) {
    if (!dragging || sp.mode !== '2d') return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    if (e.shiftKey || e.buttons & 4) {         // o'rta tugma
      sp.panBy(dx, dy);
    }
  }
  function onPointerUp(e) {
    if (pointerId !== null && el.releasePointerCapture) {
      try { el.releasePointerCapture(pointerId); } catch (err) { /* jim */ }
    }
    dragging = false; pointerId = null;
  }

  // ← chapdrag bilan pan (chizma joyini ko'chirish)
  function onAltDragStart(e) {
    if (sp.mode !== '2d') return;
    if (!(e.altKey || e.button === 1)) return;
  }

  el.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

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
      orbit.target.set(sp.bbox.cx, sp.bbox.cy, 0);
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
    get scale2d() { return scale2d; },
    setModeButtons,
    updateButtons,
    /** Sahna tashqarisidan (masalan undo) kamera tiklash */
    fit() { sp.fit(); },
    dispose() {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      orbit.dispose();
    }
  };
}