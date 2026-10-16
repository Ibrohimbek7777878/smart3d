import { useSlice } from '../../store/index.js';
import { goProjects } from '../projects/actions.js';
import { openSettings } from '../settings/actions.js';
import { goStep } from './actions.js';
import { t } from '../../i18n/index.js';

const STEPS = ['qadam.xona', 'qadam.mebel', 'qadam.narx', 'qadam.fayllar'];

/** muharrir qadamlari: joriy — urg'u, o'tilgan — belgi (ikon) */
export function useEditorNav() {
  const ed = useSlice('editor');
  return {
    nav: STEPS.map((label, i) => {
      const n = i + 1, on = ed.step === n, dn = ed.done[n];
      return { label: t(label), mark: n, done: !!dn && !on, go: () => goStep(n),
        bg: on ? 'var(--sfc2)' : 'transparent', c: on ? 'var(--txt)' : 'var(--mut)',
        nb: on ? 'var(--acc)' : dn ? 'rgba(95,225,196,.18)' : 'var(--sfc)', nc: on ? 'var(--ink)' : dn ? 'var(--cyan)' : 'var(--mut)' };
    }),
    goProjects, settingsToast: () => openSettings()
  };
}
