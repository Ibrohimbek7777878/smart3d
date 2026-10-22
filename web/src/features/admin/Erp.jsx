import React from 'react';
import { t } from '../../i18n/index.js';
import Ikon from '../../shared/ui/Ikon.jsx';
import { raqam } from '../../shared/lib/format.js';
import { useErp, GURUH_TARTIB, HOLAT_TARTIB } from './useErp.js';
import { karta, sarlavha, izoh, tugma, ghost, xavfli, maydon, mono, belgi, belgiXato, chipU } from './stil.js';

/* TZ-37 (3-faza): ERP sinxronlash. ERP bilan jonli aloqa YO'Q va ERP'ga hech narsa yozilmaydi: admin ERP'dan olingan JSON'ni yuklaydi, farqni ko'radi,
 * tanlab tasdiqlaydi; narxlar qo'llanadi (fayl narxi ustiga; admin qo'lda narxi bundan ustun), Tarix'dan qaytariladi, "Sukutga qaytarish" bor. */
const holatStil = (h) => (h === 'ozgardi' || h === 'qolda' ? belgi(false) : h === 'toldirildi' || h === 'yangi' ? belgi(true)
  : h === 'narxsiz' || h === 'noaniq' ? belgiXato : { ...belgi(false), background: 'var(--sfc2)', color: 'var(--mut)' });
const Chip = ({ k, on, children, ...p }) => <button data-erp-chip={k} aria-pressed={on} style={chipU(on)} {...p}>{children}</button>;

function Xulosa({ e }) {
  const x = e.det.xulosa || {}, g = x.guruh || {};
  return (
    <div data-erp="xulosa" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={izoh}>{t('admin.erp_xulosa_qator', { n: x.qatorlar || 0, p: (x.katalog || {}).plita || 0, f: (x.katalog || {}).furnitura || 0 })}{x.rad ? ' · ' + t('admin.erp_xulosa_rad', { n: x.rad }) : ''}</span>
      {GURUH_TARTIB.filter(k => g[k]).map(k => (
        <div key={k} data-erp-guruh={k} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <b style={{ fontSize: '13px', minWidth: '120px' }}>{t('admin.erp_g_' + k)}</b>
          {HOLAT_TARTIB.filter(h => g[k][h]).map(h => (
            <Chip key={h} k={k + ':' + h} on={e.guruh === k && e.holat === h} onClick={() => { e.setGuruh(k); e.setHolat(h); }}>{t('admin.erp_s_' + h)} · {g[k][h]}</Chip>))}
        </div>))}
      {x.yoq && (x.yoq.plita || x.yoq.furnitura || x.yoq.xizmat) ? (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <b style={{ fontSize: '13px', minWidth: '120px' }}>{t('admin.erp_s_yoq')}</b>
          <Chip k="yoq" on={e.holat === 'yoq'} onClick={() => { e.setGuruh(''); e.setHolat(e.holat === 'yoq' ? '' : 'yoq'); }}>{(x.yoq.plita || 0) + (x.yoq.furnitura || 0) + (x.yoq.xizmat || 0)}</Chip>
          <span style={izoh} data-erp="yoq">{t('admin.erp_xulosa_yoq', { p: x.yoq.plita || 0, f: x.yoq.furnitura || 0, x: x.yoq.xizmat || 0 })}</span>
        </div>) : null}
    </div>);
}

function Qator({ e, x }) {
  const tanlanadi = x.q && (x.g !== 'xizmat' || x.h !== 'yangi' || e.yangiXizmat);
  const belgili = tanlanadi && !e.istisno.includes(x.g + ':' + x.k);
  return (
    <div className="adm-erp" role="row" data-erp-qator={x.g + ':' + x.k} data-erp-holat={x.h} style={{ opacity: x.q ? 1 : 0.85 }}>
      <span>{x.q ? <input type="checkbox" data-erp-tanla={x.g + ':' + x.k} checked={!!belgili} disabled={e.det.holat !== 'qoralama' || (x.g === 'xizmat' && x.h === 'yangi')}
        onChange={() => e.qatorBelgila(x)} aria-label={x.nom} style={{ width: '20px', height: '20px', accentColor: 'var(--acc)' }} /> : null}</span>
      <span style={{ minWidth: '0' }}>
        <b style={{ overflowWrap: 'anywhere' }}>{x.nom}</b><br />
        <span style={{ ...izoh, ...mono }}>{x.sku || '—'}{x.guruh ? ' · ' + x.guruh : ''}{x.katalog_nom && x.katalog_nom !== x.nom ? ' · ' + x.katalog_nom : ''}</span>
      </span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        {x.h === 'yangi' && x.g !== 'xizmat' ? '—' : x.eski ? raqam(x.eski) : t('admin.narx_yoq')}
        {x.manba ? <><br /><span style={izoh}>{t('admin.erp_m_' + x.manba)}</span></> : null}
      </span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        {x.yangi ? <b>{raqam(x.yangi)}</b> : '—'}
        {x.narx_manba === 'usd_kurs' ? <><br /><span style={izoh}>{t('admin.erp_usd')}</span></> : x.royxat ? <><br /><span style={izoh}>{t('admin.erp_royxat_narx', { n: raqam(x.royxat) })}</span></> : null}
      </span>
      <span style={{ fontVariantNumeric: 'tabular-nums', color: x.foiz > 0 ? 'var(--acct)' : x.foiz < 0 ? 'var(--cyan)' : 'var(--mut)' }}>{x.foiz == null ? '—' : (x.foiz > 0 ? '+' : '') + String(x.foiz).replace('.', ',') + '%'}</span>
      <span><b style={holatStil(x.h)}>{t('admin.erp_s_' + x.h)}</b>{x.sabab ? <><br /><span style={izoh}>{t('admin.erp_sabab_' + x.sabab)}</span></> : null}</span>
    </div>);
}

