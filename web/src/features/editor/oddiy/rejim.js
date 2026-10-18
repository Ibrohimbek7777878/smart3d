import { get, set, useSlice } from '../../../store/index.js';
import { TELEGRAM } from '../../../app/bridge/telegram.js';
const tor = () => typeof matchMedia === 'function' && matchMedia('(max-width:980px)').matches;

/* Oddiy rejim (mijoz uchun): ish joyida faqat 4 qadam — Xona, Tayyor, Rang, Narx. Rejim foydalanuvchida (localStorage,
 * loyihaga ta'sir qilmaydi). Sukut: admin — Usta; Telegram mini-app (admin emas) — Oddiy; boshqalar — Usta
 * (serverda "usta"/"mijoz" roli yo'q: faqat user | admin — shuning uchun aniq qoida yo'q, hammaga Usta). */
export const KALIT = 's3d-rejim';
export const QADAMLAR = ['xona', 'tayyor', 'rang', 'narx'];

export function saqlangan() {
  try { const v = localStorage.getItem(KALIT); return v === 'oddiy' || v === 'usta' ? v : null; } catch (_) { return null; }
}

/** joriy rejim oddiymi (saqlangan tanlov; bo'lmasa — sukut qoida) */
export function oddiyMi() {
  const r = get().rejim, u = get().auth.user, tanlov = r && r.tanlov;
  if (tanlov) return tanlov === 'oddiy';
  return !!TELEGRAM && !(u && u.role === 'admin');
}

/** rejimni almashtirish: foydalanuvchida saqlanadi; asboblar tozalanadi */
export function rejimTanla(oddiy) {
  const v = oddiy ? 'oddiy' : 'usta';
  try { localStorage.setItem(KALIT, v); } catch (_) { /* saqlanmasa ham joriy sessiyada ishlaydi */ }
  set('rejim', { tanlov: v, panel: undefined });
  if (oddiy) {
    if (get().chizish.ochiq) set('chizish', { ochiq: false });
    set('ishjoyi', { asbob: 'tanlash', nuqtalar: [], teshikTur: null, tahrir: null, tanlov: null });
    if (get().korinish.olchash) set('korinish', { olchash: false });
  }
}

/** ochiq qadam panel: 0 — yopiq, 1..4; belgilanmagan bo'lsa — kompyuterda Xona, telefonda yopiq */
export const oddiyPanel = () => { const p = get().rejim.panel; return p === undefined ? (tor() ? 0 : 1) : p; };
export const oddiyQadam = (n) => set('rejim', { panel: n });

export function useRejim() {
  const r = useSlice('rejim'), a = useSlice('auth');
  const tanlov = r.tanlov;
  const oddiy = tanlov ? tanlov === 'oddiy' : !!TELEGRAM && !(a.user && a.user.role === 'admin');
  const panel = r.panel === undefined ? (tor() ? 0 : 1) : r.panel;
  return { oddiy, panel };
}
