import React from 'react';
import { t } from '../../../i18n/index.js';
import { btnPrimary, card, hint } from '../../../shared/ui/styles.js';
import { useOshxonaVaraq } from './oshxona.js';

/* egasi #166 (dizaynda yo'q — egasi skrinshot bilan tasdiqlaydi, 3.3): AI oshxona — nima tushunildi.
 * Dizayn bo'laklari: karta, izoh matni (KonstruktorVaraq bilan bir xil). */
export default function OshxonaVaraq() {
  const s = useOshxonaVaraq();
  return (<div data-ai-oshxona="" style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <ul style={{ margin: '0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px' }}>
        {s.qatorlar.map((z, j) => (
          <li key={j} data-manba={z.manba} style={z.diqqat ? { color: 'var(--danger)', fontWeight: '700' } : { color: 'var(--txt)' }}>
            {z.matn} <span style={{ ...hint, fontSize: '12px' }}>· {s.manba(z.manba)}</span>
          </li>))}
      </ul>
    </div>
    {s.tugma ? <button data-baribir-chiz="" onClick={s.tugma.bos} style={btnPrimary}>{s.tugma.label}</button> : null}
    {s.katalog ? null : <span style={hint}>{t('ai.osh_izoh')}</span>}
  </div>);
}
