import React from 'react';
import { Chiplar } from '../../../shared/ui/Chiplar.jsx';
import { input, listRow, hint } from '../../../shared/ui/styles.js';
import { useMaterialVaraq } from './material.js';

/* TZ-09 8-bosqich (dizaynda yo'q): material turi va ERP plitasi — dizayndagi chipdagi ▾. */
export default function MaterialVaraq() {
  const s = useMaterialVaraq();
  const rowBtn = { ...listRow, width: '100%', border: '0', borderTop: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left' };
  return (<>
    <span style={hint}>Material turi</span>
    <Chiplar list={s.turlar} />
    <span style={hint}>ERP plitasi — haqiqiy narx va varaq o'lchami</span>
    <input value={s.q} onChange={s.onQ} placeholder="Qidiruv: nom yoki SKU (masalan Egger, W1000)" style={input} />
    <div style={{ maxHeight: '36vh', overflow: 'auto' }}>
      <button onClick={s.demo} style={{ ...rowBtn, background: 'none', color: s.demoOn ? 'var(--acct)' : 'var(--txt)' }}>
        <span>— Bazaviy narx (materials.json)</span><span>{s.demoOn ? '✓' : ''}</span></button>
      {s.plitalar.map((p, i) => (
        <button key={i} onClick={p.pick} style={{ ...rowBtn, background: p.on ? 'rgba(255,122,69,.12)' : 'none', color: 'var(--txt)' }}>
          <span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontWeight: '700' }}>{p.name}</span><span style={{ fontSize: '12px', color: 'var(--mut)' }}>{p.sub}</span></span>
          <span style={{ fontWeight: '800', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{p.price}</span>
        </button>))}
      {!s.plitalar.length ? <div style={{ ...listRow, color: 'var(--mut)' }}>Topilmadi</div> : null}
    </div>
  </>);
}
