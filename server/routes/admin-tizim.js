/* ADMIN: TIZIM (TZ-37, 3-faza, bo'lim 8) — faqat O'QISH: serverning holati bir javobda.
 *   GET /api/admin/tizim  →  { vaqt, server, ai, google, sms, telegram, xatolar, zaxira }
 *   server   — ishlash vaqti, muhit, Node versiyasi, baza hajmi;
 *   ai       — yoqilganmi, provayder, model, KALIT HOLATI (bor / yo'q — qiymati, uzunligi, boshi-oxiri HECH QACHON chiqmaydi), yoqilmagan bo'lsa sababi,
 *              Claude byudjeti va oxirgi AI xatosi;
 *   google   — GOOGLE_CLIENT_ID sozlanganmi, Google bilan bog'langan foydalanuvchilar, oxirgi 7 kundagi xatolar;
 *   sms      — Eskiz.uz sozlanganmi (ESKIZ_EMAIL va ESKIZ_PASSWORD bor/yo'q), oxirgi 7 kundagi SMS xatolari;
 *   telegram — bot kaliti va webhook siri bor/yo'q, ulangan foydalanuvchilar;
 *   xatolar  — error_log: 24 soat va 7 kun (xato / ogohlantirish), eng ko'p uchragan kodlar (batafsil ro'yxat: GET /api/admin/xatolar);
 *   zaxira   — BACKUP_DIR dagi nusxalar: oxirgisi qachon, hajmi, kunlik zaxira kutilgani uchun 36 soatdan eski bo'lsa "eskirgan".
 * Model va kalit serverning muhit o'zgaruvchilarida (AI_PROVIDER, AI_MODEL, AI_API_KEY …) — panelda o'zgartirilmaydi (server sozlamasi, qoida 5.5);
 * zaxira nusxasi ham shu yerdan yaratilmaydi (server/backup.js — cron). Hech narsa yozilmaydi, tarmoqqa chiqilmaydi.
 * Javobdagi har bir matn lib/maxfiy.js dan o'tadi: xato matni ichida tasodifan kalit bo'lsa ham chiqmaydi. */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { aiConfig } from '../ai-llm.js';
import { SERVER_DIR } from '../lib/config.js';
import { maxfiyTozalaChuqur } from '../lib/maxfiy.js';
import { googleClientId } from './auth-google.js';
import { smsConfigured } from '../sms.js';
import { tgToken } from '../telegram.js';

const PROVAYDERLAR = ['anthropic', 'gemini', 'openai'];
const ZAXIRA_RE = /^smart3d-[\d-]+\.db$/;
export const ZAXIRA_ESKIRISH_SOAT = 36;                  // DEPLOY.md §8: kunlik cron (03:00) — 36 soatdan eski nusxa "eskirgan"
const iso = (ts) => (ts ? String(ts).replace(' ', 'T') + 'Z' : null);
const bor = (v) => typeof v === 'string' && v.trim().length > 0;

/** AI nega yoqilmagan (aiConfig() enabled=false bo'lganda): provayder yo'q | notog'ri, model yo'q yoki kalit yo'q */
export function aiSabab(env = process.env) {
  const provider = String(env.AI_PROVIDER || '').toLowerCase();
  if (!provider) return 'provayder_yoq';
  if (!PROVAYDERLAR.includes(provider)) return 'provayder_notogri';
  if (!(env.AI_MODEL || (provider === 'anthropic' ? 'claude-sonnet-5-5' : ''))) return 'model_yoq';
  return 'kalit_yoq';
}

/** kalit qaysi o'zgaruvchida (ai-llm.js aiConfig bilan bir xil qoida): AI_API_KEY, bo'lmasa anthropic uchun ANTHROPIC_API_KEY. Faqat NOM qaytadi, qiymat emas */
export function kalitManbasi(env = process.env) {
  const provider = String(env.AI_PROVIDER || '').toLowerCase();
  return bor(env.AI_API_KEY) ? 'AI_API_KEY' : (provider === 'anthropic' && bor(env.ANTHROPIC_API_KEY) ? 'ANTHROPIC_API_KEY' : '');
}

