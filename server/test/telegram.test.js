/* Smart3D server — TZ-16: Telegram Mini App. Vaqtinchalik bazada (S8); Telegram API — test ichidagi soxta server
 * (haqiqiy botga hech narsa yuborilmaydi), bot kaliti — test kaliti.
 * Tekshiriladi: imzo (to'g'ri / soxta / eskirgan / signature maydoni bilan), kirish (cookie'siz kalit), telefon (webhook,
 * faqat o'z raqami), saytdagi akkauntga bog'lash (SMS — avtomatik; email — faqat parol bilan kirib), fayl (faqat o'z chatiga,
 * tur va hajm), CSP (faqat ilova sahifasi Telegram ramkasiga ochiq). Ishga tushirish: npm test */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tgImzo, initDataTekshir, webhookKontakt } from '../telegram.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.join(__dirname, '..');
const TOKEN = '123456:TEST-' + crypto.randomBytes(12).toString('hex');
const SIR = 'webhook-sir-' + crypto.randomBytes(8).toString('hex');
let tmp, proc, base, tgSrv;
const kelgan = [];                                  // soxta Telegram API'ga kelgan so'rovlar

before(async () => {
  tgSrv = http.createServer((req, res) => {
    const ch = [];
    req.on('data', d => ch.push(d));
    req.on('end', () => {
      kelgan.push({ url: req.url, type: req.headers['content-type'] || '', body: Buffer.concat(ch) });
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true, result: {} }));
    });
  });
  await new Promise(r => tgSrv.listen(0, '127.0.0.1', r));
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-tg-'));
  const db = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: 'test-admin-parol-3', ADMIN_EMAIL: 'admin@smart3d.uz' }, stdio: 'pipe' });
  const port = 20000 + Math.floor(Math.random() * 20000);
  base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), DB_PATH: db, JWT_SECRET: 'tg-test-' + 'z'.repeat(40), NODE_ENV: 'test',
    TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_WEBHOOK_SECRET: SIR, TELEGRAM_API_URL: `http://127.0.0.1:${tgSrv.address().port}`,
    TELEGRAM_WEBAPP_URL: 'https://smart3d.bittada.uz/app.html', TEST_REGISTER_LIMIT: '100' };
  delete env.ESKIZ_EMAIL; delete env.ESKIZ_PASSWORD;
  for (const k of ['AI_PROVIDER', 'AI_API_KEY', 'AI_MODEL', 'AI_BASE_URL', 'ANTHROPIC_API_KEY']) delete env[k];
  proc = spawn(process.execPath, ['index.js'], { cwd: SERVER_DIR, env });
  await new Promise((resolve, reject) => {
    let out = '';
    const t = setTimeout(() => reject(new Error('server ishga tushmadi: ' + out)), 8000);
    proc.stdout.on('data', d => { out += d; if (/Smart3D server:/.test(out)) { clearTimeout(t); resolve(); } });
    proc.stderr.on('data', d => { out += d; });
  });
});
after(() => { proc && proc.kill(); tgSrv && tgSrv.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const api = (p, { method = 'GET', body, token, headers } = {}) => fetch(base + p, {
  method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}), ...(headers || {}) },
  body: body ? JSON.stringify(body) : undefined
});
/** Telegram kabi imzolash (signature — Bot API 8.0 dagi qo'shimcha maydon, HMAC satriga kirmaydi deb) */
function imzola(fields, token = TOKEN, { signature } = {}) {
  const p = new URLSearchParams(fields);
  const q = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => k + '=' + v).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  if (signature) p.set('signature', signature);
  p.set('hash', crypto.createHmac('sha256', secret).update(q).digest('hex'));
  return p.toString();
}
const now = () => Math.floor(Date.now() / 1000);
const initData = (id, extra = {}) => imzola({ auth_date: String(now()), query_id: 'AAE' + id, user: JSON.stringify({ id, first_name: 'Usta', last_name: 'Tg' + id, language_code: 'uz' }), ...extra });
const tgKirish = async (id) => { const r = await api('/api/auth/telegram', { method: 'POST', body: { initData: initData(id) } }); assert.equal(r.status, 200); return r.json(); };
const kontakt = (id, phone, fromId = id) => api('/api/telegram/webhook', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': SIR },
  body: { update_id: 1, message: { message_id: 1, from: { id: fromId }, chat: { id: fromId }, contact: { user_id: id, phone_number: phone } } } });
const DOC = (n) => ({ app: 'smart3d', v: 2, name: 'Telegram ' + n, doc: { room: { outline: [[0, 0], [3600, 0], [3600, 3000], [0, 3000]] }, placements: [] } });

