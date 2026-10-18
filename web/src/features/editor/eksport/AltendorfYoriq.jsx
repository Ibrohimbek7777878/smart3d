import React from 'react';
import { t } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { btnPrimary, card, hint } from '../../../shared/ui/styles.js';
import { closeSheet } from '../../../store/ui.js';
import { faylYukla } from '../files/actions.js';

/* Egasi #223: «Altendorf» — .gibcut (Altendorf arrasi fayli) GibLab'ning yopiq formati (kesim xaritasi shifrlangan), Smart3D uni yoza olmaydi.
 * Yo'l: Smart3D → GibLab (.project) → GibLab → Altendorf. Matnli reja — alohida «Kesim rejasi (matn)» (kesimReja). */
const qadamlar = () => [t('altendorf.q1'), t('altendorf.q2'), t('altendorf.q3')];

export default function AltendorfYoriq() {
  return (<>
    <span style={{ fontSize: '14px', color: 'var(--txt)' }}>{t('altendorf.kirish')}</span>
    <ol data-altendorf-yoriq="" style={{ margin: '0', padding: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {qadamlar().map((matn, i) => (
        <li key={i} style={{ ...card, padding: '12px 14px', display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '14px' }}>
          <span style={{ flex: '0 0 28px', height: '28px', borderRadius: '999px', background: 'var(--sfc2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '13px', color: 'var(--acc)' }}>{i + 1}</span>
          <span style={{ paddingTop: '4px', minWidth: '0', overflowWrap: 'anywhere' }}>{matn}</span>
        </li>))}
    </ol>
    <span style={{ ...hint, display: 'flex', gap: '8px' }}><span style={{ display: 'flex', paddingTop: '1px', color: 'var(--acc)' }}><Ikon n="ogohlantirish" size={16} gap={0} /></span>{t('altendorf.eslatma')}</span>
    <button data-altendorf-yukla="" onClick={() => { faylYukla('giblab'); closeSheet(); }} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
      <Ikon n="bazis" size={18} gap={0} />{t('altendorf.yuklab')}
    </button>
  </>);
}
