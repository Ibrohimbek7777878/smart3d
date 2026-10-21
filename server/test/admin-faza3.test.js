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

/* ═══════════════════ O'ZGARISHLAR TARIXI (kengaytma) ═══════════════════ */
const kun = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const XIZMAT = (qiymat = 21000) => ({ nom: 'Sinov raspili', guruh: 'raspil', qiymat, birlik: 'list', kategoriya: 'Услуги Распила', manba: 'egasi' });
const tarix = async (X, q = '') => (await (await X.A('/api/admin/tarix' + q)).json());
const narxHujjat = async (X) => (await (await X.api('/api/narxlar')).json());

test('tarix: admin bo\'lmasa 404 S3D-AUTH-006; boshida bo\'sh', async () => {
  const X = S.A;
  for (const [m, p] of [['GET', '/api/admin/tarix'], ['POST', '/api/admin/narx-qaytar/1']]) for (const token of [undefined, X.ustaA.token]) {
    const r = await X.api(p, { method: m, token, body: m === 'POST' ? {} : undefined });
    assert.equal(r.status, 404, `${m} ${p}`); assert.equal((await r.json()).code, 'S3D-AUTH-006');
  }
  const j = await tarix(X);
  assert.deepEqual([j.jami, j.items.length, j.limit, j.offset, j.bolimlar.length, j.kimlar.length], [0, 0, 50, 0, 0, 0]);
});

const TOK = {};      // admin tokenlari (1, 2) va id lari
test('tarix: har bo\'limdan o\'zgarish bitta ro\'yxatda (audit + narxlar); kim va bo\'lim hisoblari; yangisi birinchi', async () => {
  const X = S.A, [t1, t2] = X.adminlar;
  TOK.t1 = t1; TOK.t2 = t2;
  const put = (p, token, body, method = 'PUT') => X.api(p, { method, token, body });
  assert.equal((await put('/api/narxlar', t1, { xizmatlar: { X1: XIZMAT() } })).status, 200);
  assert.equal((await put('/api/narxlar', t1, { tanlov: { raspil: 'X1' }, ustama: { foiz: 40 } })).status, 200);
  const furnId = J('furnitura-catalog.json').items.find(x => x.id).id;
  assert.equal((await put('/api/admin/furnitura-boglash/TARIX-1', t2, { erp_id: furnId, koef: 0.5, izoh: 'sinov' })).status, 200);
  assert.equal((await put('/api/admin/standart', t1, { ...(await (await X.api('/api/standart')).json()), oyoqBalandlik: 120 })).status, 200);
  assert.equal((await put('/api/admin/katalog/SP-K-001', t2, { yashirin: true })).status, 200);
  assert.equal((await put('/api/admin/promptlar', t1, { kat: 'oshxona', nom_uz: 'Tarix sinovi', matn_uz: 'oshxona 3 metr' }, 'POST')).status, 201);
  const j = await tarix(X);
  assert.equal(j.jami, 7, 'narxlar: xizmatlar.X1, tanlov.raspil, ustama.foiz; audit: furnitura, standart, katalog, promptlar');
  assert.equal(j.items.length, 7);
  assert.deepEqual(j.bolimlar, [{ bolim: 'furnitura', soni: 1 }, { bolim: 'katalog', soni: 1 }, { bolim: 'narxlar', soni: 3 }, { bolim: 'promptlar', soni: 1 }, { bolim: 'standart', soni: 1 }]);
  const t0 = j.items.map(x => x.vaqt);
  assert.deepEqual(t0, [...t0].sort().reverse(), 'yangisi birinchi (vaqt kamayib boradi)');
  const nx = j.items.filter(x => x.manba === 'narx');
  assert.equal(nx.length, 3); assert.ok(nx.every(x => /^n\d+$/.test(x.id) && x.bolim === 'narxlar' && x.qaytariladi === true && x.qaytarilgan === false));
  const ust = nx.find(x => x.kalit === 'ustama.foiz');
  assert.equal(ust.eski.qiymat, 35); assert.equal(ust.yangi.qiymat, 40);
  const fu = j.items.find(x => x.bolim === 'furnitura');
  assert.deepEqual([fu.kalit, fu.eski, fu.yangi.koef, fu.manba, fu.qaytariladi], ['TARIX-1', null, 0.5, 'audit', true]);
  assert.equal(j.kimlar.length, 2); TOK.id1 = j.kimlar[0].id; TOK.id2 = fu.kim_id;
  assert.deepEqual(j.kimlar.map(k => k.soni), [5, 2], 'birinchi admin: narxlar 3 + standart + promptlar; ikkinchi: furnitura + katalog (ko\'pi birinchi)');
  assert.ok(j.kimlar.every(k => k.nom && k.id > 0));
  assert.ok(j.items.every(x => Date.parse(x.vaqt.replace(' ', 'T') + 'Z') > Date.now() - 60000 && x.kim));
});

