import React from 'react';
import { t } from '../../i18n/index.js';
import Toggle from '../../shared/ui/Toggle.jsx';
import { input } from '../../shared/ui/styles.js';
import { useNarxlar, sexJadvalTanla } from './narxlar.js';

/* TZ-20 (2026-10-17, dizaynda yo'q — Sozlamalar kartalari uslubida: karta, 48px input/select, toggle, chip, asosiy tugma):
 * "Narxlar" — narx stavkalari. Guruh → qator → qiymat, manba (egasi / sex jadvali / taxmin), sana; tarix; sex jadvalidan yuklash.
 * Faqat admin o'zgartiradi (server ham tekshiradi); usta ko'radi. Qiymatlar useNarxlar() dan. */
const card = { background: 'var(--sfc)', border: '1px solid var(--line)', borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', gridColumn: '1 / -1', minWidth: '0' };
const title = { fontWeight: '800', fontSize: '17px' };
const sub = { fontWeight: '800', fontSize: '15px', paddingTop: '6px' };
const hint = { fontSize: '13px', color: 'var(--mut)' };
const btn = { height: '48px', padding: '0 20px', borderRadius: '14px', border: '0', background: 'var(--acc)', color: 'var(--ink)', fontWeight: '800', fontSize: '15px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' };
const ghost = { height: '48px', padding: '0 18px', borderRadius: '14px', border: '1px solid var(--line)', background: 'var(--sfc2)', color: 'var(--txt)', fontWeight: '700', fontSize: '15px', cursor: 'pointer' };
const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '8px 0', borderTop: '1px solid var(--line)', fontSize: '14px', flexWrap: 'wrap' };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '4px 16px' };
const badge = (ok) => ({ fontSize: '12px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px', whiteSpace: 'nowrap',
  background: ok ? 'rgba(95,225,196,.14)' : 'rgba(255,181,154,.14)', color: ok ? 'var(--cyan)' : 'var(--acct)' });

/** bitta tanlov qatori: nom, select (egasi tanlaydi), joriy qiymat · manba · sana */
function Tanlov({ r, variant, admin, bosh }) {
  return (
    <div data-narx-qator="" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 0', borderTop: '1px solid var(--line)', minWidth: '0' }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '14px', fontWeight: '700' }}>
        <span style={{ minWidth: '0' }}>{r.nom}</span>
        <span style={badge(r.tasdiq)}>{r.manba}</span>
      </span>
      <select value={r.kod} onChange={r.on} disabled={!admin} aria-label={r.nom} style={{ ...input, height: '44px', fontSize: '14px', minWidth: '0', width: '100%' }}>
        <option value="">{r.sukut ? t('narxlar.sukut_boyicha') : bosh}</option>
        {variant.map(v => <option key={v.kod} value={v.kod}>{v.label}</option>)}
      </select>
      <span style={hint}>{r.qiymat ? r.qiymat + ' · ' : ''}{r.manba}{r.sana !== '—' ? ' · ' + r.sana : ''}</span>
    </div>
  );
}

function Qiymat({ label, q, admin }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', fontWeight: '700' }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>{label}<span style={hint}>{q.manba} · {q.sana}</span></span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input type="number" inputMode="decimal" min="0" value={q.val} onChange={q.on} disabled={!admin} aria-label={label} style={{ ...input, height: '44px' }} />
        <span style={{ ...hint, whiteSpace: 'nowrap' }}>{q.birlik}</span>
      </span>
    </label>
  );
}

