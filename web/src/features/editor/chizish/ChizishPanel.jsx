import React, { useRef } from 'react';
import { t } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { Chiplar } from '../../../shared/ui/Chiplar.jsx';
import { input, hint, btnGhost, btnPrimary, card, listRow } from '../../../shared/ui/styles.js';
import { useChizish } from './chizish.js';

/* TZ-24 A (dizaynda yo'q — dizayn bo'laklari: panel sarlavhasi, chip, 52px input, karta, asosiy tugma; egasi skrinshot
 * bilan tasdiqlaydi, 3.3): o'z modulini chizish. O'ngdagi qadam paneli o'rnida — o'rtadagi 3D shu zahoti yangilanadi.
 * Old ko'rinish (mm): bo'limni bosing — tanlanadi; bo'lgichni sudrang — 32 mm qadam bilan suriladi. */
const KORPUS = '#d9cdb8', CHIZIQ = '#6b6355', FASAD = 'rgba(95,225,196,.16)', FASAD_CH = 'rgba(95,225,196,.85)';
const kenglik = { enter: (ev) => { if (ev.key === 'Enter') ev.target.blur(); } };

function Chizma({ v }) {
  const ref = useRef(null), sur = useRef(null);
  const P = 60, W = v.w, H = v.h, T = v.tag;
  const vb = [-W / 2 - P, -H / 2 - P, W + 2 * P, H + T + 2 * P].join(' ');
  const mm = (ev) => { const s = ref.current, pt = s.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; return pt.matrixTransform(s.getScreenCTM().inverse()); };
  const rect = (q, extra) => <rect x={q.x0} y={-q.z1} width={Math.max(1, q.x1 - q.x0)} height={Math.max(1, q.z1 - q.z0)} {...extra} />;
  const bolimlar = v.bolimlar.slice().sort((a, b) => a.yol.length - b.yol.length);
  return (
    <svg ref={ref} viewBox={vb} preserveAspectRatio="xMidYMid meet" data-chizma-svg="" style={{ width: '100%', height: '340px', background: 'var(--bg)', borderRadius: '16px', border: '1px solid var(--line)', touchAction: 'none' }}
      onPointerMove={(ev) => { if (!sur.current) return; const p = mm(ev), b = sur.current; b.sur(b.yo === 'v' ? p.x : -p.y); }}
      onPointerUp={() => { sur.current = null; }} onPointerLeave={() => { sur.current = null; }}>
      {v.qutilar.filter(q => q.slot !== 'fasad').map((q, i) => <React.Fragment key={'k' + i}>{rect(q, { fill: KORPUS, stroke: CHIZIQ, strokeWidth: 1.5, vectorEffect: 'non-scaling-stroke' })}</React.Fragment>)}
      {bolimlar.map((b, i) => <React.Fragment key={'b' + i}>{rect(b, { 'data-bolim': b.yol.join('.') || 'ildiz', fill: b.on ? 'rgba(255,122,69,.18)' : 'transparent', stroke: b.on ? 'var(--acc)' : 'none', strokeWidth: 3, vectorEffect: 'non-scaling-stroke', style: { cursor: 'pointer' }, onClick: b.pick })}</React.Fragment>)}
      {v.fasadKor ? v.qutilar.filter(q => q.slot === 'fasad').map((q, i) => {
        /* eshik belgisi: petlya chetidan qarama-qarshi chetning o'rtasiga ikki chiziq (chizma standarti) */
        const yx = q.hingeSide === 'right' ? q.x1 : q.x0, qx = q.hingeSide === 'right' ? q.x0 : q.x1;
        return (<g key={'f' + i} style={{ pointerEvents: 'none' }}>
          {rect(q, { fill: FASAD, stroke: FASAD_CH, strokeWidth: 1.5, vectorEffect: 'non-scaling-stroke' })}
          {q.isDoor ? <polyline points={`${yx},${-q.z1} ${qx},${-(q.z0 + q.z1) / 2} ${yx},${-q.z0}`} fill="none" stroke={FASAD_CH} strokeWidth="1" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" /> : null}
        </g>);
      }) : null}
      {v.bolgichlar.map((b, i) => <React.Fragment key={'g' + i}>{rect({ x0: b.x0 - (b.yo === 'v' ? 10 : 0), x1: b.x1 + (b.yo === 'v' ? 10 : 0), z0: b.z0 - (b.yo === 'h' ? 10 : 0), z1: b.z1 + (b.yo === 'h' ? 10 : 0) },
        { 'data-bolgich': b.yol.join('.') + ':' + b.i, fill: 'transparent', style: { cursor: b.yo === 'v' ? 'col-resize' : 'row-resize' },
          onPointerDown: (ev) => { ev.stopPropagation(); ev.currentTarget.ownerSVGElement.setPointerCapture(ev.pointerId); sur.current = b; } })}</React.Fragment>)}
      <text x="0" y={-H / 2 - 18} textAnchor="middle" fontSize="34" fontWeight="700" fill="var(--mut)">{Math.round(W)}</text>
      <text x={W / 2 + 18} y="0" fontSize="34" fontWeight="700" fill="var(--mut)" transform={`rotate(-90 ${W / 2 + 18} 0)`} textAnchor="middle">{Math.round(H)}</text>
    </svg>
  );
}

const Sanoq = ({ label, s, data }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} data-sanoq={data}>
    <span style={{ flex: '1', fontWeight: '700', fontSize: '14px' }}>{label}</span>
    <button onClick={s.kam} aria-label={t('sahna.kamaytirish')} style={{ ...btnGhost, width: '40px', height: '40px', padding: '0', display: 'grid', placeItems: 'center' }}><Ikon n="ayir" size={16} gap={0} /></button>
    <span style={{ minWidth: '28px', textAlign: 'center', fontWeight: '800', fontVariantNumeric: 'tabular-nums' }}>{s.n}</span>
    <button onClick={s.kop} aria-label={t('sahna.oshirish')} style={{ ...btnGhost, width: '40px', height: '40px', padding: '0', display: 'grid', placeItems: 'center' }}><Ikon n="qosh" size={16} gap={0} /></button>
  </div>
);

