import React from 'react';
import { t } from '../../i18n/index.js';
import Ikon from '../../shared/ui/Ikon.jsx';
import { input, label, btnPrimary, card, hint } from '../../shared/ui/styles.js';
import { useBuyurtmaVaraq } from './buyurtma.js';

/* TZ-23 C1 (dizaynda yo'q — varaq, 52px input, asosiy tugma, karta): sexga buyurtma */
export default function BuyurtmaVaraq() {
  const v = useBuyurtmaVaraq();
  return (<>
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '4px' }} data-buyurtma-xulosa="">
      <b>{v.loyiha}</b>
      <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '14px' }}><span style={{ color: 'var(--mut)' }}>{v.mebel}</span><b style={{ fontVariantNumeric: 'tabular-nums' }}>{v.narx}</b></span>
    </div>
    <label style={label}>{t('buyurtma.mijoz')}<input value={v.ism} onChange={v.onIsm} autoComplete="name" data-buyurtma-ism="" style={input} /></label>
    <label style={label}>{t('buyurtma.telefon')}
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><b style={{ color: 'var(--mut)' }}>+998</b>
        <input value={v.tel} onChange={v.onTel} inputMode="numeric" autoComplete="tel-national" placeholder="90 123 45 67" data-buyurtma-tel="" style={input} /></span>
    </label>
    <label style={label}>{t('buyurtma.izoh')}<textarea value={v.izoh} onChange={v.onIzoh} rows="3" data-buyurtma-izoh="" style={{ ...input, height: 'auto', padding: '12px 16px', resize: 'none' }}></textarea></label>
    <button onClick={v.yubor} disabled={v.band} data-buyurtma-yubor="" style={{ ...btnPrimary, opacity: v.band ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Ikon n="tayyor" size={18} />{t('buyurtma.yuborish')}
    </button>
    <span style={hint}>{t('buyurtma.izoh_pastda')}</span>
  </>);
}
