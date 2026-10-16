import { get, set } from '../store/index.js';
import { project } from '../store/project.js';
import { S } from '../store/session.js';
import { readHandoff, initSession, afterLogin } from '../features/auth/actions.js';
import { loadServerStd, loadSettings } from '../features/settings/actions.js';
import { installKeyboard } from './klaviatura.js';
import { eskiKeshniTozala } from '../shared/lib/eskiKesh.js';
import { s3SetT } from '../shared/design3d/engine.js';
import { tr, setTil } from '../i18n/index.js';
import { TELEGRAM, TG_TIL } from './bridge/telegram.js';
import { telegramIshga } from '../features/telegram/telegram.js';
import { scene } from '../features/editor/scene/sahna.js';

/* TZ-19: ilova ishga tushishi — ma'lumot, saytdan o'tish (#hash), saqlangan kirish. Bir marta chaqiriladi (main.jsx). */
export function bootstrap() {
  document.body.style.background = '#0F2229';
  project.load().then(() => { if (project.H) loadServerStd(); });
  if (TELEGRAM) {                                   // TZ-16: Telegram ichida — kirish formasi o'rniga kutish ekrani
    set('nav', { screen: 'tg' });
    let tanlangan = null;
    try { tanlangan = localStorage.getItem('s3d-til'); } catch (_) { /* yo'q */ }
    if (!tanlangan && ['uz', 'ru', 'en'].includes(TG_TIL)) setTil(TG_TIL);   // Telegram tili (TZ-18 §3), birinchi chizishdan
  }
  readHandoff();
  initSession();
  if (TELEGRAM) telegramIshga(async (j) => {
    if (j.yangi) { loadSettings(); await S.afterLogin(true).catch(() => {}); set('nav', { screen: 'onb1' }); }
    else await afterLogin();
  });
  window.addEventListener('hashchange', readHandoff);
  installKeyboard();
  s3SetT(tr);                                       // TZ-18: 3D yorliqlar tanlangan tilda
  eskiKeshniTozala();
  installQA();
}

/* QA uchun (eski saytdagi window.__s3d kabi): faqat o'qish — loyiha, hisob, holat. Brauzer testlari (tests/ui/web_*.mjs) ishlatadi. */
function installQA() {
  const qa = {
    get doc() { return project.doc; },
    get res() { return project.res; },
    get H() { return project.H; },
    get state() {
      const s = get();
      return { ...s.nav, ...s.data, dataReady: s.data.ready, dataErr: s.data.err, ...s.project, ...s.editor, user: s.auth.user, loggedIn: S.loggedIn };
    },
    /** TZ-23: 3D sahna (kamera, ko'rinish) — brauzer testlari uchun */
    get sahna() { return scene.sahna; },
    nestCfg: () => project.nestCfg(),
    projectPayload: () => project.payload()
  };
  Object.defineProperty(window, '__app', { value: Object.freeze(qa), configurable: false, writable: false });
}
