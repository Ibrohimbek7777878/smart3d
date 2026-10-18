import React, { useEffect, useState } from 'react';
import { useSlice } from '../../store/index.js';
import { t } from '../../i18n/index.js';
import { listRow, hint, chip } from '../../shared/ui/styles.js';
import { HOLATLAR, loadBuyurtmalar, loadAdminBuyurtmalar, holatQoy, qator } from './buyurtma.js';

/* TZ-23 C1 (dizaynda yo'q — "Loyihalarim" va "Sozlamalar" karta uslubida): buyurtmalar ro'yxati.
 * admin — false: "Buyurtmalarim" (usta o'z buyurtmalari, holati bilan); true: hamma buyurtmalar, holatni o'zgartirish. */
const HOLAT_CHIP = (rang) => ({ padding: '4px 10px', borderRadius: '999px', border: '1px solid ' + rang, color: rang, fontWeight: '800', fontSize: '12px', whiteSpace: 'nowrap' });

export default function Buyurtmalar({ admin }) {
  const b = useSlice('buyurtma');
  const [n, setN] = useState(10);                         // uzun ro'yxat — 10 tadan
  useEffect(() => { if (admin) loadAdminBuyurtmalar(); else loadBuyurtmalar(); }, [admin]);
  const list = ((admin ? b.admin : b.list) || []).map(qator);
  if (!admin && !list.length) return null;
  return (
    <section data-buyurtmalar={admin ? 'admin' : 'usta'} style={{ background: 'var(--sfc)', border: '1px solid var(--line)', borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontWeight: '800', fontSize: '17px' }}>{admin ? t('buyurtma.admin_sarlavha') : t('buyurtma.mening')} · {list.length}</span>
      {!list.length ? <span style={hint}>{t('buyurtma.yoq')}</span> : null}
      {list.slice(0, n).map(o => (
        <div key={o.id} data-buyurtma={o.id} style={{ ...listRow, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: '0', flex: '1 1 220px' }}>
            <b>№{o.id} · {o.nom}</b>
            <span style={{ fontSize: '12px', color: 'var(--mut)' }}>{o.mijoz} · {o.mods} · {o.sana}{admin && o.usta ? ' · ' + t('buyurtma.usta') + ': ' + o.usta : ''}</span>
          </span>
          <b style={{ fontVariantNumeric: 'tabular-nums', fontSize: '14px' }}>{o.narx}</b>
          {admin ? (
            <select value={o.holat} onChange={ev => holatQoy(o.id, ev.target.value)} data-buyurtma-holat={o.id} aria-label={t('buyurtma.holat')}
              style={{ height: '36px', borderRadius: '10px', background: 'var(--bg)', color: 'var(--txt)', border: '1px solid ' + o.rang, padding: '0 8px', fontWeight: '700' }}>
              {HOLATLAR.map(h => <option key={h} value={h}>{t('buyurtma.h_' + h)}</option>)}
            </select>) : <span style={HOLAT_CHIP(o.rang)} data-holat={o.holat}>{o.holatNom}</span>}
        </div>))}
      {list.length > n ? <button onClick={() => setN(n + 20)} data-buyurtma-yana="" style={{ ...chip(false), alignSelf: 'flex-start' }}>{t('buyurtma.yana', { n: list.length - n })}</button> : null}
    </section>
  );
}
