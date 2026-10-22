import React, { useEffect, useRef } from 'react';
import { t } from '../../../i18n/index.js';
import { useSlice } from '../../../store/index.js';
import Ikon from '../../../shared/ui/Ikon.jsx';
import { chip, hint } from '../../../shared/ui/styles.js';
import NarxTarkibKorinish from './NarxTarkibKorinish.jsx';
import { useTarkibKorinish } from './useQadamNarx.js';
import { chopEt } from './narxActions.js';

/* TZ-49 (1, 2; egasi #303): «Narx tarkibi» — katta ko'rinish (keng varaq): sarlavha (loyiha, sana, mijoz), «PDF / Chop etish», to'liq ro'yxat. */
export default function TarkibVaraq() {
  const k = useTarkibKorinish();
  const { vq } = useSlice('ui');
  const ref = useRef(null);
  const bolim = vq && vq.bolim;
  useEffect(() => {
    if (!bolim || !ref.current) return;
    const el = ref.current.querySelector('[data-tarkib-bolim="' + bolim + '"]');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' });
  }, [bolim, !!k]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!k) return <span style={hint}>…</span>;
  return (
    <div ref={ref} data-tarkib-katta="" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0' }}>
          <span data-katta-loyiha="" style={{ fontWeight: '800', fontSize: '17px', overflowWrap: 'anywhere' }}>{k.meta.nom}</span>
          <span style={{ ...hint, fontWeight: '600' }}>{t('narx.tarkib_sana')}: {k.meta.sana}{k.meta.mijoz ? ' · ' + t('narx.mijoz') + ': ' + k.meta.mijoz : ''}</span>
        </span>
        <button onClick={chopEt} data-chop-tugma="katta" style={{ ...chip(true), minHeight: '44px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Ikon n="chop" size={16} gap={0} />{t('narx.chop')}</button>
      </div>
      <span style={{ ...hint, fontWeight: '600' }}>{t('narx.tarkib_royxat')}</span>
      <NarxTarkibKorinish k={k} keng />
    </div>
  );
}
