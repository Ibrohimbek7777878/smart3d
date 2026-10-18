/* HEALTH — baza javob beradimi; faqat ok va uptime (ichki sonlar oshkor emas). */
import express from 'express';

export default function healthRouter({ db }) {
  const r = express.Router();
  r.get('/api/health', (req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ ok: true, uptime: Math.round(process.uptime()) });
  });
  return r;
}
