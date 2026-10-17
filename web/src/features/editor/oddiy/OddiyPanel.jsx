import React, { useEffect } from 'react';
import { useSlice } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { openSheet, closeSheet, patchSheet } from '../../../store/ui.js';
import { get } from '../../../store/index.js';
import { t, til } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { Chiplar } from '../../../shared/ui/Chiplar.jsx';
import { btnPrimary, card, hint } from '../../../shared/ui/styles.js';
import * as L from '../../../services/loyiha.js';
import KUTUBXONA from '../../../../../app/data/promptlar.json';
import { roomBBox } from '../../../../../app/js/engine/rules.js';
import { useQadamXona } from '../room/useQadamXona.js';
import { useMaterialVaraq } from '../catalog/material.js';
import { Plitka } from '../catalog/MaterialVaraq.jsx';
import { narxKorinishi } from '../pricing/narx.js';
import { buyurtmaOch } from '../../buyurtma/buyurtma.js';
import { promptQur } from '../ai/promptlar.js';
import { tezOshxona } from '../ishjoyi/ishjoyi.js';
import { oddiyQadam } from './rejim.js';

/* Oddiy rejim (mijoz uchun) — dizaynda yo'q; tasdiqlangan dizayn bo'laklari bilan: karta (--sfc), chip, 52px asosiy tugma, 44px maydon.
 * 4 qadam: ① Xona (tayyor o'lchamlar va eni/chuqurligi) ② Tayyor (katta kartalar) ③ Rang (korpus, fasad — "Ko'p ishlatiladigan")
 * ④ Narx va buyurtma (jami, qisqa tarkib, "Buyurtma berish"). Tannarx va foyda mijozga ko'rsatilmaydi. */
const SARL = { fontSize: '12px', fontWeight: '800', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--mut)' };
const H2 = { margin: '0', fontSize: '22px', fontWeight: '800', letterSpacing: '-.02em' };
const MAYDON = { height: '48px', borderRadius: '12px', background: 'var(--sfc)', border: '1px solid var(--line)', color: 'var(--txt)', fontSize: '18px', fontWeight: '800', padding: '0 12px', fontVariantNumeric: 'tabular-nums', outline: 'none', width: '100%' };
const yozuv = (o) => (o && (o[til()] || o.uz)) || '';
const P = KUTUBXONA.promptlar;
const TAYYOR = [['oshxona-togri', 'oshxona'], ['oshxona-l', 'oshxona'], ['oshxona-u', 'oshxona'], ['garderob-kupe', 'mebel'], ['yotoqxona', 'karavot'], ['mehmonxona-tv', 'mebel']];

function Sarlavha({ n, nom, izoh }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={SARL}>{t('oddiy.qadam_n', { n })}</span>
      <h2 style={H2}>{nom}</h2>
      {izoh ? <span style={{ ...hint, fontWeight: '600' }}>{izoh}</span> : null}
    </div>);
}
const Keyingi = ({ n, label }) => <button onClick={() => oddiyQadam(n)} data-oddiy-keyingi="" style={{ ...btnPrimary, flex: '0 0 auto' }}>{label}</button>;

/* ① Xona */
function Xona() {
  const v = useQadamXona();
  return (<>
    <Sarlavha n={1} nom={t('oddiy.xona_sarlavha')} izoh={t('oddiy.xona_izoh')} />
    <div data-oddiy-olcham="" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '8px' }}>
      {v.roomPresets.map((p, i) => (
        <button key={i} onClick={p.pick} aria-pressed={p.bg === 'var(--acc)'} style={{ minHeight: '56px', borderRadius: '16px', border: p.bg === 'var(--acc)' ? '0' : '1px solid var(--line)', background: p.bg, color: p.c, fontSize: '17px', fontWeight: '800', cursor: 'pointer', fontVariantNumeric: 'tabular-nums' }}>{p.label}</button>))}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '8px' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '12px', color: 'var(--mut)', fontWeight: '700' }}>{t('umumiy.eni_mm')}</span>
        <input type="number" inputMode="numeric" data-oddiy-eni="" value={v.w.val} onChange={v.w.on} onBlur={v.w.commit} onKeyDown={v.w.key} style={MAYDON} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '12px', color: 'var(--mut)', fontWeight: '700' }}>{t('xona.chuqurligi')}</span>
        <input type="number" inputMode="numeric" data-oddiy-chuqurlik="" value={v.d.val} onChange={v.d.on} onBlur={v.d.commit} onKeyDown={v.d.key} style={MAYDON} />
      </label>
    </div>
    <Keyingi n={2} label={t('oddiy.keyingi_tayyor')} />
  </>);
}

/* ② Tayyor */
function Tayyor() {
  useSlice('project');
  const bb = roomBBox(project.doc.room.outline), kirish = { eni: Math.round(bb.w), chuqurligi: Math.round(bb.h) };
  const Karta = ({ id, ik, nom, izoh, bos }) => (
    <button key={id} data-oddiy-tayyor={id} onClick={bos} style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', textAlign: 'left', cursor: 'pointer', color: 'var(--txt)', minHeight: '112px', padding: '14px' }}>
      <span style={{ color: 'var(--acc)', display: 'flex' }}><Ikon n={ik} size={26} gap={0} /></span>
      <span style={{ fontWeight: '800', fontSize: '15px', lineHeight: '1.2' }}>{nom}</span>
      <span style={{ fontSize: '12px', color: 'var(--mut)', lineHeight: '1.3' }}>{izoh}</span>
    </button>);
  return (<>
    <Sarlavha n={2} nom={t('oddiy.tayyor_sarlavha')} izoh={t('oddiy.tayyor_izoh')} />
    <div data-oddiy-kartalar="" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '10px' }}>
      <Karta id="avto" ik="qurish" nom={t('oddiy.avto_oshxona')} izoh={t('oddiy.avto_izoh')} bos={tezOshxona} />
      {TAYYOR.map(([id, ik]) => { const p = P.find(x => x.id === id); return p ? <Karta key={id} id={id} ik={ik} nom={yozuv(p.nom)} izoh={yozuv(p.izoh)} bos={() => promptQur(p, kirish)} /> : null; })}
    </div>
    <Keyingi n={3} label={t('oddiy.keyingi_rang')} />
  </>);
}