export default function Narxlar() {
  const s = useNarxlar();
  if (!s.yuklandi) return (
    <section style={card} data-set="narxlar">
      <span style={title}>{t('narxlar.sarlavha')}</span>
      <span style={hint}>{s.yoq ? t('narxlar.server_yoq') : t('narxlar.yuklanmoqda')}</span>
    </section>
  );
  const pr = s.prisadka, kr = s.kromka;
  return (
    <section style={card} data-set="narxlar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={title}>{t('narxlar.sarlavha')}</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {s.admin ? <label data-sex-jadval="" style={btn}>{t('narxlar.sex_jadval_yuklash')}
            <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={sexJadvalTanla} style={{ display: 'none' }} />
          </label> : null}
          <button onClick={s.tarixFlip} aria-pressed={s.tarixOchiq} data-narx-tarix-tugma="" style={ghost}>{t('narxlar.tarix')}</button>
        </div>
      </div>
      <span style={hint}>{s.admin ? t('narxlar.izoh_admin') : t('narxlar.izoh_usta')}{s.meta ? ' ' + s.meta : ''}</span>

      {s.yuklash ? (
        <div data-narx-korib="" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px', borderRadius: '16px', border: '1px solid var(--acc)', background: 'var(--bg)' }}>
          <span style={{ fontWeight: '800' }}>{t('narxlar.korib_sarlavha')}</span>
          <span style={hint}>{s.yuklash.matn}</span>
          <div style={{ maxHeight: '320px', overflow: 'auto' }}>
            {s.yuklash.rows.map((r, i) => (
              <div key={i} style={{ ...row, fontSize: '13px' }}>
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0', flex: '1 1 180px' }}><span style={{ fontWeight: '700' }}>{r.nom}</span><span style={hint}>{r.g}</span></span>
                <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontWeight: '700' }}>{r.eski} → {r.yangi}</span>
              </div>))}
          </div>
          {s.yuklash.yana ? <span style={hint}>{t('narxlar.yana', { n: s.yuklash.yana })}</span> : null}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={s.yuklash.saqla} data-narx-saqla="" style={btn}>{t('umumiy.saqlash')}</button>
            <button onClick={s.yuklash.bekor} style={ghost}>{t('narxlar.bekor')}</button>
          </div>
        </div>) : null}

      {s.tarixOchiq ? (
        <div data-narx-tarix="" style={{ display: 'flex', flexDirection: 'column', maxHeight: '360px', overflow: 'auto' }}>
          <span style={sub}>{t('narxlar.tarix')}</span>
          {s.tarixBosh ? <span style={hint}>{t('narxlar.tarix_bosh')}</span> : null}
          {s.tarix.map((x, i) => (
            <div key={i} style={{ ...row, fontSize: '13px' }}>
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0', flex: '1 1 200px' }}>
                <span style={{ fontWeight: '700' }}>{x.nom || x.kalit}</span>
                <span style={hint}>{x.vaqt} · {x.kim}</span>
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: '700' }}>{x.eski} → {x.yangi}</span>
            </div>))}
        </div>) : null}

      <span style={sub}>{t('narxlar.g_raspil')}</span>
      <span style={hint}>{t('narxlar.raspil_izoh')}</span>
      <div style={grid}><Tanlov r={{ nom: t('narxlar.raspil_stanok'), ...s.raspil }} variant={s.raspil.variant} admin={s.admin} bosh={t('narxlar.raspil_yoq')} /></div>

      <span style={sub}>{t('narxlar.g_kromka')}</span>
      <span style={hint}>{t('narxlar.kromka_izoh')}</span>
      <div style={grid}>{kr.map((r, i) => <Tanlov key={i} r={r} variant={s.kromkaVariant} admin={s.admin} bosh={t('narxlar.tanlanmagan_taxmin')} />)}</div>

      <span style={sub}>{t('narxlar.g_prisadka')}</span>
      <span style={hint}>{t('narxlar.prisadka_izoh')}</span>
      <div style={grid}>{pr.map((r, i) => <Tanlov key={i} r={r} variant={s.prisadkaVariant} admin={s.admin} bosh={t('narxlar.tanlanmagan_taxmin')} />)}</div>

      {/* TZ-48 (egasi #302 Q1): plita narx rejimi — sotuv (ERP o'rtacha sotuv narxi) / tannarx; chegirma va koeffitsient */}
      <span style={sub}>{t('narxlar.g_plita')}</span>
      <span style={hint}>{t('narxlar.plita_izoh')}</span>
      <div style={grid} data-narx-plita="">
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', fontWeight: '700' }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>{t('narxlar.plita_rejim')}<span style={hint}>{s.plita.manba}{s.plita.sana !== '—' ? ' · ' + s.plita.sana : ''}</span></span>
          <select value={s.plita.rejim} onChange={s.plita.on} disabled={!s.admin} aria-label={t('narxlar.plita_rejim')} data-narx-plita-rejim="" style={{ ...input, height: '44px', fontSize: '14px', minWidth: '0', width: '100%' }}>
            <option value="sotuv">{t('narxlar.rejim_sotuv')}</option>
            <option value="tannarx">{t('narxlar.rejim_tannarx')}</option>
          </select>
        </label>
        <Qiymat label={t('narxlar.plita_chegirma')} q={s.plita.chegirma} admin={s.admin} />
        <Qiymat label={t('narxlar.plita_koef')} q={s.plita.koef} admin={s.admin} />
      </div>

      <span style={sub}>{t('narxlar.g_ish_haqi')}</span>
      <div style={grid}>
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: '4px' }}>
          <Toggle label={t('narxlar.ish_haqi_yoqilgan')} sub={s.ishHaqi.manba} on={s.ishHaqi.on} onFlip={s.ishHaqi.flip} />
        </div>
        <Qiymat label={t('narxlar.ish_detal')} q={s.ishHaqi.detal} admin={s.admin} />
        <Qiymat label={t('narxlar.ish_modul')} q={s.ishHaqi.modul} admin={s.admin} />
        <Qiymat label={t('narxlar.ustama')} q={s.ustama} admin={s.admin} />
      </div>
      <span style={hint}>{t('narxlar.ish_izoh')}</span>
      {s.admin ? (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={s.saqlaQiymat} data-narx-qiymat-saqla="" style={btn}>{t('umumiy.saqlash')}</button>
          <button onClick={() => s.sukutga('ish_haqi')} data-narx-sukut="ish_haqi" style={ghost}>{t('narxlar.sukut_ish_haqi')}</button>
          <button onClick={() => s.sukutga('hammasi')} data-narx-sukut="hammasi" style={ghost}>{t('narxlar.sukut_hammasi')}</button>
        </div>) : null}
      {s.admin ? <span style={hint}>{t('narxlar.sukut_izoh')}</span> : null}

      <span style={sub}>{t('narxlar.jadval')}</span>
      {s.jadval.map(g => (
        <div key={g.g} data-narx-guruh={g.g} style={{ borderTop: '1px solid var(--line)' }}>
          <button onClick={g.flip} aria-expanded={g.ochiq} style={{ width: '100%', minHeight: '44px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: '0', color: 'var(--txt)', fontWeight: '700', fontSize: '14px', cursor: 'pointer', padding: '0' }}>
            <span>{g.nom}</span><span style={hint}>{t('narxlar.qator_n', { n: g.n })}</span>
          </button>
          {g.rows.map(r => (
            <div key={r.kod} style={{ ...row, fontSize: '13px' }}>
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0', flex: '1 1 200px' }}><span style={{ fontWeight: '700' }}>{r.nom}</span><span style={hint}>{r.kod}</span></span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontWeight: '800', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r.qiymat}</span>
                <span style={hint}>{r.manba} · {r.sana}</span>
              </span>
            </div>))}
        </div>))}
    </section>
  );
}
