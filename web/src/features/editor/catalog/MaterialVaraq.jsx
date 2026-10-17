import React from 'react';
import { t } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { Chiplar } from '../../../shared/ui/Chiplar.jsx';
import { input, hint, btnGhost, chip } from '../../../shared/ui/styles.js';
import { useMaterialVaraq } from './material.js';

/* TZ-09 8-bosqich → TZ-23 E → material tanlashni soddalashtirish (dizaynda yo'q; dizayn bo'laklari: chip, karta, 52px input):
 *   1) qism tablari + doira (faqat shu modul | butun loyiha);
 *   2) qidiruv, rang oilasi doiralari, ixcham "Filtr" (tur, qalinlik, standart materiallar — yig'ib qo'yilgan);
 *   3) rang plitkalari to'ri: rang oilasi bo'yicha guruhlangan, dekor nomi, qalinlik chiplari, narx;
 *   4) pastda "Tanlandi: …" qatori.
 * Bazis loyihasida (vq.bazis) — fayldagi bitta materialni almashtirish (qismlarsiz). */
const YOGOCH = 'repeating-linear-gradient(95deg, rgba(0,0,0,.10) 0 1px, transparent 1px 7px)';
const NUQTA = (rang) => ({ display: 'inline-block', width: '22px', height: '22px', flex: '0 0 22px', borderRadius: '50%', background: rang || 'transparent', border: rang ? '1px solid rgba(0,0,0,.25)' : '1px dashed var(--mut)' });

