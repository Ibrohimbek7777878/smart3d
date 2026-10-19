/* AI (TZ-12, TZ-26, TZ-40; Kamchilik 25, 26) — istalgan provayder. Kalit faqat serverda (ai-llm.js).
 * Til modeli matnni tuzilmaga o'giradi, joylashtirishni sayt dvigateli qiladi. Har so'rov ai_log ga yoziladi (A6):
 * matn, natija, xato — "usta nima dedi → AI nima tushundi". TZ-40: Claude faqat oxirgi chora (lib/ai-tejash.js: tayyor prompt → kesh →
 * qoidali tahlilchi → Claude); har so'rov ai_sarf ga (manba, token). Pullik chaqiruv: 60 / soat / IP. Yozish — faqat login bilan. */
import express from 'express';
import { parseZamer, aiBuild } from '../../app/js/ai.js';
import { aiConfig } from '../ai-llm.js';
import { XATOLAR } from '../../app/js/xatolar.js';
import { rateLimit } from '../lib/limit.js';
import { ah, bad, fail } from '../lib/xato.js';
import { str } from '../lib/tekshir.js';

export default function aiRouter({ db, jurnal, auth, tejash }) {
  const r = express.Router();
  const aiLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 60 });         // TZ-12: 60 AI so'rov / soat / IP (pullik)

  /* AI BUILD (qoidali, kalitsiz) — to'liq fragment (o'lcham, min/max, detallar) data_json ustunidan */
  r.post('/api/ai/build', auth, ah(async (req, res) => {
    const b = req.body || {};
    const inputText = str(b.prompt || b.text, 'prompt', { max: 2000 });
    if (!inputText) bad('AI uchun matn (prompt) kerak');
    const catalog = {};
    for (const f of db.prepare('SELECT code, data_json FROM fragments').all()) {
      try { catalog[f.code] = JSON.parse(f.data_json || '{}'); } catch (e) { /* buzilgan qator — o'tkazamiz */ }
    }
    const result = await aiBuild(inputText, catalog);
    res.json({ ok: true, ...result });
  }));

  r.get('/api/ai/status', (req, res) => {
    const c = aiConfig();
    res.json({ enabled: c.enabled, provider: c.provider, model: c.model });
  });
  /** ogohlantirish (byudjet / kunlik chegara): javob 200 — qoidali natija bilan, sayt to'xtamaydi */
  const ogoh = (kod) => (kod ? { ogohlantirish: { code: kod, error: XATOLAR[kod].matn } } : {});

  r.post('/api/ai/parse', auth, aiLimiter.check, ah(async (req, res) => {
    const text = str((req.body || {}).text, 'text', { max: 2000, required: true });
    if (!aiConfig().enabled) return fail(res, 'S3D-AI-001');
    const log = db.prepare('INSERT INTO ai_log (user_id, text, engine, ok, result_json, error) VALUES (?, ?, ?, ?, ?, ?)');
    try {
      const x = await tejash.yech({ yol: 'parse', text, userId: req.user.id, admin: req.user.role === 'admin' });
      if (x.manba === 'claude') aiLimiter.hit(req);
      log.run(req.user.id, text, x.engine, 1, JSON.stringify(x.natija), '');
      res.json({ ok: true, engine: x.engine, manba: x.manba, parsed: x.natija, ...ogoh(x.ogohlantirish) });
    } catch (e) {
      aiLimiter.hit(req);
      log.run(req.user.id, text, aiConfig().provider || '', 0, '', String(e.message || e).slice(0, 300));
      jurnal.error({ code: 'S3D-AI-002', rid: req.rid, uid: req.user.id, method: req.method, path: req.path, status: 502, msg: 'AI xatosi: ' + (e.message || e) });
      res.locals.logged = true;
      fail(res, 'S3D-AI-002');
    }
  }));

  /* TZ-26: bitta mebel konstruksiyasi — AI matnni konstruksiya tiliga o'giradi, server tekshiradi va to'g'rilaydi
     (app/js/engine/konstruksiyaTili.js); chizma, narx — saytda. Natija { spec, tuzatish, tushunilmadi } yoki { xona: true } */
  r.post('/api/ai/konstruksiya', auth, aiLimiter.check, ah(async (req, res) => {
    const text = str((req.body || {}).text, 'text', { max: 2000, required: true });
    if (!aiConfig().enabled) return fail(res, 'S3D-AI-001');
    const log = db.prepare('INSERT INTO ai_log (user_id, text, engine, ok, result_json, error) VALUES (?, ?, ?, ?, ?, ?)');
    try {
      const x = await tejash.yech({ yol: 'konstruksiya', text, userId: req.user.id, admin: req.user.role === 'admin' });
      if (x.manba === 'claude') aiLimiter.hit(req);
      log.run(req.user.id, text, x.engine + ' konstruksiya', 1, JSON.stringify(x.natija), '');
      res.json({ ok: true, engine: x.engine, manba: x.manba, ...x.natija, ...ogoh(x.ogohlantirish) });
    } catch (e) {
      aiLimiter.hit(req);
      log.run(req.user.id, text, (aiConfig().provider || '') + ' konstruksiya', 0, '', String(e.message || e).slice(0, 300));
      jurnal.error({ code: 'S3D-AI-002', rid: req.rid, uid: req.user.id, method: req.method, path: req.path, status: 502, msg: 'AI konstruksiya xatosi: ' + (e.message || e) });
      res.locals.logged = true;
      fail(res, 'S3D-AI-002');
    }
  }));

  r.post('/api/ai/voice', auth, (req, res) => {
    const b = req.body || {};
    const text = str(b.text, 'text', { max: 2000 });
    if (text) return res.json({ ok: true, text, zamer: parseZamer(text), engine: 'client-speech' });
    /* Server STT (Yandex SpeechKit) hali ulanmagan — soxta matn qaytarilmaydi */
    if (b.audio_base64) return fail(res, 'S3D-AI-003');
    bad('Audio yoki text kerak');
  });

  return r;
}
