import React from 'react';
import { t } from '../../i18n/index.js';
import Toggle from '../../shared/ui/Toggle.jsx';
import { input } from '../../shared/ui/styles.js';
import { useSozlamalar } from './useSozlamalar.js';
import Qoldiqlar from './Qoldiqlar.jsx';

/* TZ-09: dizaynda yo'q sahifa — "Sozlamalar" (dizayndagi tugma faqat xabar chiqarardi: "sex logosi, narx ustamasi,
 * stanok profili"). Faqat dizayn bo'laklaridan yig'ilgan: "Loyihalarim" sahifasi tuzilishi, karta, 52px input,
 * toggle (Oshxona elementlari), chip, asosiy tugma. Egasi skrinshot bilan tasdiqlaydi (qoida 3.3).
 * Qiymatlar useSozlamalar() dan. */
const card = { background: 'var(--sfc)', border: '1px solid var(--line)', borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' };
const title = { fontWeight: '800', fontSize: '17px' };
const hint = { fontSize: '13px', color: 'var(--mut)' };
const lbl = { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', fontWeight: '700', color: 'var(--txt)' };
const btn = { height: '48px', padding: '0 20px', borderRadius: '14px', border: '0', background: 'var(--acc)', color: 'var(--ink)', fontWeight: '800', fontSize: '15px', cursor: 'pointer' };
const ghost = { height: '48px', padding: '0 18px', borderRadius: '14px', border: '1px solid var(--line)', background: 'var(--sfc2)', color: 'var(--txt)', fontWeight: '700', fontSize: '15px', cursor: 'pointer' };
const row = { display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 0', borderTop: '1px solid var(--line)', fontSize: '15px' };
const chip = (on) => ({ minHeight: '40px', padding: '0 14px', borderRadius: '999px', border: on ? '0' : '1px solid var(--line)', background: on ? 'var(--acc)' : 'var(--sfc)', color: on ? 'var(--ink)' : 'var(--txt)', fontWeight: '700', fontSize: '14px', cursor: 'pointer' });

/* TZ-19 §2 (dizaynda yo'q, faqat admin): xatolar jurnali — kod bo'yicha guruh, oxirgi yozuvlar; kod yoki so'rov raqami bo'yicha qidiruv */
function XatolarJurnali({ x }) {
  const mono = { fontFamily: "'JetBrains Mono',monospace", fontSize: '12px' };
  return (
    <section style={card} data-set="xatolar">
      <span style={title}>{t('sozlama.xatolar_jurnali')}</span>
      <span style={hint}>{t('sozlama.oxirgi_30_kun_qidirish_xato')}</span>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input value={x.q} onChange={x.onQ} onKeyDown={x.enter} placeholder={t('sozlama.s3d_exp_101_yoki_3f2a9c')} aria-label={t('sozlama.xato_kodi_yoki_sorov_raqami')} style={{ ...input, height: '48px' }} />
        <button onClick={x.qidir} style={ghost}>{t('sozlama.qidirish')}</button>
      </div>
      {x.bosh ? <span style={hint}>{t('sozlama.xato_yoq')}</span> : null}
      {x.guruhlar.map((g, i) => (
        <button key={i} onClick={g.pick} style={{ border: '0', ...row, width: '100%', background: 'none', color: 'var(--txt)', cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}>
            <span><b style={mono}>{g.code}</b> <span style={{ color: 'var(--mut)', fontSize: '12px' }}>· {g.src}</span></span>
            <span style={{ fontSize: '12px', color: 'var(--mut)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.msg}</span>
          </span>
          <span style={{ whiteSpace: 'nowrap', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>{g.n}× · {g.vaqt}</span>
        </button>))}
      {x.oxirgi.length ? <span style={{ ...hint, paddingTop: '6px' }}>{t('sozlama.oxirgi_yozuvlar')}</span> : null}
      {x.oxirgi.map((r, i) => (
        <button key={i} onClick={r.pick} style={{ border: '0', ...row, width: '100%', background: 'none', color: 'var(--txt)', cursor: 'pointer', textAlign: 'left', fontSize: '13px' }}>
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}>
            <span style={mono}>{r.code} {r.status ? '· ' + r.status : ''}</span>
            <span style={{ color: 'var(--mut)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.yol || r.msg}</span>
          </span>
          <span style={{ ...mono, color: 'var(--mut)', whiteSpace: 'nowrap' }}>{r.vaqt}{r.rid ? ' · ' + r.rid.slice(0, 6) : ''}</span>
        </button>))}
    </section>
  );
}

export default function Sozlamalar() {
  const S = useSozlamalar();
  return (
    <main style={{ maxWidth: '1240px', width: '100%', margin: '0 auto', padding: 'clamp(20px,4vw,40px) clamp(16px,4vw,32px) 64px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: '0', fontSize: 'clamp(28px,3.4vw,40px)', letterSpacing: '-.035em', fontWeight: '800' }}>{t('umumiy.sozlamalar')}</h1>
        <button onClick={S.back} style={ghost}>{S.backLabel}</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '14px', alignItems: 'start' }}>

        <section style={card} data-set="akkaunt">
          <span style={title}>{t('sozlama.akkaunt')}</span>
          {(S.akkaunt || []).map((r, i) => (<div key={i} style={row}><span style={{ color: 'var(--mut)' }}>{r[0]}</span><span style={{ fontWeight: '700', textAlign: 'right' }}>{r[1]}</span></div>))}
          <button onClick={S.logout} style={{ ...ghost, color: 'var(--danger)' }}>{t('sozlama.chiqish')}</button>
        </section>

        <section style={card} data-set="til">
          <span style={title}>{t('sozlama.til')}</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {S.tillar.map((m, i) => (<button key={i} onClick={m.pick} aria-pressed={m.on} style={chip(m.on)}>{m.label}</button>))}
          </div>
          <span style={hint}>{t('sozlama.til_izoh')}</span>
        </section>

        <section style={card} data-set="ustama">
          <span style={title}>{t('sozlama.narx_ustamasi')}</span>
          <label style={lbl}>{t('sozlama.foyda')}
            <input type="number" inputMode="decimal" min="0" max="300" value={S.markup} onChange={S.onMarkup} onBlur={S.saveMarkup} onKeyDown={S.enter} placeholder={S.markupPh} style={input} />
          </label>
          <span style={hint}>{S.markupIzoh}</span>
        </section>

        <section style={card} data-set="logo">
          <span style={title}>{t('sozlama.sex_logosi')}</span>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '72px', height: '72px', flex: '0 0 72px', borderRadius: '16px', background: 'var(--bg)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
              {S.logo ? <img src={S.logo} alt={t('sozlama.sex_logosi')} style={{ maxWidth: '100%', maxHeight: '100%' }} /> : <span style={hint}>{t('sozlama.yoq')}</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ ...btn, display: 'inline-flex', alignItems: 'center' }}>{t('sozlama.yuklash')}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={S.onLogo} style={{ display: 'none' }} />
              </label>
              {S.logo ? <button onClick={S.removeLogo} style={ghost}>{t('sozlama.olib_tashlash')}</button> : null}
            </div>
          </div>
          <span style={hint}>{t('sozlama.png_jpeg_yoki_webp_300_kb')}</span>
        </section>

        <section style={{ ...card, gap: '2px' }} data-set="stanok">
          <span style={{ ...title, paddingBottom: '6px' }}>{t('sozlama.stanok_profili')}</span>
          <span style={{ ...hint, paddingBottom: '8px' }}>{t('sozlama.fayllar_stanokka_bolimida')}</span>
          {S.stanoklar.map((t, i) => <Toggle key={i} label={t.label} sub={t.sub} on={t.on} onFlip={t.flip} />)}
        </section>

        <section style={card} data-set="raskroy">
          <span style={title}>{t('sozlama.raskroy_parametrlari')}</span>
          <span style={{ ...hint }}>{t('sozlama.joylashtirish')}</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(S.modes || []).map((m, i) => (<button key={i} onClick={m.pick} style={chip(m.on)}>{m.label}</button>))}
          </div>
          <span style={{ ...hint }}>{t('sozlama.aylantirish')}</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(S.rots || []).map((m, i) => (<button key={i} onClick={m.pick} style={chip(m.on)}>{m.label}</button>))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {(S.nest || []).map((f, i) => (
              <label key={i} style={lbl}>{f.label}
                <input type="number" inputMode="decimal" value={f.val} onChange={f.on} style={input} />
              </label>))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={S.saveNest} style={{ ...btn, flex: '1' }}>{t('umumiy.saqlash')}</button>
            <button onClick={S.resetNest} style={ghost}>{t('sozlama.standart')}</button>
          </div>
        </section>

        <section style={card} data-set="standart">
          <span style={title}>{t('sozlama.sex_standartlari')}</span>
          <span style={hint}>{S.stdNote}</span>
          {(S.std || []).map((tr, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
              <span style={{ fontWeight: '700', fontSize: '14px' }}>{tr.nom}</span>
              {tr.rows.map((r, j) => (
                <div key={j} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--mut)' }}>{r.label}</span>
                  <input type="number" inputMode="numeric" aria-label={tr.nom + ' ' + r.label + ' min'} value={r.min} onChange={r.onMin} disabled={!S.admin} placeholder={t('sozlama.min')} style={{ ...input, height: '44px' }} />
                  <input type="number" inputMode="numeric" aria-label={tr.nom + ' ' + r.label + ' max'} value={r.max} onChange={r.onMax} disabled={!S.admin} placeholder={t('sozlama.max')} style={{ ...input, height: '44px' }} />
                </div>))}
            </div>))}
          {S.admin ? <button onClick={S.saveStd} style={btn}>{t('umumiy.saqlash')}</button> : null}
        </section>

        <Qoldiqlar />
        {S.xatolar ? <XatolarJurnali x={S.xatolar} /> : null}

      </div>
    </main>
  );
}
