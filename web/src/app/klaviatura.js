import { get, set } from '../store/index.js';
import { confirmNo, closeSheet } from '../store/ui.js';
import { closeAi } from '../features/editor/ai/actions.js';
import { closePart } from '../features/editor/scene/actions.js';
import { select } from '../features/editor/actions.js';

/* TZ-19 §5 (qulaylik): Esc — eng ustdagi oynani yopadi: tasdiq → varaq → AI → "Ichini ko'rish" → detal kartasi → tanlov. */
export function installKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    const s = get();
    if (s.ui.cf) confirmNo();
    else if (s.ui.vq) closeSheet();
    else if (s.ai.open) closeAi();
    else if (s.ins.id) set('ins', { id: null });
    else if (s.nav.screen === 'app' && s.editor.part) closePart();
    else if (s.nav.screen === 'app' && s.editor.sel) select(null);
    else return;
    e.preventDefault();
  });
}
