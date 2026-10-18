/* Smart3D server — xavfsizlik regressiya testlari (TZ-SAYT-BARQARORLIK-RESPONSIVE §6).
 * Ishga tushirish: npm test   (server/smart3d.db nusxasida ishlaydi, asl bazaga tegmaydi)
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.join(__dirname, '..');
const SECRET = 'test-secret-' + 'x'.repeat(40);
const ADMIN_PW = 'test-admin-parol-1';

let tmp, proc, base;

function startServer(env) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, ['index.js'], { cwd: SERVER_DIR, env: { ...process.env, ...env } });
    let out = '';
    const done = (v) => { clearTimeout(t); resolve(v); };
    const t = setTimeout(() => done({ p, out, started: false }), 8000);
    p.stdout.on('data', (d) => { out += d; if (/Smart3D server:/.test(out)) done({ p, out, started: true }); });
    p.stderr.on('data', (d) => { out += d; });
    p.on('exit', (code) => done({ p, out, started: false, code }));
  });
}
const freePort = () => 30000 + Math.floor(Math.random() * 1000);
const api = (p, opts = {}) => fetch(base + p, {
  ...opts,
  headers: { 'content-type': 'application/json', ...(opts.headers || {}) }
});

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-test-'));
  const db = path.join(tmp, 'test.db');
  /* toza baza (smart3d.db gitga kirmaydi) — init-db orqali, admin paroli test uchun */
  execFileSync(process.execPath, ['init-db.js'], {
    cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: ADMIN_PW, ADMIN_EMAIL: 'Admin@Smart3D.uz' }, stdio: 'pipe'
  });
  const port = freePort();
  base = `http://127.0.0.1:${port}`;
  const r = await startServer({ PORT: String(port), DB_PATH: db, JWT_SECRET: SECRET, NODE_ENV: 'test' });
  assert.ok(r.started, 'server ishga tushmadi: ' + r.out);
  proc = r.p;
});
after(() => { proc && proc.kill(); fs.rmSync(tmp, { recursive: true, force: true }); });

test('health — faqat ok/uptime, ichki sonlar oshkor emas', async () => {
  const r = await api('/api/health');
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.ok, true);
  assert.equal(j.users, undefined);
});

test('obyekt email bilan server o\'chmaydi (400)', async () => {
  const r = await api('/api/register', { method: 'POST', body: JSON.stringify({ email: { x: 1 }, password: 'a' }) });
  assert.equal(r.status, 400);
  assert.equal((await api('/api/health')).status, 200, 'server tirik bo\'lishi kerak');
});

test('buzilgan JSON — 400, 500 emas', async () => {
  const r = await api('/api/login', { method: 'POST', body: '{"email":' });
  assert.equal(r.status, 400);
});

test('eski standart kalit bilan yasalgan admin token rad etiladi', async () => {
  const forged = jwt.sign({ id: 1, email: 'admin@smart3d.uz', role: 'admin' }, 'smart3d-secret-2026');
  const r = await api('/api/materials/10000440/price', {
    method: 'PUT', headers: { authorization: 'Bearer ' + forged }, body: JSON.stringify({ uzs: 1 })
  });
  assert.equal(r.status, 401);
});

test('login yozmasdan yozuvchi endpointlar — 401', async () => {
  for (const [m, p] of [['POST', '/api/remnants'], ['PUT', '/api/remnants/1/use'], ['GET', '/api/remnants'],
                        ['POST', '/api/ai/build'], ['POST', '/api/ai/voice'], ['POST', '/api/orders']]) {
    const r = await api(p, { method: m, body: m === 'GET' ? undefined : '{}' });
    assert.equal(r.status, 401, `${m} ${p}`);
  }
});

