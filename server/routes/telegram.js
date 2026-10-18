/* TELEGRAM MINI APP (TZ-16)
 * Kirish — Telegram imzosi bilan (parol/SMS'siz). Kalit faqat javobda (cookie'siz): ilova uni xotirada saqlaydi va har
 * ochilishda qayta oladi (Telegram Web'da ilova ramka ichida — u yerda cookie ishlamaydi). Telefon — bot chatiga ulashilgan
 * kontakt (webhook, faqat o'z raqami). Saytdagi akkauntga avtomatik bog'lash — faqat SMS bilan tasdiqlangan raqamga;
 * email bilan ochilgan akkaunt — ilovada email+parol bilan kirib, keyin ulanadi (saytda telefon tasdiqlanmagan —
 * birovning raqami bilan oldindan ochilgan akkauntga Telegram loyihalari oqib ketmasin). TELEGRAM_BOT_TOKEN bo'lmasa — o'chiq. */
import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { tgToken, initDataTekshir, webhookKontakt, hujjatYubor, tgApi, TG_EMAIL } from '../telegram.js';
import { BCRYPT_COST } from '../lib/auth.js';
import { rateLimit } from '../lib/limit.js';
import { ah, fail } from '../lib/xato.js';

const TG_USER = 'SELECT id, name, email, phone, shop, role, token_version, telegram_id FROM users';
const ochiqUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone || '', shop: u.shop || '', role: u.role, telegram: true });
const smsAkkaunt = (u) => /^tel\d+@telefon\.smart3d$/.test(u.email || '');   // TZ-07 SMS kirish — raqam tasdiqlangan
/* faylni bot orqali foydalanuvchining o'z chatiga (Telegram ichida brauzer yuklab olishi ishlamasa) */
const TG_FAYL = /^[\p{L}\p{N} _.()'-]{1,120}\.(pdf|xlsx|csv|dxf|nc|xnc|ptp|tap|gcode|bpj|json|glb|obj|mtl|zip|png|jpg|project|xml|txt|mpr|cix|bpp)$/iu;

export default function telegramRouter({ db, jurnal, auth, sendSession }) {
  const r = express.Router();
  const tgLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });   // 30 xato urinish / daqiqa / IP
  /** Telegram akkauntini (placeholder) boshqa akkauntga ko'chirish: loyihalar o'tadi, eski kalitlar bekor */
  const tgKochir = db.transaction((tgId, eski, yangi) => {
    if (eski && eski.id !== yangi.id) {
      db.prepare('UPDATE projects SET user_id = ? WHERE user_id = ?').run(yangi.id, eski.id);
      db.prepare('UPDATE users SET telegram_id = NULL, token_version = token_version + 1 WHERE id = ?').run(eski.id);
      if (eski.phone && !yangi.phone) {                    // raqam ham o'tadi (bitta raqam — bitta akkaunt, S1)
        db.prepare("UPDATE users SET phone = '' WHERE id = ?").run(eski.id);
        db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(eski.phone, yangi.id);
      }
    }
    db.prepare('UPDATE users SET telegram_id = ? WHERE id = ?').run(tgId, yangi.id);
  });

  r.post('/api/auth/telegram', tgLimiter.check, ah(async (req, res) => {
    const token = tgToken();
    if (!token) return fail(res, 'S3D-TG-001');
    const d = initDataTekshir((req.body || {}).initData, token);
    if (!d) { tgLimiter.hit(req); return fail(res, 'S3D-TG-002'); }
    let u = db.prepare(TG_USER + ' WHERE telegram_id = ?').get(d.tgId);
    let yangi = false;
    if (!u) {
      const hash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), BCRYPT_COST);   // parol bilan kirib bo'lmaydi
      const ins = db.prepare('INSERT INTO users (name, email, password_hash, role, telegram_id) VALUES (?, ?, ?, ?, ?)')
        .run(d.ism, TG_EMAIL(d.tgId), hash, 'user', d.tgId);
      u = db.prepare(TG_USER + ' WHERE id = ?').get(Number(ins.lastInsertRowid));
      yangi = true;
    }
    sendSession(req, res, u, { user: ochiqUser(u), yangi }, { cookie: false });
  }));

  /* saytdagi akkauntni (email+parol bilan kirilgan) shu Telegram'ga ulash — ikkala egalik ham isbotlangan */
  r.post('/api/telegram/ulash', auth, ah(async (req, res) => {
    const token = tgToken();
    if (!token) return fail(res, 'S3D-TG-001');
    const d = initDataTekshir((req.body || {}).initData, token);
    if (!d) return fail(res, 'S3D-TG-002');
    const men = db.prepare(TG_USER + ' WHERE id = ?').get(req.user.id);
    if (!men) return fail(res, 'S3D-AUTH-007');
    if (men.telegram_id && men.telegram_id !== d.tgId) return fail(res, 'S3D-TG-006');
    tgKochir(d.tgId, db.prepare(TG_USER + ' WHERE telegram_id = ?').get(d.tgId), men);
    sendSession(req, res, db.prepare(TG_USER + ' WHERE id = ?').get(men.id), { user: ochiqUser(men) }, { cookie: false });
  }));

  /* bot webhook'i (setWebhook secret_token bilan): kontakt → telefon, /start → ilova tugmasi */
  r.post('/api/telegram/webhook', ah(async (req, res) => {
    const sir = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
    const got = String(req.headers['x-telegram-bot-api-secret-token'] || '');
    if (!tgToken() || sir.length < 16 || got.length !== sir.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(sir))) return fail(res, 'S3D-TG-003');
    const up = req.body || {}, m = up.message || {};
    const javob = (text, extra) => tgApi('sendMessage', { chat_id: m.chat && m.chat.id, text, ...(extra || {}) })
      .catch(e => jurnal.warn({ code: 'S3D-TG-005', rid: req.rid, method: 'POST', path: req.path, status: 200, msg: 'bot javobi yuborilmadi: ' + e.message }));
    const k = webhookKontakt(up);
    if (k) {
      const p = k.phone.length === 9 ? '998' + k.phone : k.phone;
      if (!/^998\d{9}$/.test(p)) { await javob('Faqat O\'zbekiston raqami (+998) qabul qilinadi.'); return res.json({ ok: true }); }
      let u = db.prepare(TG_USER + ' WHERE telegram_id = ?').get(k.tgId);
      const egasi = db.prepare(TG_USER + " WHERE phone <> '' AND substr(phone, -9) = ?").get(p.slice(-9));
      if (egasi && (!u || egasi.id !== u.id)) {
        if (egasi.telegram_id && egasi.telegram_id !== k.tgId) await javob('Bu raqam boshqa Telegram akkauntga ulangan.');
        else if (smsAkkaunt(egasi)) { tgKochir(k.tgId, u, egasi); await javob('Raqam saytdagi akkauntingizga ulandi. Ilovani qayta oching.'); }
        else await javob('Bu raqam bilan saytda akkaunt bor. Ilovada email va parol bilan bir marta kiring — akkaunt Telegram\'ga ulanadi.');
      } else if (u) {
        db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(p, u.id);
        await javob('Raqam saqlandi: +' + p);
      } else await javob('Avval Smart3D ilovasini oching, keyin raqamni ulashing.');
      return res.json({ ok: true });
    }
    if (/^\/start\b/.test(m.text || '')) {
      const url = (process.env.TELEGRAM_WEBAPP_URL || '').trim();
      await javob('Smart3D — mebel loyihasi, smeta va stanok fayllari. Boshlash uchun tugmani bosing.',
        /^https:\/\//.test(url) ? { reply_markup: { inline_keyboard: [[{ text: 'Smart3D', web_app: { url } }]] } } : undefined);
    }
    res.json({ ok: true });
  }));

  r.post('/api/telegram/fayl', auth, ah(async (req, res) => {
    if (!tgToken()) return fail(res, 'S3D-TG-001');
    const men = db.prepare('SELECT telegram_id FROM users WHERE id = ?').get(req.user.id);
    if (!men || !men.telegram_id) return fail(res, 'S3D-TG-004');
    const b = req.body || {};
    const nom = String(b.nom || '').trim();
    if (!TG_FAYL.test(nom) || typeof b.base64 !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(b.base64)) return fail(res, 'S3D-TG-007');
    const bytes = Buffer.from(b.base64, 'base64');
    if (!bytes.length || bytes.length > 10 * 1024 * 1024) return fail(res, 'S3D-TG-007');
    try { await hujjatYubor(men.telegram_id, { nom, bytes, mime: typeof b.mime === 'string' ? b.mime.slice(0, 100) : '' }); }
    catch (e) {
      jurnal.error({ code: 'S3D-TG-005', rid: req.rid, uid: req.user.id, method: 'POST', path: req.path, status: 502, msg: String(e.message || e).slice(0, 200) });
      return fail(res, 'S3D-TG-005');
    }
    res.json({ ok: true });
  }));

  return r;
}
