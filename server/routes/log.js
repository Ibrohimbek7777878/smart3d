/* XATOLAR JURNALI (TZ-19 §2)
 * Brauzerdagi xato serverga keladi (kod, bo'lim, sahifa, qisqa matn) — kirmagan foydalanuvchidan ham.
 * Faqat ruxsat etilgan maydonlar, 4 KB gacha (index.js), 30 ta/daqiqa/IP; parol, token, email, telefon yuborilmaydi (niqoblanadi ham).
 * Admin: Sozlamalar → "Xatolar jurnali" — kod bo'yicha guruh va oxirgi yozuvlar; rid yoki kod bo'yicha qidiruv. */
import express from 'express';
import { KOD_RE } from '../../app/js/xatolar.js';
import { rateLimit } from '../lib/limit.js';
import { BadInput, bad, fail } from '../lib/xato.js';
import { str } from '../lib/tekshir.js';

const logField = (v, field, max, re) => {
  const s = str(v, field, { max });
  if (s && re && !re.test(s)) bad(`${field} formati noto'g'ri`);
  return s;
};

export default function logRouter({ jurnal, auth, adminOnly, optUser }) {
  const r = express.Router();
  const logLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });             // TZ-19: 30 xato yozuvi / daqiqa / IP

  r.post('/api/log', logLimiter.check, (req, res) => {
    logLimiter.hit(req);
    const b = req.body;
    if (!b || typeof b !== 'object' || Array.isArray(b)) return fail(res, 'S3D-LOG-001');
    const extra = Object.keys(b).filter(k => !['code', 'modul', 'sahifa', 'xabar', 'stack'].includes(k));
    if (extra.length) return fail(res, 'S3D-LOG-001', 'Ruxsat etilmagan maydon: ' + extra.slice(0, 3).join(', '));
    let e;
    try {
      const code = logField(b.code, 'code', 20, KOD_RE);
      if (!code) bad('code kerak');
      e = { source: 'web', code, rid: req.rid, path: logField(b.sahifa, 'sahifa', 80, /^[\w./#?=&-]*$/), msg: logField(b.xabar, 'xabar', 300),
        meta: { modul: logField(b.modul, 'modul', 40, /^[\w/-]*$/), stack: str(b.stack, 'stack', { max: 1000 }), ua: String(req.headers['user-agent'] || '').slice(0, 160) } };
    } catch (err) { if (err instanceof BadInput) return fail(res, 'S3D-LOG-001', err.message); throw err; }
    const u = optUser(req);
    jurnal.warn({ ...e, uid: u && u.id });
    res.status(204).end();
  });

  r.get('/api/admin/xatolar', auth, adminOnly, (req, res) => {
    const rid = logField(req.query.rid, 'rid', 24, /^[a-f0-9]*$/);
    const kod = logField(req.query.kod, 'kod', 20, /^(S3D-[A-Z]{2,6}-\d{3})?$/);
    res.json(jurnal.royxat({ rid, kod }));
  });

  return r;
}
