import React from 'react';
import { t } from '../../i18n/index.js';
import Ikon from '../../shared/ui/Ikon.jsx';
import Toggle from '../../shared/ui/Toggle.jsx';
import { raqam } from '../../shared/lib/format.js';
import { useErpJonli, vaqtKorsat } from './useErpJonli.js';
import { karta, sarlavha, izoh, tugma, ghost, maydon, lbl, belgi, belgiXato } from './stil.js';

/* TZ-44 (10): "Jonli sinxronlash" kartasi — /admin/erp ning eng tepasida. Holat (yoqilgan / pauza / o'chiq), oxirgi muvaffaqiyat, xato soni, kurs,
 * "Hozir sinxronla", pauza almashtirgich, chegara (%), oxirgi o'zgarishlar va tasdiq kutayotganlar (mavjud tasdiq oqimiga havola).
 * Mavjud admin uslublari (stil.js) va Toggle — yangi dizayn tokeni yo'q. */
const HOLAT_STIL = { yoqilgan: belgi(true), pauza: belgi(false), ochiq: { ...belgi(false), background: 'var(--sfc2)', color: 'var(--mut)' } };
const OZGARISH_HOLAT = ['qollandi', 'kutadi', 'rad', 'qaytarildi'];
const OZGARISH_SABAB = ['birinchi_narx', 'kurs_sakradi', 'narx_yoq', 'katta_ozgarish'];          // server: erp_jonli_tarix.sabab
const holatBelgi = (h) => (h === 'kutadi' || h === 'rad' ? belgiXato : h === 'qollandi' ? belgi(true) : belgi(false));
const GURUHLAR = ['plita', 'furnitura', 'xizmat', 'stoleshnitsa'];

function Katak({ nom, k, children, xato }) {
  return (
    <div data-erpj-katak={k} style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '14px', padding: '10px 12px' }}>
      <span style={{ ...izoh, fontSize: '12px' }}>{nom}</span>
      <b style={{ fontSize: '15px', fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere', color: xato ? 'var(--danger)' : 'var(--txt)' }}>{children}</b>
    </div>);
}

function OzgarishQator({ o }) {
  const h = String(o.harakat || o.holat || o.natija || ''), sabab = OZGARISH_SABAB.includes(o.sabab) ? t('admin.erpj_sabab_' + o.sabab) : '', guruh = GURUHLAR.includes(o.guruh || o.tur) ? t('admin.erp_g_' + (o.guruh || o.tur)) : '';
  const eski = o.eski != null && o.eski !== '' ? raqam(o.eski) : '—', yangi = o.yangi != null && o.yangi !== '' ? raqam(o.yangi) : '—';
  const foiz = Number.isFinite(Number(o.foiz)) && o.foiz != null && o.foiz !== '' ? Number(o.foiz) : null;
  return (
    <div data-erpj-ozgarish={o.kod || o.kalit || ''} data-erpj-holat={h} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px 12px', flexWrap: 'wrap', borderTop: '1px solid var(--line)', padding: '8px 0', fontSize: '14px' }}>
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0', flex: '1 1 200px' }}>
        <b style={{ overflowWrap: 'anywhere' }}>{o.nom || o.kod || o.kalit || '—'}</b>
        <span style={izoh}>{vaqtKorsat(o.vaqt)}{guruh ? ' · ' + guruh : ''}{o.kim ? ' · ' + o.kim : ''}{sabab ? ' · ' + sabab : ''}</span>
      </span>
      <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{eski} → <b>{yangi}</b></span>
      <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: '56px', textAlign: 'right', color: foiz > 0 ? 'var(--acct)' : foiz < 0 ? 'var(--cyan)' : 'var(--mut)' }}>{foiz == null ? '' : (foiz > 0 ? '+' : '') + String(foiz).replace('.', ',') + '%'}</span>
      {h ? <b style={holatBelgi(h)}>{OZGARISH_HOLAT.includes(h) ? t('admin.erpj_h_' + h) : h}</b> : null}
    </div>);
}

