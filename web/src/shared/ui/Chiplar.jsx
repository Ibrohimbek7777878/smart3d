import React from 'react';
import { chip, input, label } from './styles.js';

/* TZ-19: varaqlardagi tanlov chiplari va son maydoni (dizayn bo'laklari: chip, 52px input). */
export function Chiplar({ list }) {
  return <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>{list.map((c, i) => <button key={i} onClick={c.pick} aria-pressed={!!c.on} style={chip(c.on)}>{c.label}</button>)}</div>;
}

/** f: { label, val, on } */
export function SonMaydon({ f }) {
  return <label style={label}>{f.label}<input type="number" inputMode="decimal" value={f.val} onChange={f.on} style={input} /></label>;
}
