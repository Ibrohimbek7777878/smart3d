import React from 'react';
import { t } from '../../i18n/index.js';
import Varaq from '../../shared/ui/Varaq.jsx';
import Ikon from '../../shared/ui/Ikon.jsx';
import { raqam, telefon, sana } from '../../shared/lib/format.js';
import { useFoydalanuvchilar, TABLAR, HOLATLAR } from './useFoydalanuvchilar.js';
import { karta, sarlavha, izoh, tugma, ghost, xavfli, maydon, lbl, mono, belgi, chipU } from './stil.js';

/* TZ-37 (2-faza, bo'lim 7): foydalanuvchilar, loyihalar, buyurtmalar — ko'rish, qidirish, bloklash. Telefon +998 XX XXX XX XX ko'rinishida.
 * Bloklangan foydalanuvchi kira olmaydi (S3D-AUTH-021) va ochiq kalitlari yaroqsiz bo'ladi; admin va o'zini bloklab bo'lmaydi. */
const emailKor = (e) => (e && !/@telefon\.smart3d$/.test(e) ? e : '—');
const holatBelgi = (h) => ({ ...belgi(h === 'tayyor' || h === 'ishlab' || h === 'qabul'), ...(h === 'bekor' ? { background: 'rgba(255,123,123,.16)', color: 'var(--danger)' } : null) });

function Tafsilot({ f }) {
  const u = f.det;
  const bloklashMumkin = u.role !== 'admin';
  return (
    <Varaq title={u.name || emailKor(u.email) || '#' + u.id} kind="admin-foyd" onClose={() => f.setDet(null)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', minHeight: '0' }} data-foyd-tafsilot={u.id}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '8px 16px', fontSize: '14px' }}>
          <span><span style={izoh}>ID</span><br /><b style={mono}>#{u.id}</b></span>
          <span><span style={izoh}>{t('admin.fy_rol')}</span><br /><b>{t('admin.rol_' + u.role)}</b></span>
          <span><span style={izoh}>{t('admin.fy_telefon')}</span><br /><b data-foyd-telefon="" style={{ fontVariantNumeric: 'tabular-nums' }}>{telefon(u.phone)}</b></span>
          <span><span style={izoh}>Email</span><br /><b style={{ overflowWrap: 'anywhere' }}>{emailKor(u.email)}</b></span>
          <span><span style={izoh}>{t('admin.fy_sex')}</span><br /><b>{u.shop || '—'}</b></span>
          <span><span style={izoh}>{t('admin.fy_royxat')}</span><br /><b>{sana(u.created_at) || '—'}</b></span>
          <span><span style={izoh}>{t('admin.fy_kirish')}</span><br /><b>{[u.telegram ? 'Telegram' : '', u.google ? 'Google' : ''].filter(Boolean).join(', ') || '—'}</b></span>
        </div>
        {u.bloklangan ? <span style={{ ...belgi(false), alignSelf: 'flex-start', background: 'rgba(255,123,123,.16)', color: 'var(--danger)' }}>{t('admin.fy_bloklangan')}{u.blok_sabab ? ': ' + u.blok_sabab : ''}</span> : null}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {bloklashMumkin && !u.bloklangan ? <button onClick={() => f.blokOch(u)} data-foyd-blok={u.id} style={xavfli}><Ikon n="bloklash" size={16} />{t('admin.fy_blokla')}</button> : null}
          {u.bloklangan ? <button onClick={() => f.blokOch2(u)} data-foyd-och={u.id} style={ghost}>{t('admin.fy_och')}</button> : null}
        </div>
        <span style={sarlavha}>{t('admin.fy_loyihalar')} ({u.loyihalar_royxat.length})</span>
        {u.loyihalar_royxat.length ? u.loyihalar_royxat.map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: '8px', fontSize: '14px', opacity: p.archived ? 0.6 : 1 }}>
            <span><b>#{p.id} {p.name || '—'}</b>{p.client ? ' · ' + p.client : ''}{p.archived ? ' · ' + t('admin.fy_arxiv') : ''}</span>
            <span style={izoh}>{p.modullar} {t('admin.fy_modul')} · {raqam(p.total_price)} {t('sarlavha.som')} · {sana(p.updated_at)}</span>
          </div>)) : <span style={izoh}>{t('admin.fy_bosh')}</span>}
        <span style={sarlavha}>{t('admin.fy_buyurtmalar')} ({u.buyurtmalar_royxat.length})</span>
        {u.buyurtmalar_royxat.length ? u.buyurtmalar_royxat.map(o => (
          <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: '8px', fontSize: '14px' }}>
            <span><b>№{o.id}</b> {o.client_name} · <span style={{ fontVariantNumeric: 'tabular-nums' }}>{telefon(o.client_phone)}</span> <b style={holatBelgi(o.status)}>{t('buyurtma.h_' + o.status)}</b></span>
            <span style={izoh}>{o.modullar} {t('admin.fy_modul')} · {raqam(o.total_price)} {t('sarlavha.som')} · {sana(o.created_at)}</span>
          </div>)) : <span style={izoh}>{t('admin.fy_bosh')}</span>}
      </div>
    </Varaq>
  );
}

