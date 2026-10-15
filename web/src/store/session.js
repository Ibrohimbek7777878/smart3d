import { set } from './index.js';
import { project } from './project.js';
import { toast } from './ui.js';
import { createSession } from '../../../app/js/auth-core.js';

/* TZ-19: server bilan sessiya — auth-core.js (eski sayt bilan umumiy: kirish, avtomatik saqlash, internetsiz navbat,
 * loyihalar). Bu yerda faqat ilova holatiga ulanadi. */
export const S = createSession({
  toast: (t, kind, code) => toast(t, code),   // server xatosi — kodi bilan (server o'zi jurnalga yozgan)
  onState: (kind, title) => set('auth', { save: kind ? { kind, title } : null }),
  onUser: (u, why) => {
    set('auth', { user: u });
    if (why === 'expired') { toast('Kirish muddati tugadi — qayta kiring'); set('nav', { screen: 'login' }); }
  },
  getPayload: () => project.payload(),
  getTotal: () => (project.res ? project.res.priceRes.total : 0),
  applyPayload: (p, meta) => project.apply(p, meta),
  hasWork: () => project.doc.placements.length > 0
});

/* har hisobdan keyin — kirgan bo'lsa 2 soniyadan keyin serverga saqlanadi */
project.onRecalc(() => S.changed());
