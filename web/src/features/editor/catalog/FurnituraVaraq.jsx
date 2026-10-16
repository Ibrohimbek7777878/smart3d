import React from 'react';
import { t } from '../../../i18n/index.js';
import { Chiplar } from '../../../shared/ui/Chiplar.jsx';
import { input, listRow, hint } from '../../../shared/ui/styles.js';
import { useFurnituraVaraq } from './furnitura.js';

/* TZ-23 C3 (dizaynda yo'q; dizayn bo'laklari: chip, 52px input, ro'yxat qatori — material varag'i bilan bir xil):
 * loyihadagi furnitura (soni, narxi) va ERP furnitura katalogi (qidiruv, toifa). Faqat ko'rish. */
function Qator({ r }) {
  return (
    <div style={{ ...listRow, alignItems: 'flex-start' }}>
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}>
        <span style={{ fontWeight: '700' }}>{r.name}</span><span style={{ fontSize: '12px', color: 'var(--mut)' }}>{r.sub}</span>
      </span>
      <span style={{ fontWeight: '800', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: r.yoq ? 'var(--mut)' : 'var(--txt)' }}>{r.price}</span>
    </div>
  );
}

export default function FurnituraVaraq() {
  const s = useFurnituraVaraq();
  return (<>
    <div data-furnitura-tab=""><Chiplar list={s.tablar} /></div>
    {s.tab === 'loyiha' ? (
      <div data-furnitura-loyiha="" style={{ display: 'flex', flexDirection: 'column' }}>
        {s.loyiha.map((r, i) => <Qator key={i} r={r} />)}
        {!s.loyiha.length ? <span style={hint}>{t('furnitura.loyihada_yoq')}</span> : null}
        {s.jami ? <div style={{ ...listRow, fontWeight: '800' }}><span>{s.jami}</span></div> : null}
        {s.narxsiz ? <span style={hint}>{t('furnitura.narxsiz', { n: s.narxsiz })}</span> : null}
      </div>
    ) : (<>
      <input value={s.q} onChange={s.onQ} placeholder={t('furnitura.qidiruv')} style={input} />
      <div data-furnitura-toifa=""><Chiplar list={s.toifalar} /></div>
      <div data-furnitura-katalog="" style={{ maxHeight: '44vh', overflow: 'auto' }}>
        {s.katalog.map((r, i) => <Qator key={i} r={r} />)}
        {!s.katalog.length ? <div style={{ ...listRow, color: 'var(--mut)' }}>{t('mebel.topilmadi')}</div> : null}
        {s.soni ? <div style={{ ...listRow, color: 'var(--mut)', fontSize: '12px' }}>{s.soni}</div> : null}
      </div>
    </>)}
  </>);
}