test('tarix: filtr — bo\'lim, kim, sana oralig\'i, holat, kalit bo\'yicha qidiruv', async () => {
  const X = S.A;
  const kalitlar = (j) => j.items.map(x => x.bolim + ':' + x.kalit).sort();
  assert.deepEqual((await tarix(X, '?bolim=narxlar')).items.map(x => x.kalit).sort(), ['tanlov.raspil', 'ustama.foiz', 'xizmatlar.X1']);
  assert.equal((await tarix(X, '?bolim=standart')).jami, 1);
  assert.equal((await tarix(X, '?bolim=yoq_bolim')).jami, 0);
  const k2 = await tarix(X, '?kim=' + TOK.id2);
  assert.equal(k2.jami, 2); assert.deepEqual(kalitlar(k2), ['furnitura:TARIX-1', 'katalog:SP-K-001']);
  assert.equal((await tarix(X, `?kim=${TOK.id1}&bolim=narxlar`)).jami, 3);
  assert.equal((await tarix(X, `?kim=${TOK.id2}&bolim=narxlar`)).jami, 0);
  assert.equal((await tarix(X, '?kim=999999')).jami, 0);
  assert.equal((await tarix(X, `?dan=${kun(-1)}&gacha=${kun(1)}`)).jami, 7);
  assert.equal((await tarix(X, `?dan=${kun(0)}&gacha=${kun(0)}`)).jami, 7, 'ikkala chegara ham kiradi (UTC)');
  assert.equal((await tarix(X, `?dan=${kun(1)}`)).jami, 0); assert.equal((await tarix(X, `?gacha=${kun(-1)}`)).jami, 0);
  assert.equal((await tarix(X, '?holat=faol')).jami, 7); assert.equal((await tarix(X, '?holat=qaytarilgan')).jami, 0);
  assert.deepEqual(kalitlar(await tarix(X, '?q=raspil')), ['narxlar:tanlov.raspil'], 'kalit ichida qidiruv (katta-kichik harf farqsiz)');
  assert.equal((await tarix(X, '?q=RASPIL')).jami, 1);
  assert.equal((await tarix(X, '?q=X1')).jami, 1); assert.equal((await tarix(X, '?q=%25')).jami, 0, '% oddiy belgi sifatida'); assert.equal((await tarix(X, '?q=_')).jami, 0);
  const birga = await tarix(X, `?bolim=narxlar&q=ustama&kim=${TOK.id1}&dan=${kun(-1)}`);
  assert.deepEqual(kalitlar(birga), ['narxlar:ustama.foiz']);
  /* bo'limlar hisobi — bo'lim filtrini hisobga olmaydi (chiplar uchun), qolgan filtrlarni oladi */
  const b = await tarix(X, `?bolim=narxlar&kim=${TOK.id2}`);
  assert.equal(b.jami, 0); assert.deepEqual(b.bolimlar.map(x => x.bolim), ['furnitura', 'katalog']);
});

