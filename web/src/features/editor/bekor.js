import { get, set, useSlice } from '../../store/index.js';
import { project } from '../../store/project.js';
import { toast } from '../../store/ui.js';
import { select } from './actions.js';
import { t } from '../../i18n/index.js';

/* Bekor qilish / qaytarish amallari (egasi, 2026-10-17): Ctrl+Z (Mac — Cmd+Z), Ctrl+Shift+Z yoki Ctrl+Y (app/klaviatura.js)
 * va ish joyidagi ikki ikon tugma (sarlavhada). Tarix — store/bekor.js, surat qaytarilgach 3D, narx va avtomatik saqlash
 * project.changed() orqali yangilanadi. Modul chizish oynasi ochiq bo'lsa — o'chiq (u oyna yopilganda bitta qadam bo'ladi). */
const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');

/** hozir bekor qilish/qaytarish mumkinmi (ish joyi ochiq, chizish oynasi va tasdiq oynasi yo'q) */
export function mumkin() {
  const s = get();
  return s.nav.screen === 'app' && !s.chizish.ochiq && !s.ui.cf && !!project.H;
}

/** surat qaytarilgach: o'chgan modul yoki eshik/deraza tanlovi tozalanadi (tanlov — tarixda emas) */
function tanlovniTekshir() {
  const s = get();
  if (s.editor.sel && !project.pl(s.editor.sel)) select(null);
  const tv = s.ishjoyi.tanlov, ops = (project.doc.room && project.doc.room.openings) || [];
  if (tv && tv.idx != null && !ops[tv.idx]) set('ishjoyi', { tanlov: null });
  if (s.ishjoyi.tahrir) set('ishjoyi', { tahrir: null });   // devor o'lchami tahriri — eski devor raqami bilan qolmasin
}

function bajar(qayta) {
  if (!mumkin()) return false;
  const nom = qayta ? project.tarix.qayta() : project.tarix.bekor();
  if (!nom) return false;
  tanlovniTekshir();
  const nima = t('tarix.n_' + nom);
  toast(qayta ? t('tarix.qaytarildi', { nima }) : t('tarix.bekor_qilindi', { nima }));
  return true;
}
export const bekorQil = () => bajar(false);
export const qaytar = () => bajar(true);

/** sarlavhadagi tugmalar holati */
export function useBekor() {
  const h = useSlice('tarix'), ch = useSlice('chizish'), nav = useSlice('nav');
  const on = nav.screen === 'app' && !ch.ochiq;
  return {
    bekor: { on: on && h.bekor > 0, bos: bekorQil, title: t('tarix.bekor') + (MAC ? ' (⌘Z)' : ' (Ctrl+Z)') },
    qayta: { on: on && h.qayta > 0, bos: qaytar, title: t('tarix.qayta') + (MAC ? ' (⇧⌘Z)' : ' (Ctrl+Shift+Z)') }
  };
}
