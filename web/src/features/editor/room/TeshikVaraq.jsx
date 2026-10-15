import React from 'react';
import { Chiplar, SonMaydon } from '../../../shared/ui/Chiplar.jsx';
import { btnPrimary, listRow, delBtn, hint } from '../../../shared/ui/styles.js';
import { useTeshikVaraq } from './teshik.js';

/* TZ-09 8-bosqich (dizaynda yo'q): deraza / eshik / quvur / rozetka qo'shish va o'chirish (dizayndagi "+ Qo'shish").
 * Dizayn bo'laklari: chip, 52px input, asosiy tugma. Egasi skrinshot bilan tasdiqlaydi (3.3). */
export default function TeshikVaraq() {
  const s = useTeshikVaraq();
  return (<>
    <Chiplar list={s.turlar} />
    <span style={hint}>Devor</span>
    <Chiplar list={s.devorlar} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '8px' }}>{s.maydonlar.map((f, i) => <SonMaydon key={i} f={f} />)}</div>
    <button onClick={s.qosh} style={btnPrimary}>+ Qo'shish</button>
    {s.royxat.length ? <div>{s.royxat.map((r, i) => (
      <div key={i} style={listRow}><span><b>{r.t}</b> <span style={{ color: 'var(--mut)' }}>{r.d}</span></span><button aria-label={'O\'chirish: ' + r.t} onClick={r.del} style={delBtn}>✕</button></div>))}</div> : null}
  </>);
}
