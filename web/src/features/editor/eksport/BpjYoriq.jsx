import React from 'react';
import { t } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { btnPrimary, card, hint } from '../../../shared/ui/styles.js';
import { closeSheet } from '../../../store/ui.js';
import { faylYukla } from '../files/actions.js';

/* TZ-33 B1 (dizaynda yo'q — varaq uslubida): "Bazis (.bpj)" — 3 qadamli yo'riqnoma va yuklab olish.
 * Eksport mantig'i o'zgarmaydi (services/eksport.js bpj, TZ-17); .b3d faylni Bazis'ning o'zi yozadi. */
const qadamlar = () => [t('bpj.q1'), t('bpj.q2'), t('bpj.q3')];

export default function BpjYoriq() {
  return (<>
    <span style={{ fontSize: '14px', color: 'var(--txt)' }}>{t('bpj.kirish')}</span>
    <ol data-bpj-yoriq="" style={{ margin: '0', padding: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {qadamlar().map((matn, i) => (
        <li key={i} style={{ ...card, padding: '12px 14px', display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '14px' }}>
          <span style={{ flex: '0 0 28px', height: '28px', borderRadius: '999px', background: 'var(--sfc2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '13px', color: 'var(--acc)' }}>{i + 1}</span>
          <span style={{ paddingTop: '4px', minWidth: '0', overflowWrap: 'anywhere' }}>{matn}</span>
        </li>))}
    </ol>
    <span style={{ ...hint, display: 'flex', gap: '8px' }}><span style={{ display: 'flex', paddingTop: '1px', color: 'var(--acc)' }}><Ikon n="ogohlantirish" size={16} gap={0} /></span>{t('bpj.sinov')}</span>
    <button data-bpj-yukla="" onClick={() => { faylYukla('bpj'); closeSheet(); }} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
      <Ikon n="bazis" size={18} gap={0} />{t('bpj.yuklab')}
    </button>
  </>);
}
