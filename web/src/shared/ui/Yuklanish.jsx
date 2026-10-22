import React from 'react';
import { t } from '../../i18n/index.js';

/* Tezlik (testchi nuqsonlari, 2026-10-22): neutral yuklanish holati — sahifa bo'lagi (kod) yoki sessiya (/api/me) kutilayotganda; hech qanday ekran (kirish,
 * ro'yxatdan o'tish) ko'rsatilmaydi. Ko'rinish — muharrirdagi "3D sahna yuklanmoqda…" bilan bir xil (JetBrains Mono 13 px, --mut, markazda);
 * yangi dizayn qo'shilmagan. Ekran o'qigichlar uchun role="status".
 * joy: 'sahifa' — butun ekran (sukut); 'qobiq' — sarlavha ostida (flex ustun ichida qolgan joyni oladi); 'ichki' — oyna/varaq ichida (ixcham). */
const BALANDLIK = { sahifa: { minHeight: '100vh' }, qobiq: { flex: '1 1 auto', minHeight: '50vh' }, ichki: { minHeight: '120px' } };
export default function Yuklanish({ joy = 'sahifa' }) {
  return (
    <div role="status" aria-live="polite" data-yuklanish="" style={{ ...(BALANDLIK[joy] || BALANDLIK.sahifa), display: 'grid', placeItems: 'center', padding: '16px', textAlign: 'center', color: 'var(--mut)', fontFamily: "'JetBrains Mono',monospace", fontSize: '13px' }}>
      {t('umumiy.yuklanmoqda')}
    </div>
  );
}
