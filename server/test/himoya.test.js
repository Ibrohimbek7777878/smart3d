/* TZ-19 §3: hujum testlari — CSP, httpOnly cookie va CSRF, "Chiqish" kalitni bekor qiladi, akkaunt bloklash, XSS va buzilgan
 * hujjat, bcrypt 12, so'rovlar chegarasi, WebSocket (Origin, ulanishlar soni). Ishga tushirish: npm test (vaqtinchalik baza). */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import WebSocket from 'ws';
import { docXatosi, csp, PRINT_SCRIPT } from '../himoya.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.join(__dirname, '..');
const ADMIN_PW = 'test-admin-parol-1';
let tmp, proc, base, port, dbFile, out = '';

const api = (p, opts = {}) => fetch(base + p, { ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) } });
const sessCookie = (r) => { const c = (r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get('set-cookie')]).find(x => x && x.startsWith('s3d_sess=')); return c || ''; };
const cookieHdr = (setCookie) => setCookie.split(';')[0];
const uniq = () => Date.now() + Math.random().toString(36).slice(2, 7);

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-himoya-'));
  dbFile = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: dbFile, ADMIN_PASSWORD: ADMIN_PW, ADMIN_EMAIL: 'admin@smart3d.uz' }, stdio: 'pipe' });
  port = 26000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['index.js'], { cwd: SERVER_DIR, env: { ...process.env, PORT: String(port), DB_PATH: dbFile, JWT_SECRET: 'h'.repeat(48), NODE_ENV: 'test' } });
  proc.stdout.on('data', d => { out += d; });
  proc.stderr.on('data', d => { out += d; });
  for (let i = 0; i < 100 && !/Smart3D server:/.test(out); i++) await new Promise(r => setTimeout(r, 100));
  assert.match(out, /Smart3D server:/, 'server ishga tushmadi: ' + out);
});
after(() => { proc && proc.kill(); fs.rmSync(tmp, { recursive: true, force: true }); });

async function registerCookie() {
  const email = `h${uniq()}@test.uz`;
  const r = await api('/api/register', { method: 'POST', headers: { 'sec-fetch-site': 'same-origin' }, body: JSON.stringify({ email, password: 'yaxshi-parol-1', name: 'Usta', sessiya: 'cookie' }) });
  return { r, j: await r.json(), email };
}

test('X1: CSP va xavfsizlik sarlavhalari — sahifa va API; importmap faqat xeshi bilan', async () => {
  for (const p of ['/index.html', '/api/health']) {
    const r = await api(p);
    const c = r.headers.get('content-security-policy') || '';
    assert.match(c, /default-src 'self'/, p);
    assert.match(c, /script-src 'self' 'sha256-[A-Za-z0-9+/=]+'/, p + ': importmap xeshi');
    assert.match(c, /object-src 'none'/);
    assert.match(c, /frame-ancestors 'none'/);
    assert.ok(!/script-src[^;]*unsafe-inline/.test(c), 'skriptga unsafe-inline yo\'q');
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
    assert.equal(r.headers.get('cross-origin-opener-policy'), 'same-origin-allow-popups');
    assert.equal(r.headers.get('strict-transport-security'), null, 'HSTS faqat production\'da');
  }
  assert.equal((await api('/index.html')).headers.get('cache-control'), 'no-cache');
  assert.match(csp({ upgrade: true }), /upgrade-insecure-requests/);
  /* hisobot oynasidagi chop etish skripti — ikkala saytda ham aynan shu matn (xesh mos kelishi uchun) */
  for (const f of ['../../web/src/services/eksport.js', '../../app/js/app.js']) assert.ok(fs.readFileSync(path.join(__dirname, f), 'utf8').includes('<script>' + PRINT_SCRIPT + '</script>'), f);
});

