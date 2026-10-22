import React from 'react';
import { t } from '../../i18n/index.js';
import Varaq from '../../shared/ui/Varaq.jsx';
import Ikon from '../../shared/ui/Ikon.jsx';
import { useKatalog, OLCHAM, REJIMLAR } from './useKatalog.js';
import { karta, sarlavha, izoh, tugma, ghost, xavfli, maydon, lbl, mono, belgi, chipU } from './stil.js';
import './katalog.css';

/* TZ-37 (2-faza, bo'lim 4): modullar katalogi — nom (uz/ru/en), ko'rinish (yashirish), o'lcham chegarasi, narx rejimi. Fayl ustiga baza; yashirish — faqat
 * tanlash ro'yxatida va AI/konstruktor tanlovida: ochiq loyihalar va hisob o'zgarmaydi. */
/* modul turi (kategoriya kodi: cabinet, wall_cabinet…) — tanlangan tilda; noma'lum kod bo'lsa — o'zi */
const turNomi = (c) => { const k = 'admin.kat_tur_' + c; const v = t(k); return v === k ? c : v; };
const oraliq = (c, o) => (c['min_' + o] || c['max_' + o] ? (c['min_' + o] || '…') + '–' + (c['max_' + o] || '…') : '—');

function Kalit({ on, onFlip, label, kod }) {
  return (
    <button onClick={onFlip} role="switch" aria-checked={on} aria-label={label} data-kat-korinish={kod}
      style={{ width: '48px', height: '28px', borderRadius: '999px', border: '0', padding: '0', position: 'relative', cursor: 'pointer', background: on ? 'var(--acc)' : 'var(--sfc3)', transition: 'background .2s', flex: '0 0 48px' }}>
      <span style={{ position: 'absolute', left: '3px', top: '3px', width: '22px', height: '22px', borderRadius: '999px', background: '#fff', transform: on ? 'translateX(20px)' : 'none', transition: 'transform .2s ease-out' }} />
    </button>);
}

function Tahrir({ k }) {
  const e = k.joriy, x = k.x;
  if (!e) return null;
  return (
    <Varaq title={e.kod} kind="admin-kat" onClose={() => k.setX(null)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', minHeight: '0' }}>
        <span style={izoh}>{e.nom_fayl} · {turNomi(e.kategoriya)}{e.guruh ? ' · ' + e.guruh : ''} · {e.w}×{e.d}×{e.h} {t('umumiy.mm')}{e.standart ? ' · ' + t('admin.kat_sex_standart', { n: e.standart }) : ''}</span>
        {['uz', 'ru', 'en'].map(l => (
          <label key={l} style={lbl}>{t('admin.kat_nom')} ({l})
            <input data-kat-f={'nom_' + l} value={x['nom_' + l]} onChange={k.on('nom_' + l)} placeholder={l === 'uz' ? e.nom_fayl : ''} maxLength={120} style={maydon} />
          </label>))}
        {e.texnika ? <span style={izoh}>{t('admin.kat_texnika')}</span> : (
          <>
            <span style={sarlavha}>{t('admin.kat_olcham')}</span>
            <span style={izoh}>{t('admin.kat_olcham_izoh')}</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '10px' }}>
              {OLCHAM.map(o => (
                <label key={o} style={lbl}>{t('admin.kat_' + o)}
                  <input data-kat-f={o} inputMode="numeric" value={x.olcham[o]} onChange={k.olchamYoz(o)} placeholder={e.chegara_fayl[o] ? String(e.chegara_fayl[o]) : '—'} style={maydon} />
                </label>))}
            </div>
            <label style={lbl}>{t('admin.kat_rejim')}
              <select data-kat-f="rejim" value={x.rejim} onChange={k.on('rejim')} style={maydon}>
                {REJIMLAR.map(r => <option key={r} value={r}>{t('admin.kat_rejim_' + r)}{r === e.narx_rejim_fayl ? ' · ' + t('admin.manba_fayl') : ''}</option>)}
              </select>
            </label>
            <span style={izoh}>{t('admin.kat_rejim_izoh')}</span>
          </>)}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={k.saqla} disabled={k.band} data-kat-f="saqla" style={tugma}>{t('umumiy.saqlash')}</button>
          {e.tahrir ? <button onClick={k.qaytar} data-kat-f="qaytar" style={xavfli}>{t('admin.fayldagiga_qaytar')}</button> : null}
        </div>
      </div>
    </Varaq>
  );
}