export default function ChizishPanel() {
  const v = useChizish();
  if (!v.ochiq) return null;
  const sarlavha = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
      <h2 style={{ margin: '0', fontSize: '22px', fontWeight: '800', letterSpacing: '-.02em' }}><Ikon n="tahrir" size={20} />{t('chizish.sarlavha')}</h2>
      <button onClick={v.yop} data-chizish-yop="" style={{ ...btnGhost, height: '40px' }}>{v.tanlov ? t('umumiy.yopish') : t('chizish.tayyor')}</button>
    </div>);
  if (v.tanlov) {
    return (<div data-chizish="" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {sarlavha}
      <span style={hint}>{t('chizish.tur_tanlang')}</span>
      {v.turlar.map(x => (
        <button key={x.tur} onClick={x.pick} data-chizish-tur={x.tur} style={{ ...card, padding: '14px 16px', textAlign: 'left', cursor: 'pointer', color: 'var(--txt)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontWeight: '800' }}>{x.label}</span><span style={{ fontSize: '13px', color: 'var(--mut)' }}>{x.izoh}</span>
        </button>))}
      {v.kirgan ? (<>
        <b>{t('chizish.modullarim')}</b>
        {v.modullarim.length ? v.modullarim.map((m, i) => <button key={i} onClick={m.pick} data-modulim={i} style={{ ...listRow, width: '100%', border: '0', borderTop: '1px solid var(--line)', background: 'none', color: 'var(--txt)', cursor: 'pointer', textAlign: 'left' }}><span style={{ fontWeight: '700' }}>{m.nom}</span><Ikon n="qosh" size={16} gap={0} /></button>)
          : <span style={hint}>{t('chizish.modullarim_yoq')}</span>}
      </>) : null}
    </div>);
  }
  const b = v.bolim;
  return (
    <div data-chizish="" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {sarlavha}
      <input value={v.nom} onChange={v.onNom} placeholder={t('chizish.nom')} aria-label={t('chizish.nom')} maxLength={80} style={{ ...input, height: '48px' }} />
      {v.izoh ? (   /* TZ-26 (dizaynda yo'q — karta uslubida): AI konstruksiyasi — kim tushundi, tizim nimani to'g'riladi */
        <section data-kons-izoh="" style={{ ...card, display: 'flex', flexDirection: 'column', gap: '6px', borderColor: 'rgba(95,225,196,.35)' }}>
          <b style={{ display: 'flex', alignItems: 'center', color: 'var(--cyan)' }}><Ikon n="ai" size={16} />{v.izoh.kim}</b>
          <span style={{ fontSize: '13px', fontWeight: '700' }}>{v.izoh.xulosa}</span>
          {v.izoh.tuzatish.length ? (<>
            <span style={hint}>{t('kons.izoh_sarlavha')}</span>
            <ul data-kons-tuzatish="" style={{ margin: '0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '13px' }}>
              {v.izoh.tuzatish.map((x, i) => <li key={i}>{x}</li>)}
            </ul></>) : null}
          {v.izoh.tushunilmadi.length ? <span style={{ ...hint, color: 'var(--pch)' }}>{t('kons.tushunilmadi', { s: v.izoh.tushunilmadi.join(', ') })}</span> : null}
        </section>) : null}
      <div data-chizish-turlar=""><Chiplar list={v.turlar} /></div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {v.olchamlar.map(o => (
          <label key={o.k} style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: '700', color: 'var(--mut)' }}>{o.label}
            <input type="number" inputMode="numeric" value={o.val} onChange={o.on} onBlur={o.commit} onKeyDown={kenglik.enter} data-olcham={o.k} style={{ ...input, height: '44px', padding: '0 10px' }} />
          </label>))}
      </div>
      {v.taglar.length ? <div data-chizish-tag=""><Chiplar list={v.taglar} /></div> : null}
      {v.qopqoqlar.length ? <div data-chizish-qopqoq=""><Chiplar list={v.qopqoqlar} /></div> : null}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <Chiplar list={[{ label: t('chizish.orqa_hdf'), on: v.orqa.on, pick: v.orqa.flip }, { label: t('chizish.fasad_kor'), on: v.fasad.on, pick: v.fasad.flip }]} />
      </div>
      <Chizma v={v.svg} />
      <span style={hint}>{t('chizish.yordam')}</span>
      <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: '10px' }} data-bolim-karta="">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <b>{b.ildiz ? t('chizish.butun_ichki') : t('chizish.tanlangan')} · <span style={{ fontVariantNumeric: 'tabular-nums' }}>{b.olcham}</span></b>
          {b.yuqori ? <button onClick={b.yuqori} data-bolim-yuqori="" style={{ ...btnGhost, height: '36px', fontSize: '13px' }}>{t('chizish.yuqori')}</button> : null}
        </div>
        <span style={hint}>{t('chizish.bolish')}</span>
        <div data-bolish=""><Chiplar list={b.bol} /></div>
        {b.bolaklar.length ? (<>
          <span style={hint}>{t('chizish.bolaklar_izoh')}</span>
          {b.bolaklar.map((x, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={x.tanla} style={{ ...btnGhost, height: '40px', flex: '0 0 auto', fontSize: '13px' }}>{x.label}</button>
              <input type="number" inputMode="numeric" value={x.val} onChange={x.on} onBlur={x.commit} onKeyDown={kenglik.enter} placeholder={t('chizish.teng')} data-bolak={i} style={{ ...input, height: '40px', padding: '0 10px' }} />
            </div>))}
          <button onClick={b.birlashtir} data-birlashtir="" style={{ ...btnGhost, height: '40px' }}>{t('chizish.birlashtir')}</button>
        </>) : null}
        {b.polka ? <Sanoq label={t('chizish.polka')} s={b.polka} data="polka" /> : null}
        {b.tortma ? <Sanoq label={t('chizish.tortma')} s={b.tortma} data="tortma" /> : null}
        {b.shtanga ? <Chiplar list={[{ label: t('chizish.shtanga'), on: b.shtanga.on, pick: b.shtanga.flip }]} /> : null}
        <span style={hint}>{t('chizish.eshik')}</span>
        <div data-eshik=""><Chiplar list={b.eshiklar} /></div>
        {b.petlyalar.length ? <div data-petlya=""><Chiplar list={b.petlyalar} /></div> : null}
      </section>
      {v.ogoh.length ? (
        <ul data-chizish-ogoh="" style={{ margin: '0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--danger)', fontWeight: '600' }}>
          {v.ogoh.map((o, i) => <li key={i}>{o}</li>)}
        </ul>) : null}
      {v.narx ? (
        <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }} data-chizish-narx="">
          <span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '13px', color: 'var(--mut)' }}>{v.narx.detal}</span>{v.narx.narxsiz ? <span style={{ fontSize: '12px', color: 'var(--mut)' }}>{v.narx.narxsiz}</span> : null}</span>
          <b style={{ fontSize: '18px', fontVariantNumeric: 'tabular-nums' }}>{v.narx.jami}</b>
        </div>) : null}
      {v.saqlaModul ? <button onClick={v.saqlaModul} data-modullarimga="" style={{ ...btnGhost, height: '44px' }}>{t('chizish.modullarimga')}</button> : null}
      <button onClick={v.yop} style={btnPrimary}>{t('chizish.tayyor')}</button>
    </div>
  );
}
