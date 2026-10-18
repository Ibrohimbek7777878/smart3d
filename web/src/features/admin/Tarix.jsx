import React from 'react';
import { t } from '../../i18n/index.js';
import { useTarix, SUZGICH } from './useTarix.js';
import { karta, sarlavha, izoh, ghost, mono, chipU } from './stil.js';

/* TZ-37 (f): audit ro'yxati — kim, qachon, bo'lim, eski → yangi; "Qaytarish" (tasdiq bilan) */
export default function Tarix() {
  const h = useTarix();
  return (
    <section style={karta} data-admin-bolim="tarix">
      <span style={sarlavha}>{t('admin.tarix_sarlavha')}</span>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {SUZGICH.map(b => <button key={b || 'hammasi'} onClick={() => h.setBolim(b)} aria-pressed={h.bolim === b} data-tarix-suzgich={b} style={chipU(h.bolim === b)}>{b ? t('admin.bolim_' + b) : t('admin.hammasi')}</button>)}
      </div>
      {!h.r ? <span style={izoh}>{t('admin.yuklanmoqda')}</span> : null}
      {h.r && !h.r.length ? <span style={izoh}>{t('admin.tarix_bosh')}</span> : null}
      {(h.r || []).map(x => (
        <div key={x.id} data-tarix-qator={x.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '10px', borderTop: '1px solid var(--line)', minWidth: '0' }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', fontSize: '13px' }}>
            <span><b>{x.kim}</b> · {x.bolim}{x.kalit ? ' · ' : ''}<span style={mono}>{x.kalit}</span></span>
            <span style={{ color: 'var(--mut)' }}>{h.sana(x.vaqt)}</span>
          </span>
          <span style={{ ...mono, color: 'var(--mut)', overflowWrap: 'anywhere' }}>{x.eski} → <span style={{ color: 'var(--txt)' }}>{x.yangi}</span></span>
          <div><button onClick={() => h.qaytar(x)} data-tarix-qaytar={x.id} style={ghost}>{t('admin.qaytarish')}</button></div>
        </div>))}
    </section>
  );
}