test('imzo: to\'g\'ri, soxta kalit, o\'zgartirilgan maydon, eskirgan, kelajakdan, signature bilan', () => {
  const ok = initData(1001);
  assert.equal(initDataTekshir(ok, TOKEN).tgId, 1001);
  assert.equal(initDataTekshir(ok, '999:boshqa'), null);
  assert.equal(initDataTekshir(ok.replace('Usta', 'Admin'), TOKEN), null);
  assert.equal(initDataTekshir(imzola({ auth_date: String(now() - 2 * 86400), user: JSON.stringify({ id: 5 }) }), TOKEN), null);
  assert.equal(initDataTekshir(imzola({ auth_date: String(now() + 3600), user: JSON.stringify({ id: 5 }) }), TOKEN), null);
  assert.equal(initDataTekshir(imzola({ auth_date: String(now()), user: JSON.stringify({ id: 7 }) }, TOKEN, { signature: 'abc_-' }), TOKEN).tgId, 7);
  assert.equal(tgImzo('hash=' + 'a'.repeat(64), TOKEN), null);
  assert.equal(initDataTekshir(imzola({ auth_date: String(now()), user: '{"id":"x"}' }), TOKEN), null);
});

test('webhook kontakti: faqat o\'z raqami', () => {
  assert.deepEqual(webhookKontakt({ message: { from: { id: 5 }, contact: { user_id: 5, phone_number: '+998 90 123 45 67' } } }), { tgId: 5, phone: '998901234567' });
  assert.equal(webhookKontakt({ message: { from: { id: 5 }, contact: { user_id: 6, phone_number: '998901234567' } } }), null);
});

