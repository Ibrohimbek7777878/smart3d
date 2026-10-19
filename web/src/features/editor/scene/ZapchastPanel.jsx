import React, { useEffect, useRef } from 'react';
import { t } from '../../../i18n/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { useZapchast } from './zapchast.js';
import { useSlice } from '../../../store/index.js';

/* TZ-38 (egasi #274): zapchast ro'yxati — "Zapchastlar" tugmasi bilan birga ochiladi. Kompyuterda — ko'rinish panelining chap tomonida,
 * telefonda — pastdan chiqadigan varaq. Dizayn tokenlari: --sfc, --line, --acc, --cyan, 18-22 px burchak. Qatorga bosilsa 3D da zapchast
 * ajraladi; 3D da zapchastga bosilsa shu qator ochiladi va ko'rinishga keltiriladi. */
const KARTA_D = { position: 'absolute', right: '64px', top: '68px', zIndex: '5', width: 'min(340px,calc(100% - 88px))', maxHeight: 'calc(100% - 140px)' };
/* telefonda 3D oynasi pastki varaq (katalog) bilan bo'lishadi va past — shuning uchun ro'yxat ekranning pastidan chiqadigan varaq (fixed) */
const KARTA_T = { position: 'fixed', left: '8px', right: '8px', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)', zIndex: '45', maxHeight: '52vh' };
const BOSH = { display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(23,50,57,.97)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--line)', borderRadius: '22px', boxShadow: '0 20px 50px rgba(0,0,0,.45)' };
const QATOR = (on) => ({ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', padding: '9px 12px', border: '0', borderTop: '1px solid var(--line)', background: on ? 'rgba(255,122,69,.12)' : 'transparent', color: 'var(--txt)', cursor: 'pointer', textAlign: 'left', minHeight: '44px' });
const BELGI = (on) => ({ display: 'flex', flexDirection: 'column', gap: '1px', width: '100%', padding: '7px 12px 7px 30px', border: '0', background: on ? 'rgba(255,122,69,.22)' : 'rgba(255,255,255,.03)', color: 'var(--txt)', cursor: 'pointer', textAlign: 'left', minHeight: '40px', borderLeft: on ? '3px solid var(--acc)' : '3px solid transparent' });

export default function ZapchastPanel({ tel }) {
  const v = useZapchast();
  const sel = useSlice('korinish').zapTanla, ref = useRef(null);
  /* 3D da zapchastga bosildi — ro'yxatda shu qator ko'rinishga keladi */
  useEffect(() => {
    if (!sel || !ref.current) return;
    const el = ref.current.querySelector('[data-zap-key="' + sel + '"]');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [sel, v.on]);
  const [ochiq, setOchiq] = React.useState({});
  if (!v.on) return null;
  return (
    <div data-zap-panel="" role="region" aria-label={t('zapchast.sarlavha')} style={{ ...BOSH, ...(tel ? KARTA_T : KARTA_D) }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', padding: '12px 12px 8px 14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0' }}>
          <span style={{ fontSize: '16px', fontWeight: '800' }}>{t('zapchast.sarlavha')}</span>
          <span data-zap-jami="" style={{ fontSize: '13px', fontWeight: '700', color: 'var(--cyan)', fontVariantNumeric: 'tabular-nums' }}>{v.jami}</span>
          <span data-zap-belgi-jami="" style={{ fontSize: '12px', color: 'var(--mut)' }}>{v.belgiJami}</span>
          {v.narxsiz ? <span style={{ fontSize: '12px', color: 'var(--pch)', display: 'flex', alignItems: 'center', gap: '4px' }}><Ikon n="ogohlantirish" size={13} gap={0} />{v.narxsiz}</span> : null}
        </div>
        <button onClick={v.yop} aria-label={t('umumiy.yopish')} data-zap-yop="" style={{ width: '36px', height: '36px', flex: '0 0 auto', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--sfc2)', color: 'var(--txt)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
          <Ikon n="yopish" size={18} gap={0} />
        </button>
      </div>
      <div ref={ref} style={{ overflow: 'auto', overscrollBehavior: 'contain' }}>
        {!v.hisob ? <div style={{ padding: '12px 14px', color: 'var(--mut)', fontSize: '13px' }}>{t('sahna.yuklanmoqda')}</div> : null}
        {v.bosh ? <div style={{ padding: '12px 14px', color: 'var(--mut)', fontSize: '13px' }}>{v.bosh}</div> : null}
        {v.qatorlar.map(r => {
          const och = r.ochiq || ochiq[r.id];
          return (
            <div key={r.id} data-zap-qator-blok="">
              <button data-zap-qator={r.bomsiz ? 'bomsiz' : ''} aria-expanded={och && r.belgilar.length > 0}
                onClick={() => setOchiq(o => ({ ...o, [r.id]: !o[r.id] }))} style={QATOR(r.ochiq)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {r.rang ? <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: r.rang, flex: '0 0 auto' }}></span> : null}
                  <span style={{ flex: '1', minWidth: '0', fontSize: '13px', fontWeight: '700', lineHeight: '1.25', overflowWrap: 'anywhere' }}>{r.nom}</span>
                  {r.belgilar.length ? <span style={{ flex: '0 0 auto', color: 'var(--mut)', display: 'grid' }}><Ikon n={och ? 'tepa' : 'past'} size={16} gap={0} /></span> : null}
                </span>
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12px', color: 'var(--mut)' }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: '0' }}>{r.kod}</span>
                  <span style={{ flex: '0 0 auto', fontVariantNumeric: 'tabular-nums' }}>{r.soni}</span>
                </span>
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12px' }}>
                  <span data-zap-belgi-soni="" style={{ color: r.belgilar.length ? 'var(--cyan)' : 'var(--mut)' }}>{r.belgi}</span>
                  {r.narx ? <span style={{ fontWeight: '700', color: r.noPrice ? 'var(--pch)' : 'var(--txt)', display: 'flex', alignItems: 'center', gap: '4px', fontVariantNumeric: 'tabular-nums' }}>{r.noPrice ? <Ikon n="ogohlantirish" size={12} gap={0} /> : null}{r.narx}</span> : null}
                </span>
              </button>
              {och ? r.belgilar.map(b => (
                <button key={b.key} data-zap-belgi={b.key} data-zap-key={b.key} aria-pressed={b.on} onClick={b.tanla} style={BELGI(b.on)}>
                  <span style={{ fontSize: '12px', fontWeight: '700' }}>{b.detal}{b.taxminiy ? <span style={{ marginLeft: '6px', color: 'var(--pch)', fontWeight: '600' }}>({t('zapchast.taxminiy')})</span> : null}</span>
                  <span style={{ fontSize: '11px', color: 'var(--mut)', fontFamily: "'JetBrains Mono',monospace", fontVariantNumeric: 'tabular-nums' }}>{b.joy}</span>
                  <span style={{ fontSize: '11px', color: 'var(--mut)' }}>{b.modul}</span>
                </button>
              )) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
