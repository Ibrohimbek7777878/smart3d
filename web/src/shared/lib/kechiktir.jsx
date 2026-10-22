import React, { lazy, Suspense } from 'react';
import Yuklanish from '../ui/Yuklanish.jsx';

/* Tezlik (testchi nuqsonlari, 2026-10-22): kam ishlatiladigan sahifa (admin, sozlamalar …) yoki faqat kirgandan keyin kerak bo'ladigan katta qism (muharrir) —
 * alohida bo'lak, kerak bo'lganda yuklanadi; birinchi ekran yengil.
 *   const Admin = kechiktir(() => import('./Admin.jsx'));   →   <Admin /> (Suspense va neutral "Yuklanmoqda…" ichida);
 *   Admin.oldindan() — bo'lakni oldindan (bo'sh vaqtda) yuklab qo'yish: ochilganda kutish bo'lmaydi.
 * { joy } — "Yuklanmoqda…" qayerda turadi: 'sahifa' (sukut: butun ekran), 'qobiq' (sarlavha ostida), 'ichki' (oyna/varaq ichida, ixcham).
 * Yuklash yiqilsa (tarmoq uzildi) — xato chegarasi (XatoChegarasi, S3D-UI-101) ushlaydi; "Qayta urinish" bosilsa bo'lak QAYTA yuklanadi:
 * React.lazy rad etilgan natijani eslab qoladi, shuning uchun har yiqilishda yangi lazy yaratiladi. */
export function kechiktir(yukla, { joy = 'sahifa' } = {}) {
  let L;
  const yarat = () => lazy(() => yukla().catch((e) => { L = yarat(); throw e; }));
  L = yarat();
  const Kechiktirilgan = (props) => <Suspense fallback={<Yuklanish joy={joy} />}><L {...props} /></Suspense>;
  Kechiktirilgan.oldindan = () => { try { yukla().catch(() => { /* ochilganda qayta uriniladi */ }); } catch (_) { /* yo'q */ } };
  return Kechiktirilgan;
}

/** bo'sh vaqtda bajarish (requestIdleCallback; bo'lmasa — qisqa kutishdan keyin). Qaytaradi: bekor qilish funksiyasi (useEffect tozalash). */
export function boshVaqtda(fn, timeout = 3000) {
  if (typeof requestIdleCallback === 'function') { const id = requestIdleCallback(fn, { timeout }); return () => cancelIdleCallback(id); }
  const id = setTimeout(fn, Math.min(timeout, 1500));
  return () => clearTimeout(id);
}
