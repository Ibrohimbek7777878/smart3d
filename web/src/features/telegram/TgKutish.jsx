import React from 'react';
import { t } from '../../i18n/index.js';

/* TZ-16 (dizaynda yo'q — egasi skrinshot bilan tasdiqlaydi): Telegram ichida kirish tekshirilguncha — kirish formasi
 * o'rniga logotip va qisqa yozuv (ranglar va shrift — dizayn tokenlaridan). */
export default function TgKutish() {
  return (
    <div data-tg-kutish="" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <span style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--acc)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '20px' }}>3D</span>
        <span style={{ fontWeight: '800', fontSize: '20px' }}>Smart3D</span>
        <span role="status" aria-live="polite" style={{ color: 'var(--mut)', fontSize: '15px' }}>{t('telegram.kirilmoqda')}</span>
      </div>
    </div>
  );
}
