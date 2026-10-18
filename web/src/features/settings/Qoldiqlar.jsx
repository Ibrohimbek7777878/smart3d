import React from 'react';
import { t } from '../../i18n/index.js';
import { input } from '../../shared/ui/styles.js';
import { useQoldiqlar } from './qoldiq.js';

/* TZ-23 C2 (dizaynda yo'q — Sozlamalar sahifasidagi karta, chip, 52px input, asosiy tugma uslubida): qoldiqlar ombori.
 * Hamma ko'radi va qidiradi; admin — qo'shadi va "ishlatildi" deb belgilaydi. */
const card = { background: 'var(--sfc)', border: '1px solid var(--line)', borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' };
const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '8px 0', borderTop: '1px solid var(--line)', fontSize: '14px' };
const chip = (on) => ({ minHeight: '40px', padding: '0 14px', borderRadius: '999px', border: on ? '0' : '1px solid var(--line)', background: on ? 'var(--acc)' : 'var(--sfc)', color: on ? 'var(--ink)' : 'var(--txt)', fontWeight: '700', fontSize: '14px', cursor: 'pointer' });
const ghostSm = { height: '36px', padding: '0 12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--sfc2)', color: 'var(--txt)', fontWeight: '700', fontSize: '13px', cursor: 'pointer', flex: '0 0 auto' };
const btn = { height: '48px', padding: '0 20px', borderRadius: '14px', border: '0', background: 'var(--acc)', color: 'var(--ink)', fontWeight: '800', fontSize: '15px', cursor: 'pointer' };

export default function Qoldiqlar() {
  const s = useQoldiqlar();
  return (
    <section style={card} data-set="qoldiqlar">
      <span style={{ fontWeight: '800', fontSize: '17px' }}>{t('qoldiq.sarlavha')}</span>
      <span style={{ fontSize: '13px', color: 'var(--mut)' }}>{s.admin ? t('qoldiq.izoh_admin') : t('qoldiq.izoh')}</span>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {s.holatlar.map((h, i) => <button key={i} onClick={h.pick} aria-pressed={h.on} style={chip(h.on)}>{h.label}</button>)}
      </div>
      <input value={s.q} onChange={s.onQ} placeholder={t('qoldiq.qidiruv')} aria-label={t('qoldiq.qidiruv')} style={{ ...input, height: '48px' }} />
      <div data-qoldiq-royxat="" style={{ maxHeight: '360px', overflow: 'auto' }}>
        {s.rows.map((r, i) => (
          <div key={i} style={row}>
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}>
              <span style={{ fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nom}</span>
              <span style={{ fontSize: '12px', color: 'var(--mut)', fontVariantNumeric: 'tabular-nums' }}>{r.olcham} · {r.maydon}</span>
            </span>
            {r.ishlatildi ? <button onClick={r.ishlatildi} style={ghostSm}>{t('qoldiq.ishlatildi')}</button> : null}
          </div>))}
        {s.yuklandi && !s.rows.length ? <div style={{ ...row, color: 'var(--mut)' }}>{t('qoldiq.yoq')}</div> : null}
      </div>
      {s.jami ? <span style={{ fontWeight: '800', fontVariantNumeric: 'tabular-nums' }}>{s.jami}</span> : null}
      {s.form ? (
        <div data-qoldiq-forma="" style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '6px', borderTop: '1px solid var(--line)' }}>
          <span style={{ fontWeight: '700', fontSize: '14px' }}>{t('qoldiq.qoshish')}</span>
          <select value={s.form.mat} onChange={s.form.onMat} aria-label={t('qoldiq.material')} style={{ ...input, height: '48px' }}>
            {s.form.matlar.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="number" inputMode="numeric" value={s.form.len} onChange={s.form.onLen} placeholder={t('qoldiq.uzunlik')} aria-label={t('qoldiq.uzunlik')} style={{ ...input, height: '48px' }} />
            <input type="number" inputMode="numeric" value={s.form.width} onChange={s.form.onWidth} placeholder={t('qoldiq.eni')} aria-label={t('qoldiq.eni')} style={{ ...input, height: '48px' }} />
          </div>
          <button onClick={s.form.qosh} style={btn}>{t('qoldiq.qoshish_tugma')}</button>
        </div>) : null}
    </section>
  );
}