function BlokForma({ f }) {
  return (
    <Varaq title={t('admin.fy_blokla')} kind="admin-blok" onClose={() => f.setBlok(null)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <span style={izoh}>{t('admin.fy_blok_matn', { nom: f.blok.name })}</span>
        <label style={lbl}>{t('admin.fy_sabab')}
          <textarea data-blok-f="sabab" rows={3} maxLength={200} value={f.blok.sabab} onChange={f.sababYoz} style={{ ...maydon, height: 'auto', padding: '12px 16px', resize: 'vertical', fontFamily: 'inherit' }} />
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={f.blokYubor} disabled={f.band} data-blok-f="tasdiq" style={{ ...tugma, background: 'var(--danger)', color: '#2A0A0A' }}>{t('admin.fy_blokla')}</button>
          <button onClick={() => f.setBlok(null)} style={ghost}>{t('umumiy.bekor')}</button>
        </div>
      </div>
    </Varaq>
  );
}

function Qatorlar({ f }) {
  const items = (f.r && f.r.items) || [];
  if (f.tab === 'foydalanuvchilar') return items.map(u => (
    <div key={u.id} className="adm-fy" role="row" data-foyd-qator={u.id} style={{ opacity: u.bloklangan ? 0.7 : 1 }}>
      <span style={{ minWidth: '0' }}>
        <b style={{ overflowWrap: 'anywhere' }}>{u.name || emailKor(u.email) || '#' + u.id}</b> <span style={{ ...izoh, ...mono }}>#{u.id}</span><br />
        <span style={izoh}>{emailKor(u.email)}</span>
      </span>
      <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }} data-foyd-telefon="">{telefon(u.phone)}</span>
      <span><b style={belgi(u.role === 'admin')}>{t('admin.rol_' + u.role)}</b></span>
      <span style={{ fontSize: '13px' }}>{u.loyihalar} {t('admin.fy_loyiha')} · {u.buyurtmalar} {t('admin.fy_buyurtma')}</span>
      <span>{u.bloklangan ? <b style={{ ...belgi(false), background: 'rgba(255,123,123,.16)', color: 'var(--danger)' }}>{t('admin.fy_bloklangan')}</b> : <b style={belgi(true)}>{t('admin.fy_faol')}</b>}</span>
      <span style={{ display: 'flex', gap: '6px' }}>
        <button onClick={() => f.ochish(u)} aria-label={t('admin.fy_korish')} data-foyd-korish={u.id} style={ghost}><Ikon n="korish" size={16} gap={0} /></button>
      </span>
    </div>));
  if (f.tab === 'loyihalar') return items.map(p => (
    <div key={p.id} className="adm-fy" role="row" data-loyiha-qator={p.id} style={{ opacity: p.archived ? 0.6 : 1 }}>
      <span style={{ minWidth: '0' }}><b style={{ overflowWrap: 'anywhere' }}>#{p.id} {p.name || '—'}</b><br /><span style={izoh}>{p.client || '—'}</span></span>
      <span style={{ fontSize: '13px' }}>{p.usta || emailKor(p.usta_email)}<br /><span style={{ ...izoh, fontVariantNumeric: 'tabular-nums' }}>{telefon(p.usta_phone)}</span></span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{raqam(p.total_price)} {t('sarlavha.som')}</span>
      <span style={{ fontSize: '13px' }}>{p.modullar} {t('admin.fy_modul')}</span>
      <span style={izoh}>{sana(p.updated_at)}{p.archived ? ' · ' + t('admin.fy_arxiv') : ''}</span>
      <span></span>
    </div>));
  return items.map(o => (
    <div key={o.id} className="adm-fy" role="row" data-buyurtma-qator={o.id}>
      <span style={{ minWidth: '0' }}><b>№{o.id}</b> {o.project_name || '—'}<br /><span style={izoh}>{o.client_name}</span></span>
      <span style={{ fontSize: '13px' }}><span style={{ fontVariantNumeric: 'tabular-nums' }}>{telefon(o.client_phone)}</span><br /><span style={izoh}>{t('admin.fy_usta')}: {o.usta || emailKor(o.usta_email)}</span></span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{raqam(o.total_price)} {t('sarlavha.som')}</span>
      <span style={{ fontSize: '13px' }}>{o.modullar} {t('admin.fy_modul')}</span>
      <span><b style={holatBelgi(o.status)}>{t('buyurtma.h_' + o.status)}</b><br /><span style={izoh}>{sana(o.created_at)}</span></span>
      <span></span>
    </div>));
}

