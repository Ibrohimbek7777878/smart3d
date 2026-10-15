import { get, set } from './index.js';

/* TZ-19: umumiy oynalar — qisqa xabar (toast), tasdiq oynasi, pastki varaq. Har modul shu orqali chaqiradi. */
let toastTimer = 0;

/** qisqa xabar — 3 soniya */
export function toast(text) {
  clearTimeout(toastTimer);
  set('ui', { toast: text });
  toastTimer = setTimeout(() => set('ui', { toast: '' }), 3000);
}

/** tasdiq oynasi: { title, text, ok, danger, yes } */
export function confirm(o) { set('ui', { cf: o }); }
export function confirmNo() { set('ui', { cf: null }); }
export function confirmYes() {
  const cf = get().ui.cf, yes = cf && cf.yes;
  set('ui', { cf: null });
  if (yes) yes();
}

/** pastki varaq (dizaynda yo'q qismlar): kind — 'teshik' | 'shakl' | 'material' | 'oshxona', qolgani — varaq maydonlari */
export function openSheet(kind, fields) { set('ui', { vq: { kind, ...fields } }); }
export function patchSheet(patch) { set('ui', s => ({ vq: s.vq ? { ...s.vq, ...patch } : s.vq })); }
export function closeSheet() { set('ui', { vq: null }); }
