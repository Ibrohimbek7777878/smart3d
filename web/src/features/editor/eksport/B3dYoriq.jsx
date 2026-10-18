import React from 'react';
import { t } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { btnPrimary, card, hint } from '../../../shared/ui/styles.js';
import { closeSheet } from '../../../store/ui.js';
import { faylYukla } from '../files/actions.js';

/* TZ-33 B2 (dizaynda yo'q — varaq uslubida): "Bazis (.b3d)" — SINOV: Smart3D .b3d faylni o'zi yozadi (engine/bazis/b3dYoz.js);
 * haqiqiy Bazis'da ochilishi tekshirilmagan — yo'riqnoma va yuklab olish. Uslub — BpjYoriq.jsx bilan bir xil. */
const qadamlar = () => [t('b3d.q1'), t('b3d.q2'), t('b3d.q3')];

export default function B3dYoriq() {
  return (<>
    <span style={{ fontSize: '14px', color: 'var(--txt)' }}>{t('b3d.kirish')}</span>
    <ol data-b3d-yoriq="" style={{ margin: '0', padding: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {qadamlar().map((matn, i) => (
        <li key={i} style={{ ...card, padding: '12px 14px', display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '14px' }}>
          <span style={{ flex: '0 0 28px', height: '28px', borderRadius: '999px', background: 'var(--sfc2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '13px', color: 'var(--acc)' }}>{i + 1}</span>
          <span style={{ paddingTop: '4px', minWidth: '0', overflowWrap: 'anywhere' }}>{matn}</span>
        </li>))}
    </ol>
    <span style={{ ...hint, display: 'flex', gap: '8px' }}><span style={{ display: 'flex', paddingTop: '1px', color: 'var(--acc)' }}><Ikon n="ogohlantirish" size={16} gap={0} /></span>{t('b3d.sinov')}</span>
    <button data-b3d-yukla="" onClick={() => { faylYukla('b3d'); closeSheet(); }} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
      <Ikon n="bazis" size={18} gap={0} />{t('b3d.yuklab')}
    </button>
  </>);
}
