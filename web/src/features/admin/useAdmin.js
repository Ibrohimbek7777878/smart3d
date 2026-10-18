import { useEffect } from 'react';
import { useSlice, set } from '../../store/index.js';
import { S } from '../../store/session.js';
import { goProjects } from '../projects/actions.js';
import { openAdmin, adminMi, BOLIMLAR } from './actions.js';

/** admin qobig'i: kim kirgan, qaysi bo'lim, til menyusi */
export function useAdmin() {
  const nav = useSlice('nav'), auth = useSlice('auth');
  const bolim = BOLIMLAR.includes(nav.adminBolim) ? nav.adminBolim : 'narxlar';
  const user = auth.user || null;
  /* kirgan, lekin foydalanuvchi hali kelmagan (/api/me) — "yuklanmoqda"; kelgach role tekshiriladi */
  const holat = !S.loggedIn ? 'kirmagan' : !user ? 'yuklanmoqda' : adminMi(user) ? 'admin' : 'yoq';
  useEffect(() => { if (holat === 'kirmagan') set('nav', { screen: 'login' }); }, [holat]);
  return {
    holat, bolim, open: openAdmin, back: goProjects,
    tilMenu: (ev) => { const r = ev.currentTarget.getBoundingClientRect(); set('ui', { tilMenu: { top: Math.round(r.bottom + 8), right: Math.round(window.innerWidth - r.right) } }); }
  };
}
