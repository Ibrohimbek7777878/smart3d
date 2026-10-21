import React from 'react';
import { t } from '../../i18n/index.js';
import { useTarix, SUZGICH, HOLATLAR, farq } from './useTarix.js';
import { karta, sarlavha, izoh, ghost, mono, chipU, maydon, lbl, belgi } from './stil.js';

/* TZ-37 (f; 3-faza): o'zgarishlar tarixi — filtr (bo'lim, kim, sana, holat, kalit), sahifalash, har yozuvda "Qaytarish" (tasdiq bilan). Audit va narxlar bitta ro'yxatda. */
const Farq = ({ x }) => {
  const f = farq(x.eski, x.yangi);
  return (
    <div data-tarix-farq={x.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px', ...mono, color: 'var(--mut)', overflowWrap: 'anywhere' }}>
      {f.qatorlar.map((q, i) => (
        <span key={i}>{q.k ? <b style={{ color: 'var(--txt)' }}>{q.k}: </b> : null}{q.e} → <span style={{ color: 'var(--txt)' }}>{q.y}</span></span>))}
      {f.ortiqcha ? <span>{t('admin.tarix_farq_yana', { n: f.ortiqcha })}</span> : null}
    </div>);
};

export default function Tarix() {
  const h = useTarix();
  const soni = (b) => { const x = h.r && h.r.bolimlar.find(y => y.bolim === b); return x ? x.soni : 0; };
  const bolimJami = h.r ? h.r.bolimlar.reduce((a, y) => a + y.soni, 0) : 0;
  return (
    <section style={karta} data-admin-bolim="tarix">
      <span style={sarlavha}>{t('admin.tarix_sarlavha')}</span>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {SUZGICH.map(b => (
          <button key={b || 'hammasi'} onClick={() => h.setBolim(b)} aria-pressed={h.bolim === b} data-tarix-suzgich={b} style={chipU(h.bolim === b)}>
            {b ? t('admin.bolim_' + b) : t('admin.hammasi')}{h.r ? ` · ${b ? soni(b) : bolimJami}` : ''}
          </button>))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '10px' }}>
        <label style={lbl}>{t('admin.tarix_kim')}
          <select data-tarix="kim" value={h.kim} onChange={(ev) => h.setKim(ev.target.value)} style={maydon}>
            <option value="">{t('admin.hammasi')}</option>
            {((h.r && h.r.kimlar) || []).map(k => <option key={k.id} value={String(k.id)}>{k.nom} ({k.soni})</option>)}
          </select>
        </label>
        <label style={lbl}>{t('admin.tarix_dan')}
          <input data-tarix="dan" type="date" value={h.dan} max={h.gacha || undefined} onChange={(ev) => h.setDan(ev.target.value)} style={maydon} />
        </label>
        <label style={lbl}>{t('admin.tarix_gacha')}
          <input data-tarix="gacha" type="date" value={h.gacha} min={h.dan || undefined} onChange={(ev) => h.setGacha(ev.target.value)} style={maydon} />
        </label>
        <label style={lbl}>{t('admin.tarix_holat')}
          <select data-tarix="holat" value={h.holat} onChange={(ev) => h.setHolat(ev.target.value)} style={maydon}>
            {HOLATLAR.map(v => <option key={v || 'h'} value={v}>{v ? t('admin.tarix_h_' + v) : t('admin.hammasi')}</option>)}
          </select>
        </label>
      </div>
      <input data-tarix="qidir" value={h.q} onChange={(ev) => h.setQ(ev.target.value)} maxLength={100} placeholder={t('admin.tarix_qidir_ph')} aria-label={t('admin.tarix_qidir_ph')} style={maydon} />
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={izoh} data-tarix-jami="">{h.r ? t('admin.tarix_jami', { n: h.r.jami }) : t('admin.yuklanmoqda')}</span>
        {h.filtrBor ? <button onClick={h.tozala} data-tarix="tozala" style={ghost}>{t('admin.tarix_tozala')}</button> : null}
      </span>
      {h.r && !h.r.items.length ? <span style={izoh}>{h.filtrBor ? t('admin.topilmadi') : t('admin.tarix_bosh')}</span> : null}
      {(h.r ? h.r.items : []).map(x => (
        <div key={x.id} data-tarix-qator={x.id} data-tarix-bolim={x.bolim} style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '10px', borderTop: '1px solid var(--line)', minWidth: '0', opacity: x.qaytarilgan ? 0.65 : 1 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', fontSize: '13px' }}>
            <span style={{ minWidth: '0', overflowWrap: 'anywhere' }}><b>{x.kim}</b> · {t('admin.bolim_' + x.bolim)}{x.kalit ? ' · ' : ''}<span style={mono}>{x.kalit}</span></span>
            <span style={{ color: 'var(--mut)' }}>{h.sana(x.vaqt)}</span>
          </span>
          <Farq x={x} />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {x.qaytariladi ? <button onClick={() => h.qaytar(x)} data-tarix-qaytar={x.id} style={ghost}>{t('admin.qaytarish')}</button> : null}
            {x.qaytarilgan ? <b style={belgi(false)} data-tarix-qaytarilgan={x.id}>{t('admin.tarix_h_qaytarilgan')}</b> : null}
          </div>
        </div>))}
      {h.r && h.r.items.length < h.r.jami ? <button onClick={h.yana} disabled={h.band} data-tarix="yana" style={ghost}>{t('admin.tarix_yana', { n: h.r.jami - h.r.items.length })}</button> : null}
    </section>
  );
}
