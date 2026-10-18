import { get, set } from '../store/index.js';
import { confirmNo, closeSheet } from '../store/ui.js';
import { closeAi } from '../features/editor/ai/actions.js';
import { closePart } from '../features/editor/scene/actions.js';
import { select } from '../features/editor/actions.js';
import { korinishOzgar } from '../features/editor/scene/korinish.js';
import { asbobTanla } from '../features/editor/ishjoyi/devorAsbob.js';
import { chizishYop } from '../features/editor/chizish/chizish.js';
import { bekorQil, qaytar } from '../features/editor/bekor.js';

/* TZ-19 §5 (qulaylik): Esc — eng ustdagi oynani yopadi: til menyusi → tasdiq → varaq → AI → "Ichini ko'rish" → detal kartasi → tanlov.
 * TZ-27: "orqaga" (brauzer va sichqoncha tugmasi, app/tarix.js) — shu tartib, keyin rejim va panellar ham. → true agar yopilsa */
export function yopiqQil(orqaga = false) {
  const s = get(), app = s.nav.screen === 'app';
  if (s.ui.tilMenu) set('ui', { tilMenu: null });
  else if (s.ui.cf) confirmNo();
  else if (s.ui.vq) closeSheet();
  else if (s.ai.open) closeAi();
  else if (s.ins.id) set('ins', { id: null });
  else if (app && s.editor.part) closePart();
  else if (orqaga && app && s.korinish.kamera === 'yurish') korinishOzgar({ kamera: 'orbit' });
  else if (orqaga && app && s.korinish.olchash) korinishOzgar({ olchash: false });
  else if (orqaga && app && (s.ishjoyi.tahrir || s.ishjoyi.tanlov)) set('ishjoyi', { tahrir: null, tanlov: null });
  else if (orqaga && app && s.ishjoyi.asbob !== 'tanlash') asbobTanla('tanlash');
  else if (orqaga && app && s.chizish.ochiq) chizishYop();
  else if (app && s.editor.sel) select(null);
  else if (orqaga && app && s.editor.step) set('editor', { step: 0 });
  else return false;
  return true;
}

/** matn maydoni fokusda — brauzerning o'z bekor qilishi ishlaydi, bizniki emas */
const matnMaydoni = (el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName || ''));

export function installKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented) return;
    if (e.key === 'Escape') { if (yopiqQil(false)) e.preventDefault(); return; }
    /* bekor qilish: Ctrl+Z (Mac — Cmd+Z); qaytarish: Ctrl+Shift+Z yoki Ctrl+Y. e.code — rus/boshqa klaviatura tartibida ham */
    if (!(e.ctrlKey || e.metaKey) || e.altKey || matnMaydoni(e.target)) return;
    const k = String(e.key || '').toLowerCase(), z = e.code === 'KeyZ' || k === 'z', y = e.code === 'KeyY' || k === 'y';
    if (!z && !y) return;
    const ok = (z && !e.shiftKey) ? bekorQil() : qaytar();
    if (ok || get().nav.screen === 'app') e.preventDefault();
  });
}
