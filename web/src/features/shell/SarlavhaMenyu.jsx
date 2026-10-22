import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { t, til, TILLAR, setTil } from '../../i18n/index.js';
import Ikon from '../../shared/ui/Ikon.jsx';

/* Telefonda (≤560px) admin sarlavhasi sig'maydi: "Til" va "Admin panel" tugmalari shu bitta ixcham "Menyu" ikonasiga yig'iladi
 * (sarlavha.css qolganlarini yashiradi). Kompyuterda bu tugma ko'rinmaydi. Menyu uslubi — TilMenyu bilan bir xil (karta, 44px qator).
 * Portal — sarlavhadagi backdrop-filter "fixed" qatlamni sarlavhaga qamab qo'ymasligi uchun. Esc/tashqarini bosish/o'lcham o'zgarishi — yopadi. */
export default function SarlavhaMenyu({ goAdmin }) {
  const [pos, setPos] = useState(null);
  useEffect(() => {
    if (!pos) return undefined;
    const yop = () => setPos(null);
    const esc = (ev) => { if (ev.key === 'Escape') { ev.preventDefault(); yop(); } };   // preventDefault — umumiy Esc (klaviatura.js) ishlamasin
    window.addEventListener('keydown', esc, true); window.addEventListener('resize', yop);
    return () => { window.removeEventListener('keydown', esc, true); window.removeEventListener('resize', yop); };
  }, [pos]);
  const och = (ev) => { const r = ev.currentTarget.getBoundingClientRect(); setPos({ top: Math.round(r.bottom + 8), right: Math.round(window.innerWidth - r.right) }); };
  const yop = () => setPos(null);
  const qator = { height: '44px', padding: '0 12px', borderRadius: '12px', border: '0', color: 'var(--txt)', fontWeight: '700', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' };
  const cur = til();
  const ildiz = typeof document !== 'undefined' ? (document.querySelector('[data-s3a]') || document.body) : null;
  return (
    <>
      <button onClick={och} data-sarl="menyu" aria-label={t('sarlavha.menyu')} aria-haspopup="menu" aria-expanded={!!pos} style={{"width":"44px","height":"44px","borderRadius":"14px","background":"var(--sfc)","border":"1px solid var(--line)","color":"var(--txt)","cursor":"pointer","display":"none","placeItems":"center","padding":"0","flex":"0 0 auto"}}>
        <Ikon n="menyu" size={19} gap={0} />
      </button>
      {pos && ildiz ? createPortal(
        <>
          <div onClick={yop} style={{ position: 'fixed', inset: '0', zIndex: '95' }}></div>
          <div role="menu" data-sarl="menyu-royxat" aria-label={t('sarlavha.menyu')} style={{ position: 'fixed', top: pos.top + 'px', right: pos.right + 'px', zIndex: '96', minWidth: '200px', padding: '6px', borderRadius: '16px', background: 'var(--sfc)', border: '1px solid var(--line)', boxShadow: '0 20px 50px rgba(0,0,0,.45)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {TILLAR.map(([kod, nom]) => (
              <button key={kod} role="menuitemradio" aria-checked={kod === cur} lang={kod} onClick={() => { setTil(kod); yop(); }}
                style={{ ...qator, background: kod === cur ? 'var(--sfc2)' : 'transparent', justifyContent: 'space-between' }}>
                <span>{nom}</span>
                {kod === cur ? <Ikon n="tayyor" size={16} gap={0} style={{ color: 'var(--acct)' }} /> : null}
              </button>))}
            <div role="separator" style={{ height: '1px', margin: '4px 6px', background: 'var(--line)' }}></div>
            <button role="menuitem" data-sarl="menyu-admin" onClick={() => { yop(); goAdmin(); }} style={{ ...qator, background: 'transparent', color: 'var(--acct)' }}>
              <Ikon n="sozlash" size={18} gap={0} /><span>{t('admin.sarlavha')}</span>
            </button>
          </div>
        </>, ildiz) : null}
    </>
  );
}
