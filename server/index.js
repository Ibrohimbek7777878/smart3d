/* Smart3D Server — API + Auth + Real-time narx (SQLite). Bu fayl faqat ilovani yig'adi: sozlama, baza, middleware,
 * xavfsizlik sarlavhalari, routerlar (routes/*), sahifalar, 404 va xato ishlovchisi. Umumiy qismlar — lib/*.
 *
 * Boshlash:  npm ci && ADMIN_PASSWORD='…' npm run init-db && npm start
 * Port: 3000 (PORT)
 *
 * Muhit o'zgaruvchilari (TZ-SAYT-BARQARORLIK-RESPONSIVE §6) — lib/config.js:
 *   JWT_SECRET       — majburiy (production). Dev rejimida yo'q bo'lsa tasodifiy kalit
 *                      yaratiladi (server qayta ishga tushsa tokenlar bekor bo'ladi).
 *   JWT_EXPIRES      — token muddati, standart '12h'
 *   ALLOWED_ORIGINS  — CORS ruxsat etilgan manzillar, vergul bilan. Bo'sh — faqat
 *                      shu serverning o'zi (frontend shu yerdan beriladi, CORS kerak emas)
 *   DB_PATH          — SQLite fayli, standart server/smart3d.db
 *   TRUST_PROXY      — nginx ortida bo'lsa 1 (rate limit haqiqiy IP bo'yicha ishlashi uchun)
 *   NODE_ENV         — 'production' da xavfsizlik shartlari qat'iy (HSTS, Secure cookie, upgrade-insecure-requests)
 *
 * TZ-19 §3 himoya: CSP, httpOnly sessiya cookie + CSRF (Origin), chiqishda kalit bekor (jti), parol o'zgarsa — hammasi
 * (token_version), akkaunt bloklash (5 xato → 15 daq), umumiy so'rov chegarasi, loyiha hujjatini chuqur tekshirish,
 * WebSocket (Origin, 5 ulanish/IP), bcrypt 12. Tafsilot — himoya.js.
 */
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { createJurnal } from './jurnal.js';
import { securityHeaders, inlineScriptHashes, TG_ILOVA } from './himoya.js';
import { loadConfig, APP_DIR, WEB_DIST } from './lib/config.js';
import { openDb } from './lib/db.js';
import { yadroSxema, mcModullar, adminSxema, promptlarSeed, aiSxema } from './lib/sxema.js';
import { adminSxema2, adminSxema3, erpJonliSxema } from './lib/sxema.js';
import { erpJonliYarat } from './lib/erp-jonli.js';
import { aiTejash } from './lib/ai-tejash.js';
import { createAuth, zaifAdminTekshir } from './lib/auth.js';
import { rateLimit } from './lib/limit.js';
import { fail, xatoIshlovchi } from './lib/xato.js';
import { sorovJurnali } from './lib/sorov-jurnali.js';
import { narxEfiri } from './lib/narx-efiri.js';
import { sahifalar, ILOVA_YOLI } from './routes/sahifalar.js';
import authRouter from './routes/auth.js';
import authSmsRouter from './routes/auth-sms.js';
import authGoogleRouter from './routes/auth-google.js';
import telegramRouter from './routes/telegram.js';
import projectsRouter from './routes/projects.js';
import shablonlarRouter from './routes/shablonlar.js';
import materialsRouter from './routes/materials.js';
import fragmentsRouter from './routes/fragments.js';
import ordersRouter from './routes/orders.js';
import servicesRouter from './routes/services.js';
import settingsRouter from './routes/settings.js';
import sexStandartlariRouter from './routes/sex-standartlari.js';
import narxlarRouter from './routes/narxlar.js';
import furnituraRouter from './routes/furnitura.js';
import plitaMoslashRouter from './routes/plita-moslash.js';
import remnantsRouter from './routes/remnants.js';
import aiRouter from './routes/ai.js';
import logRouter from './routes/log.js';
import adminPanelRouter from './routes/admin-panel.js';
import healthRouter from './routes/health.js';

const cfg = loadConfig();

/* ── baza: ulanish, jurnal (TZ-19: JSON qatorlar + error_log jadvali), jadvallar, boshlang'ich ma'lumot ── */
const db = openDb(cfg.DB_PATH);
const jurnal = createJurnal(db);
yadroSxema(db);
mcModullar(db, APP_DIR);
adminSxema(db);
aiSxema(db);                                  // TZ-40: ai_kesh, ai_sarf, promptlar_admin.spec_*
adminSxema2(db);                              // TZ-37 (2-faza): materiallar, katalog, users.bloklangan (createAuth'dan OLDIN — u shu ustunni o'qiydi)
adminSxema3(db);                              // TZ-37 (3-faza): ERP sinxronlash (erp_partiya, erp_narx), narx tarixini qaytarish
erpJonliSxema(db);                            // TZ-44: ERP jonli sinxron (holat, kategoriyalar, tarix) — faqat yangi jadvallar
promptlarSeed(db, APP_DIR);
const tejash = aiTejash({ db, jurnal });      // TZ-40: AI token tejash (tayyor → kesh → qoida → Claude)
tejash.royxatToldir();                        // tayyor promptlarga tuzilma (qoida bilan, bepul; mavjud tuzilma o'zgarmaydi)
tejash.keshTozala();
setInterval(() => tejash.keshTozala(), 6 * 3600 * 1000).unref();
zaifAdminTekshir(db, cfg.PROD);

