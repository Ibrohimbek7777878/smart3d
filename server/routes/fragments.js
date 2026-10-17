/* FRAGMENT API — modullar katalogi (o'qish, hamma). */
import express from 'express';
import { fail } from '../lib/xato.js';

export default function fragmentsRouter({ db }) {
  const r = express.Router();

  r.get('/api/fragments', (req, res) => {
    res.json(db.prepare('SELECT * FROM fragments ORDER BY code').all());
  });

  r.get('/api/fragments/:code', (req, res) => {
    const f = db.prepare('SELECT * FROM fragments WHERE code = ?').get(req.params.code);
    if (!f) return fail(res, 'S3D-DATA-001');
    res.json(f);
  });

  return r;
}
