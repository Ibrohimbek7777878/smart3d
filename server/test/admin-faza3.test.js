/* Smart3D server — TZ-37 (3-faza): admin panel — Tizim (AI/Google/SMS/Telegram holati, xatolar, zaxira), O'zgarishlar tarixi kengaytmasi (filtr,
 * sahifalash, narxlarni ham qaytarish) va ERP sinxronlash (admin yuklagan JSON: tekshiruv, farq, tasdiq, qo'llash, qaytarish, sukutga qaytarish).
 * Vaqtinchalik bazada (asl bazaga tegmaydi, S8). Ikki server: A — toza muhit (kalit yo'q); B — soxta kalit/parol/token bilan (Tizim hech birini
 * ko'rsatmasligi tekshiriladi). ERP ga hech narsa yozilmaydi va tarmoqqa chiqilmaydi: yuklangan JSON faqat serverda tekshiriladi. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { aiSabab, kalitManbasi } from '../routes/admin-tizim.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.join(__dirname, '..');
const ADMIN_PW = 'test-admin-faza3-9';
const J = (f) => JSON.parse(fs.readFileSync(path.join(SERVER_DIR, '../app/data', f), 'utf8'));
let tmp, ipN = 0, S = {};

/* soxta maxfiy qiymatlar (B server) — javobda ularning HECH BIRI bo'lmasligi kerak */
const KALIT = 'sk-ant-api03-TESTKALIT-' + 'Q9x7'.repeat(8);
const PAROL = 'eskiz-parol-' + 'Zk4m'.repeat(4);
const TG_TOKEN = '123456789:AAH' + 'tgTEST_token-'.repeat(3);
const TG_SIR = 'webhook-sir-' + 'Ab12'.repeat(5);
const MAXFIYLAR = [KALIT, PAROL, TG_TOKEN, TG_SIR, 'ESKIZ-LOGIN@kompaniya.uz'];

