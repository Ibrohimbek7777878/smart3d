/* Smart3D server himoyasi (TZ-19 §3): xavfsizlik sarlavhalari (CSP, HSTS), sessiya cookie va CSRF, loyiha hujjatini
 * chuqur tekshirish, WebSocket qo'riqchisi. Kutubxonasiz — har qism o'z testida (server/test/himoya.test.js). */
import crypto from 'crypto';
import fs from 'fs';

/* ── X1/X8: sarlavhalar ── */

const sha = (src) => "'sha256-" + crypto.createHash('sha256').update(src).digest('base64') + "'";
/** PDF hisobot oynasi (eski va yangi sayt, eksport → hisobot) o'zi chop etadi — shu bitta inline skript */
export const PRINT_SCRIPT = 'window.onload = () => { window.print(); };';

/** CSP ruxsat beradigan inline skriptlar: eski sayt importmap'i (app/index.html) va hisobot oynasidagi chop etish —
 *  faqat aniq xeshi bilan (boshqa har qanday inline skript bloklanadi) */
export function inlineScriptHashes(htmlFile) {
  let maps = [];
  try {
    const html = fs.readFileSync(htmlFile, 'utf8');
    maps = [...html.matchAll(/<script type="importmap">([\s\S]*?)<\/script>/g)].map(m => sha(m[1]));
  } catch (e) { /* eski sayt yo'q */ }
  return [...maps, sha(PRINT_SCRIPT)];
}

/** Content-Security-Policy: skript — faqat o'z saytidan; uslub atributi (React/three.js) — ruxsat; ramkaga olish — taqiq.
 *  scriptHashes — inline skript xeshlari; scriptExtra va frameAncestors — faqat ilova sahifasi uchun Telegram (TZ-16) */
export function csp({ scriptHashes = [], scriptExtra = [], frameAncestors = "'none'", upgrade = false } = {}) {
  return [
    "default-src 'self'",
    "script-src 'self'" + [...scriptExtra, ...scriptHashes].map(x => ' ' + x).join(''),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    'frame-ancestors ' + frameAncestors,
    ...(upgrade ? ['upgrade-insecure-requests'] : [])
  ].join('; ');
}

/* TZ-16: ilova sahifasi (app.html) Telegram Mini App bo'lib ochiladi — Telegram Web uni web.telegram.org ramkasiga oladi,
 * ilova Telegram skriptini telegram.org dan yuklaydi (faqat Telegram ichida). Qolgan sahifalar — avvalgidek (ramka taqiq).
 * ilovaMi — ilova hujjati beriladigan yo'l (sukut: /app, /app.html; TZ-30: ilova manzillari ham — index.js). */
export const TG_ILOVA = /^\/app(\.html)?$/;
export function securityHeaders({ prod, scriptHashes, ilovaMi = (p) => TG_ILOVA.test(p) }) {
  const policy = csp({ scriptHashes, upgrade: prod });
  const ilova = csp({ scriptHashes, upgrade: prod, scriptExtra: ['https://telegram.org'], frameAncestors: 'https://web.telegram.org' });
  return (req, res, next) => {
    const tg = ilovaMi(req.path);
    res.set({
      'Content-Security-Policy': tg ? ilova : policy,
      'X-Content-Type-Options': 'nosniff',
      ...(tg ? {} : { 'X-Frame-Options': 'DENY' }),
      'Referrer-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(), geolocation=(), microphone=(self)',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin'
    });
    if (prod) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');   // X8: faqat HTTPS
    next();
  };
}

/* ── X2: sessiya cookie va CSRF ── */

export const SESS = 's3d_sess';

/** '12h' / '30m' / '7d' → millisekund */
export function msOf(s, def = 12 * 3600 * 1000) {
  const m = /^(\d+)\s*([smhd])$/.exec(String(s || '').trim());
  return m ? +m[1] * { s: 1e3, m: 6e4, h: 3.6e6, d: 8.64e7 }[m[2]] : def;
}

export function cookieOf(req, name) {
  const h = req.headers.cookie || '';
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) { try { return decodeURIComponent(part.slice(i + 1).trim()); } catch (e) { return ''; } }
  }
  return '';
}

/** cookie bilan kelgan yozuvchi so'rov shu saytdan bo'lishi shart (SameSite=Strict + Origin/Sec-Fetch-Site) */
export function sameOrigin(req, allowed = []) {
  const m = req.method;
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return true;
  const sfs = req.headers['sec-fetch-site'];
  if (sfs) return sfs === 'same-origin' || sfs === 'none';
  const origin = req.headers.origin;
  if (!origin) return false;
  return origin === req.protocol + '://' + req.get('host') || allowed.includes(origin);
}

