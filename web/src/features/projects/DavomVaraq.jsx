import React from 'react';
import { t } from '../../i18n/index.js';
import Ikon from '../../shared/ui/Ikon.jsx';
import { listRow, hint } from '../../shared/ui/styles.js';
import { useDavom } from './davom.js';

/* TZ-27 (dizaynda yo'q — varaq qatori uslubida): chala qolgan ishlar ro'yxati — bosilsa loyiha ochiladi */
export default function DavomVaraq() {
  const v = useDavom();
  return (<>
    <span style={hint}>{v.aloqa ? t('davom.izoh') : t('loyihalar.aloqa_yoq')}</span>
    <div data-davom-royxat="" style={{ display: 'flex', flexDirection: 'column', maxHeight: '60vh', overflow: 'auto' }}>
      {v.royxat.map(p => (
        <button key={p.id} onClick={p.och} data-davom={p.id} style={{ ...listRow, width: '100%', border: '0', borderTop: '1px solid var(--line)', background: 'none', color: 'var(--txt)', cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}>
            <span style={{ fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nom}</span>
            <span style={{ fontSize: '12px', color: 'var(--mut)' }}>{p.mijoz} · {p.mods} · {p.sana}</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto', fontWeight: '800', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
            {p.narx}<Ikon n="ong" size={16} gap={0} />
          </span>
        </button>))}
    </div>
  </>);
}
