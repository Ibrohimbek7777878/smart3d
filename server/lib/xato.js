/* TZ-19: xato javobi — doim { error, code, rid }. Kod va matn — app/js/xatolar.js (bitta manba); rid — jurnaldagi so'rov raqami.
 * Kirish xatosi (bad) — 400 S3D-VAL-001; kutilmagan xato — 500 S3D-SRV-001 (tafsilot faqat jurnalda). */
import { XATOLAR } from '../../app/js/xatolar.js';

export class BadInput extends Error {}
/** noto'g'ri kirish ma'lumoti → 400 (xato ishlovchisi ushlaydi) */
export const bad = (msg) => { throw new BadInput(msg); };

/** Async route'dagi xato Express 4 da ushlanmaydi — next(err) ga o'tkazamiz (aks holda server o'chadi). */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function fail(res, code, msg, extra) {
  const x = XATOLAR[code] || XATOLAR['S3D-SRV-001'];
  res.locals.code = code; res.locals.msg = msg || x.matn;
  return res.status(x.http).json({ error: msg || x.matn, code, rid: res.req.rid, ...(extra || {}) });
}

/** oxirgi xato ishlovchisi: kirish xatosi, buzilgan/katta JSON — o'z kodi bilan; qolgani — 500 (ichki tafsilot faqat jurnalda) */
export function xatoIshlovchi(jurnal) {
  return (err, req, res, next) => {          // eslint-disable-line no-unused-vars
    if (err instanceof BadInput) return fail(res, 'S3D-VAL-001', err.message);
    if (err.type === 'entity.parse.failed') return fail(res, 'S3D-VAL-002');
    if (err.type === 'entity.too.large') return fail(res, 'S3D-VAL-003');
    jurnal.error({ code: 'S3D-SRV-001', rid: req.rid, uid: req.user && req.user.id, method: req.method, path: req.path, status: 500,
      msg: String(err && err.message || err), meta: { stack: String(err && err.stack || '').slice(0, 1200) } });
    res.locals.logged = true;
    fail(res, 'S3D-SRV-001');
  };
}
