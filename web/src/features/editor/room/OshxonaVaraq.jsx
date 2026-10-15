import React from 'react';
import { SonMaydon } from '../../../shared/ui/Chiplar.jsx';
import { btnPrimary } from '../../../shared/ui/styles.js';
import { useOshxonaVaraq } from './oshxona.js';

/* TZ-09 8-bosqich (dizaynda yo'q): oshxona elementlari (⚙ Sozlash). Dizayn bo'laklari: 52px input, asosiy tugma. */
export default function OshxonaVaraq() {
  const s = useOshxonaVaraq();
  return (<>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '8px' }}>{s.maydonlar.map((f, i) => <SonMaydon key={i} f={f} />)}</div>
    <button onClick={s.saqla} style={btnPrimary}>Saqlash</button>
  </>);
}
