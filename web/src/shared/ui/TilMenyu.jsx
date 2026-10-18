import React from 'react';
import { TILLAR, til, setTil } from '../../i18n/index.js';
import Ikon from './Ikon.jsx';

/* TZ-18: til tanlash menyusi — sarlavhadagi 🌐 tugmasi ostida (dizayn tokenlari: karta, 44px qator, urg'u rangi).
 * pos — { top, right } (tugma joyi); tashqarini bosish yoki Esc — yopiladi. */
export default function TilMenyu({ pos, onClose }) {
  if (!pos) return null;
  const cur = til();
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: '0', zIndex: '95' }}></div>
      <div role="menu" aria-label="Til / Язык / Language" style={{ position: 'fixed', top: pos.top + 'px', right: pos.right + 'px', zIndex: '96', minWidth: '180px', padding: '6px', borderRadius: '16px', background: 'var(--sfc)', border: '1px solid var(--line)', boxShadow: '0 20px 50px rgba(0,0,0,.45)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {TILLAR.map(([kod, nom]) => (
          <button key={kod} role="menuitemradio" aria-checked={kod === cur} lang={kod} onClick={() => { setTil(kod); onClose(); }}
            style={{ height: '44px', padding: '0 12px', borderRadius: '12px', border: '0', background: kod === cur ? 'var(--sfc2)' : 'transparent', color: 'var(--txt)', fontWeight: '700', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', textAlign: 'left' }}>
            <span>{nom}</span>
            {kod === cur ? <Ikon n="tayyor" size={16} gap={0} style={{ color: 'var(--acct)' }} /> : null}
          </button>))}
      </div>
    </>
  );
}
