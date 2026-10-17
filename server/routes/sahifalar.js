/* Sahifalar (TZ-09 Q7): yangi sayt (web/dist) — "/" va "/app.html"; eski sayt — "/eski/" da 2 hafta zaxira.
 * web/dist yo'q bo'lsa (build qilinmagan) — eski sayt avvalgidek "/" da. X11: assets/* — o'zgarmas (nomida xesh),
 * sahifa, service worker, manifest va ma'lumot (narx) — har safar tekshiriladi. Noma'lum sahifa — 404 (web/dist/404.html). */
import express from 'express';
import fs from 'fs';
import path from 'path';

const noCache = (f) => /\.(html|webmanifest)$/.test(f) || /[\/](sw|registerSW)\.js$/.test(f) || /[\/]data[\/][^\/]+\.json$/.test(f);

/** → { statik: router, topilmadi: middleware, hasWeb } */
export function sahifalar({ webDist, eski }) {
  const hasWeb = fs.existsSync(path.join(webDist, 'index.html'));
  const statik = express.Router();
  if (hasWeb) {
    statik.use('/eski', express.static(eski, { setHeaders: (res, f) => { if (noCache(f)) res.set('Cache-Control', 'no-cache'); } }));
    statik.use(express.static(webDist, {
      setHeaders: (res, f) => {
        if (/[\/]assets[\/]/.test(f)) res.set('Cache-Control', 'public, max-age=31536000, immutable');
        else if (noCache(f)) res.set('Cache-Control', 'no-cache');
        else res.set('Cache-Control', 'public, max-age=86400');
      }
    }));
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
