/* Server sozlamalari: muhit o'zgaruvchilari va papkalar — bitta joyda (ro'yxat va izoh — index.js boshida).
 * JWT kaliti hech qachon kodda turmaydi (AUDIT-2026-10-14 §5: standart kalit bilan har kim admin token yasay olardi). */
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

export const SERVER_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const APP_DIR = path.join(SERVER_DIR, '../app');          // eski sayt va ma'lumot (app/data)
export const WEB_DIST = path.join(SERVER_DIR, '../web/dist');    // yangi sayt (vite build)

/** Muhitdan sozlama. Production'da JWT_SECRET (kamida 32 belgi) bo'lmasa — jarayon to'xtaydi. */
export function loadConfig(env = process.env) {
  const PROD = env.NODE_ENV === 'production';
  let JWT_SECRET = env.JWT_SECRET;
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    if (PROD) {
      console.error('XATO: JWT_SECRET (kamida 32 belgi) o\'rnatilmagan — production server ishga tushmaydi.');
      process.exit(1);
    }
    JWT_SECRET = crypto.randomBytes(48).toString('hex');
    console.warn('DIQQAT: JWT_SECRET yo\'q — vaqtinchalik tasodifiy kalit (dev). Qayta ishga tushsa tokenlar bekor bo\'ladi.');
  }
  return Object.freeze({
    PROD,
    PORT: env.PORT || 3000,
    JWT_EXPIRES: env.JWT_EXPIRES || '12h',
    DB_PATH: env.DB_PATH || path.join(SERVER_DIR, 'smart3d.db'),
    JWT_SECRET,
    TRUST_PROXY: env.TRUST_PROXY,
    ALLOWED_ORIGINS: (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
    /* 10 ro'yxat / soat / IP. Brauzer testlari bitta serverda ko'p akkaunt ochadi — faqat production bo'lmaganda TEST_REGISTER_LIMIT */
    REGISTER_MAX: (!PROD && +env.TEST_REGISTER_LIMIT) || 10,
    /* hamma /api: 300 / daqiqa / IP. Brauzer testlari bitta IP'dan juda tez sahifa ochadi (tezlashgan sahifa — soniyasiga ko'proq so'rov) —
       faqat production bo'lmaganda TEST_API_LIMIT (production'da e'tiborga olinmaydi, 300 qoladi) */
    API_MAX: (!PROD && +env.TEST_API_LIMIT) || 300
  });
}
