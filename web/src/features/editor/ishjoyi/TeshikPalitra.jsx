import React, { useState } from 'react';
import { useSlice } from '../../../store/index.js';
import { t } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { teshikTanla, teshikTashla } from './devorAsbob.js';

/* TZ-25 D3 (dizaynda yo'q — dizayn tokenlari bilan): eshik va deraza palitrasi. Tugmani devorga sudrab tashlang
 * (sichqoncha va barmoq) yoki tanlab, devorga bosing. Sahna ustida, chapda; faqat "Eshik va deraza" asbobida. */
const TURLAR = [['door', 'eshik', 'xona.eshik', 'var(--cyan)'], ['window', 'deraza', 'xona.deraza', 'var(--lav)']];

export default function TeshikPalitra() {
  const ij = useSlice('ishjoyi');
  const [sud, setSud] = useState(null);                    // { tur, x, y } — sudralayotgan belgi
  if (ij.asbob !== 'teshik') return null;
  const bosh = (tur) => (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    const x0 = e.clientX, y0 = e.clientY;
    let x = x0, y = y0;
    const harakat = (ev) => { x = ev.clientX; y = ev.clientY; if (Math.hypot(x - x0, y - y0) > 6) setSud({ tur, x, y }); };
    const tugadi = () => {
      window.removeEventListener('pointermove', harakat); window.removeEventListener('pointerup', tugadi); window.removeEventListener('pointercancel', tugadi);
      setSud(null);
      if (Math.hypot(x - x0, y - y0) > 6) teshikTashla(tur, x, y); else teshikTanla(tur);
    };
    window.addEventListener('pointermove', harakat); window.addEventListener('pointerup', tugadi); window.addEventListener('pointercancel', tugadi);
  };
  const s = sud && TURLAR.find(x => x[0] === sud.tur);
  return (
    <>
      <div data-teshik-palitra="" style={{ position: 'absolute', left: '12px', top: '64px', zIndex: '4', display: 'flex', gap: '6px', padding: '6px', borderRadius: '16px', background: 'rgba(23,50,57,.92)', border: '1px solid var(--line)' }}>
        {TURLAR.map(([tur, ik, k, rang]) => {
          const on = ij.teshikTur === tur;
          return (
            <button key={tur} onPointerDown={bosh(tur)} data-palitra={tur} aria-pressed={on}
              style={{ minHeight: '48px', padding: '0 14px', borderRadius: '12px', border: on ? '2px solid ' + rang : '1px solid var(--line)', background: on ? 'var(--sfc2)' : 'var(--sfc)', color: 'var(--txt)', fontWeight: '800', fontSize: '14px', cursor: 'grab', display: 'flex', alignItems: 'center', touchAction: 'none', userSelect: 'none' }}>
              <span style={{ color: rang, display: 'flex' }}><Ikon n={ik} size={18} /></span>{t(k)}
            </button>
          );
        })}
      </div>
      {s ? <div aria-hidden="true" style={{ position: 'fixed', left: sud.x, top: sud.y, transform: 'translate(-50%,-50%)', zIndex: '70', pointerEvents: 'none', padding: '8px 12px', borderRadius: '12px', background: 'var(--sfc)', border: '2px solid ' + s[3], color: 'var(--txt)', fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,.4)' }}>
        <span style={{ color: s[3], display: 'flex' }}><Ikon n={s[1]} size={16} /></span>{t(s[2])}
      </div> : null}
    </>
  );
}