test('tarix: sahifalash — limit/offset, jami o\'zgarmaydi, sahifalar birlashsa to\'liq ro\'yxat', async () => {
  const X = S.A;
  const hammasi = (await tarix(X, '?limit=200')).items.map(x => x.id);
  assert.equal(hammasi.length, 7);
  const s1 = await tarix(X, '?limit=3'), s2 = await tarix(X, '?limit=3&offset=3'), s3 = await tarix(X, '?limit=3&offset=6'), s4 = await tarix(X, '?limit=3&offset=9');
  assert.deepEqual([s1.items.length, s2.items.length, s3.items.length, s4.items.length], [3, 3, 1, 0]);
  assert.ok([s1, s2, s3, s4].every(s => s.jami === 7) && s2.offset === 3 && s2.limit === 3);
  assert.deepEqual([...s1.items, ...s2.items, ...s3.items].map(x => x.id), hammasi);
  assert.equal(new Set(hammasi).size, 7, 'takror yo\'q');
});

test('tarix: noto\'g\'ri parametr — 400 S3D-ADM-001', async () => {
  const X = S.A;
  for (const q of ['?limit=0', '?limit=201', '?limit=abc', '?offset=-1', '?kim=abc', '?kim=0x1', '?dan=2026-13-01', '?dan=2026-02-30', '?dan=26-1-1', `?dan=${kun(2)}&gacha=${kun(-2)}`,
    '?holat=x', '?bolim=A;DROP', '?bolim=' + 'a'.repeat(31), '?q=' + 'a'.repeat(101), '?q[]=1', '?dan[]=2026-01-01']) {
    const r = await X.A('/api/admin/tarix' + q);
    assert.equal(r.status, 400, q); assert.equal((await r.json()).code, 'S3D-ADM-001', q);
  }
});

test('narxlarni qaytarish: ustama — eski qiymat AYNAN tiklanadi (manba va sana ham), qaytarish tarixga yoziladi, ikkinchi marta — 409', async () => {
  const X = S.A, t = TOK.t2;
  const ust = (await tarix(X, '?q=ustama')).items[0];
  assert.equal(ust.qaytariladi, true);
  const r = await X.api('/api/admin/narx-qaytar/' + ust.id.slice(1), { method: 'POST', token: t, body: {} });
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), { ok: true, qaytarildi: ust.id, bolim: 'narxlar', kalit: 'ustama.foiz' });
  assert.deepEqual((await narxHujjat(X)).ustama.foiz, ust.eski, 'qiymat, manba va sana avvalgidek');
  const j = await tarix(X, '?q=ustama');
  assert.equal(j.jami, 2);
  assert.equal(j.items.find(x => x.id === ust.id).qaytarilgan, true); assert.equal(j.items.find(x => x.id === ust.id).qaytariladi, false);
  const yangi = j.items.find(x => x.id !== ust.id);
  assert.deepEqual([yangi.eski.qiymat, yangi.yangi.qiymat, yangi.kim_id], [40, 35, TOK.id2], 'qaytarish: kim, eski → yangi');
  assert.equal((await tarix(X, '?holat=qaytarilgan')).jami, 1);
  const q2 = await X.api('/api/admin/narx-qaytar/' + ust.id.slice(1), { method: 'POST', token: t, body: {} });
  assert.equal(q2.status, 409); assert.equal((await q2.json()).code, 'S3D-ADM-007');
  /* qaytarishni ham qaytarish mumkin */
  assert.equal((await X.api('/api/admin/narx-qaytar/' + yangi.id.slice(1), { method: 'POST', token: t, body: {} })).status, 200);
  assert.equal((await narxHujjat(X)).ustama.foiz.qiymat, 40);
  assert.equal((await X.api('/api/admin/narx-qaytar/' + (await tarix(X, '?q=ustama&holat=faol')).items[0].id.slice(1), { method: 'POST', token: t, body: {} })).status, 200);
  assert.equal((await narxHujjat(X)).ustama.foiz.qiymat, 35);
});

