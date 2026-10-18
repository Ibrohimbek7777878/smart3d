/* RATE LIMIT (kutubxonasiz, xotirada) — bitta jarayon uchun (DEPLOY.md: klaster ishlatilmaydi).
 * login — faqat MUVAFFAQIYATSIZ urinishlar sanaladi (bitta NAT ortidagi sex o'zini bloklamaydi); register — alohida hisob.
 * Nginx ortida TRUST_PROXY=1 shart. Chegaradan oshsa — 429 S3D-RATE-001 va Retry-After. */
import { fail } from './xato.js';

export function rateLimit({ windowMs, max, key = (req) => req.ip }) {
  const hits = new Map();                  // kalit (ip yoki foydalanuvchi) → {n, reset}
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs).unref();
  const entry = (key) => {
    const now = Date.now();
    let h = hits.get(key);
    if (!h || h.reset <= now) { h = { n: 0, reset: now + windowMs }; hits.set(key, h); }
    return h;
  };
  return {
    /** chegaradan oshgan bo'lsa 429 qaytaradi */
    check: (req, res, next) => {
      const h = entry(key(req));
      if (h.n >= max) {
        res.set('Retry-After', String(Math.ceil((h.reset - Date.now()) / 1000)));
        return fail(res, 'S3D-RATE-001');
      }
      next();
    },
    hit: (req) => { entry(key(req)).n++; },
    /** sanaydi va chegaradan oshsa 429 (har so'rov uchun) */
    take: (req, res, next) => {
      const h = entry(key(req));
      if (h.n >= max) { res.set('Retry-After', String(Math.ceil((h.reset - Date.now()) / 1000))); return fail(res, 'S3D-RATE-001'); }
      h.n++; next();
    }
  };
}
