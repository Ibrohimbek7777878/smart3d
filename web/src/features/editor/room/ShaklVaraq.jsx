import React from 'react';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { input, btnPrimary, btnGhost, delBtn } from '../../../shared/ui/styles.js';
import { useShaklVaraq } from './shakl.js';

/* TZ-09 8-bosqich (dizaynda yo'q): erkin shakl — burchak nuqtalari. Dizayn bo'laklari: 52px input, tugmalar. */
export default function ShaklVaraq() {
  const s = useShaklVaraq();
  return (<>
    <span style={{ fontSize: '13px', color: 'var(--mut)' }}>Xona burchaklari, mm — soat strelkasiga qarshi yoki bo'yicha, ketma-ket. Kamida 3 nuqta.</span>
    <div style={{ maxHeight: '38vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {s.nuqtalar.map((p, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 36px', gap: '8px', alignItems: 'center' }}>
          <b style={{ textAlign: 'center' }}>{i + 1}</b>
          <input type="number" inputMode="numeric" aria-label={'X ' + (i + 1)} value={p.x} onChange={p.onX} style={{ ...input, height: '44px' }} />
          <input type="number" inputMode="numeric" aria-label={'Y ' + (i + 1)} value={p.y} onChange={p.onY} style={{ ...input, height: '44px' }} />
          <button aria-label={'Nuqtani o\'chirish ' + (i + 1)} onClick={p.del} disabled={!p.canDel} style={{ ...delBtn, opacity: p.canDel ? 1 : 0.35 }}><Ikon n="yopish" size={16} gap={0} style={{ verticalAlign: 'middle' }} /></button>
        </div>))}
    </div>
    <div style={{ display: 'flex', gap: '8px' }}>
      <button onClick={s.qoshNuqta} style={btnGhost}>+ Nuqta</button>
      <button onClick={s.lShakl} style={btnGhost}><Ikon n="lShakl" size={15} />L-shakl</button>
      <button onClick={s.qolla} style={{ ...btnPrimary, flex: '1' }}>Qo'llash</button>
    </div>
  </>);
}
