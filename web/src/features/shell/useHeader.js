import { useSlice, set } from '../../store/index.js';
import { project } from '../../store/project.js';
import { S } from '../../store/session.js';
import { bosh } from '../../shared/lib/format.js';
import { narxKorinishi } from '../editor/pricing/narx.js';
import { goStep } from '../editor/actions.js';
import { goProjects } from '../projects/actions.js';
import { openSettings } from '../settings/actions.js';

const SAVE_IKON = { ok: 'saqlandi', busy: 'bulut', off: 'internetYoq' };   // saqlandi / saqlanmoqda / internet yo'q

/** sarlavha: logo, loyiha nomi, saqlash belgisi, narx, til, avatar */
export function useHeader() {
  const nav = useSlice('nav'), auth = useSlice('auth'), pj = useSlice('project');
  const u = auth.user || {}, sv = auth.save;
  return {
    isEditor: nav.screen === 'app',
    goProjects, goStep3: () => goStep(3), openSettings: () => openSettings(),
    avatarKey: ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openSettings(); } },
    projName: pj.name, onProjName: ev => { set('project', { name: ev.target.value }); S.changed(); },
    save: sv ? { on: true, kind: sv.kind, title: sv.title || '', ikon: SAVE_IKON[sv.kind] || 'bulut', c: sv.kind === 'off' ? 'var(--danger)' : sv.kind === 'ok' ? 'var(--cyan)' : 'var(--mut)' } : { on: false },
    price: narxKorinishi(project.res),
    /* TZ-18: 🌐 — til menyusi tugma ostida */
    tilMenu: ev => { const r = ev.currentTarget.getBoundingClientRect(); set('ui', { tilMenu: { top: Math.round(r.bottom + 8), right: Math.round(window.innerWidth - r.right) } }); },
    initials: bosh(u.name || auth.f.name, u.email)
  };
}
