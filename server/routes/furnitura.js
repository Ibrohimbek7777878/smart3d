/* FURNITURA API (Kamchilik 17) — katalog (app/data/furnitura-catalog.json) va qidiruv, 100 tagacha; o'qish — hamma. */
import express from 'express';
import { str } from '../lib/tekshir.js';
import { readJsonData } from '../lib/malumot.js';

export default function furnituraRouter() {
  const r = express.Router();
  r.get('/api/furnitura', (req, res) => {
    const data = readJsonData('furnitura-catalog.json');
    if (!data) return res.json({ items: [] });
    const q = str(req.query.q, 'q', { max: 100 }).toLowerCase();
    let items = data.items || [];
    if (q) {
      items = items.filter(it => (it.name || '').toLowerCase().includes(q) || (it.sku || '').toLowerCase().includes(q));
    }
    res.json({ _meta: data._meta, total: items.length, items: items.slice(0, 100) });
  });
  return r;
}
