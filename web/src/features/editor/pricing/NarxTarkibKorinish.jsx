import React, { useEffect, useState } from 'react';
import { t } from '../../../i18n/index.js';
import { input } from '../../../shared/ui/styles.js';

/* TZ-49 (1): «Narx tarkibi» — bo'limlar, har qator: nom, miqdor × birlik narx = summa, jamidagi ulushi (%) va ingichka bar, manba belgisi, qoida;
 * bo'lim yig'indisi; pastda tannarx, ustama (manbasi bilan), jami, «Furniturasiz» jami. Kichik blok (narx paneli) va katta ko'rinish (varaq, keng=true)
 * SHU komponent: ma'lumot — useQadamNarx.tarkibKorinishi (prod.tarkib; yig'indi = narx paneli jami). Stillar — app.css (.nt-*), ranglar — dizayn tokenlari. */
const RANG = { plita: 'var(--acc)', kromka: 'var(--cyan)', raspil: 'var(--lav)', prisadka: 'var(--pch)', bazis: 'var(--lav)', furnitura: 'var(--cyan)', ish_haqi: 'var(--pch)', qosh: 'var(--acc)', ustama: 'var(--acct)' };
/** manba belgisi rangi: ERP / egasi / mijoz — firuza (tasdiqlangan), qo'lda — lavanda, taxmin — to'q sariq, narx yo'q — qizil */
const MANBA_RANG = { erp: 'var(--cyan)', egasi: 'var(--cyan)', mijoz: 'var(--cyan)', qolda: 'var(--lav)', taxmin: 'var(--acct)', yoq: 'var(--danger)' };

function Bar({ p, rang }) {
  return <span className="nt-bar" aria-hidden="true"><i style={{ width: (p > 0 ? Math.max(1.5, Math.min(100, p)) : 0) + '%', background: rang }} /></span>;
}

/** narxsiz furniturasi uchun qo'lda dona narxi (TZ-49 4): yozilgandan keyin (Enter / maydondan chiqish) shu loyiha hisobiga kiradi */
function QoldaNarx({ r }) {
  const [v, setV] = useState(r.qoldaNarx);
  useEffect(() => { setV(r.qoldaNarx); }, [r.qoldaNarx]);
  const yubor = () => { if (v !== r.qoldaNarx && !r.saqla(v)) setV(r.qoldaNarx); };
  return (
    <label className="nt-qolda" data-qolda={r.kod} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px', fontWeight: '700', color: 'var(--mut)' }}>
      <span>{t('narx.qolda_label')}</span>
      <input type="number" inputMode="numeric" min="1" step="1" value={v} placeholder={t('narx.qolda_ph')} onChange={(e) => setV(e.target.value)} onBlur={yubor}
        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} data-qolda-narx={r.kod} aria-label={t('narx.qolda_ph') + ': ' + r.nom}
        style={{ ...input, width: '150px', height: '40px', fontSize: '14px', padding: '0 12px' }} />
    </label>
  );
}

function Qator({ r, rang }) {
  return (
    <div data-tarkib-qator="" className="nt-q">
      <span className="nt-nom" style={{ fontWeight: '700', minWidth: '0', overflowWrap: 'anywhere' }}>{r.nom}</span>
      <span className="nt-formula" style={{ color: 'var(--mut)', fontVariantNumeric: 'tabular-nums' }}>{r.formula}</span>
      <span className="nt-summa" style={{ fontWeight: '800', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r.narxsiz ? t('narx.ch_narxsiz') : r.summa}</span>
      <span className="nt-ul" data-tarkib-ulush={r.ulush}><Bar p={r.ulush} rang={rang} /><b style={{ fontVariantNumeric: 'tabular-nums', fontSize: '12px', color: 'var(--mut)', minWidth: '44px', textAlign: 'right' }}>{r.ulushMatn}</b></span>
      <span className="nt-meta" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'baseline', fontSize: '12px', color: 'var(--mut)' }}>
        <span data-tarkib-manba={r.manbaKod} style={{ fontWeight: '800', padding: '1px 8px', borderRadius: '999px', border: '1px solid currentColor', color: MANBA_RANG[r.manbaKod] || 'var(--acct)', whiteSpace: 'nowrap' }}>{r.manba}</span>
        <span data-tarkib-qoida={r.qoidaKod} style={{ minWidth: '0', overflowWrap: 'anywhere' }}>· {r.qoida}</span>
      </span>
      {r.qoldaMumkin ? <span className="nt-qolda-q"><QoldaNarx r={r} /></span> : null}
    </div>
  );
}