/* ── X7: loyiha hujjatini chuqur tekshirish ── */

const LIM = { depth: 12, nodes: 60000, arr: 2000, keys: 300, str: 2000 };
const TAG = /<\s*[a-zA-Z!/?]/;                                   // HTML teg boshlanishi — saqlangan XSS'ga yo'l yo'q
const NUM_KEYS = new Set(['x', 'y', 'z', 'w', 'd', 'h', 'rot', 'qty', 'wall_height', 'wall_thickness', 'width', 'offset', 'wall',
  'doborH', 'karnizH', 'size', 'fromBack', 'total_price']);

/** → null (to'g'ri) yoki xato matni */
export function docXatosi(doc) {
  let nodes = 0;
  const walk = (v, path, depth) => {
    if (++nodes > LIM.nodes) return 'hujjat juda katta (tugunlar soni)';
    if (depth > LIM.depth) return path + ': juda chuqur';
    if (v === null || typeof v === 'boolean') return null;
    if (typeof v === 'number') return Number.isFinite(v) && Math.abs(v) <= 1e15 ? null : path + ': son noto\'g\'ri';
    if (typeof v === 'string') {
      if (v.length > LIM.str) return path + ': matn juda uzun';
      return TAG.test(v) ? path + ': HTML belgilari mumkin emas' : null;
    }
    if (Array.isArray(v)) {
      if (v.length > LIM.arr) return path + ': ro\'yxat juda uzun';
      for (let i = 0; i < v.length; i++) { const e = walk(v[i], path + '[' + i + ']', depth + 1); if (e) return e; }
      return null;
    }
    if (typeof v === 'object') {
      const ks = Object.keys(v);
      if (ks.length > LIM.keys) return path + ': maydonlar juda ko\'p';
      for (const k of ks) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') return path + ': ruxsat etilmagan maydon';
        if (k.length > 64) return path + ': maydon nomi juda uzun';
        const x = v[k];
        if (NUM_KEYS.has(k) && x != null && x !== '' && typeof x !== 'number' && !(typeof x === 'string' && x.trim() !== '' && isFinite(+x))) return path + '.' + k + ': son bo\'lishi kerak';
        const e = walk(x, path + '.' + k, depth + 1); if (e) return e;
      }
      return null;
    }
    return path + ': noma\'lum tur';
  };
  const e = walk(doc, 'doc', 0);
  if (e) return e;
  const inner = doc.doc && typeof doc.doc === 'object' ? doc.doc : doc;
  const o = inner.room && inner.room.outline;
  if (o != null) {
    if (!Array.isArray(o) || o.length < 3 || o.length > 64) return 'xona: 3–64 burchak bo\'lishi kerak';
    if (o.some(p => !Array.isArray(p) || p.length < 2 || typeof p[0] !== 'number' || typeof p[1] !== 'number')) return 'xona: burchak [x, y] son bo\'lishi kerak';
  }
  for (const [i, p] of (inner.placements || []).entries()) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) return `placements[${i}]: obyekt bo'lishi kerak`;
    if (p.frg != null && (typeof p.frg !== 'string' || p.frg.length > 64)) return `placements[${i}].frg: noto'g'ri`;
  }
  return null;
}

/* ── X6: WebSocket ── */

/** Origin tekshiruvi (begona sayt ulana olmaydi) va IP bo'yicha ulanishlar chegarasi */
export function wsGuard({ allowed = [], maxPerIp = 5, ipOf }) {
  const perIp = new Map();
  return {
    verifyClient(info, cb) {
      const req = info.req, origin = req.headers.origin, host = req.headers.host;
      const okOrigin = !origin || allowed.includes(origin) || origin === 'http://' + host || origin === 'https://' + host;
      const ip = ipOf(req);
      if (!okOrigin) return cb(false, 403, 'Forbidden');
      if (ip && (perIp.get(ip) || 0) >= maxPerIp) return cb(false, 429, 'Too Many Requests');   // IP noma'lum — chegara qo'llanmaydi
      cb(true);
    },
    track(ws, req) {
      const ip = ipOf(req);
      if (!ip) return;
      perIp.set(ip, (perIp.get(ip) || 0) + 1);
      ws.on('close', () => { const n = (perIp.get(ip) || 1) - 1; if (n > 0) perIp.set(ip, n); else perIp.delete(ip); });
    }
  };
}