test('narxlarni qaytarish: xizmat va tanlov — bog\'liq tozalash; noma\'lum va noto\'g\'ri id', async () => {
  const X = S.A, t = TOK.t1;
  const bosh = (await narxHujjat(X)).tanlov.raspil;
  assert.equal(bosh, 'X1', 'oldingi testdan: raspil X1 ga o\'tgan');
  /* xizmat X1 qo'shilishini qaytarish: unga bog'langan tanlov (raspil) ham bo'shaydi (yangi tarix yozuvi bilan) */
  const x1 = (await tarix(X, '?q=xizmatlar.X1&holat=faol')).items.find(x => x.eski === null);
  const r = await X.api('/api/admin/narx-qaytar/' + x1.id.slice(1), { method: 'POST', token: t, body: {} });
  assert.equal(r.status, 200);
  const h = await narxHujjat(X);
  assert.equal(h.xizmatlar.X1, undefined); assert.equal(h.tanlov.raspil, null, 'o\'chirilgan xizmatga bog\'langan tanlov tozalandi');
  const yoz = await tarix(X, '?bolim=narxlar&holat=faol&limit=10');
  assert.ok(yoz.items.some(x => x.kalit === 'tanlov.raspil' && x.eski === 'X1' && x.yangi === null), 'tozalash ham tarixda');
  /* tanlovni qaytarish: tanlov.raspil eski qiymati ('7802360156' — Holzma 2) tiklanadi */
  const tn = (await tarix(X, '?q=tanlov.raspil&holat=faol')).items.find(x => x.eski === '7802360156' && x.yangi === 'X1');
  assert.equal((await X.api('/api/admin/narx-qaytar/' + tn.id.slice(1), { method: 'POST', token: t, body: {} })).status, 200);
  assert.equal((await narxHujjat(X)).tanlov.raspil, '7802360156');
  for (const id of ['99999', 'abc', '-1', '1e3', '0']) {
    const q = await X.api('/api/admin/narx-qaytar/' + id, { method: 'POST', token: t, body: {} });
    assert.equal(q.status, 404, id); assert.equal((await q.json()).code, 'S3D-ADM-006');
  }
  /* shaklsiz kalit (narx_history ga qo'lda yozilgan) — qaytarib bo'lmaydi (409), hujjat o'zgarmaydi */
  const db = X.sql(); const id = Number(db.prepare("INSERT INTO narx_history (user_id, kalit, eski, yangi) VALUES (1, 'noma.lum', '1', '2')").run().lastInsertRowid); db.close();
  const asl = JSON.stringify(await narxHujjat(X));
  const q = await X.api('/api/admin/narx-qaytar/' + id, { method: 'POST', token: t, body: {} });
  assert.equal(q.status, 409); assert.equal((await q.json()).code, 'S3D-ADM-007'); assert.equal(JSON.stringify(await narxHujjat(X)), asl);
  assert.equal((await tarix(X, '?q=noma.lum')).items[0].qaytariladi, false, 'ro\'yxat ham "qaytarib bo\'lmaydi" deydi');
});

test('har bir "qaytariladi" yozuv haqiqatan qaytariladi (audit — /api/admin/qaytar, narxlar — /api/admin/narx-qaytar); qaytarilganlar belgilanadi', async () => {
  const X = S.A;
  const fa = (await tarix(X, '?holat=faol&limit=200')).items.filter(x => x.qaytariladi);
  assert.ok(fa.length >= 4, 'furnitura, standart, katalog, promptlar bor: ' + fa.length);
  const bolimlar = new Set(fa.map(x => x.bolim));
  for (const b of ['furnitura', 'standart', 'katalog', 'promptlar']) assert.ok(bolimlar.has(b), b);
  let n = 0;
  for (const x of fa) {                                                    // yangidan eskiga
    const id = x.id.slice(1);
    const r = await X.A(x.manba === 'audit' ? '/api/admin/qaytar/' + id : '/api/admin/narx-qaytar/' + id, { method: 'POST', body: {} });
    assert.equal(r.status, 200, x.id + ' ' + x.bolim + ':' + x.kalit); n++;
  }
  assert.ok(n >= 4);
  const j = await tarix(X, '?limit=200');
  for (const x of fa) assert.equal(j.items.find(y => y.id === x.id).qaytarilgan, true, x.id);
  assert.equal(j.items.filter(x => x.qaytarilgan).length, (await tarix(X, '?holat=qaytarilgan')).jami);
  /* furnitura va katalog haqiqatan tiklandi */
  assert.equal((await (await X.A('/api/admin/furnitura-boglash')).json()).links.some(l => l.kod === 'TARIX-1'), false);
  assert.deepEqual((await (await X.api('/api/katalog')).json()).modullar, {});
});