test('kirish: imzo bilan — kalit javobda, cookie yo\'q; qayta kirish — o\'sha akkaunt; soxta/eskirgan — 401', async () => {
  const r = await api('/api/auth/telegram', { method: 'POST', body: { initData: initData(2001) } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('set-cookie'), null, 'Telegram rejimida cookie qo\'yilmaydi');
  const j = await r.json();
  assert.ok(j.token && j.yangi && j.user.telegram && j.user.name === 'Usta Tg2001');
  const me = await (await api('/api/me', { token: j.token })).json();
  assert.equal(me.telegram, true);
  assert.ok(!('telegram_id' in me), 'Telegram ID javobda ochilmaydi');
  const j2 = await tgKirish(2001);
  assert.equal(j2.user.id, j.user.id); assert.equal(j2.yangi, false);
  const bad = await api('/api/auth/telegram', { method: 'POST', body: { initData: initData(2001).replace('Usta', 'X') } });
  assert.equal(bad.status, 401); assert.equal((await bad.json()).code, 'S3D-TG-002');
  const old = await api('/api/auth/telegram', { method: 'POST', body: { initData: imzola({ auth_date: String(now() - 90000), user: JSON.stringify({ id: 2001 }) }) } });
  assert.equal(old.status, 401);
});

test('webhook: maxfiy kalitsiz — 403; o\'z raqami saqlanadi (S1); birovning kontakti — saqlanmaydi; /start — ilova tugmasi', async () => {
  const j = await tgKirish(3001);
  assert.equal((await api('/api/telegram/webhook', { method: 'POST', body: { message: {} } })).status, 403);
  assert.equal((await api('/api/telegram/webhook', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': SIR + 'x' }, body: {} })).status, 403);
  await kontakt(9999, '+998 90 555 00 01', 3001);                       // boshqaning kontaktini yubordi
  assert.equal((await (await api('/api/me', { token: j.token })).json()).phone, '');
  assert.equal((await kontakt(3001, '+998 90 555 00 01')).status, 200);
  assert.equal((await (await api('/api/me', { token: j.token })).json()).phone, '998905550001');
  kelgan.length = 0;
  await api('/api/telegram/webhook', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': SIR }, body: { message: { from: { id: 3001 }, chat: { id: 3001 }, text: '/start' } } });
  const m = kelgan.find(k => /\/sendMessage$/.test(k.url));
  assert.ok(m && JSON.parse(m.body).reply_markup.inline_keyboard[0][0].web_app.url === 'https://smart3d.bittada.uz/app.html');
  assert.ok(m.url.startsWith('/bot' + TOKEN + '/'), 'bot kaliti faqat Telegram API manzilida');
});

test('SMS bilan tasdiqlangan akkaunt — raqam ulashilganda avtomatik bog\'lanadi, Telegram loyihalari o\'tadi', async () => {
  const s = await (await api('/api/auth/sms/send', { method: 'POST', body: { phone: '+998 91 444 55 66' } })).json();
  const sms = await (await api('/api/auth/sms/verify', { method: 'POST', body: { phone: '+998 91 444 55 66', code: s.dev_code, name: 'SMS Usta' } })).json();
  const tg = await tgKirish(4001);
  assert.equal((await api('/api/projects', { method: 'POST', token: tg.token, body: DOC(1) })).status, 200);
  await kontakt(4001, '998914445566');
  assert.equal((await api('/api/me', { token: tg.token })).status, 401, 'eski Telegram kaliti bekor');
  const tg2 = await tgKirish(4001);
  assert.equal(tg2.user.id, sms.user.id, 'endi SMS akkaunti');
  const pr = await (await api('/api/projects', { token: tg2.token })).json();
  assert.ok(pr.some(p => p.name === 'Telegram 1'), 'loyiha ko\'chdi');
});

test('email akkaunti — avtomatik bog\'lanmaydi; email+parol bilan kirib /api/telegram/ulash — bog\'lanadi; boshqa Telegram — 409', async () => {
  const reg = await (await api('/api/register', { method: 'POST', body: { email: 'tg.email@test.uz', password: 'parol12345', name: 'Email Usta', phone: '998935556677' } })).json();
  const tg = await tgKirish(5001);
  await kontakt(5001, '998935556677');
  assert.equal((await tgKirish(5001)).user.id, tg.user.id, 'telefon bo\'yicha avtomatik bog\'lanmadi');
  assert.ok(kelgan.some(k => /email va parol/.test(k.body.toString())), 'foydalanuvchiga yo\'l-yo\'riq');
  assert.equal((await api('/api/projects', { method: 'POST', token: tg.token, body: DOC(2) })).status, 200);
  const u = await api('/api/telegram/ulash', { method: 'POST', token: reg.token, body: { initData: initData(5001) } });
  assert.equal(u.status, 200);
  assert.equal((await tgKirish(5001)).user.id, reg.user.id);
  assert.ok((await (await api('/api/projects', { token: reg.token })).json()).some(p => p.name === 'Telegram 2'));
  const k = await api('/api/telegram/ulash', { method: 'POST', token: reg.token, body: { initData: initData(5002) } });
  assert.equal(k.status, 409); assert.equal((await k.json()).code, 'S3D-TG-006');
  assert.equal((await api('/api/telegram/ulash', { method: 'POST', token: reg.token, body: { initData: 'hash=x' } })).status, 401);
});

test('fayl: faqat o\'z chatiga; Telegram\'siz akkaunt — 403; tur va hajm cheklovi', async () => {
  const tg = await tgKirish(6001);
  kelgan.length = 0;
  const r = await api('/api/telegram/fayl', { method: 'POST', token: tg.token, body: { nom: 'Smeta oshxona.xlsx', mime: 'application/vnd.ms-excel', base64: Buffer.from('salom fayl').toString('base64') } });
  assert.equal(r.status, 200);
  const d = kelgan.find(k => /\/sendDocument$/.test(k.url));
  assert.ok(d && /multipart\/form-data/.test(d.type));
  const b = d.body.toString();
  assert.match(b, /name="chat_id"\r\n\r\n6001\r\n/);
  assert.ok(b.includes('Smeta oshxona.xlsx') && b.includes('salom fayl'));
  const reg = await (await api('/api/register', { method: 'POST', body: { email: 'tgsiz@test.uz', password: 'parol12345', name: 'Oddiy' } })).json();
  const x = await api('/api/telegram/fayl', { method: 'POST', token: reg.token, body: { nom: 'a.pdf', base64: 'AAAA' } });
  assert.equal(x.status, 403); assert.equal((await x.json()).code, 'S3D-TG-004');
  for (const nom of ['../etc/passwd', 'virus.exe', 'a.html', '']) {
    assert.equal((await api('/api/telegram/fayl', { method: 'POST', token: tg.token, body: { nom, base64: 'AAAA' } })).status, 400, nom);
  }
  const katta = Buffer.alloc(10 * 1024 * 1024 + 10, 1).toString('base64');
  assert.equal((await api('/api/telegram/fayl', { method: 'POST', token: tg.token, body: { nom: 'k.pdf', base64: katta } })).status, 400);
  assert.equal((await api('/api/telegram/fayl', { method: 'POST', body: { nom: 'a.pdf', base64: 'AAAA' } })).status, 401);
});

test('CSP: ilova sahifasi Telegram ramkasi va skriptiga ochiq, bosh sahifa — yopiq', async () => {
  const a = await fetch(base + '/app.html');
  const ca = a.headers.get('content-security-policy');
  assert.match(ca, /frame-ancestors https:\/\/web\.telegram\.org/);
  assert.match(ca, /script-src 'self' https:\/\/telegram\.org/);
  assert.equal(a.headers.get('x-frame-options'), null);
  const s = await fetch(base + '/');
  assert.match(s.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(s.headers.get('x-frame-options'), 'DENY');
  const api1 = await fetch(base + '/api/health');
  assert.match(api1.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});
