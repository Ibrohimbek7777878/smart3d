import React from 'react';
import { useSlice } from '../../../store/index.js';
import { t } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { FONLAR, korinishOzgar, menyuOchYop, menyuYop, yonalish, zoom, toliqEkran, erkinMaydon } from './korinish.js';

/* TZ-23 (dizaynda yo'q — namuna: egasi bergan Bazis-Cloud skrinshotlari; dizayn uslubida: --sfc, --line, 14px burchak).
 * O'ngda vertikal panel: yo'nalishlar (izometriya, old, yuqori, chap, o'ng), to'liq ekran, +/−, o'lchash, ko'rinish menyusi.
 * Menyu: kamera (aylanish, yurish, orto), fon, chizish rejimi (bo'yalgan, qirralar, sim karkas, effektlar) va rentgen,
 * devor-pol, fasadsiz. Telefonda panel ixcham — yo'nalishlar menyuda. Faqat 3D da ko'rinadi. */
const BTN = { width: '40px', height: '40px', borderRadius: '12px', border: '0', background: 'transparent', color: 'var(--txt)', display: 'grid', placeItems: 'center', cursor: 'pointer' };
const PANEL = { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: '7',   // menyu foni ustida — tugmalar doim bosiladi
  display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px', borderRadius: '16px', background: 'rgba(23,50,57,.92)', border: '1px solid var(--line)' };
const QATOR = (on) => ({ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', minHeight: '40px', padding: '0 12px', borderRadius: '10px', border: '0', background: on ? 'rgba(255,122,69,.16)' : 'transparent', color: on ? 'var(--acc)' : 'var(--txt)', fontWeight: on ? '800' : '600', fontSize: '14px', cursor: 'pointer', textAlign: 'left' });
const SARLAVHA = { fontSize: '11px', fontWeight: '800', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--mut)', padding: '10px 12px 4px' };
const YON = [['izo', 'izo'], ['old', 'old'], ['yuqori', 'yuqori'], ['chap', 'chapYon'], ['ong', 'ongYon']];
const FON_RANG = (n) => '#' + n.toString(16).padStart(6, '0');

function Tugma({ ik, label, onClick, on, data }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} aria-pressed={on === undefined ? undefined : !!on} data-korinish={data}
      style={{ ...BTN, background: on ? 'var(--acc)' : 'transparent', color: on ? 'var(--ink)' : 'var(--txt)' }}>
      <Ikon n={ik} size={19} gap={0} />
    </button>
  );
}

export default function KorinishPanel({ tel }) {
  const k = useSlice('korinish'), ed = useSlice('editor');
  useSlice('project');                                      // docV: maydon rejimi o'zgarsa qayta chiziladi
  const erkin = erkinMaydon();
  if (ed.view !== '3d' || !ed.sceneOn) return null;
  const tanla = (p) => () => korinishOzgar(p);
  return (
    <>
      <div data-korinish-panel="" style={PANEL}>
        {!tel ? YON.map(([nom, ik]) => <Tugma key={nom} ik={ik} label={t('korinish.' + nom)} onClick={() => yonalish(nom)} data={'yon-' + nom} />) : <Tugma ik="izo" label={t('korinish.izo')} onClick={() => yonalish('izo')} data="yon-izo" />}
        <span style={{ height: '1px', background: 'var(--line)', margin: '3px 6px' }}></span>
        <Tugma ik="toliq" label={t('korinish.toliq')} onClick={toliqEkran} data="toliq" />
        {!tel ? (<>
          <Tugma ik="yaqin" label={t('korinish.yaqin')} onClick={() => zoom(1)} data="yaqin" />
          <Tugma ik="uzoq" label={t('korinish.uzoq')} onClick={() => zoom(-1)} data="uzoq" />
        </>) : null}
        <span style={{ height: '1px', background: 'var(--line)', margin: '3px 6px' }}></span>
        <Tugma ik="olchash" label={t('korinish.olchash')} on={k.olchash} onClick={tanla({ olchash: !k.olchash })} data="olchash" />
        <Tugma ik="qatlam" label={t('korinish.menyu')} on={k.menyu} onClick={menyuOchYop} data="menyu" />
      </div>
      {k.olchash || k.kamera === 'yurish' ? (
        <div role="status" data-korinish-holat="" style={{ position: 'absolute', left: '50%', bottom: '20px', transform: 'translateX(-50%)', zIndex: '4', padding: '8px 14px', borderRadius: '12px', background: 'rgba(23,50,57,.92)', border: '1px solid var(--line)', color: 'var(--txt)', fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap', maxWidth: 'calc(100% - 24px)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {k.olchash ? (k.olcham != null ? t('korinish.olcham', { mm: String(k.olcham).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') }) : t('korinish.olchash_izoh')) : t('korinish.yurish_izoh')}
        </div>
      ) : null}
      {k.menyu ? (
        <>
          <div onClick={menyuYop} style={{ position: 'absolute', inset: '0', zIndex: '5' }}></div>
          <div role="menu" data-korinish-menyu="" style={{ position: 'absolute', right: tel ? '64px' : '68px', top: tel ? '64px' : '50%', transform: tel ? 'none' : 'translateY(-50%)', zIndex: '6', width: tel ? 'calc(100% - 72px)' : '260px',   /* panel (o'ngda) yopmasin */
             maxWidth: '300px', maxHeight: 'calc(100% - 80px)', overflow: 'auto', padding: '6px', borderRadius: '18px', background: 'var(--sfc)', border: '1px solid var(--line)', boxShadow: '0 18px 48px rgba(0,0,0,.4)' }}>
            {tel ? (<>
              <div style={SARLAVHA}>{t('korinish.yonalish')}</div>
              <div style={{ display: 'flex', gap: '4px', padding: '0 6px 4px', flexWrap: 'wrap' }}>
                {YON.map(([nom, ik]) => <Tugma key={nom} ik={ik} label={t('korinish.' + nom)} onClick={() => { yonalish(nom); menyuYop(); }} data={'yon-' + nom} />)}
                <Tugma ik="yaqin" label={t('korinish.yaqin')} onClick={() => zoom(1)} data="yaqin" />
                <Tugma ik="uzoq" label={t('korinish.uzoq')} onClick={() => zoom(-1)} data="uzoq" />
              </div>
            </>) : null}
            <div style={SARLAVHA}>{t('korinish.kamera')}</div>
            {[['orbit', 'orbit'], ['yurish', 'yurish'], ['orto', 'orto']].map(([v, ik]) => (
              <button key={v} role="menuitemradio" aria-checked={k.kamera === v} data-kamera={v} onClick={() => { korinishOzgar({ kamera: v }); if (v === 'yurish') menyuYop(); }} style={QATOR(k.kamera === v)}>
                <Ikon n={ik} size={17} gap={0} /><span style={{ flex: '1' }}>{t('korinish.' + v)}</span>{k.kamera === v ? <Ikon n="tayyor" size={16} gap={0} /> : null}
              </button>
            ))}
            <div style={SARLAVHA}>{t('korinish.fon')}</div>
            <div style={{ display: 'flex', gap: '8px', padding: '2px 12px 6px', alignItems: 'center', flexWrap: 'wrap' }}>
              {Object.entries(FONLAR).map(([nom, rang]) => (
                <button key={nom} onClick={tanla({ fon: rang })} aria-label={t('korinish.fon_' + nom)} title={t('korinish.fon_' + nom)} data-fon={nom}
                  style={{ width: '30px', height: '30px', borderRadius: '9px', border: k.fon === rang ? '2px solid var(--acc)' : '1px solid var(--line)', background: FON_RANG(rang), cursor: 'pointer' }}></button>
              ))}
              <label title={t('korinish.oz_rang')} style={{ position: 'relative', width: '30px', height: '30px', borderRadius: '9px', border: '1px dashed var(--mut)', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--mut)' }}>
                <Ikon n="qosh" size={15} gap={0} />
                <input type="color" aria-label={t('korinish.oz_rang')} onChange={(e) => korinishOzgar({ fon: parseInt(e.target.value.slice(1), 16) })} style={{ position: 'absolute', inset: '0', opacity: '0', cursor: 'pointer' }} />
              </label>
            </div>
            <button onClick={tanla({ fon: null })} data-fon="standart" style={QATOR(k.fon == null)}>
              <span style={{ flex: '1' }}>{t('korinish.standart')}</span>{k.fon == null ? <Ikon n="tayyor" size={16} gap={0} /> : null}
            </button>
            <div style={SARLAVHA}>{t('korinish.chizish')}</div>
            {['boyalgan', 'qirrali', 'karkas', 'effekt'].map(v => (
              <button key={v} role="menuitemradio" aria-checked={k.chizish === v} data-chizish={v} onClick={tanla({ chizish: v })} style={QATOR(k.chizish === v)}>
                <span style={{ flex: '1' }}>{t('korinish.' + v)}</span>{k.chizish === v ? <Ikon n="tayyor" size={16} gap={0} /> : null}
              </button>
            ))}
            <button role="menuitemcheckbox" aria-checked={k.rentgen} data-rentgen="" onClick={tanla({ rentgen: !k.rentgen })} style={QATOR(k.rentgen)}>
              <Ikon n="rentgen" size={17} gap={0} /><span style={{ flex: '1' }}>{t('korinish.rentgen')}</span>{k.rentgen ? <Ikon n="tayyor" size={16} gap={0} /> : null}
            </button>
            <div style={SARLAVHA}>{t('korinish.sahna')}</div>
            <button role="menuitemcheckbox" aria-checked={k.xona && !erkin} aria-disabled={erkin} disabled={erkin} title={erkin ? t('korinish.xona_erkin') : undefined} data-xona="" onClick={tanla({ xona: !k.xona })} style={{ ...QATOR(k.xona && !erkin), ...(erkin ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}>
              <span style={{ flex: '1' }}>{t('korinish.xona')}</span>{k.xona && !erkin ? <Ikon n="tayyor" size={16} gap={0} /> : null}
            </button>
            <button role="menuitemcheckbox" aria-checked={k.fasadsiz} data-fasadsiz="" onClick={tanla({ fasadsiz: !k.fasadsiz })} style={QATOR(k.fasadsiz)}>
              <span style={{ flex: '1' }}>{t('korinish.fasadsiz')}</span>{k.fasadsiz ? <Ikon n="tayyor" size={16} gap={0} /> : null}
            </button>
          </div>
        </>
      ) : null}
    </>
  );
}
