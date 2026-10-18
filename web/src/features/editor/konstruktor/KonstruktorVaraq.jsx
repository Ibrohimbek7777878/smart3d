import React from 'react';
import { t } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { Chiplar } from '../../../shared/ui/Chiplar.jsx';
import { btnPrimary, card, hint } from '../../../shared/ui/styles.js';
import { useKonstruktorVaraq } from './konstruktor.js';

/* TZ-22 (dizaynda yo'q — egasi skrinshot bilan tasdiqlaydi, 3.3): avtomatik konstruksiya varianti.
 * Dizayn bo'laklari: chip, asosiy tugma, karta, izoh matni. */
export default function KonstruktorVaraq() {
  const s = useKonstruktorVaraq();
  /* varaq (flex ustun, overflow: auto) ichida siqilmasin — variantlar ko'p bo'lsa varaq o'zi aylanadi */
  return (<div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
    <span style={hint}>{t('konstruktor.izoh_xona')}</span>
    <Chiplar list={s.shakllar} />
    <Chiplar list={s.talablar} />
    <button onClick={s.korish} style={btnPrimary}>{t('konstruktor.korish')}</button>
    {s.bosh ? <div style={card}><b>{t('konstruktor.topilmadi')}</b></div> : null}
    {(s.variantlar || []).map((v, i) => (
      <div key={i} data-variant={i} style={{ ...card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
          <b style={{ fontSize: '16px' }}>{v.nom}</b><span style={hint}>{v.sub}</span>
        </div>
        <ul style={{ margin: '0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
          {v.izohlar.map((z, j) => <li key={j} style={z.diqqat ? { color: 'var(--danger)', fontWeight: '700' } : { color: 'var(--mut)' }}>{z.matn}</li>)}
        </ul>
        {v.ogoh ? <span style={{ ...hint, color: 'var(--danger)', display: 'flex', alignItems: 'center' }}><Ikon n="ogohlantirish" size={14} />{t('konstruktor.ogoh', { n: v.ogoh })}</span> : null}
        <button onClick={v.qolla} style={btnPrimary}>{t('konstruktor.qollash')}</button>
      </div>))}
    <span style={hint}>{t('konstruktor.taklif')}</span>
  </div>);
}
