import React from 'react';
import Toggle from '../../shared/ui/Toggle.jsx';
import { input } from '../../shared/ui/styles.js';
import { useSozlamalar } from './useSozlamalar.js';

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

export default function Sozlamalar() {
  const S = useSozlamalar();
  return (
    <main style={{ maxWidth: '1240px', width: '100%', margin: '0 auto', padding: 'clamp(20px,4vw,40px) clamp(16px,4vw,32px) 64px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: '0', fontSize: 'clamp(28px,3.4vw,40px)', letterSpacing: '-.035em', fontWeight: '800' }}>Sozlamalar</h1>
        <button onClick={S.back} style={ghost}>{S.backLabel}</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '14px', alignItems: 'start' }}>

        <section style={card} data-set="akkaunt">
          <span style={title}>Akkaunt</span>
          {(S.akkaunt || []).map((r, i) => (<div key={i} style={row}><span style={{ color: 'var(--mut)' }}>{r[0]}</span><span style={{ fontWeight: '700', textAlign: 'right' }}>{r[1]}</span></div>))}
          <button onClick={S.logout} style={{ ...ghost, color: 'var(--danger)' }}>Chiqish</button>
        </section>

        <section style={card} data-set="ustama">
          <span style={title}>Narx ustamasi</span>
          <label style={lbl}>Foyda, %
            <input type="number" inputMode="decimal" min="0" max="300" value={S.markup} onChange={S.onMarkup} onBlur={S.saveMarkup} onKeyDown={S.enter} placeholder={S.markupPh} style={input} />
          </label>
          <span style={hint}>Mijoz narxi = tannarx × (1 + ustama). Bo'sh qoldirilsa — standart {S.markupStd}%.</span>
        </section>

        <section style={card} data-set="logo">
          <span style={title}>Sex logosi</span>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '72px', height: '72px', flex: '0 0 72px', borderRadius: '16px', background: 'var(--bg)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
              {S.logo ? <img src={S.logo} alt="Sex logosi" style={{ maxWidth: '100%', maxHeight: '100%' }} /> : <span style={hint}>yo'q</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ ...btn, display: 'inline-flex', alignItems: 'center' }}>Yuklash
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={S.onLogo} style={{ display: 'none' }} />
              </label>
              {S.logo ? <button onClick={S.removeLogo} style={ghost}>Olib tashlash</button> : null}
            </div>
          </div>
          <span style={hint}>PNG, JPEG yoki WEBP, 300 KB gacha. Hisobotda Bittada belgisidan kichikroq chiqadi.</span>
        </section>

        <section style={{ ...card, gap: '2px' }} data-set="stanok">
          <span style={{ ...title, paddingBottom: '6px' }}>Stanok profili</span>
          <span style={{ ...hint, paddingBottom: '8px' }}>"Fayllar → Stanokka" bo'limida ko'rinadigan fayllar. GibLab doim bor.</span>
          {S.stanoklar.map((t, i) => <Toggle key={i} label={t.label} sub={t.sub} on={t.on} onFlip={t.flip} />)}
        </section>

        <section style={card} data-set="raskroy">
          <span style={title}>Raskroy parametrlari</span>
          <span style={{ ...hint }}>Joylashtirish</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(S.modes || []).map((m, i) => (<button key={i} onClick={m.pick} style={chip(m.on)}>{m.label}</button>))}
          </div>
          <span style={{ ...hint }}>Aylantirish</span>
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
            <button onClick={S.saveNest} style={{ ...btn, flex: '1' }}>Saqlash</button>
            <button onClick={S.resetNest} style={ghost}>Standart</button>
          </div>
        </section>

        <section style={card} data-set="standart">
          <span style={title}>Sex standartlari</span>
          <span style={hint}>{S.stdNote}</span>
          {(S.std || []).map((t, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
              <span style={{ fontWeight: '700', fontSize: '14px' }}>{t.nom}</span>
              {t.rows.map((r, j) => (
                <div key={j} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--mut)' }}>{r.label}</span>
                  <input type="number" inputMode="numeric" aria-label={t.nom + ' ' + r.label + ' min'} value={r.min} onChange={r.onMin} disabled={!S.admin} placeholder="min" style={{ ...input, height: '44px' }} />
                  <input type="number" inputMode="numeric" aria-label={t.nom + ' ' + r.label + ' max'} value={r.max} onChange={r.onMax} disabled={!S.admin} placeholder="max" style={{ ...input, height: '44px' }} />
                </div>))}
            </div>))}
          {S.admin ? <button onClick={S.saveStd} style={btn}>Saqlash</button> : null}
        </section>

      </div>
    </main>
  );
}