/* ── Express ── */
const app = express();
app.disable('x-powered-by');
const server = http.createServer(app);
const efir = narxEfiri({ server, app, allowed: cfg.ALLOWED_ORIGINS });          // WebSocket /ws — real-time narx
const kirish = createAuth({ db, cfg });
const erpJonli = erpJonliYarat({ db, jurnal });                                 // TZ-44: ERP_JONLI=1 + ERP_LOGIN + ERP_PASSWORD bo'lmasa — o'chiq (xato emas)
const ctx = { db, jurnal, cfg, tejash, erpJonli, ...kirish, broadcastPrice: efir.broadcastPrice };
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: cfg.API_MAX });         // TZ-19 X5: hamma /api — 300 / daqiqa / IP (testda TEST_API_LIMIT)

app.use(sorovJurnali(jurnal));
if (cfg.TRUST_PROXY) app.set('trust proxy', Number(cfg.TRUST_PROXY) || 1);
app.use(cors({ origin: cfg.ALLOWED_ORIGINS.length ? cfg.ALLOWED_ORIGINS : false }));
/* xavfsizlik sarlavhalari (helmet'siz): CSP, HSTS (production), nosniff, ramka taqiqi — himoya.js */
app.use(securityHeaders({ prod: cfg.PROD, scriptHashes: inlineScriptHashes(path.join(APP_DIR, 'index.html')),
  ilovaMi: (p) => TG_ILOVA.test(p) || ILOVA_YOLI.test(p) }));   // TZ-30: ilova manzillari — /app.html bilan bir xil sarlavha
app.use('/api', apiLimiter.take);
app.use('/api/log', express.json({ limit: '4kb' }));                // brauzer xato yozuvi — kichik (TZ-19)
app.use('/api/telegram/fayl', express.json({ limit: '15mb' }));     // TZ-16: fayl (base64, 10 MB gacha) — bot chatiga
app.use(express.json({ limit: '2mb' }));

/* ── sahifalar: yangi sayt (web/dist), ilova manzillari (TZ-30), eski sayt (/eski/) ── */
const sahifa = sahifalar({ webDist: WEB_DIST, eski: APP_DIR });
app.use(sahifa.statik);

/* ── API (har modul — o'z routerida, manzillar to'liq: /api/...) ── */
for (const router of [authRouter, authSmsRouter, authGoogleRouter, telegramRouter, projectsRouter, shablonlarRouter, materialsRouter, fragmentsRouter,
  ordersRouter, servicesRouter, settingsRouter, sexStandartlariRouter, narxlarRouter, furnituraRouter, plitaMoslashRouter, remnantsRouter, aiRouter,
  adminPanelRouter, logRouter, healthRouter]) app.use(router(ctx));

/* ── xatolar: noma'lum API — JSON 404; noma'lum sahifa — 404.html; qolgani — xato ishlovchisi ── */
app.use('/api', (req, res) => fail(res, 'S3D-SRV-002'));
app.use(sahifa.topilmadi);
app.use(xatoIshlovchi(jurnal));
process.on('unhandledRejection', (e) => jurnal.error({ code: 'S3D-SRV-001', msg: 'unhandledRejection: ' + (e && e.message || e), meta: { stack: String(e && e.stack || '').slice(0, 1200) } }));
process.on('uncaughtException', (e) => {
  jurnal.error({ code: 'S3D-SRV-001', msg: 'uncaughtException: ' + (e && e.message || e), meta: { stack: String(e && e.stack || '').slice(0, 1200) } });
  process.exit(1);   // holati noma'lum jarayon davom etmaydi — pm2/systemd qayta ishga tushiradi
});

/* ═══════════════════ START ═══════════════════ */
server.on('close', () => { erpJonli.stop(); });                                     // TZ-44: poller tozalanadi (taymerlar unref — jarayonni ushlab turmaydi)
server.listen(cfg.PORT, () => {
  if (erpJonli.start()) jurnal.info({ code: 'S3D-ADM-100', msg: `ERP jonli sinxron yoqildi (${erpJonli.erpManzil}): qaynoq 2 daqiqa, to'liq 15 daqiqa` });
  else if (process.env.ERP_JONLI === '1' && erpJonli.sabab) jurnal.warn({ code: 'S3D-ERP-001', msg: `ERP jonli sinxron o'chiq: ${erpJonli.sabab}` });
  console.log(`Smart3D server: http://localhost:${cfg.PORT}`);
  console.log(`WebSocket: ws://localhost:${cfg.PORT}/ws`);
  console.log(`API: http://localhost:${cfg.PORT}/api/health`);
});