/** k — useQadamNarx.tarkibKorinishi() natijasi; keng — katta ko'rinish (varaq) */
export default function NarxTarkibKorinish({ k, keng = false }) {
  if (!k) return null;
  const qoldaBor = k.bolimlar.some(b => b.qatorlar.some(r => r.qoldaMumkin));
  return (
    <div data-tarkib-royxat="" className={'nt ' + (keng ? 'nt-keng' : 'nt-kichik')}>
      {keng ? (
        <div className="nt-th" aria-hidden="true">
          <span>{t('narx.ch_nom')}</span><span>{t('narx.ch_miqdor')} × {t('narx.ch_narx')}</span><span style={{ textAlign: 'right' }}>{t('narx.ch_summa')}</span><span>%</span>
        </div>) : null}
      {k.bolimlar.map((b) => (
        <div key={b.kod} data-tarkib-bolim={b.kod} className="nt-b">
          <div className="nt-bh">
            <span style={{ fontSize: keng ? '16px' : '15px' }}>{b.nom} <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--mut)' }}>· {b.qatorlar.length}</span></span>
            <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}><span data-tarkib-jami="" style={{ fontSize: keng ? '16px' : '15px' }}>{b.jami}</span> <span data-tarkib-bolim-ulush="" style={{ fontSize: '12px', color: 'var(--mut)', fontWeight: '700', marginLeft: '6px' }}>{b.ulushMatn}</span></span>
            <Bar p={b.ulush} rang={RANG[b.kod] || 'var(--acc)'} />
          </div>
          {b.kod === 'furnitura' && qoldaBor ? <span data-qolda-izoh="" style={{ display: 'block', fontSize: '12px', color: 'var(--mut)', fontWeight: '600', padding: '2px 0 4px' }}>{t('narx.qolda_izoh')}</span> : null}
          {b.qatorlar.map((r, i) => <Qator key={r.kod + ':' + i} r={r} rang={RANG[b.kod] || 'var(--acc)'} />)}
        </div>))}
      <div className="nt-pastki">
        <div className="nt-p"><span>{t('narx.tarkib_tannarx')}</span><span data-tarkib-tannarx="" style={{ fontVariantNumeric: 'tabular-nums' }}>{k.tannarx}</span></div>
        <div className="nt-p" data-tarkib-ustama-qator="">
          <span>{k.ustama.bor ? t('narx.tarkib_ustama_jami', { n: String(k.ustama.foiz).replace('.', ',') }) : t('narx.tarkib_ustama_yoq')}</span>
          <span data-tarkib-ustama-summa="" style={{ fontVariantNumeric: 'tabular-nums' }}>{k.ustama.summa}</span>
        </div>
        {k.ustamaManba ? <span data-tarkib-ustama-manba="" style={{ fontSize: '12px', color: 'var(--mut)', fontWeight: '600' }}>{k.ustamaManba}</span> : null}
        <div className="nt-p nt-jami"><span>{t('narx.tarkib_jami')}</span><span style={{ fontVariantNumeric: 'tabular-nums' }} data-tarkib-hammasi="">{k.jami}</span></div>
        <div className="nt-p" style={{ color: 'var(--mut)', fontWeight: '700' }}><span>{t('narx.tarkib_furnsiz')}</span><span style={{ fontVariantNumeric: 'tabular-nums' }} data-tarkib-furnsiz="">{k.furnsiz}</span></div>
      </div>
    </div>
  );
}
