import React from 'react';
import { t } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { Chiplar } from '../../../shared/ui/Chiplar.jsx';
import { input, listRow, hint } from '../../../shared/ui/styles.js';
import { useMaterialVaraq } from './material.js';

/* TZ-09 8-bosqich (dizaynda yo'q): material turi va ERP plitasi — dizayndagi chipdagi ▾. */
export default function MaterialVaraq() {
  const s = useMaterialVaraq();
  const rowBtn = { ...listRow, width: '100%', border: '0', borderTop: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left' };
  return (<>
    <span style={hint}>{t('mebel.material_turi')}</span>
    <Chiplar list={s.turlar} />
    <span style={hint}>{t('mebel.erp_plitasi_haqiqiy_narx_va')}</span>
    <input value={s.q} onChange={s.onQ} placeholder={t('mebel.qidiruv_nom_yoki_sku_masalan')} style={input} />
    <div style={{ maxHeight: '36vh', overflow: 'auto' }}>
      <button onClick={s.demo} style={{ ...rowBtn, background: 'none', color: s.demoOn ? 'var(--acct)' : 'var(--txt)' }}>
        <span>{t('mebel.bazaviy_narx_materials_json')}</span><span>{s.demoOn ? <Ikon n="tayyor" size={16} gap={0} /> : null}</span></button>
      {s.plitalar.map((p, i) => (
        <button key={i} onClick={p.pick} style={{ ...rowBtn, background: p.on ? 'rgba(255,122,69,.12)' : 'none', color: 'var(--txt)' }}>
          <span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontWeight: '700' }}>{p.name}</span><span style={{ fontSize: '12px', color: 'var(--mut)' }}>{p.sub}</span></span>
          <span style={{ fontWeight: '800', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{p.price}</span>
        </button>))}
      {!s.plitalar.length ? <div style={{ ...listRow, color: 'var(--mut)' }}>{t('mebel.topilmadi')}</div> : null}
    </div>
  </>);
}