/* ③ Rang — material oynasining "Ko'p ishlatiladigan" qismi (korpus, fasad) */
function RangIchki() {
  const s = useMaterialVaraq(), qism = s.qism;
  const royxat = s.mashhur.length ? s.mashhur : s.bolimlar.flatMap(b => b.plitkalar).slice(0, 12);
  const tab = (k) => ({ label: t('oddiy.' + k), on: qism === k, pick: () => patchSheet({ qism: k, guruh: null, th: null, tur: null, hammasi: false, q: '' }) });
  return (<>
    <div data-oddiy-rang-qism=""><Chiplar list={[tab('korpus'), tab('fasad')]} /></div>
    <span style={hint}>{s.mashhur.length ? t('mebel.mashhur') : t('oddiy.rang_royxat')} · {t('oddiy.joriy')}: {s.joriy}</span>
    <div data-oddiy-plitkalar="" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))', gap: '8px' }}>
      {royxat.map(p => <Plitka key={p.key} p={p} />)}
    </div>
  </>);
}
function Rang() {
  const vq = useSlice('ui').vq;
  useEffect(() => {
    openSheet('oddiy', { qism: 'korpus', modul: null, modul0: null, q: '', guruh: null, th: null, tur: null, fil: false, hammasi: false });
    return () => { const q = get().ui.vq; if (q && q.kind === 'oddiy') closeSheet(); };
  }, []);
  return (<>
    <Sarlavha n={3} nom={t('oddiy.rang_sarlavha')} izoh={t('oddiy.rang_izoh')} />
    {vq && vq.kind === 'oddiy' ? <RangIchki /> : null}
    <Keyingi n={4} label={t('oddiy.keyingi_narx')} />
  </>);
}

/* ④ Narx va buyurtma */
function Narx() {
  const pj = useSlice('project');
  const H = project.H, doc = project.doc, price = narxKorinishi(project.res);
  const bb = roomBBox(doc.room.outline);
  const guruh = new Map();
  for (const p of doc.placements) { const fr = H && H.catalog[p.frg]; const nom = (fr && L.modulNomi(H, fr)) || p.name || p.frg; guruh.set(nom, (guruh.get(nom) || 0) + 1); }
  const qatorlar = [...guruh.entries()], KO = 5;
  const mat = (kod) => (H && kod ? project.matName(kod) : '—');
  return (<>
    <Sarlavha n={4} nom={t('oddiy.narx_sarlavha')} />
    <div data-oddiy-jami="" style={{ borderRadius: '20px', padding: '18px', background: 'var(--acc)', color: 'var(--ink)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '13px', fontWeight: '800' }}>{t('oddiy.jami')}</span>
      <span style={{ fontSize: '28px', fontWeight: '800', fontVariantNumeric: 'tabular-nums', lineHeight: '1.15' }}>{price.total}</span>
      <span style={{ fontSize: '13px', fontWeight: '700' }}>{price.som}</span>
    </div>
    {price.note ? <span style={hint}>{price.note}</span> : null}
    <div data-oddiy-tarkib="" style={{ ...card, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontWeight: '800' }}>{t('oddiy.tarkib')}</span>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '14px' }}><span>{t('qadam.xona')}</span><span style={{ color: 'var(--mut)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(bb.w)} × {Math.round(bb.h)} {t('umumiy.mm')}</span></div>
      {qatorlar.length ? qatorlar.slice(0, KO).map(([nom, n]) => (
        <div key={nom} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '14px', borderTop: '1px solid var(--line)', paddingTop: '8px' }}><span>{nom}</span><span style={{ color: 'var(--mut)' }}>× {n}</span></div>))
        : <span style={hint}>{t('oddiy.bosh')}</span>}
      {qatorlar.length > KO ? <span style={hint}>{t('oddiy.yana', { n: qatorlar.length - KO })}</span> : null}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '14px', borderTop: '1px solid var(--line)', paddingTop: '8px' }}><span>{t('oddiy.korpus')}</span><span style={{ color: 'var(--mut)', textAlign: 'right' }}>{mat(pj.matCode)}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '14px' }}><span>{t('oddiy.fasad')}</span><span style={{ color: 'var(--mut)', textAlign: 'right' }}>{mat(pj.fasadCode)}</span></div>
    </div>
    <button onClick={buyurtmaOch} data-buyurtma-ber="" style={{ ...btnPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
      <Ikon n="buyurtma" size={19} />{t('buyurtma.ber')}
    </button>
  </>);
}

const QADAM = { 1: Xona, 2: Tayyor, 3: Rang, 4: Narx };
export default function OddiyPanel({ n }) {
  const Q = QADAM[n];
  return Q ? <div data-oddiy-panel={n} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}><Q /></div> : null;
}
