import { get, set } from './index.js';
import { report } from '../shared/lib/jurnal.js';
import { t } from '../i18n/index.js';

/* TZ-19: umumiy oynalar — qisqa xabar (toast), tasdiq oynasi, pastki varaq. Har modul shu orqali chaqiradi. */
let toastTimer = 0;

/** qisqa xabar — 3 soniya (xato bo'lsa — 5 soniya, kodi bilan) */
export function toast(text, code) {
  clearTimeout(toastTimer);
  set('ui', { toast: text, toastCode: code || '' });
  toastTimer = setTimeout(() => set('ui', { toast: '', toastCode: '' }), code ? 5000 : 3000);
}

/** foydalanuvchiga ko'rinadigan xato: tushunarli matn + kod; jurnalga ham yoziladi.
 *  o: { matn (ko'rinadigan matn, bo'lmasa — kod matni), modul, err, xabar (jurnal uchun) } */
export function xato(code, o = {}) {
  const matn = o.matn || t('xato.' + code);
  report(code, { modul: o.modul, err: o.err, xabar: o.xabar || matn });
  toast(matn, code);
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
