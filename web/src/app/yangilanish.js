import { project } from '../store/project.js';
import { S } from '../store/session.js';
import { toast } from '../store/ui.js';
import { t } from '../i18n/index.js';

/* Yangi versiya o'zi yuklanadi: service worker yangilansa (clientsClaim + skipWaiting) sahifa BIR marta qayta yuklanadi.
 * Himoya:
 *  - birinchi o'rnatishda (oldin controller yo'q) qayta yuklanmaydi;
 *  - tsikl yo'q: sessionStorage'da oxirgi qayta yuklash vaqti, 30 soniyadan ichida ikkinchisi bo'lmaydi;
 *  - tahrir yo'qolmaydi: qayta yuklash faqat "xavfsiz"da — ish joyi bo'sh YOKI kirgan va hamma narsa serverga saqlangan.
 *    Saqlanmagan o'zgarish bo'lsa avval S.flush(), saqlanguncha kutiladi. Mehmon (kirmagan) ishi bor bo'lsa serverga
 *    saqlab bo'lmaydi — avtomatik qayta yuklanmaydi, faqat xabar beriladi (yangi kod keyingi ochishda baribir olinadi). */
const KEY = 's3d-yangilandi', TEKSHIRUV = 10 * 60 * 1000;

export function xavfsizmi() {
  const ish = project.doc && project.doc.placements && project.doc.placements.length > 0;
  if (!ish) return true;
  return S.loggedIn && S.ready && !S.dirty;
}

export function yangilanishniKuzat() {
  const sw = typeof navigator !== 'undefined' && navigator.serviceWorker;
  if (!sw) return;
  let boshqaruvchiBor = !!sw.controller, kutmoqda = false, xabarBerildi = false;

  const urin = () => {
    if (xavfsizmi()) {
      let oxirgi = 0; try { oxirgi = +sessionStorage.getItem(KEY) || 0; } catch (_) { /* yo'q */ }
      if (Date.now() - oxirgi < 30000) { setTimeout(urin, 30000 - (Date.now() - oxirgi) + 200); return; }   // tsikldan himoya: kamida 30 s oralig'i
      try { sessionStorage.setItem(KEY, String(Date.now())); } catch (_) { /* yo'q */ }
      location.reload();
      return;
    }
    if (S.loggedIn && S.ready) { S.flush().catch(() => {}); setTimeout(urin, 2500); return; }   // saqlanguncha kut
    if (!xabarBerildi) { xabarBerildi = true; toast(t('yangilanish.tayyor')); }
    setTimeout(urin, 10000);                                          // mehmon ishi: kirib saqlasa — o'tadi
  };

  sw.addEventListener('controllerchange', () => {
    if (!boshqaruvchiBor) { boshqaruvchiBor = true; return; }          // birinchi o'rnatish
    if (kutmoqda) return;
    kutmoqda = true; urin();
  });

  const tekshir = () => { sw.getRegistration().then(r => r && r.update()).catch(() => {}); };
  tekshir();
  setInterval(tekshir, TEKSHIRUV);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tekshir(); });
}
