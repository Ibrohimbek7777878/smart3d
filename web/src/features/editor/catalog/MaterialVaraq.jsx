import React from 'react';
import { t } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { Chiplar } from '../../../shared/ui/Chiplar.jsx';
import { input, listRow, hint, btnGhost } from '../../../shared/ui/styles.js';
import { useMaterialVaraq } from './material.js';

/* TZ-09 8-bosqich → TZ-23 E (dizaynda yo'q; dizayn bo'laklari: chip, 52px input, ro'yxat qatori):
 * qism (korpus, polka, fasad, orqa, stoleshnitsa) → material turi → rang palitrasi va qalinlik → ERP plitalari.
 * Bazis loyihasida (vq.bazis) — fayldagi bitta materialni almashtirish (qismlarsiz). */
const NUQTA = (rang) => ({ width: '18px', height: '18px', flex: '0 0 18px', borderRadius: '6px', background: rang || 'transparent', border: rang ? '1px solid rgba(0,0,0,.25)' : '1px dashed var(--mut)' });

export default function MaterialVaraq() {
  const s = useMaterialVaraq();
  const rowBtn = { ...listRow, width: '100%', border: '0', borderTop: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left' };
  const amal = { ...btnGhost, height: '40px', fontSize: '13px' };
  return (<>
    {s.qismlar.length ? <div data-material-qism=""><Chiplar list={s.qismlar} /></div> : null}
    <div data-material-joriy="" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
      <span style={NUQTA(s.joriyRang)}></span>
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}>
        <span style={{ fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.joriy}</span>
        <span style={{ fontSize: '12px', color: 'var(--mut)' }}>{s.doira}</span>
      </span>
    </div>
    {s.umumiy || s.hammasiga || s.loyihaga || s.loyihadagi || s.asli ? (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {s.umumiy ? <button data-material-umumiy="" onClick={s.umumiy} style={amal}>{t('mebel.umumiy_material')}</button> : null}
        {s.hammasiga ? <button data-material-hammasiga="" onClick={s.hammasiga} style={amal}>{t('mebel.hammasiga')}</button> : null}
        {s.loyihaga ? <button data-material-loyihaga="" onClick={s.loyihaga} style={amal}>{t('mebel.loyihaga')}</button> : null}
        {s.loyihadagi ? <button data-material-loyihadagi="" onClick={s.loyihadagi} style={amal}>{t('mebel.loyihadagi')}</button> : null}
        {s.asli ? <button data-material-asli="" onClick={s.asli} style={amal}>{t('mebel.bazis_asliga')}</button> : null}
      </div>) : null}
    <span style={hint}>{t('mebel.material_turi')}</span>
    <Chiplar list={s.turlar} />
    <span style={hint}>{t('mebel.rang')}</span>
    <div data-material-rang=""><Chiplar list={s.ranglar} /></div>
    {s.qalinlik.length ? (<>
      <span style={hint}>{t('mebel.qalinlik')}</span>
      <div data-material-qalinlik=""><Chiplar list={s.qalinlik} /></div>
    </>) : null}
    <span style={hint}>{t('mebel.erp_plitasi_haqiqiy_narx_va')}</span>
    <input value={s.q} onChange={s.onQ} placeholder={t('mebel.qidiruv_nom_yoki_sku_masalan')} style={input} />
    <div data-material-royxat="" style={{ maxHeight: '36vh', overflow: 'auto' }}>
      {s.plitalar.map((p, i) => (
        <button key={i} onClick={p.pick} style={{ ...rowBtn, background: p.on ? 'rgba(255,122,69,.12)' : 'none', color: 'var(--txt)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '0' }}>
            <span style={NUQTA(p.rang)}></span>
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}><span style={{ fontWeight: '700' }}>{p.name}</span><span style={{ fontSize: '12px', color: 'var(--mut)' }}>{p.sub}</span></span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{p.price}{p.on ? <Ikon n="tayyor" size={16} gap={0} /> : null}</span>
        </button>))}
      {!s.plitalar.length ? <div style={{ ...listRow, color: 'var(--mut)' }}>{t('mebel.topilmadi')}</div> : null}
      {s.jami ? <div style={{ ...listRow, color: 'var(--mut)', fontSize: '12px' }}>{s.jami}</div> : null}
    </div>
  </>);
}