export default function ErpJonli({ onKutayotgan }) {
  const e = useErpJonli();
  const d = e.d;
  if (!d) return <section style={karta} data-erpj="karta"><span style={sarlavha}>{t('admin.erpj_sarlavha')}</span><span style={izoh} data-erpj="yuklanmoqda">{e.yoq ? t('admin.erpj_yuklanmadi') : t('admin.yuklanmoqda')}</span></section>;
  const ochiq = d.holat === 'ochiq';
  return (
    <section style={karta} data-erpj="karta" data-erpj-holat={d.holat}>
      <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ ...sarlavha, display: 'flex', alignItems: 'center', gap: '8px' }}><Ikon n="sinxron" size={18} gap={0} />{t('admin.erpj_sarlavha')}</span>
        <b data-erpj="holat" style={HOLAT_STIL[d.holat]}>{t('admin.erpj_h_' + d.holat)}</b>
      </span>
      <span style={izoh}>{t('admin.erpj_izoh')}</span>
      {e.yoq ? <span style={{ ...izoh, color: 'var(--danger)' }} data-erpj="yuklanmadi">{t('admin.erpj_yuklanmadi')}</span> : null}
      {ochiq ? <span style={izoh} data-erpj="ochiq-izoh">{d.sabab === 'env_yoq' ? t('admin.erpj_ochiq_env_yoq') : d.sabab === 'ochirilgan' ? t('admin.erpj_ochiq_ochirilgan') : d.sabab === 'url_yaroqsiz' ? t('admin.erpj_ochiq_url') : t('admin.erpj_ochiq_izoh')}</span> : null}
      {d.kursKutadi ? <span style={{ ...izoh, color: 'var(--acct)' }} data-erpj="kurs-kutadi">{t('admin.erpj_kurs_kutadi', { eski: raqam(d.kursKutadi.eski || 0), yangi: raqam(d.kursKutadi.yangi) })}</span> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '10px' }}>
        <Katak k="oxirgi" nom={t('admin.erpj_oxirgi')}>{vaqtKorsat(d.oxirgi)}</Katak>
        <Katak k="manba" nom={t('admin.erpj_manba')}>{d.manba ? vaqtKorsat(d.manba) : '—'}</Katak>
        <Katak k="xato" nom={t('admin.erpj_xato')} xato={d.xato > 0}>{d.xato}{d.xato > 0 && d.xatoKodi ? ' · ' + d.xatoKodi : ''}</Katak>
        <Katak k="kurs" nom={t('admin.erpj_kurs')}>{d.kurs ? raqam(d.kurs) : '—'}</Katak>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={e.hozir} disabled={e.band || e.hozirKutish || ochiq} data-erpj="hozir" style={{ ...tugma, opacity: e.band || e.hozirKutish || ochiq ? 0.55 : 1 }}>
          <Ikon n="sinxron" size={17} />{t('admin.erpj_hozir')}
        </button>
        <span style={izoh}>{t('admin.erpj_hozir_izoh')}</span>
      </div>

      <div data-erpj="pauza" style={{ opacity: ochiq ? 0.55 : 1, pointerEvents: ochiq ? 'none' : 'auto' }}>
        <Toggle label={t('admin.erpj_pauza')} sub={d.pauza ? t('admin.erpj_pauza_on') : t('admin.erpj_pauza_off')} on={d.pauza} onFlip={e.pauzaFlip} />
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
        <label style={{ ...lbl, flex: '0 1 220px' }}>
          {t('admin.erpj_chegara')}
          <input data-erpj="chegara" value={e.chegara} onChange={(ev) => e.chegaraYoz(ev.target.value)} inputMode="numeric" maxLength={3} autoComplete="off"
            aria-label={t('admin.erpj_chegara')} onKeyDown={(ev) => { if (ev.key === 'Enter') e.chegaraSaqla(); }} style={maydon} />
        </label>
        <button onClick={e.chegaraSaqla} disabled={e.band} data-erpj="chegara-saqla" style={ghost}>{t('admin.erpj_saqla')}</button>
      </div>
      <span style={izoh}>{t('admin.erpj_chegara_izoh')}</span>

      <div data-erpj="kutayotgan" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
        {d.kutayotgan > 0 ? (<>
          <b style={belgiXato} data-erpj="kutayotgan-son">{t('admin.erpj_kutayotgan', { n: d.kutayotgan })}</b>
          <button onClick={() => onKutayotgan && onKutayotgan(d.kutayotganId)} data-erpj="kutayotgan-och" style={ghost}><Ikon n="havola" size={16} />{t('admin.erpj_kutayotgan_och')}</button>
        </>) : <span style={izoh} data-erpj="kutayotgan-yoq">{t('admin.erpj_kutayotgan_yoq')}</span>}
      </div>

      <div data-erpj="ozgarishlar" style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ ...sarlavha, fontSize: '15px', paddingBottom: '6px' }}>{t('admin.erpj_ozgarishlar')}</span>
        {!d.ozgarishlar.length ? <span style={izoh}>{t('admin.erpj_ozgarish_yoq')}</span> : null}
        {d.ozgarishlar.map((o, i) => <OzgarishQator key={(o.id != null ? o.id : '') + ':' + i} o={o} />)}
      </div>
    </section>);
}
