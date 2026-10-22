import React, { useEffect, useMemo, useState } from 'react';
import { t } from '../../../i18n/index.js';
import { useSlice } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { xato } from '../../../store/ui.js';
import { raqam } from '../../../shared/lib/format.js';
import { input, chip, hint } from '../../../shared/ui/styles.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { XIZMAT_GURUHLAR, xizmatQidir } from '../../../../../app/js/engine/xizmatKatalog.js';
import { qoshXizmat, qoshOlib } from './narxActions.js';

/* TZ-48 (egasi #301, 4-qaror): «Xizmat qo'shish» oynasi — ERP xizmatlar ro'yxatidan (arra, kromka, prisadka, Rover …) istalgan xizmatni tanlab miqdor bilan
 * narx qatori sifatida qo'shish. Qidiruv va guruhlar; qo'shilgan xizmat olib tashlanadi; loyiha bilan birga saqlanadi (doc.qoshXizmat).
 * Narx — ERP xizmatlar jadvali (yoki narx hujjatidagi yangi narx); Smart3D katalogidagi (ERP emas) xizmat «taxmin» deb belgilanadi — narx o'ylab topilmaydi. */
const MAX = 80;
const MANBA = { 'sex jadvali': 'erp', egasi: 'egasi', taxmin: 'taxmin' };
const birlikNomi = (u) => { const k = 'narx.u_' + u, v = t(k); return v === k ? String(u || '') : v; };

function Qator({ x, bor }) {
  const [soni, setSoni] = useState('1');
  const n = Math.ceil(Number(soni));
  const yaroq = Number.isFinite(n) && n >= 1;
  return (
    <div data-xizmat-qator={x.kod} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 0', borderTop: '1px solid var(--line)' }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
        <span style={{ fontWeight: '700', fontSize: '14px', minWidth: '0', overflowWrap: 'anywhere' }}>{x.nom}</span>
        <span style={{ fontWeight: '800', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontSize: '14px' }}>{raqam(x.narx)} {t('narx.som')}</span>
      </span>
      <span style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--mut)', fontWeight: '600' }}>
        <span>{t('xg.' + x.guruh)}</span><span>· {t('xizmatq.birlik', { u: birlikNomi(x.birlik) })}</span>
        <span data-xizmat-manba={MANBA[x.manba] || 'taxmin'} style={{ fontWeight: '800', color: x.manba === 'taxmin' ? 'var(--acct)' : 'var(--cyan)' }}>· {t('narx.m_' + (MANBA[x.manba] || 'taxmin'))}</span>
        {x.sana ? <span>· {x.sana}</span> : null}
      </span>
      <span style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="number" inputMode="numeric" min="1" step="1" value={soni} onChange={e => setSoni(e.target.value)} aria-label={t('xizmatq.miqdor')} data-xizmat-soni="" style={{ ...input, width: '88px', height: '44px', fontSize: '15px', textAlign: 'center' }} />
        <button onClick={() => { if (yaroq) qoshXizmat(x, n); else xato('S3D-NARX-105', { modul: 'narx', xabar: x.kod + ' × ' + soni }); }} data-xizmat-qoshish="" style={{ ...chip(true), minHeight: '44px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Ikon n="qosh" size={16} gap={0} />{t('xizmatq.qoshish')}
        </button>
        {bor ? (<>
          <span data-xizmat-bor="" style={{ fontSize: '13px', fontWeight: '800', color: 'var(--cyan)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Ikon n="tayyor" size={14} gap={0} />{t('xizmatq.qoshilgan', { n: bor.soni })}</span>
          <button onClick={() => qoshOlib(x.kod)} data-xizmat-olib="" aria-label={t('xizmatq.olib_tashlash')} style={{ ...chip(false), minHeight: '44px', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Ikon n="ochirish" size={16} gap={0} />{t('xizmatq.olib_tashlash')}
          </button>
        </>) : null}
      </span>
    </div>
  );
}

export default function XizmatVaraq() {
  useSlice('project'); useSlice('data'); useSlice('settings');
  const H = project.H;
  const [q, setQ] = useState('');
  const [g, setG] = useState('hammasi');
  const katalog = useMemo(() => (H ? H.xizmatKatalog() : []), [H, H && H.narxlar]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (H && !katalog.length) xato('S3D-NARX-104', { modul: 'xizmat-katalog' }); }, [H, katalog.length]);
  const topildi = xizmatQidir(katalog, q, g);
  const qosh = new Map(((project.doc && project.doc.qoshXizmat) || []).map(x => [x.kod, x]));
  const son = (guruh) => katalog.filter(x => guruh === 'hammasi' || x.guruh === guruh).length;
  return (
    <>
      <span style={hint}>{t('xizmatq.izoh')}</span>
      <div style={{ position: 'relative' }}>
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t('xizmatq.qidiruv')} aria-label={t('xizmatq.qidiruv')} data-xizmat-qidiruv="" style={{ ...input, height: '48px', paddingLeft: '44px' }} />
        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--mut)', display: 'grid' }}><Ikon n="qidiruv" size={18} gap={0} /></span>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {['hammasi', ...XIZMAT_GURUHLAR].filter(x => x === 'hammasi' || son(x) > 0).map(x => (
          <button key={x} onClick={() => setG(x)} aria-pressed={g === x} data-xizmat-guruh={x} style={chip(g === x)}>{t('xg.' + x)} · {son(x)}</button>))}
      </div>
      <div data-xizmat-royxat="" style={{ display: 'flex', flexDirection: 'column' }}>
        {topildi.slice(0, MAX).map(x => <Qator key={x.kod} x={x} bor={qosh.get(x.kod)} />)}
        {!topildi.length ? <span style={{ ...hint, padding: '12px 0' }}>{t('xizmatq.topilmadi')}</span> : null}
        {topildi.length > MAX ? <span style={{ ...hint, padding: '10px 0' }}>{t('xizmatq.yana', { n: topildi.length - MAX })}</span> : null}
      </div>
    </>
  );
}