test('X2: cookie sessiya — kalit javobda yo\'q, cookie httpOnly + SameSite=Strict; cookie bilan /api/me ishlaydi', async () => {
  const { r, j } = await registerCookie();
  assert.equal(r.status, 200);
  assert.equal(j.token, undefined, 'yangi sayt kalitni ko\'rmaydi');
  const sc = sessCookie(r);
  assert.match(sc, /HttpOnly/i);
  assert.match(sc, /SameSite=Strict/i);
  assert.match(sc, /Path=\//);
  const me = await api('/api/me', { headers: { cookie: cookieHdr(sc) } });
  assert.equal(me.status, 200);
  /* eski sayt (Bearer) — o'tish davrida ishlayveradi */
  const old = await (await api('/api/login', { method: 'POST', body: JSON.stringify({ email: 'admin@smart3d.uz', password: ADMIN_PW }) })).json();
  assert.ok(old.token);
});

test('X2: CSRF — cookie bilan begona saytdan yozish rad etiladi, o\'z saytidan o\'tadi', async () => {
  const { r } = await registerCookie();
  const ck = cookieHdr(sessCookie(r));
  const body = JSON.stringify({ markup_pct: 0.4 });
  const evil = await api('/api/settings', { method: 'PUT', headers: { cookie: ck, origin: 'https://evil.example' }, body });
  assert.equal(evil.status, 403);
  assert.equal((await evil.json()).code, 'S3D-AUTH-009');
  assert.equal((await api('/api/settings', { method: 'PUT', headers: { cookie: ck, 'sec-fetch-site': 'cross-site' }, body })).status, 403);
  assert.equal((await api('/api/settings', { method: 'PUT', headers: { cookie: ck }, body })).status, 403, 'Origin ham, Sec-Fetch-Site ham yo\'q');
  assert.equal((await api('/api/settings', { method: 'PUT', headers: { cookie: ck, origin: base }, body })).status, 200);
  assert.equal((await api('/api/settings', { method: 'PUT', headers: { cookie: ck, 'sec-fetch-site': 'same-origin' }, body })).status, 200);
  assert.equal((await api('/api/settings', { headers: { cookie: ck, origin: 'https://evil.example' } })).status, 200, 'o\'qish (GET) — CSRF xavfi yo\'q');
});

test('X3: "Chiqish" — shu kalit bekor; "hammasi" — barcha qurilmalarda', async () => {
  const email = `x${uniq()}@test.uz`;
  const reg = await (await api('/api/register', { method: 'POST', body: JSON.stringify({ email, password: 'yaxshi-parol-1' }) })).json();
  const login = async () => (await (await api('/api/login', { method: 'POST', body: JSON.stringify({ email, password: 'yaxshi-parol-1' }) })).json()).token;
  const t1 = reg.token, t2 = await login(), t3 = await login();
  const H = (t) => ({ authorization: 'Bearer ' + t });
  assert.equal((await api('/api/logout', { method: 'POST', headers: H(t1), body: '{}' })).status, 200);
  assert.equal((await api('/api/me', { headers: H(t1) })).status, 401, 'chiqqan kalit');
  assert.equal((await api('/api/me', { headers: H(t2) })).status, 200, 'boshqa qurilma — ishlaydi');
  await api('/api/logout', { method: 'POST', headers: H(t2), body: JSON.stringify({ hammasi: true }) });
  assert.equal((await api('/api/me', { headers: H(t3) })).status, 401, 'hammasi — uchinchi qurilma ham chiqdi');
  const t4 = await login();
  assert.equal((await api('/api/me', { headers: H(t4) })).status, 200, 'qayta kirish ishlaydi');
});

test('X4: 5 xato paroldan keyin akkaunt 15 daqiqaga bloklanadi (to\'g\'ri parol ham), jurnalda S3D-AUTH-008', async () => {
  const email = `l${uniq()}@test.uz`;
  await api('/api/register', { method: 'POST', body: JSON.stringify({ email, password: 'yaxshi-parol-1' }) });
  for (let i = 0; i < 5; i++) assert.equal((await api('/api/login', { method: 'POST', body: JSON.stringify({ email, password: 'xato-' + i }) })).status, 401);
  const r = await api('/api/login', { method: 'POST', body: JSON.stringify({ email, password: 'yaxshi-parol-1' }) });
  assert.equal(r.status, 423);
  const j = await r.json();
  assert.equal(j.code, 'S3D-AUTH-008');
  assert.ok(j.retry_after > 800);
  assert.match(out, /S3D-AUTH-008/);
});

test('X7: XSS va buzilgan loyiha hujjati — 400; prototip ifloslantirish — 400', async () => {
  const { r } = await registerCookie();
  const H = { cookie: cookieHdr(sessCookie(r)), 'sec-fetch-site': 'same-origin' };
  const doc = (extra) => ({ app: 'smart3d', v: 2, doc: { room: { outline: [[0, 0], [3000, 0], [3000, 3000], [0, 3000]] }, placements: [{ id: 'p1', frg: 'MC-KP-02', x: 0, y: 0, w: 600, d: 450, h: 708, ...extra }] } });
  const post = (b) => api('/api/projects', { method: 'POST', headers: H, body: typeof b === 'string' ? b : JSON.stringify(b) });
  assert.equal((await post({ name: 'Oshxona', doc: doc() })).status, 200, 'to\'g\'ri hujjat');
  assert.equal((await post({ name: '<img src=x onerror=alert(1)>', doc: doc() })).status, 400, 'nom');
  assert.equal((await post({ name: 'A', client: '<script>alert(1)</script>', doc: doc() })).status, 400, 'mijoz');
  assert.equal((await post({ name: 'A', doc: doc({ name: '<svg onload=alert(1)>' }) })).status, 400, 'hujjat ichidagi matn');
  assert.equal((await post({ name: 'A', doc: doc({ w: 'katta' }) })).status, 400, 'o\'lcham son emas');
  assert.equal((await post({ name: 'A', doc: doc({ w: 1e300 }) })).status, 400, 'juda katta son');
  assert.equal((await post('{"name":"A","doc":{"app":"smart3d","doc":{"room":{"outline":[[0,0],[1,0],[1,1]]},"placements":[{"__proto__":{"admin":true}}]}}}')).status, 400, '__proto__');
  let deep = {}; const root = deep; for (let i = 0; i < 30; i++) deep = deep.a = {};
  assert.equal((await post({ name: 'A', doc: { ...doc(), extra: root } })).status, 400, 'juda chuqur');
  assert.equal((await post({ name: 'A', doc: { app: 'smart3d', doc: { room: { outline: [[0, 0]] }, placements: [] } } })).status, 400, 'xona 1 nuqta');
  assert.equal(docXatosi({ room: { outline: [[0, 0], [1, 0], [1, 1]] }, placements: [], ts: Date.now() }), null, 'vaqt belgisi (ts) — to\'g\'ri');
});

test('X10: yangi parol bcrypt 12; eski (10) xesh kirishda yangilanadi', async () => {
  const { email } = await registerCookie();
  const db = new Database(dbFile);
  assert.match(db.prepare('SELECT password_hash FROM users WHERE email = ?').get(email).password_hash, /^\$2[aby]\$12\$/);
  const old = `o${uniq()}@test.uz`;
  db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run('Eski', old, bcrypt.hashSync('eski-parol-123', 10), 'user');
  db.close();
  assert.equal((await api('/api/login', { method: 'POST', body: JSON.stringify({ email: old, password: 'eski-parol-123' }) })).status, 200);
  const db2 = new Database(dbFile);
  assert.match(db2.prepare('SELECT password_hash FROM users WHERE email = ?').get(old).password_hash, /^\$2[aby]\$12\$/);
  db2.close();
});

test('X6: WebSocket — begona Origin rad etiladi, bir IP dan 5 tadan ortiq ulanish yo\'q', async () => {
  const open = (origin) => new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, origin ? { origin } : {});
    ws.on('message', () => resolve({ ok: true, ws }));
    ws.on('unexpected-response', (req, res) => resolve({ ok: false, status: res.statusCode }));
    ws.on('error', () => resolve({ ok: false }));
  });
  const evil = await open('https://evil.example');
  assert.equal(evil.ok, false);
  assert.equal(evil.status, 403);
  const conns = [];
  for (let i = 0; i < 5; i++) { const c = await open(base); assert.ok(c.ok, 'ulanish ' + (i + 1)); conns.push(c.ws); }
  const sixth = await open(base);
  assert.equal(sixth.ok, false);
  assert.equal(sixth.status, 429);
  conns.forEach(w => w.close());
});

test('X5: yozish — foydalanuvchiga daqiqasiga 60; umumiy — IP ga daqiqasiga 300 (oxirida: chegara tugaydi)', async () => {
  const { r } = await registerCookie();
  const H = { cookie: cookieHdr(sessCookie(r)), 'sec-fetch-site': 'same-origin' };
  let w429 = 0;
  for (let i = 0; i < 65; i++) if ((await api('/api/settings', { method: 'PUT', headers: H, body: '{}' })).status === 429) w429++;
  assert.ok(w429 >= 4, 'yozish chegarasi: ' + w429);
  let g429 = false;
  for (let i = 0; i < 320 && !g429; i++) if ((await api('/api/health')).status === 429) g429 = true;
  assert.ok(g429, 'umumiy chegara');
});
