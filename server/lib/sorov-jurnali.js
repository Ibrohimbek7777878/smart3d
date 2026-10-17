/* TZ-19: har so'rovga raqam (rid) — javob sarlavhasida (X-Request-Id) va jurnalda. /api dagi xato javoblar jurnalga yoziladi
 * (401/403/413/423/429 va 5xx — bazaga ham: hujum va nosozlikni keyin ko'rish uchun). Yo'l o'zi yozgan bo'lsa (res.locals.logged) — takrorlanmaydi. */
import crypto from 'crypto';

export function sorovJurnali(jurnal) {
  return (req, res, next) => {
    req.rid = crypto.randomBytes(6).toString('hex');
    res.set('X-Request-Id', req.rid);
    const t0 = Date.now();
    res.on('finish', () => {
      const st = res.statusCode;
      if (st < 400 || res.locals.logged || !req.originalUrl.startsWith('/api')) return;
      const code = res.locals.code || (st === 404 ? 'S3D-SRV-002' : st >= 500 ? 'S3D-SRV-001' : 'S3D-VAL-001');
      const save = st === 401 || st === 403 || st === 413 || st === 423 || st === 429 || st >= 500;
      jurnal[st >= 500 ? 'error' : 'warn']({ code, rid: req.rid, uid: req.user && req.user.id, method: req.method, path: req.originalUrl.split('?')[0],
        status: st, msg: res.locals.msg || '', save, meta: { ms: Date.now() - t0, ip: req.ip } });
    });
    next();
  };
}
