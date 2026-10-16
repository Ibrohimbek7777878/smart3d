import React from 'react';
import { t } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { bazisYukla } from '../../bazis/bazis.js';
import { useAsboblar } from './ishjoyi.js';
import { goProjects } from '../../projects/actions.js';

/* TZ-25 A (dizaynda yo'q — muharrir qadamlari paneli uslubida: #0C1D23 fon, --sfc2 faol, --mut nofaol, --acc urg'u).
 * Chapda vertikal asboblar (Bazis kabi); telefonda — matn qatori ustida gorizontal qator. Har tugma: ikon va qisqa nom. */
const TUGMA = (on) => ({ width: '100%', minHeight: '58px', padding: '6px 2px', borderRadius: '14px', border: '0', cursor: 'pointer',
  background: on ? 'var(--sfc2)' : 'transparent', color: on ? 'var(--txt)' : 'var(--mut)', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px', fontWeight: '800', lineHeight: '1.15', textAlign: 'center' });

export default function Asboblar() {
  const v = useAsboblar();
  return (
    <nav data-asboblar="" aria-label={t('asbob.sarlavha')} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 6px', borderRight: '1px solid var(--line)', background: '#0C1D23', overflowY: 'auto' }}>
      {v.asboblar.map(a => (
        <button key={a.id} onClick={a.bos} data-asbob={a.id} aria-pressed={a.on} title={a.label} className="h3" style={TUGMA(a.on)}>
          <span style={{ color: a.on ? 'var(--acc)' : 'inherit', display: 'flex' }}><Ikon n={a.ik} size={20} gap={0} /></span>
          <span data-asbob-nom="">{a.label}</span>
        </button>
      ))}
      <label data-asbob="bazis" title={t('bazis.yuklash')} aria-busy={!!v.bazisYuk} className="h3" style={{ ...TUGMA(false), cursor: v.bazisYuk ? 'progress' : 'pointer', opacity: v.bazisYuk ? 0.6 : 1 }}>
        <Ikon n="bazis" size={20} gap={0} />
        <span data-asbob-nom="">{t('asbob.bazis')}</span>
        <input type="file" accept=".b3d,.fr3d,.bpj" disabled={!!v.bazisYuk} onChange={bazisYukla} style={{ display: 'none' }} />
      </label>
      {/* telefonda — sarlavhadagi "Loyihalar" o'rnida (sarlavha tor) */}
      <button onClick={goProjects} data-asbob="loyihalar" data-faqat-tel="" title={t('qadam.loyihalar')} className="h3" style={TUGMA(false)}>
        <Ikon n="papka" size={20} gap={0} />
        <span data-asbob-nom="">{t('qadam.loyihalar')}</span>
      </button>
    </nav>
  );
}
