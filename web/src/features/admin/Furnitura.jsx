import React from 'react';
import { t } from '../../i18n/index.js';
import Varaq from '../../shared/ui/Varaq.jsx';
import Ikon from '../../shared/ui/Ikon.jsx';
import { raqam } from '../../shared/lib/format.js';
import { useFurnitura } from './useFurnitura.js';
import { karta, sarlavha, izoh, tugma, ghost, xavfli, maydon, lbl, mono, belgi } from './stil.js';

/* TZ-37 (c): furnitura kodi → ERP ID, koeffitsient (narx = katalog narxi × koef), izoh. Narxsizlar — tepada. */
function Tahrir({ f }) {
  const x = f.tahrir;
  return (
    <Varaq title={t('admin.furn_tahrir')} kind="admin-furn" onClose={() => f.setTahrir(null)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', minHeight: '0' }}>
        <span style={{ ...mono, fontSize: '14px', fontWeight: '800' }}>{x.kod}</span>
        <label style={lbl}>{t('admin.furn_erp_qidir')}
          <input data-f="qidir" value={x.q} onChange={f.on('q')} placeholder={t('admin.furn_qidir_ph')} style={maydon} />
        </label>
        {f.katYoq ? <span style={izoh}>{t('admin.furn_katalog_yoq')}</span> : null}
        {f.topilgan.map(it => (
          <button key={it.id} data-erp-variant={it.id} onClick={() => f.setTahrir({ ...x, erp: String(it.id), q: '' })}
            style={{ ...ghost, height: 'auto', minHeight: '44px', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', padding: '8px 12px', textAlign: 'left' }}>
            <span style={{ fontSize: '13px' }}><b style={mono}>{it.id}</b> · {it.sku}</span>
            <span style={{ fontSize: '12px', color: 'var(--mut)', fontWeight: '500' }}>{it.name} · {it.uzs ? raqam(it.uzs) + ' ' + t('sarlavha.som') : t('admin.narx_yoq')}</span>
          </button>))}
        <label style={lbl}>{t('admin.furn_erp_id')}
          <input data-f="erp" inputMode="numeric" value={x.erp} onChange={f.on('erp')} style={maydon} />
        </label>
        {f.tanlangan ? <span style={izoh}>{f.tanlangan.name} · {f.tanlangan.uzs ? raqam(f.tanlangan.uzs) + ' ' + t('sarlavha.som') : t('admin.narx_yoq')}</span> : null}
        <label style={lbl}>{t('admin.furn_koef')}
          <input data-f="koef" inputMode="decimal" value={x.koef} onChange={f.on('koef')} style={maydon} />
        </label>
        <span style={izoh}>{t('admin.furn_koef_izoh')}</span>
        <label style={lbl}>{t('admin.furn_izoh')}
          <textarea data-f="izoh" value={x.izoh} onChange={f.on('izoh')} rows={2} style={{ ...maydon, height: 'auto', padding: '12px 16px', resize: 'vertical', fontFamily: 'inherit' }} />
        </label>
        <button onClick={f.saqla} disabled={f.band} data-f="saqla" style={tugma}>{t('umumiy.saqlash')}</button>
      </div>
    </Varaq>
  );
}

export default function Furnitura() {
  const f = useFurnitura();
  if (!f.d) return <section style={karta}><span style={izoh}>{t('admin.yuklanmoqda')}</span></section>;
  const bogli = new Set(f.d.links.map(l => l.kod));
  const narxsiz = f.d.narxsiz.filter(k => !bogli.has(k) || (f.d.links.find(l => l.kod === k) || {}).narx == null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '0' }} data-admin-bolim="furnitura">
      {narxsiz.length ? (
        <section style={karta} data-furn="narxsiz">
          <span style={sarlavha}>{t('admin.furn_narxsiz')} ({narxsiz.length})</span>
          <span style={izoh}>{t('admin.furn_narxsiz_izoh')}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {narxsiz.map(k => (
              <button key={k} onClick={() => f.ochish(f.d.links.find(l => l.kod === k), k)} data-narxsiz={k} style={{ ...ghost, ...mono }}>{k}</button>))}
          </div>
        </section>) : null}
      <section style={karta} data-furn="royxat">
        <span style={sarlavha}>{t('admin.furn_sarlavha')} ({f.d.links.length})</span>
        <span style={izoh}>{t('admin.furn_izoh_matn')}</span>
        <div role="table">
          <div className="adm-fr adm-fh" role="row">
            {['kod', 'nom', 'erp', 'narx', 'koef', 'izoh', 'manba'].map(k => <span key={k}>{t('admin.furn_h_' + k)}</span>)}<span></span>
          </div>
          {f.d.links.map(l => (
            <div key={l.kod} className="adm-fr" role="row" data-furn-qator={l.kod}>
              <span style={{ ...mono, fontWeight: '800' }}>{l.kod}</span>
              <span>{l.nom || '—'}</span>
              <span style={mono}>{l.erp_id}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{l.narx != null ? raqam(l.narx) : <b style={belgi(false)}>{t('admin.narx_yoq')}</b>}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>×{l.koef}</span>
              <span style={{ color: 'var(--mut)', fontSize: '13px' }}>{l.izoh || ''}</span>
              <span><b style={belgi(l.manba === 'baza')}>{l.manba === 'baza' ? t('admin.manba_baza') : t('admin.manba_fayl')}</b></span>
              <span style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => f.ochish(l)} aria-label={t('admin.tahrirlash')} data-furn-tahrir={l.kod} style={ghost}><Ikon n="tahrir" size={16} gap={0} /></button>
                {l.manba === 'baza' ? <button onClick={() => f.ochir(l)} aria-label={t('umumiy.ochirish')} data-furn-ochir={l.kod} style={xavfli}><Ikon n="ochirish" size={16} gap={0} /></button> : null}
              </span>
            </div>))}
        </div>
      </section>
      {f.tahrir ? <Tahrir f={f} /> : null}
    </div>
  );
}