export default function Katalog() {
  const k = useKatalog();
  if (!k.d) return <section style={karta}><span style={izoh}>{t('admin.yuklanmoqda')}</span></section>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '0' }} data-admin-bolim="katalog">
      <section style={karta}>
        <span style={sarlavha}>{t('admin.kat_sarlavha')} ({k.royxat.length}/{k.d.length})</span>
        <span style={izoh}>{t('admin.kat_izoh')}</span>
        <input data-kat="qidir" value={k.q} onChange={(ev) => k.setQ(ev.target.value)} placeholder={t('admin.kat_qidir_ph')} aria-label={t('admin.kat_qidir_ph')} style={maydon} />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select data-kat-suzgich="kategoriya" value={k.kat} onChange={(ev) => k.setKat(ev.target.value)} aria-label={t('admin.kat_kategoriya')} style={{ ...maydon, width: 'auto', minWidth: '200px', height: '44px' }}>
            <option value="">{t('admin.kat_kategoriya')}: {t('admin.hammasi')}</option>
            {k.kategoriyalar.map(([c, n]) => <option key={c} value={c}>{turNomi(c)} ({n})</option>)}
          </select>
          <button onClick={() => k.setFaqatYashirin(!k.faqatYashirin)} aria-pressed={k.faqatYashirin} data-kat-suzgich="yashirin" style={chipU(k.faqatYashirin)}><Ikon n="yashirish" size={14} />{t('admin.kat_yashirin')} ({k.yashirinSoni})</button>
        </div>
        <div role="table">
          <div className="adm-kt adm-kh" role="row">
            {['kod', 'nom', 'olcham', 'eni', 'chuqurlik', 'rejim', 'korinish'].map(h => <span key={h}>{t('admin.kat_h_' + h)}</span>)}<span></span>
          </div>
          {k.royxat.map(e => (
            <div key={e.kod} className="adm-kt" role="row" data-kat-qator={e.kod} style={{ opacity: e.yashirin ? 0.6 : 1 }}>
              <span style={{ ...mono, fontWeight: '800' }}>{e.kod}</span>
              <span style={{ minWidth: '0' }}>
                <b>{e.nom.uz || e.nom_fayl}</b>{e.tahrir ? <> <b style={belgi(true)}>{t('admin.manba_baza')}</b></> : null}<br />
                <span style={izoh}>{turNomi(e.kategoriya)}{e.nom.ru ? ' · ' + e.nom.ru : ''}</span>
              </span>
              <span data-l={t('admin.kat_h_olcham')} style={{ ...mono, whiteSpace: 'nowrap' }}>{e.w}×{e.d}×{e.h}</span>
              <span data-l={t('admin.kat_h_eni')} style={{ ...mono, whiteSpace: 'nowrap' }}>{oraliq(e.chegara, 'w')}</span>
              <span data-l={t('admin.kat_h_chuqurlik')} style={{ ...mono, whiteSpace: 'nowrap' }}>{oraliq(e.chegara, 'd')}</span>
              <span data-l={t('admin.kat_h_rejim')} style={mono}>{e.narx_rejim}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Kalit on={!e.yashirin} onFlip={() => k.korinish(e)} label={e.yashirin ? t('admin.kat_korsat') : t('admin.kat_yashir')} kod={e.kod} />
              </span>
              <button onClick={() => k.ochish(e)} aria-label={t('admin.tahrirlash')} data-kat-tahrir={e.kod} style={ghost}><Ikon n="tahrir" size={16} gap={0} /></button>
            </div>))}
          {!k.royxat.length ? <span style={izoh}>{t('admin.topilmadi')}</span> : null}
        </div>
      </section>
      {k.x ? <Tahrir k={k} /> : null}
    </div>
  );
}
