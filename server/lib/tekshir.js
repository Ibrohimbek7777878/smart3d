/* Kirish ma'lumotlarini tekshirish: noto'g'ri tur yoki qiymat — 400 (bad), crash emas. */
import { bad } from './xato.js';
import { docXatosi } from '../himoya.js';

/** Matn: string bo'lishi, uzunlik chegarasi; boshqa tur kelsa — 400 (crash emas). */
export function str(v, field, { max = 200, required = false } = {}) {
  if (v == null || v === '') { if (required) bad(`${field} kerak`); return ''; }
  if (typeof v !== 'string') bad(`${field} matn bo'lishi kerak`);
  const s = v.trim();
  if (s.length > max) bad(`${field} juda uzun (max ${max})`);
  return s;
}
/** Ism kabi ko'rinadigan matn: HTML belgilarisiz (saqlangan XSS'ga yo'l yo'q). */
export function plainText(v, field, opts) {
  const s = str(v, field, opts);
  if (/[<>]/.test(s)) bad(`${field}: < va > belgilari mumkin emas`);
  return s;
}
export function email(v) {
  const s = str(v, 'email', { max: 254, required: true }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) bad('email formati noto\'g\'ri');
  return s;
}
export function num(v, field, { min = 0, max = 1e12, required = false } = {}) {
  if (v == null || v === '') { if (required) bad(`${field} kerak`); return null; }
  const n = typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
  if (!Number.isFinite(n) || n < min || n > max) bad(`${field} ${min}…${max} oralig'idagi son bo'lishi kerak`);
  return n;
}
/** S1: telefon → 998XXXXXXXXX ("+998 90 123 45 67", "901234567" ham qabul qilinadi) */
export function phone(v) {
  const d = String(str(v, 'telefon', { max: 32, required: true })).replace(/\D/g, '');
  const p = d.length === 9 ? '998' + d : d;
  if (!/^998\d{9}$/.test(p)) bad('telefon formati: +998 XX XXX XX XX');
  return p;
}

/** Loyiha (TZ-07): saqlash va buyurtmada bir xil tekshiruv — tuzilma, 500 modulgacha, chuqur tekshiruv (X7: tur, o'lcham, HTML) */
export function projectPayload(b) {
  const doc = b.doc;
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) bad('doc kerak');
  const inner = doc.doc && typeof doc.doc === 'object' ? doc.doc : doc;     // {app, v, name, doc:{room, placements}} yoki to'g'ridan-to'g'ri doc
  if (!inner.room || typeof inner.room !== 'object' || !Array.isArray(inner.placements)) bad('doc tuzilmasi noto\'g\'ri (room, placements)');
  if (inner.placements.length > 500) bad('placements juda ko\'p (max 500)');
  const xe = docXatosi(doc);
  if (xe) bad(xe);
  return {
    name: plainText(b.name, 'nom', { max: 200 }) || 'Loyiha',
    client: plainText(b.client, 'mijoz', { max: 200 }),
    doc_json: JSON.stringify(doc),
    total_price: Math.round(num(b.total_price, 'total_price', { min: 0, max: 1e13 }) || 0)
  };
}
