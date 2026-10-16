import { set } from './index.js';
import { project } from './project.js';
import { toast } from './ui.js';
import { createSession } from '../../../app/js/auth-core.js';
import { t, serverXato } from '../i18n/index.js';

/* TZ-19: server bilan sessiya — auth-core.js (eski sayt bilan umumiy: kirish, avtomatik saqlash, internetsiz navbat,
 * loyihalar). Bu yerda faqat ilova holatiga ulanadi. */
/* saqlash belgisi izohi tanlangan tilda (auth-core o'zbekcha beradi — eski sayt bilan umumiy) */
function saqlashIzoh(kind, title) {
  const s = String(title || '');
  if (kind === 'busy') return t('sarlavha.saqlanmoqda');
  if (s.startsWith('Saqlandi')) return t('sarlavha.saqlandi', { vaqt: s.slice(-5) });
  if (s === 'Serverdan ochildi') return t('sarlavha.serverdan');
  if (s.startsWith('Internet yo')) return t('sarlavha.internet_yoq');
  const m = /^(.*) · (S3D-[A-Z]+-\d{3})$/.exec(s);
  return m ? serverXato(m[1], m[2]) + ' · ' + m[2] : s;
}

export const S = createSession({
  cookie: true,                                   // TZ-19 X2: kalit httpOnly cookie'da, JS ko'rmaydi
  toast: (matn, kind, code) => toast(serverXato(matn, code), code),   // server xatosi — kodi bilan (server o'zi jurnalga yozgan)
  onState: (kind, title) => set('auth', { save: kind ? { kind, title: saqlashIzoh(kind, title) } : null }),
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
