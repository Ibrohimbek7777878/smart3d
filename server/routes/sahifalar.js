/* Sahifalar (TZ-09 Q7): yangi sayt (web/dist) — "/" va "/app.html"; eski sayt — "/eski/" da 2 hafta zaxira.
 * web/dist yo'q bo'lsa (build qilinmagan) — eski sayt avvalgidek "/" da. X11: assets/* — o'zgarmas (nomida xesh),
 * sahifa, service worker, manifest va ma'lumot (narx) — har safar tekshiriladi. Noma'lum sahifa — 404 (web/dist/404.html). */
import express from 'express';
import fs from 'fs';
import path from 'path';

const noCache = (f) => /\.(html|webmanifest)$/.test(f) || /[\/](sw|registerSW)\.js$/.test(f) || /[\/]data[\/][^\/]+\.json$/.test(f);

/* TZ-30: ilova sahifalarining manzillari (frontend bilan bir xil ro'yxat) — hammasi ilovaning o'zi (app.html), ekranni ilova
 * manzildan tanlaydi: /kirish, /royxat, /loyihalar, /loyiha/yangi, /loyiha/<raqam>, /sozlamalar, /sozlamalar/narxlar, /buyurtmalar, /tg
 * (oxirida "/" bo'lsa ham). Faqat shu ro'yxat: boshqa yo'l — 404 (hamma narsani app.html ga burish yo'q).
 * Bu yo'llar /app.html bilan bir xil sarlavha oladi (bir xil hujjat; Telegram ichida qayta yuklansa ham ishlaydi) — index.js, himoya.js. */
export const ILOVA_YOLI = /^\/(kirish|royxat|loyihalar|loyiha\/(yangi|\d{1,15})|sozlamalar(\/narxlar)?|buyurtmalar|admin(\/(narxlar|furnitura|materiallar|katalog|promptlar|standart|foydalanuvchilar|erp|tizim|tarix))?|tg)\/?$/;

/** → { statik: router (fayllar va ilova manzillari), topilmadi: middleware, hasWeb } */
export function sahifalar({ webDist, eski }) {
  const hasWeb = fs.existsSync(path.join(webDist, 'index.html'));
  const statik = express.Router();
  /* /favicon.ico: brauzerlar HTML'dagi <link rel="icon"> dan qat'i nazar shu manzilni ham so'raydi (404 jurnalni to'ldirardi).
   * Yangi rasm yo'q — mavjud ikon (icons/icon-192.png) beriladi; kesh — boshqa statik fayllardek (1 kun). */
  const ikonYoli = path.join(hasWeb ? webDist : eski, 'icons', 'icon-192.png');
  statik.get('/favicon.ico', (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=86400').type('png').sendFile(ikonYoli, (e) => { if (e && !res.headersSent) next(); });
  });
  if (hasWeb) {
    statik.use('/eski', express.static(eski, { setHeaders: (res, f) => { if (noCache(f)) res.set('Cache-Control', 'no-cache'); } }));
    statik.use(express.static(webDist, {
      setHeaders: (res, f) => {
        if (/[\/]assets[\/]/.test(f)) res.set('Cache-Control', 'public, max-age=31536000, immutable');
        else if (noCache(f)) res.set('Cache-Control', 'no-cache');
        else res.set('Cache-Control', 'public, max-age=86400');
      }
    }));
    /* ilova manzillari → app.html (sahifa — har safar tekshiriladi) */
    statik.get(ILOVA_YOLI, (req, res, next) => {
      res.set('Cache-Control', 'no-cache').sendFile(path.join(webDist, 'app.html'), (e) => { if (e && !res.headersSent) next(); });
    });
  } else {
    statik.use(express.static(eski, { setHeaders: (res, f) => { if (noCache(f)) res.set('Cache-Control', 'no-cache'); } }));
  }

  /** noma'lum sahifa — 404 (dizayndagi sahifa) */
  const topilmadi = (req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || !hasWeb) return next();
    res.status(404).set('Cache-Control', 'no-cache').sendFile(path.join(webDist, '404.html'), (e) => { if (e) next(); });
  };
  return { statik, topilmadi, hasWeb };
}
