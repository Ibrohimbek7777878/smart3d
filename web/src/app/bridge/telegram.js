/* TZ-16: Telegram Mini App ko'prigi — ilova Telegram ichida ochilganini aniqlaydi va Telegram skriptini yuklaydi.
 * Oddiy saytda hech narsa yuklanmaydi va hech narsa o'zgarmaydi. Telegram ilovani `#tgWebAppData=…` bilan ochadi
 * (ilova ichida hash o'zgarsa ham — shu sessiya davomida eslab qolinadi). Skript faqat telegram.org dan
 * (CSP faqat ilova sahifasi uchun shunga ruxsat beradi, server/himoya.js). */
const BELGI = 's3d-tg';
export const TG_SKRIPT = 'https://telegram.org/js/telegram-web-app.js?64';

function aniqla() {
  if (typeof window === 'undefined') return false;
  const bor = /[#&?]tgWebAppData=/.test((location.hash || '') + (location.search || ''));
  try {
    if (bor) sessionStorage.setItem(BELGI, '1');
    return bor || sessionStorage.getItem(BELGI) === '1';
  } catch (_) { return bor; }
}

/** ilova Telegram ichida ochilganmi (modul yuklanganda bir marta aniqlanadi) */
export const TELEGRAM = aniqla();

/** Telegram foydalanuvchisi tili — skript kelishini kutmasdan, hash'dagi initData'dan (faqat ko'rinish uchun; kirish — serverda) */
export const TG_TIL = (() => {
  if (!TELEGRAM) return '';
  try {
    const d = new URLSearchParams((location.hash || '').slice(1)).get('tgWebAppData') || '';
    const u = JSON.parse(new URLSearchParams(d).get('user') || 'null');
    return u && typeof u.language_code === 'string' ? u.language_code.slice(0, 2) : '';
  } catch (_) { return ''; }
})();

let W = null;
/** Telegram.WebApp (yuklangandan keyin) */
export const tg = () => W;

/** Telegram skriptini yuklash → WebApp */
export function tgYukla() {
  return new Promise((ok, no) => {
    if (window.Telegram && window.Telegram.WebApp) { W = window.Telegram.WebApp; ok(W); return; }
    const s = document.createElement('script');
    s.src = TG_SKRIPT;
    s.onload = () => { W = window.Telegram && window.Telegram.WebApp; W ? ok(W) : no(new Error('Telegram.WebApp yo\'q')); };
    s.onerror = () => no(new Error('telegram-web-app.js yuklanmadi'));
    document.head.appendChild(s);
  });
}

/** Bot API versiyasi talab qilinadigan chaqiruv: eski Telegram'da metod bo'lmasa — jim o'tadi */
export function tgChaqir(fn) { try { fn(); } catch (_) { /* eski Telegram versiyasi */ } }
