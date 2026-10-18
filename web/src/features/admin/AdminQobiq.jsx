import React from 'react';
import { t } from '../../i18n/index.js';
import Ikon from '../../shared/ui/Ikon.jsx';
import XatoChegarasi from '../../shared/ui/XatoChegarasi.jsx';
import { iconBtn } from '../../shared/ui/styles.js';
import Narxlar from '../settings/Narxlar.jsx';
import { S } from '../../store/session.js';
import { set } from '../../store/index.js';
import { btnPrimary, btnGhost } from '../../shared/ui/styles.js';
import { useAdmin } from './useAdmin.js';
import { BOLIMLAR, BOLIM_IKON } from './actions.js';
import Furnitura from './Furnitura.jsx';
import Promptlar from './Promptlar.jsx';
import Standart from './Standart.jsx';
import Tarix from './Tarix.jsx';
import { ghost, chipU } from './stil.js';

/* TZ-37 (a): admin panel qobig'i — sarlavha (logo, "Ilovaga qaytish", til), chap menyu / telefonda tepada tablar.
 * Admin bo'lmasa — mavjud 404 sahifasiga (web/404.html) o'tkaziladi (replace: orqaga bosilsa qaytib kelmaydi; dublikat yo'q). */
const BOLIM = { narxlar: Narxlar, furnitura: Furnitura, promptlar: Promptlar, standart: Standart, tarix: Tarix };

export default function AdminQobiq() {
  const a = useAdmin();
  /* egasi #261: kirgan, lekin admin emas — oddiy 404 o'rniga tushuntirish (qaysi akkaunt bilan kirgani va admin bilan qayta kirish) */
  if (a.holat === 'yoq') return (
    <div data-admin-emas="" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h1 style={{ margin: '0', fontSize: '28px', fontWeight: '800' }}>{t('admin.admin_emas')}</h1>
        <p style={{ margin: '0', color: 'var(--mut)' }}>{t('admin.admin_emas_izoh')}</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button data-admin-chiqish="" onClick={() => { S.logout(false); set('nav', { screen: 'login' }); }} style={btnPrimary}>{t('admin.admin_bilan_kirish')}</button>
          <button onClick={a.back} style={btnGhost}>{t('admin.ilovaga_qaytish')}</button>
        </div>
      </div>
    </div>);
  if (a.holat !== 'admin') return <div style={{ minHeight: '100vh' }} data-admin-yuk="" />;
  const Bolim = BOLIM[a.bolim];
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }} data-admin="">
      <header style={{ position: 'sticky', top: '0', zIndex: '30', height: '64px', flex: '0 0 64px', background: 'rgba(15,34,41,.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 clamp(12px,3vw,24px)' }}>
        <button onClick={a.back} aria-label="Smart3D" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: '0', color: 'var(--txt)', cursor: 'pointer', padding: '0' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'var(--acc)', color: 'var(--ink)', display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '15px' }}>3D</div>
          <span data-hide-m="" style={{ fontWeight: '800', fontSize: '18px' }}>Smart3D</span>
        </button>
        <span style={{ fontWeight: '800', fontSize: '16px', color: 'var(--acct)', minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('admin.sarlavha')}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={a.back} data-admin="qaytish" style={{ ...ghost, borderRadius: '14px' }}><Ikon n="chap" size={16} gap={0} /><span data-hide-m="">{t('admin.ilovaga_qaytish')}</span></button>
          <button onClick={a.tilMenu} aria-label={t('sarlavha.til')} data-til-menyu="" style={iconBtn}><Ikon n="til" size={19} gap={0} /></button>
        </div>
      </header>
      <main style={{ maxWidth: '1240px', width: '100%', margin: '0 auto', padding: 'clamp(16px,3vw,32px) clamp(16px,3vw,28px) 64px', boxSizing: 'border-box', minWidth: '0' }}>
        <div data-adm-lay="">
          <nav data-adm-nav="" aria-label={t('admin.sarlavha')}>
            {BOLIMLAR.map(b => (
              <button key={b} onClick={() => a.open(b)} aria-current={a.bolim === b ? 'page' : undefined} data-admin-tab={b}
                style={{ ...chipU(a.bolim === b), borderRadius: '14px', height: '44px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start', flex: '0 0 auto' }}>
                <Ikon n={BOLIM_IKON[b]} size={17} gap={0} />{t('admin.bolim_' + b)}
              </button>))}
          </nav>
          <div style={{ minWidth: '0' }}>
            <XatoChegarasi key={a.bolim} modul={'admin/' + a.bolim} joy="sahifa"><Bolim /></XatoChegarasi>
          </div>
        </div>
      </main>
    </div>
  );
}