export default function adminTizimRouter({ db, cfg, tejash }, { guard, himoya }) {
  const r = express.Router();

  /** AI sozlamasi: kalit faqat bor/yo'q (qiymati ko'rilmaydi ham — faqat bo'sh emasligi tekshiriladi) */
  function aiHolat() {
    const provider = String(process.env.AI_PROVIDER || '').toLowerCase();
    const c = aiConfig();
    const kalitManba = kalitManbasi(process.env);
    const kalitsiz = provider === 'openai' && /localhost|127\.0\.0\.1/.test(process.env.AI_BASE_URL || '');   // mahalliy Ollama — kalit shart emas
    const modelNomi = process.env.AI_MODEL || (provider === 'anthropic' ? 'claude-sonnet-5-5' : '');
    const sabab = c.enabled ? '' : aiSabab(process.env);
    let hostNomi = '';                                     // faqat host (login/parol/so'rov qismisiz)
    try { if (process.env.AI_BASE_URL) hostNomi = new URL(process.env.AI_BASE_URL).host; } catch (_) { hostNomi = ''; }
    const kesh = process.env.AI_PROMPT_CACHE;
    const oxirgiXato = db.prepare("SELECT vaqt, model, yol, sabab FROM ai_sarf WHERE ok = 0 ORDER BY id DESC LIMIT 1").get() || null;
    const st = tejash.statistika();
    return {
      yoqilgan: !!c.enabled, provayder: provider || null, model: modelNomi || null,
      kalit: { bor: !!kalitManba, manba: kalitManba || null, kerak: !kalitsiz },
      sabab,
      base_url_host: hostNomi || null,
      prompt_kesh: kesh === '0' ? 'off' : kesh === '1' ? 'on' : 'auto',
      byudjet: st.byudjet, kunlik_chegara: st.kunlik_chegara,
      bugun: { jami: st.bugun.jami, claude: st.bugun.claude, xato: st.bugun.xato },
      oy: { jami: st.oy_jami.jami, claude: st.oy_jami.claude, xato: st.oy_jami.xato, token: st.oy_jami.token },
      xato_24soat: db.prepare("SELECT COUNT(*) AS n FROM ai_sarf WHERE ok = 0 AND vaqt >= datetime('now', '-1 day')").get().n,
      oxirgi_xato: oxirgiXato ? { vaqt: iso(oxirgiXato.vaqt), model: oxirgiXato.model || '', yol: oxirgiXato.yol || '', sabab: String(oxirgiXato.sabab || '').slice(0, 200) } : null
    };
  }

  const jurnalSoni = (kodlar, kun) => {
    const q = kodlar.map(() => 'code LIKE ?').join(' OR ');
    return db.prepare(`SELECT COUNT(*) AS n FROM error_log WHERE (${q}) AND ts >= datetime('now', '-${kun} days')`).get(...kodlar).n;
  };

  function xatolarHolat() {
    const guruh = (kun) => {
      const o = { error: 0, warn: 0 };
      for (const x of db.prepare(`SELECT level, COUNT(*) AS n FROM error_log WHERE ts >= datetime('now', '-${kun} days') GROUP BY level`).all()) if (x.level in o) o[x.level] = x.n;
      return o;
    };
    const top = db.prepare(`SELECT code, source, COUNT(*) AS n, MAX(ts) AS oxirgi, (SELECT msg FROM error_log e2 WHERE e2.code = e1.code ORDER BY id DESC LIMIT 1) AS msg
      FROM error_log e1 WHERE ts >= datetime('now', '-7 days') GROUP BY code, source ORDER BY n DESC, oxirgi DESC LIMIT 8`).all()
      .map(x => ({ code: x.code, source: x.source, n: x.n, oxirgi: iso(x.oxirgi), msg: x.msg || '' }));
    return { soat24: guruh(1), kun7: guruh(7), top, jami_saqlangan: db.prepare('SELECT COUNT(*) AS n FROM error_log').get().n };
  }

  function zaxiraHolat() {
    const papka = process.env.BACKUP_DIR || path.join(SERVER_DIR, 'backups');   // server/backup.js bilan bir xil
    let royxat = [], papkaBor = true;
    try {
      royxat = fs.readdirSync(papka).filter(f => ZAXIRA_RE.test(f)).map(f => {
        const st = fs.statSync(path.join(papka, f));
        return { fayl: f, vaqt: st.mtime.toISOString(), hajm: st.size };
      }).sort((a, b) => (a.vaqt < b.vaqt ? 1 : a.vaqt > b.vaqt ? -1 : b.fayl.localeCompare(a.fayl)));
    } catch (_) { papkaBor = false; }
    const oxirgi = royxat[0] || null;
    const yosh = oxirgi ? Math.max(0, Math.round((Date.now() - Date.parse(oxirgi.vaqt)) / 36e5 * 10) / 10) : null;
    const holat = !oxirgi ? 'yoq' : yosh > ZAXIRA_ESKIRISH_SOAT ? 'eskirgan' : 'yaxshi';
    return { papka, papka_bor: papkaBor, soni: royxat.length, holat, eskirish_soat: ZAXIRA_ESKIRISH_SOAT,
      oxirgi: oxirgi ? { ...oxirgi, yosh_soat: yosh } : null, royxat: royxat.slice(0, 5) };
  }

  function bazaHajm() {
    const hajm = (f) => { try { return fs.statSync(f).size; } catch (_) { return 0; } };
    return hajm(cfg.DB_PATH) + hajm(cfg.DB_PATH + '-wal');
  }

  r.get('/api/admin/tizim', guard, himoya((req, res) => {
    const tel = String(process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
    const javob = {
      vaqt: new Date().toISOString(),
      server: { uptime: Math.round(process.uptime()), node: process.version, muhit: process.env.NODE_ENV || 'development', baza_hajm: bazaHajm() },
      ai: aiHolat(),
      google: {
        sozlangan: !!googleClientId(),
        ulangan: db.prepare('SELECT COUNT(*) AS n FROM users WHERE google_sub IS NOT NULL').get().n,
        xato_7kun: jurnalSoni(['S3D-AUTH-017', 'S3D-AUTH-018', 'S3D-AUTH-019', 'S3D-AUTH-020'], 7)
      },
      sms: {
        sozlangan: smsConfigured(),
        jonatuvchi: process.env.ESKIZ_FROM || '4546',
        xato_7kun: jurnalSoni(['S3D-AUTH-010', 'S3D-AUTH-011'], 7)
      },
      telegram: {
        bot: !!tgToken(), webhook_sir: tel.length >= 16,
        ulangan: db.prepare('SELECT COUNT(*) AS n FROM users WHERE telegram_id IS NOT NULL').get().n,
        xato_7kun: jurnalSoni(['S3D-TG-%'], 7)
      },
      xatolar: xatolarHolat(),
      zaxira: zaxiraHolat()
    };
    res.set('Cache-Control', 'no-store').json(maxfiyTozalaChuqur(javob));
  }));

  return r;
}
