import { set } from './index.js';
import { project } from './project.js';
import { toast } from './ui.js';
import { createSession } from '../../../app/js/auth-core.js';
import { t, serverXato } from '../i18n/index.js';

/* TZ-19: server bilan sessiya — auth-core.js (eski sayt bilan umumiy: kirish, avtomatik saqlash, internetsiz navbat,
 * loyihalar). Bu yerda faqat ilova holatiga ulanadi. */
export const S = createSession({
  cookie: true,                                   // TZ-19 X2: kalit httpOnly cookie'da, JS ko'rmaydi
  toast: (matn, kind, code) => toast(serverXato(matn, code), code),   // server xatosi — kodi bilan (server o'zi jurnalga yozgan)
  onState: (kind, title) => set('auth', { save: kind ? { kind, title } : null }),
  onUser: (u, why) => {
    set('auth', { user: u });
    if (why === 'expired') { toast(t('kirish.muddat_tugadi')); set('nav', { screen: 'login' }); }
  },
  getPayload: () => project.payload(),
  getTotal: () => (project.res ? project.res.priceRes.total : 0),
  applyPayload: (p, meta) => project.apply(p, meta),
  hasWork: () => project.doc.placements.length > 0
});

/* har hisobdan keyin — kirgan bo'lsa 2 soniyadan keyin serverga saqlanadi */
project.onRecalc(() => S.changed());
