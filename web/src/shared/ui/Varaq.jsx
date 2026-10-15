import React from 'react';
import { iconBtn } from './styles.js';
import Ikon from './Ikon.jsx';

/* TZ-19: pastdan chiqadigan varaq — dizayndagi AI oynasi qobig'i (fon, 28px radius, tutqich, × tugma).
 * AI oynasi va dizaynda yo'q varaqlar (teshik, shakl, material, oshxona) shuni ishlatadi. */
export default function Varaq({ title, label, kind, onClose, children }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: '0', zIndex: '60', background: 'rgba(4,12,15,.55)' }}></div>
      <div role="dialog" aria-modal="true" aria-label={label || title} data-varaq={kind} style={{ position: 'fixed', left: '50%', bottom: '0', zIndex: '61', transform: 'translateX(-50%)', width: 'min(640px,100%)', maxHeight: '92vh', overflow: 'auto', background: 'var(--sfc)', border: '1px solid var(--line)', borderBottom: '0', borderRadius: '28px 28px 0 0', padding: '12px 20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 -20px 60px rgba(0,0,0,.4)' }}>
        <span style={{ alignSelf: 'center', width: '44px', height: '5px', borderRadius: '9px', background: 'var(--sfc3)' }}></span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center' }}>{title}</span>
          <button onClick={onClose} aria-label="Yopish" style={{ ...iconBtn, background: 'var(--sfc2)' }}><Ikon n="yopish" size={18} gap={0} /></button>
        </div>
        {children}
      </div>
    </>
  );
}
