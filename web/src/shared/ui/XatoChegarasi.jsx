import React from 'react';
import { t } from '../../i18n/index.js';
import { report } from '../lib/jurnal.js';

/* TZ-19 §2: modul chegarasi (React ErrorBoundary). Bo'lim yiqilsa — faqat o'sha joyda xabar va "Qayta urinish",
 * qolgan sayt ishlashda davom etadi. Xato kod bilan jurnalga yoziladi (S3D-UI-101, bo'lim nomi bilan).
 * Ko'rinish — dizayn tokenlari (karta, 44px tugma). joy: 'sahifa' — butun ekran markazida, aks holda — kichik karta. */
const card = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', padding: '16px', margin: '12px', borderRadius: '20px',
  background: 'var(--sfc, #173239)', border: '1px solid rgba(255,123,123,.4)', color: 'var(--txt, #ECF4F2)', fontFamily: "'Manrope',system-ui,sans-serif" };
const btn = { height: '44px', padding: '0 16px', borderRadius: '14px', border: '1px solid var(--line, rgba(236,244,242,.12))', background: 'var(--sfc2, #204049)',
  color: 'var(--txt, #ECF4F2)', fontWeight: '800', fontSize: '15px', cursor: 'pointer' };

export default class XatoChegarasi extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) {
    report('S3D-UI-101', { modul: this.props.modul, err, xabar: (err && err.message) + ' @ ' + String((info && info.componentStack) || '').trim().split('\n')[0] });
  }
  render() {
    if (!this.state.err) return this.props.children;
    const page = this.props.joy === 'sahifa';
    return (
      <div role="alert" style={page ? { minHeight: '60vh', display: 'grid', placeItems: 'center', padding: '16px' } : undefined}>
        <div style={card}>
          <span style={{ fontWeight: '800', fontSize: '16px' }}>{t('umumiy.bu_bolimda_xatolik_yuz_berdi')}</span>
          <span style={{ fontSize: '13px', color: 'var(--mut, #9DB8B5)' }}>{t('umumiy.qolgan_qismlar_ishlayveradi')} <b style={{ fontFamily: "'JetBrains Mono',monospace" }}>S3D-UI-101</b> · {this.props.modul}</span>
          <button onClick={() => this.setState({ err: null })} style={btn}>{t('umumiy.qayta_urinish')}</button>
        </div>
      </div>
    );
  }
}
