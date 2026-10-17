/* FOYDALANUVCHI SOZLAMALARI (TZ-09: dizayndagi "Sozlamalar")
 * markup_pct — usta ustamasi (0…3, ya'ni 0–300%; bo'sh bo'lsa materials.json standarti);
 * stanoklar — "Stanokka" bo'limida ko'rsatiladigan fayllar; logo — sex logosi (PNG/JPEG/WEBP data URL, ≤ ~300 KB),
 * hisobotda Bittada belgisidan kichikroq (qoida S4); til — TZ-18. Har usta faqat o'zinikini ko'radi va o'zgartiradi. */
import express from 'express';
import { bad } from '../lib/xato.js';
import { num } from '../lib/tekshir.js';

const STANOKLAR = ['dxf', 'gcode', 'ptp', 'nc', 'xnc', 'altendorf'];
function settingsPayload(b) {
  const out = { markup_pct: num(b.markup_pct, 'ustama', { min: 0, max: 3 }), stanoklar: null, logo: null, til: null };
  if (b.til != null && b.til !== '') { if (!['uz', 'ru', 'en'].includes(b.til)) bad('til: uz, ru yoki en'); out.til = b.til; }   // TZ-18
  if (b.stanoklar != null) {
    if (!Array.isArray(b.stanoklar) || b.stanoklar.some(x => !STANOKLAR.includes(x))) bad('stanok profili noto\'g\'ri');
    out.stanoklar = [...new Set(b.stanoklar)];
  }
  if (b.logo) {
    if (typeof b.logo !== 'string' || b.logo.length > 400000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(b.logo)) bad('logo: PNG, JPEG yoki WEBP, 300 KB gacha');
    out.logo = b.logo;
  }
  return out;
}

export default function settingsRouter({ db, auth }) {
  const r = express.Router();
  r.get('/api/settings', auth, (req, res) => {
    const u = db.prepare('SELECT settings_json FROM users WHERE id = ?').get(req.user.id);
    let v = {};
    try { v = JSON.parse((u && u.settings_json) || '{}') || {}; } catch (e) { v = {}; }
    res.json({ markup_pct: v.markup_pct ?? null, stanoklar: v.stanoklar ?? null, logo: v.logo ?? null, til: v.til ?? null });
  });
  r.put('/api/settings', auth, (req, res) => {
    const v = settingsPayload(req.body || {});
    db.prepare('UPDATE users SET settings_json = ? WHERE id = ?').run(JSON.stringify(v), req.user.id);
    res.json({ ok: true, ...v });
  });
  return r;
}