function Batafsil({ e }) {
  const det = e.det, qoralama = det.holat === 'qoralama', g = (det.xulosa && det.xulosa.guruh) || {}, xz = g.xizmat || {};
  const guruhSon = { plita: (det.xulosa.qollanadi || {}).plita || 0, furnitura: (det.xulosa.qollanadi || {}).furnitura || 0, xizmat: xz.ozgardi || 0 };
  return (
    <section style={karta} data-erp="batafsil" data-erp-id={det.id}>
      <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={sarlavha}>{t('admin.erp_farq')}: {det.fayl_nom || '#' + det.id}</span>
        <span style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <b data-erp="holat" style={holatStil(det.holat === 'qollandi' ? 'toldirildi' : det.holat === 'qaytarilgan' ? 'qolda' : 'bir_xil')}>{t('admin.erp_h_' + det.holat)}</b>
          <button onClick={e.yop} data-erp="yop" style={ghost}>{t('umumiy.yopish')}</button>
        </span>
      </span>
      <span style={izoh}>{t('admin.erp_yuklash_qator', { n: (det.xulosa || {}).qatorlar || 0, sana: det.erp_sana || '—' })} · {e.sana(det.vaqt)} · {det.kim}</span>
      {det.eskirgan ? <span style={izoh} data-erp="eskirgan">{t('admin.erp_eskirgan')}</span> : null}
      {det.holat === 'qollandi' ? <span style={izoh} data-erp="qollangan">{t('admin.erp_qollangan', { sana: e.sana(det.qollangan_vaqt) })}</span> : null}
      {det.holat === 'qaytarilgan' ? <span style={izoh}>{t('admin.erp_qaytarilgan_n')}</span> : null}
      <Xulosa e={e} />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '10px' }}>
        <input data-erp="qidir" value={e.q} onChange={(ev) => e.setQ(ev.target.value)} maxLength={100} placeholder={t('admin.erp_qidir')} aria-label={t('admin.erp_qidir')} style={maydon} />
        {e.guruh || e.holat || e.q ? <div><button onClick={() => { e.setGuruh(''); e.setHolat(''); e.setQ(''); }} data-erp="tozala" style={ghost}>{t('admin.tarix_tozala')}</button></div> : null}
      </div>
      <span style={izoh} data-erp="jami">{t('admin.erp_jami', { a: det.items.length, b: det.jami })}</span>
      <div role="table" data-erp="jadval">
        <div className="adm-erp adm-eh" role="row"><span></span>{['nom', 'joriy', 'erp', 'foiz', 'holat'].map(k => <span key={k}>{t('admin.erp_c_' + k)}</span>)}</div>
        {det.items.map(x => <Qator key={x.g + ':' + x.k + ':' + x.erp_id} e={e} x={x} />)}
        {!det.items.length ? <span style={izoh}>{t('admin.topilmadi')}</span> : null}
      </div>
      {det.items.length < det.jami ? <button onClick={e.yana} data-erp="yana" style={ghost}>{t('admin.erp_yana', { n: det.jami - det.items.length })}</button> : null}
      {qoralama ? (
        <div data-erp="qollash-blok" style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
          <span style={sarlavha}>{t('admin.erp_qollash_blok')}</span>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {['plita', 'furnitura', 'xizmat'].filter(k => guruhSon[k] || (k === 'xizmat' && xz.yangi)).map(k => (
              <label key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '700' }}>
                <input type="checkbox" data-erp-guruh-tanla={k} checked={e.guruhlar[k]} onChange={() => e.guruhBelgila(k)} style={{ width: '20px', height: '20px', accentColor: 'var(--acc)' }} />
                {t('admin.erp_g_' + k)} ({guruhSon[k]})
              </label>))}
            {xz.yangi ? (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '700' }}>
                <input type="checkbox" data-erp="yangi-xizmat" checked={e.yangiXizmat} onChange={(ev) => e.setYangiXizmat(ev.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--acc)' }} />
                {t('admin.erp_yangi_xizmat', { n: xz.yangi })}
              </label>) : null}
          </div>
          <span style={izoh} data-erp="qollash-soni">{t('admin.erp_qollash_jami', { n: e.soni.jami, p: e.soni.plita, f: e.soni.furnitura, x: e.soni.xizmat })}</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={e.qollash} disabled={e.band || !e.soni.jami} data-erp="qollash" style={tugma}>{t('admin.erp_qollash')} ({e.soni.jami})</button>
            <button onClick={() => e.ochir(det)} data-erp="ochir" style={xavfli}><Ikon n="ochirish" size={16} />{t('umumiy.ochirish')}</button>
          </div>
        </div>) : null}
    </section>);
}