export default function Foydalanuvchilar() {
  const f = useFoydalanuvchilar();
  const holatlar = HOLATLAR[f.tab];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '0' }} data-admin-bolim="foydalanuvchilar">
      <section style={karta}>
        <span style={sarlavha}>{t('admin.fy_sarlavha')}</span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }} role="tablist">
          {TABLAR.map(b => <button key={b} onClick={() => f.tabAlmash(b)} role="tab" aria-selected={f.tab === b} data-fy-tab={b} style={chipU(f.tab === b)}>{t('admin.fy_tab_' + b)}</button>)}
        </div>
        <input data-fy="qidir" value={f.q} onChange={(ev) => f.setQ(ev.target.value)} placeholder={t('admin.fy_qidir_' + f.tab)} aria-label={t('admin.fy_qidir_' + f.tab)} maxLength={100} style={maydon} />
        {holatlar.length ? (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {holatlar.map(h => <button key={h || 'hammasi'} onClick={() => f.setHolat(h)} aria-pressed={f.holat === h} data-fy-holat={h} style={chipU(f.holat === h)}>{h ? (f.tab === 'buyurtmalar' ? t('buyurtma.h_' + h) : t('admin.fy_h_' + h)) : t('admin.hammasi')}</button>)}
          </div>) : null}
        <span style={izoh} data-fy-jami="">{f.r ? t('admin.fy_jami', { n: f.r.jami }) : t('admin.yuklanmoqda')}</span>
        <div role="table" data-fy-royxat={f.tab}>
          <Qatorlar f={f} />
          {f.r && !f.r.items.length ? <span style={izoh}>{t('admin.topilmadi')}</span> : null}
        </div>
        {f.r && f.r.items.length < f.r.jami ? <button onClick={f.yana} disabled={f.band} data-fy="yana" style={ghost}>{t('admin.fy_yana', { n: f.r.jami - f.r.items.length })}</button> : null}
      </section>
      {f.det ? <Tafsilot f={f} /> : null}
      {f.blok ? <BlokForma f={f} /> : null}
    </div>
  );
}
