import React from 'react';
import { t } from '../../i18n/index.js';
import { closeSheet } from '../../store/ui.js';
import { btnPrimary, card, hint, listRow } from '../../shared/ui/styles.js';
import { useBazisVaraq } from './bazis.js';

/* TZ-21 (dizaynda yo'q — egasi skrinshot bilan tasdiqlaydi, 3.3): Bazis faylidan nima o'qildi va nima kesimga kirmadi.
 * Dizayn bo'laklari: karta, ro'yxat qatori, izoh matni, asosiy tugma. */
export default function BazisVaraq() {
  const s = useBazisVaraq();
  if (!s) return <span style={hint}>{t('bazis.yoq')}</span>;
  return (<div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
    <span style={hint}>{t('bazis.olcham', { s: s.olcham })}</span>
    <div style={card}>{s.qatorlar.map((q, i) => <div key={i} style={{ ...listRow, borderTop: i ? listRow.borderTop : '0' }}><span>{q[0]}</span><b>{q[1]}</b></div>)}</div>
    <b>{t('bazis.materiallar')}</b>
    <div style={card}>{s.materiallar.map((m, i) => (
      <div key={i} style={{ ...listRow, borderTop: i ? listRow.borderTop : '0', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
        <span style={{ fontWeight: '700' }}>{m.nom}</span><span style={hint}>{m.d}</span>
      </div>))}</div>
    {s.chiqarildi.length ? (<>
      <b>{t('bazis.chiqarildi')}</b>
      <div style={card} data-chiqarildi>{s.chiqarildi.map((c, i) => (
        <div key={i} style={{ ...listRow, borderTop: i ? listRow.borderTop : '0', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
          <span><b>{c.nom}</b> — {c.n}</span>{c.misol ? <span style={hint}>{c.misol}</span> : null}
        </div>))}</div>
    </>) : null}
    <ul style={{ margin: '0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--mut)' }}>
      {s.eslatma.map((e, i) => <li key={i}>{e}</li>)}
    </ul>
    <button onClick={closeSheet} style={btnPrimary}>{t('umumiy.yopish')}</button>
  </div>);
}