export default function Erp() {
  const e = useErp();
  if (!e.d) return <section style={karta} data-admin-bolim="erp"><span style={izoh}>{t('admin.yuklanmoqda')}</span></section>;
  const Q = e.d.qatlam;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '0' }} data-admin-bolim="erp">
      <section style={karta} data-erp="yuklash">
        <span style={sarlavha}>{t('admin.erp_sarlavha')}</span>
        <span style={izoh}>{t('admin.erp_izoh')}</span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ ...tugma, cursor: e.band ? 'wait' : 'pointer', opacity: e.band ? 0.6 : 1 }}>
            <Ikon n="faylYuk" size={17} />{t('admin.erp_fayl_tanla')}
            <input type="file" accept=".json,application/json" data-erp="fayl" disabled={e.band} style={{ position: 'absolute', width: '1px', height: '1px', opacity: '0', overflow: 'hidden' }}
              onChange={(ev) => { const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; e.fayl(f); }} />
          </label>
          {e.band ? <span style={izoh}>{t('admin.yuklanmoqda')}</span> : null}
        </div>
        <span style={izoh}>{t('admin.erp_fayl_izoh')}</span>
      </section>

      {e.det ? <Batafsil e={e} /> : null}

      <section style={karta} data-erp="qatlam">
        <span style={sarlavha}>{t('admin.erp_qatlam')}</span>
        <span style={izoh}>{t('admin.erp_qatlam_izoh')}</span>
        <span data-erp="qatlam-son" style={{ fontSize: '14px', fontWeight: '700' }}>{Q.plita + Q.furnitura ? t('admin.erp_qatlam_son', { p: Q.plita, f: Q.furnitura, sana: Q.oxirgi_sana || '—' }) : t('admin.erp_qatlam_bosh')}</span>
        {Q.plita + Q.furnitura ? <div><button onClick={e.sukut} data-erp="sukut" style={xavfli}>{t('admin.erp_sukut')}</button></div> : null}
      </section>

      <section style={karta} data-erp="royxat">
        <span style={sarlavha}>{t('admin.erp_yuklashlar')}</span>
        {!e.d.partiyalar.length ? <span style={izoh}>{t('admin.erp_yuklash_yoq')}</span> : null}
        {e.d.partiyalar.map(p => (
          <div key={p.id} data-erp-partiya={p.id} data-erp-p-holat={p.holat} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: '8px', fontSize: '14px' }}>
            <span style={{ minWidth: '0', overflowWrap: 'anywhere' }}>
              <b>#{p.id}</b> {t('admin.erp_tur_' + p.tur)} {p.fayl_nom && p.tur !== 'sukut' ? '· ' + p.fayl_nom : ''}<br />
              <span style={izoh}>{e.sana(p.vaqt)} · {p.kim}{p.erp_sana ? ' · ERP ' + p.erp_sana : ''}{p.xulosa && p.xulosa.qatorlar ? ' · ' + t('admin.erp_qator_n', { n: p.xulosa.qatorlar }) : ''}</span>
            </span>
            <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <b style={holatStil(p.holat === 'qollandi' ? 'toldirildi' : p.holat === 'qaytarilgan' ? 'qolda' : 'bir_xil')}>{t('admin.erp_h_' + p.holat)}</b>
              {p.farq_bor ? <button onClick={() => e.ochish(p.id)} data-erp-ochish={p.id} style={ghost}>{t('admin.erp_korish')}</button> : null}
              {p.holat === 'qoralama' ? <button onClick={() => e.ochir(p)} data-erp-ochir={p.id} aria-label={t('umumiy.ochirish')} style={xavfli}><Ikon n="ochirish" size={16} gap={0} /></button> : null}
            </span>
          </div>))}
      </section>
    </div>
  );
}
