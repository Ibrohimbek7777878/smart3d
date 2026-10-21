/* TZ-30 (egasi #179): ilova ekranlarining manzillari — bitta manba. Ilova (app/tarix.js), vite dev/preview (vite.config.js),
 * service worker (navigateFallback) va server shu ro'yxat bo'yicha chuqur manzilni app.html ga beradi.
 * Bu modul hech narsa import qilmaydi (Node'da ham, brauzerda ham ishlaydi).
 *
 *   /kirish                 kirish (login)              /royxat               ro'yxatdan o'tish (reg)
 *   /loyihalar              "Loyihalarim"               /loyiha/yangi         yangi ish joyi
 *   /loyiha/:id             shu loyiha ish joyida       /sozlamalar           sozlamalar
 *   /sozlamalar/narxlar     sozlamalar, Narxlar bo'limi /buyurtmalar          buyurtmalar: admin — Sozlamalarda, usta — Loyihalarimda
 *   /tg                     Telegram mini-app kutish ekrani
 *   /admin, /admin/(narxlar|furnitura|materiallar|promptlar|standart|tarix)   admin panel (TZ-37; faqat role=admin, aks holda 404 ko'rinishi)
 * Kirmagan foydalanuvchi himoyalangan manzilni ochsa — /kirish?qaytish=<manzil>, kirgach o'sha manzil ochiladi. */

/** loyiha raqami — son (server bilan bir xil: server/routes/sahifalar.js ILOVA_YOLI). UUID'ga o'tilsa — ikkalasi birga kengayadi */
const ID_RE = /^\d{1,15}$/;

/** app.html beriladigan yo'llar (server, vite preview, service worker) — oxiridagi "/" bilan ham */
export const ILOVA_YOL_RE = /^\/(?:kirish|royxat|loyihalar|loyiha\/(?:yangi|\d{1,15})|sozlamalar(?:\/narxlar)?|buyurtmalar|tg|admin(?:\/(?:narxlar|furnitura|materiallar|promptlar|standart|tarix))?)\/?$/;

/** kirmasdan ochiladigan manzillar */
const OCHIQ = new Set(['kirish', 'royxat', 'tg']);

/**
 * yo'l → marshrut yoki null (ilova manzili emas: /app.html, /, noma'lum).
 * → { nom: 'kirish'|'royxat'|'loyihalar'|'yangi'|'loyiha'|'sozlamalar'|'buyurtmalar'|'tg', id?, bolim?, himoya, yol }
 */
export function yolniOqi(pathname) {
  const p = String(pathname || '').replace(/\/+$/, '') || '/';
  if (!ILOVA_YOL_RE.test(p)) return null;
  const q = p.split('/').filter(Boolean);
  let m;
  if (q[0] === 'loyiha') m = q[1] === 'yangi' ? { nom: 'yangi' } : ID_RE.test(q[1]) ? { nom: 'loyiha', id: q[1] } : null;
  else if (q[0] === 'sozlamalar') m = q[1] ? { nom: 'sozlamalar', bolim: q[1] } : { nom: 'sozlamalar' };
  else if (q[0] === 'admin') m = { nom: 'admin', bolim: q[1] || 'narxlar' };
  else m = { nom: q[0] };
  if (!m) return null;
  m.himoya = !OCHIQ.has(m.nom);
  m.yol = p;
  return m;
}

/** /kirish?qaytish=… — faqat ilovaning himoyalangan manzili (boshqa saytga yo'naltirib bo'lmaydi) */
export function qaytishniOqi(search) {
  let v = '';
  try { v = new URLSearchParams(search || '').get('qaytish') || ''; } catch (_) { return null; }
  if (!v.startsWith('/') || v.startsWith('//')) return null;
  const m = yolniOqi(v);
  return m && m.himoya ? m : null;
}

/** ekran holati → manzil. o: { screen, id (S.currentId), bolim, qaytish (kutilgan marshrut yo'li) } → yo'l yoki null */
export function ekranYoli(o) {
  const q = o.qaytish ? '?qaytish=' + encodeURIComponent(o.qaytish) : '';
  switch (o.screen) {
    case 'login': return '/kirish' + q;
    case 'reg': return '/royxat' + q;
    case 'projects': return o.bolim === 'buyurtmalar' ? '/buyurtmalar' : '/loyihalar';
    case 'settings': return o.bolim === 'buyurtmalar' ? '/buyurtmalar' : o.bolim === 'narxlar' ? '/sozlamalar/narxlar' : '/sozlamalar';
    case 'app': return o.id != null && ID_RE.test(String(o.id)) ? '/loyiha/' + o.id : '/loyiha/yangi';
    case 'onb1': case 'onb2': return '/loyiha/yangi';          // "Nima yasaymiz" (yashirilgan, TZ-25) — yangi loyiha
    case 'admin': return o.bolim && o.bolim !== 'narxlar' ? '/admin/' + o.bolim : '/admin';
    case 'tg': return '/tg';
    default: return null;
  }
}