test('ro\'yxatdan o\'tish: kuchsiz parol va HTML ism rad etiladi; to\'g\'risi ishlaydi', async () => {
  const em = `t${Date.now()}@test.uz`;
  let r = await api('/api/register', { method: 'POST', body: JSON.stringify({ email: em, password: '123' }) });
  assert.equal(r.status, 400);
  r = await api('/api/register', { method: 'POST', body: JSON.stringify({ email: em, password: 'yaxshi-parol-1', name: '<img src=x onerror=alert(1)>' }) });
  assert.equal(r.status, 400);
  r = await api('/api/register', { method: 'POST', body: JSON.stringify({ email: em, password: 'yaxshi-parol-1', name: 'Usta', role: 'admin' }) });
  assert.equal(r.status, 200);
  const { token, user } = await r.json();
  assert.equal(user.role, 'user', 'role tanadan olinmasligi kerak');
  const p = jwt.verify(token, SECRET);
  assert.ok(p.exp - p.iat <= 12 * 3600, 'token muddati ≤ 12 soat');
  const me = await api('/api/me', { headers: { authorization: 'Bearer ' + token } });
  assert.equal(me.status, 200);
  /* oddiy foydalanuvchi sex omborini (qoldiqlar) o'zgartira olmaydi */
  const auth = { authorization: 'Bearer ' + token };
  assert.equal((await api('/api/remnants', { method: 'POST', headers: auth, body: JSON.stringify({ remnants: [{ len: 500, width: 300 }] }) })).status, 403);
  assert.equal((await api('/api/remnants/1/use', { method: 'PUT', headers: auth, body: '{}' })).status, 403);
  assert.equal((await api('/api/remnants', { headers: auth })).status, 200, 'o\'qish — mumkin');
  /* buyurtma izohida < > belgilari — oddiy matn, rad etilmaydi */
  const o = await api('/api/orders', { method: 'POST', headers: auth, body: JSON.stringify({ client_name: 'Ali', client_phone: '901234567', notes: "eni > 600 bo'lsa 2 eshik",
    placements: [{ id: 'p1', frg: 'MC-KP-02', x: 0, y: 0, z: 0, w: 600, d: 450, h: 708, rot: 0 }] }) });
  assert.equal(o.status, 200);
});

test('admin: aralash harfli email bilan kirish; qoldiqni faqat admin yozadi', async () => {
  for (const em of ['admin@smart3d.uz', 'ADMIN@Smart3D.uz']) {
    const r = await api('/api/login', { method: 'POST', body: JSON.stringify({ email: em, password: ADMIN_PW }) });
    assert.equal(r.status, 200, em);
  }
  const { token } = await (await api('/api/login', { method: 'POST', body: JSON.stringify({ email: 'admin@smart3d.uz', password: ADMIN_PW }) })).json();
  const auth = { authorization: 'Bearer ' + token };
  assert.equal((await api('/api/remnants', { method: 'POST', headers: auth, body: JSON.stringify({ remnants: [{ len: 'abc', width: 300 }] }) })).status, 400);
  assert.equal((await api('/api/remnants', { method: 'POST', headers: auth, body: JSON.stringify({ remnants: [{ len: 500, width: 300 }] }) })).status, 200);
});

test('materials: limit katta bo\'lsa 500 ga cheklanadi (400 emas)', async () => {
  const r = await api('/api/materials?limit=1000');
  assert.equal(r.status, 200);
  assert.ok((await r.json()).length <= 500);
});

test('ovoz: audio uchun soxta matn qaytarilmaydi (501)', async () => {
  const em = `v${Date.now()}@test.uz`;
  const { token } = await (await api('/api/register', { method: 'POST', body: JSON.stringify({ email: em, password: 'yaxshi-parol-2' }) })).json();
  const r = await api('/api/ai/voice', { method: 'POST', headers: { authorization: 'Bearer ' + token }, body: JSON.stringify({ audio_base64: 'AAAA' }) });
  assert.equal(r.status, 501);
});

test('CORS: begona sayt uchun ruxsat sarlavhasi yo\'q', async () => {
  const r = await api('/api/health', { headers: { origin: 'https://evil.example' } });
  assert.equal(r.headers.get('access-control-allow-origin'), null);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
});

test('noma\'lum API — 404 JSON', async () => {
  const r = await api('/api/yoq-endpoint');
  assert.equal(r.status, 404);
  assert.ok((await r.json()).error);
});

test('login brute-force: 15 daqiqada 10 ta xato urinishdan keyin 429', async () => {
  let got429 = false;
  for (let i = 0; i < 12; i++) {
    const r = await api('/api/login', { method: 'POST', body: JSON.stringify({ email: 'admin@smart3d.uz', password: 'notogri-' + i }) });
    if (r.status === 429) { got429 = true; break; }
  }
  assert.ok(got429);
});

test('production: JWT_SECRET siz server ishga tushmaydi', async () => {
  const r = await startServer({ PORT: String(freePort()), DB_PATH: path.join(tmp, 'test.db'), NODE_ENV: 'production', JWT_SECRET: '' });
  r.p.kill();
  assert.equal(r.started, false);
  assert.match(r.out, /JWT_SECRET/);
});