export function Plitka({ p }) {
  return (
    <div data-material-plitka="" data-on={p.on ? '1' : '0'} style={{ background: 'var(--sfc2)', borderRadius: '16px', border: p.on ? '2px solid var(--acc)' : '1px solid var(--line)', padding: p.on ? '0' : '1px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <button onClick={p.pick} aria-pressed={p.on} aria-label={p.nom} style={{ border: '0', background: 'none', color: 'var(--txt)', cursor: 'pointer', textAlign: 'left', padding: '0', display: 'flex', flexDirection: 'column', flex: '1' }}>
        <span data-material-namuna="" style={{ position: 'relative', display: 'block', height: '64px', width: '100%', background: p.rang ? (p.yogoch ? YOGOCH + ', ' + p.rang : p.rang) : 'repeating-linear-gradient(45deg, var(--sfc3) 0 6px, transparent 6px 12px)' }}>
          {p.on ? <span style={{ position: 'absolute', top: '6px', right: '6px', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--acc)', color: 'var(--ink)', display: 'grid', placeItems: 'center' }}><Ikon n="tayyor" size={14} gap={0} /></span> : null}
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '8px 10px 4px' }}>
          <span style={{ fontWeight: '800', fontSize: '13px', lineHeight: '1.25', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.nom}</span>
          <span style={{ fontSize: '11px', color: 'var(--mut)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.soni || p.sub || ' '}</span>
          <span style={{ fontSize: '13px', fontWeight: '800', fontVariantNumeric: 'tabular-nums' }}>{p.price}</span>
        </span>
      </button>
      {p.variantlar.length ? (
        <span data-material-qalinlik="" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '2px 10px 10px' }}>
          {p.variantlar.map((v, i) => <button key={i} onClick={v.pick} aria-pressed={v.on} style={{ ...chip(v.on), minHeight: '28px', padding: '0 10px', fontSize: '12px' }}>{v.label}</button>)}
        </span>) : null}
    </div>);
}

export default function MaterialVaraq() {
  const s = useMaterialVaraq();
  const amal = { ...btnGhost, height: '40px', fontSize: '13px' };
  return (<>
    <div data-material-tepa="" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {s.qismlar.length ? <div data-material-qism=""><Chiplar list={s.qismlar} /></div> : null}
      {s.doiralar.length ? <div data-material-doira=""><Chiplar list={s.doiralar} /></div> : <span style={hint}>{s.doira}</span>}
    </div>
    {s.mashhur.length ? (
      <section data-material-mashhur="" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={hint}>{t('mebel.mashhur')}</span>
          <button data-material-boshqa="" onClick={s.hammasiTogla} style={{ ...chip(false), minHeight: '40px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          {t('mebel.boshqa_ranglar')}{s.boshqaSoni > 0 ? ' · ' + s.boshqaSoni : ''}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))', gap: '8px' }}>
          {s.mashhur.map(p => <Plitka key={p.key} p={p} />)}
        </div>
      </section>) : null}
    {s.hammasi ? (<>
    {!s.mashhur.length && s.hammasiQaytish ? <button data-material-mashhurga="" onClick={s.hammasiTogla} style={{ ...chip(false), minHeight: '40px' }}>{t('mebel.mashhur')}</button> : null}
    <input data-material-qidiruv="" value={s.q} onChange={s.onQ} placeholder={t('mebel.qidiruv_nom_yoki_sku_masalan')} style={input} />
    <div data-material-rang="" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
      {s.ranglar.map(r => (
        <button key={r.k} onClick={r.pick} aria-pressed={r.on} aria-label={r.label} title={r.label} style={{ ...chip(r.on), padding: '0 10px 0 6px', display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '40px', fontSize: '13px' }}>
          <span style={NUQTA(r.rang)}></span>{r.on ? r.label : null}
        </button>))}
      <button data-material-filtr="" onClick={s.filTogla} aria-expanded={s.filOchiq} style={{ ...chip(s.filOchiq), marginLeft: 'auto', minHeight: '40px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        {t('mebel.filtr')}{s.filSoni ? ' · ' + s.filSoni : ''}
      </button>
    </div>
    {s.filOchiq ? (
      <div data-material-filtr-panel="" style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--sfc2)', borderRadius: '16px', padding: '12px' }}>
        {s.turlarERP.length ? <><span style={hint}>{t('mebel.material_turi')}</span><Chiplar list={s.turlarERP} /></> : null}
        {s.qalinlik.length ? <><span style={hint}>{t('mebel.qalinlik')}</span><Chiplar list={s.qalinlik} /></> : null}
        {s.turlar.length ? <><span style={hint}>{t('mebel.standart_material')}</span><div data-material-standart=""><Chiplar list={s.turlar} /></div></> : null}
      </div>) : null}
    <div data-material-royxat="" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {s.bolimlar.map(b => (
        <section key={b.k} data-material-bolim={b.k} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ ...hint, display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ ...NUQTA(b.rang), width: '14px', height: '14px', flex: '0 0 14px' }}></span>{b.label} · {b.plitkalar.length}</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: '10px' }}>
            {b.plitkalar.map(p => <Plitka key={p.key} p={p} />)}
          </div>
        </section>))}
      {!s.bor ? <span style={{ ...hint, padding: '12px 0' }}>{t('mebel.topilmadi')}</span> : null}
      {s.jami ? <span style={hint}>{s.jami}</span> : null}
    </div>
    </>) : null}
    {s.loyihadagi || s.umumiy || s.asli ? (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {s.umumiy ? <button data-material-umumiy="" onClick={s.umumiy} style={amal}>{t('mebel.umumiy_material')}</button> : null}
        {s.loyihadagi ? <button data-material-loyihadagi="" onClick={s.loyihadagi} style={amal}>{t('mebel.loyihadagi')}</button> : null}
        {s.asli ? <button data-material-asli="" onClick={s.asli} style={amal}>{t('mebel.bazis_asliga')}</button> : null}
      </div>) : null}
    <div data-material-joriy="" style={{ position: 'sticky', bottom: '-24px', margin: '0 -20px -24px', padding: '12px 20px 20px', background: 'var(--sfc)', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
      <span style={NUQTA(s.joriyRang)}></span>
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0', flex: '1' }}>
        <span style={{ fontSize: '12px', color: 'var(--mut)' }}>{t('mebel.tanlandi')} · {s.doira}</span>
        <span style={{ fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.joriy}</span>
      </span>
      <span style={{ fontWeight: '800', textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{s.joriyQalin}<br />{s.joriyNarx}</span>
    </div>
  </>);
}