async function boshlash(nom, qoshimcha = {}, port0 = 30000) {
  const dir = path.join(tmp, nom);
  fs.mkdirSync(dir, { recursive: true });
  const db = path.join(dir, 'test.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: ADMIN_PW, ADMIN_EMAIL: 'admin@smart3d.uz' }, stdio: 'pipe' });
  const port = port0 + Math.floor(Math.random() * 900);
  const env = { ...process.env, PORT: String(port), DB_PATH: db, JWT_SECRET: 'adm3-test-' + 'y'.repeat(40), NODE_ENV: 'test', TRUST_PROXY: '1', ...qoshimcha };
  for (const k of ['ESKIZ_EMAIL', 'ESKIZ_PASSWORD', 'AI_PROVIDER', 'AI_API_KEY', 'AI_MODEL', 'AI_BASE_URL', 'ANTHROPIC_API_KEY', 'GOOGLE_CLIENT_ID', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'BACKUP_DIR'])
    if (!(k in qoshimcha)) delete env[k];
  const proc = spawn(process.execPath, ['index.js'], { cwd: SERVER_DIR, env });
  await new Promise((resolve, reject) => {
    let out = '';
    const t = setTimeout(() => reject(new Error('server ishga tushmadi: ' + out)), 8000);
    proc.stdout.on('data', d => { out += d; if (/Smart3D server:/.test(out)) { clearTimeout(t); resolve(); } });
    proc.stderr.on('data', d => { out += d; });
  });
  const s = { nom, proc, base: `http://127.0.0.1:${port}`, dbPath: db, dir, adminlar: [], n: 0 };
  s.api = (p, { method = 'GET', body, token, headers = {} } = {}) => fetch(s.base + p, {
    method, headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.8.${Math.floor(ipN++ / 40) % 250}.1`, ...(token ? { authorization: 'Bearer ' + token } : {}), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const dbq = new Database(db);
  const asl = dbq.prepare("SELECT password_hash FROM users WHERE email = 'admin@smart3d.uz'").get();
  for (let i = 2; i <= 4; i++) dbq.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')").run('Admin ' + i, `admin${i}@smart3d.uz`, asl.password_hash);
  dbq.close();
  for (let i = 1; i <= 4; i++) s.adminlar.push((await (await s.api('/api/login', { method: 'POST', body: { email: i === 1 ? 'admin@smart3d.uz' : `admin${i}@smart3d.uz`, password: ADMIN_PW } })).json()).token);
  s.A = (p, o = {}) => s.api(p, { ...o, token: s.adminlar[s.n++ % s.adminlar.length] });   // har adminning yozish chegarasi (60/daq) alohida
  s.sql = () => new Database(db);
  s.usta = async (tel, name) => {
    const { dev_code } = await (await s.api('/api/auth/sms/send', { method: 'POST', body: { phone: tel } })).json();
    const j = await (await s.api('/api/auth/sms/verify', { method: 'POST', body: { phone: tel, code: dev_code, name } })).json();
    return { token: j.token, id: j.user.id };
  };
  return s;
}

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-adm3-'));
  S.B = await boshlash('b', {
    AI_PROVIDER: 'anthropic', AI_API_KEY: KALIT, AI_MODEL: 'claude-sonnet-5-5', ESKIZ_EMAIL: 'ESKIZ-LOGIN@kompaniya.uz', ESKIZ_PASSWORD: PAROL,
    GOOGLE_CLIENT_ID: 'sinov-123.apps.googleusercontent.com', TELEGRAM_BOT_TOKEN: TG_TOKEN, TELEGRAM_WEBHOOK_SECRET: TG_SIR,
    BACKUP_DIR: path.join(tmp, 'zaxira-b'), TELEGRAM_API_URL: 'http://127.0.0.1:9'
  }, 31000);
  S.A = await boshlash('a', { BACKUP_DIR: path.join(tmp, 'yoq-papka') }, 32000);
  S.A.ustaA = await S.A.usta('998901234567', 'Aziz Usta');
});
after(() => { for (const k of ['A', 'B']) S[k] && S[k].proc.kill(); fs.rmSync(tmp, { recursive: true, force: true }); });

/* ═══════════════════ TIZIM ═══════════════════ */
test('tizim: admin bo\'lmasa 404 S3D-AUTH-006 (kirmagan ham, usta ham)', async () => {
  const A = S.A;
  for (const token of [undefined, A.ustaA.token]) {
    const r = await A.api('/api/admin/tizim', { token });
    assert.equal(r.status, 404); assert.equal((await r.json()).code, 'S3D-AUTH-006');
  }
});

test('tizim: toza muhit — AI o\'chiq (sababi bilan), kalit yo\'q, SMS/Google/Telegram sozlanmagan, zaxira papkasi yo\'q', async () => {
  const j = await (await S.A.A('/api/admin/tizim')).json();
  assert.equal(j.ai.yoqilgan, false); assert.equal(j.ai.sabab, 'provayder_yoq');
  assert.deepEqual(j.ai.kalit, { bor: false, manba: null, kerak: true });
  assert.equal(j.ai.oxirgi_xato, null); assert.equal(j.ai.xato_24soat, 0);
  assert.ok(j.ai.byudjet.chegara > 0 && j.ai.byudjet.qoldiq === j.ai.byudjet.chegara, 'byudjet: ishlatilmagan');
  assert.equal(j.google.sozlangan, false); assert.equal(j.google.ulangan, 0);
  assert.equal(j.sms.sozlangan, false);
  assert.deepEqual([j.telegram.bot, j.telegram.webhook_sir], [false, false]);
  assert.equal(j.zaxira.holat, 'yoq'); assert.equal(j.zaxira.papka_bor, false); assert.equal(j.zaxira.oxirgi, null); assert.equal(j.zaxira.soni, 0);
  assert.equal(j.server.muhit, 'test'); assert.ok(j.server.uptime >= 0 && j.server.baza_hajm > 0 && /^v\d+/.test(j.server.node));
  assert.ok(Date.parse(j.vaqt) > Date.now() - 5000);
  /* /api/ai/status (ochiq) bilan bir xil fikr */
  assert.equal((await (await S.A.api('/api/ai/status')).json()).enabled, false);
});

test('tizim: AI o\'chiq sababi — provayder yo\'q | notog\'ri | model yo\'q | kalit yo\'q', () => {
  assert.equal(aiSabab({}), 'provayder_yoq');
  assert.equal(aiSabab({ AI_PROVIDER: 'foo' }), 'provayder_notogri');
  assert.equal(aiSabab({ AI_PROVIDER: 'openai' }), 'model_yoq');
  assert.equal(aiSabab({ AI_PROVIDER: 'gemini' }), 'model_yoq');
  assert.equal(aiSabab({ AI_PROVIDER: 'anthropic' }), 'kalit_yoq');                       // model standarti bor, kalit yo'q
  assert.equal(aiSabab({ AI_PROVIDER: 'OpenAI', AI_MODEL: 'gpt-x' }), 'kalit_yoq');
});

test('tizim: sozlangan muhit — kalit "bor" (manba nomi bilan), AI yoqilgan, SMS/Google/Telegram sozlangan; HECH QAYSI maxfiy qiymat javobda yo\'q', async () => {
  const r = await S.B.A('/api/admin/tizim');
  const matn = await r.text();
  const j = JSON.parse(matn);
  assert.equal(j.ai.yoqilgan, true); assert.equal(j.ai.sabab, ''); assert.equal(j.ai.provayder, 'anthropic'); assert.equal(j.ai.model, 'claude-sonnet-5-5');
  assert.deepEqual(j.ai.kalit, { bor: true, manba: 'AI_API_KEY', kerak: true });
  assert.equal(j.google.sozlangan, true); assert.equal(j.sms.sozlangan, true);
  assert.deepEqual([j.telegram.bot, j.telegram.webhook_sir], [true, true]);
  for (const m of MAXFIYLAR) assert.ok(!matn.includes(m), 'maxfiy qiymat javobda: ' + m.slice(0, 12));
  for (const bolak of [KALIT.slice(0, 14), KALIT.slice(-10), PAROL.slice(0, 12), TG_TOKEN.slice(0, 12), TG_SIR.slice(0, 12)]) assert.ok(!matn.includes(bolak), 'maxfiy qiymat bo\'lagi: ' + bolak);
  assert.ok(!/sk-ant|AIza|eyJ/.test(matn));
  assert.deepEqual(Object.keys(j.ai.kalit).sort(), ['bor', 'kerak', 'manba'], 'kalit obyektida boshqa maydon yo\'q (uzunlik, boshi, oxiri)');
  assert.equal((await (await S.B.api('/api/ai/status')).json()).enabled, true);
});

test('tizim: kalit manbasi (faqat nomi) — AI_API_KEY, anthropic uchun ANTHROPIC_API_KEY', () => {
  assert.equal(kalitManbasi({}), ''); assert.equal(kalitManbasi({ AI_API_KEY: '   ' }), '');
  assert.equal(kalitManbasi({ AI_API_KEY: 'x' }), 'AI_API_KEY');
  assert.equal(kalitManbasi({ AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'x' }), 'ANTHROPIC_API_KEY');
  assert.equal(kalitManbasi({ AI_PROVIDER: 'openai', ANTHROPIC_API_KEY: 'x' }), '', 'boshqa provayder uchun ANTHROPIC_API_KEY ishlatilmaydi');
});

test('tizim: xato matni ichidagi kalit, parol va token — "[maxfiy]" bilan almashtiriladi', async () => {
  const B = S.B;
  const db = B.sql();
  db.prepare("INSERT INTO ai_sarf (sana, vaqt, manba, model, ok, sabab, yol) VALUES (date('now'), datetime('now'), 'claude', 'claude-sonnet-5-5', 0, ?, 'parse')").run('401 invalid x-api-key ' + KALIT + ' (Bearer ' + TG_TOKEN + ')');
  db.prepare("INSERT INTO error_log (level, source, code, rid, msg) VALUES ('error', 'server', 'S3D-AI-002', 'aaaa', ?)").run('chaqiruv yiqildi, kalit=' + KALIT);
  db.close();
  const matn = await (await B.A('/api/admin/tizim')).text();
  for (const m of MAXFIYLAR) assert.ok(!matn.includes(m), 'xato matnida maxfiy qiymat chiqdi: ' + m.slice(0, 12));
  const j = JSON.parse(matn);
  assert.ok(j.ai.oxirgi_xato && /\[maxfiy\]/.test(j.ai.oxirgi_xato.sabab), j.ai.oxirgi_xato && j.ai.oxirgi_xato.sabab);
  assert.equal(j.ai.xato_24soat, 1);
  assert.ok(j.xatolar.top.some(x => x.code === 'S3D-AI-002' && /\[maxfiy\]/.test(x.msg)));
});

test('tizim: xatolar jurnali — 24 soat va 7 kun (xato / ogohlantirish), eng ko\'p kodlar; Google/SMS/Telegram xato sonlari', async () => {
  const A = S.A;
  const db = A.sql();
  const q = db.prepare("INSERT INTO error_log (ts, level, source, code, rid, msg) VALUES (datetime('now', ?), ?, 'server', ?, 'r1', ?)");
  q.run('-1 hours', 'error', 'S3D-AUTH-011', 'SMS yuborilmadi'); q.run('-2 hours', 'error', 'S3D-AUTH-011', 'SMS yuborilmadi'); q.run('-3 hours', 'warn', 'S3D-AUTH-017', 'Google token rad');
  q.run('-2 days', 'warn', 'S3D-AUTH-020', 'Google aloqa'); q.run('-3 days', 'warn', 'S3D-TG-002', 'tg imzo'); q.run('-9 days', 'error', 'S3D-AUTH-011', 'eski');
  db.prepare("INSERT INTO users (name, email, password_hash, role, google_sub) VALUES ('G', 'g@x.uz', 'x', 'user', 'sub1')").run();
  db.close();
  const j = await (await A.A('/api/admin/tizim')).json();
  assert.deepEqual(j.xatolar.soat24, { error: 2, warn: 1 });
  assert.deepEqual(j.xatolar.kun7, { error: 2, warn: 3 }, '9 kunlik yozuv 7 kunga kirmaydi');
  assert.equal(j.xatolar.top[0].code, 'S3D-AUTH-011'); assert.equal(j.xatolar.top[0].n, 2);
  assert.ok(j.xatolar.top.every(x => x.n >= 1 && Date.parse(x.oxirgi) > 0));
  assert.equal(j.sms.xato_7kun, 2); assert.equal(j.google.xato_7kun, 2); assert.equal(j.telegram.xato_7kun, 1);
  assert.equal(j.google.ulangan, 1);
  assert.ok(j.xatolar.jami_saqlangan >= 6);
});

test('tizim: zaxira holati — yo\'q → yaxshi (yangi nusxa) → eskirgan (36 soatdan eski); oxirgi 5 ta; boshqa fayllar hisobga kirmaydi', async () => {
  const B = S.B, dir = path.join(tmp, 'zaxira-b');
  assert.equal((await (await B.A('/api/admin/tizim')).json()).zaxira.holat, 'yoq', 'papka hali yo\'q');
  fs.mkdirSync(dir, { recursive: true });
  const yoz = (nom, soatOldin, hajm = 1000) => { const f = path.join(dir, nom); fs.writeFileSync(f, Buffer.alloc(hajm)); const t = new Date(Date.now() - soatOldin * 36e5); fs.utimesSync(f, t, t); };
  assert.equal((await (await B.A('/api/admin/tizim')).json()).zaxira.holat, 'yoq', 'papka bo\'sh');
  for (let i = 0; i < 7; i++) yoz(`smart3d-2026-10-${10 + i}-03-00-00.db`, 100 - i * 10 - 2, 2000 + i);       // oxirgisi ~38 soat oldin
  yoz('boshqa.txt', 0); yoz('smart3d-eski.bak', 0);
  let z = (await (await B.A('/api/admin/tizim')).json()).zaxira;
  assert.equal(z.soni, 7, 'faqat smart3d-<sana>.db nusxalari');
  assert.equal(z.holat, 'eskirgan'); assert.ok(z.oxirgi.yosh_soat > 36 && z.oxirgi.yosh_soat < 40, String(z.oxirgi.yosh_soat));
  assert.equal(z.oxirgi.fayl, 'smart3d-2026-10-16-03-00-00.db'); assert.equal(z.oxirgi.hajm, 2006);
  assert.equal(z.royxat.length, 5); assert.deepEqual(z.royxat.map(x => x.fayl).slice(0, 2), ['smart3d-2026-10-16-03-00-00.db', 'smart3d-2026-10-15-03-00-00.db']);
  assert.equal(z.eskirish_soat, 36); assert.equal(z.papka, dir);
  yoz('smart3d-2026-10-21-03-00-00.db', 3);
  z = (await (await B.A('/api/admin/tizim')).json()).zaxira;
  assert.equal(z.holat, 'yaxshi'); assert.equal(z.oxirgi.fayl, 'smart3d-2026-10-21-03-00-00.db'); assert.ok(z.oxirgi.yosh_soat >= 2.9 && z.oxirgi.yosh_soat < 3.5);
  assert.equal(z.soni, 8);
});
