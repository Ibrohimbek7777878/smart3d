import { get } from '../store/index.js';
import { project } from '../store/project.js';
import { S } from '../store/session.js';
import { readHandoff, initSession } from '../features/auth/actions.js';
import { loadServerStd } from '../features/settings/actions.js';
import { installKeyboard } from './klaviatura.js';
import { eskiKeshniTozala } from '../shared/lib/eskiKesh.js';

/* TZ-19: ilova ishga tushishi — ma'lumot, saytdan o'tish (#hash), saqlangan kirish. Bir marta chaqiriladi (main.jsx). */
export function bootstrap() {
  document.body.style.background = '#0F2229';
  project.load().then(() => { if (project.H) loadServerStd(); });
  readHandoff();
  initSession();
  window.addEventListener('hashchange', readHandoff);
  installKeyboard();
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
    nestCfg: () => project.nestCfg(),
    projectPayload: () => project.payload()
  };
  Object.defineProperty(window, '__app', { value: Object.freeze(qa), configurable: false, writable: false });
}
