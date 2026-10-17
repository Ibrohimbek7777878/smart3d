/* TZ-31 A: Google bilan kirish — soxta JWKS (testda yaratilgan RSA kalit), haqiqiy tarmoq kerak emas. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';

const SERVER_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CID = 'test-client.apps.googleusercontent.com';
let tmp, proc, proc2, base, base2, jwks;
const A = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const B = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });   // begona kalit (imzo buzilgan holat)
const jwk = { ...A.publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };

const token = (o = {}, key = A.privateKey) => jwt.sign({
  iss: 'https://accounts.google.com', aud: CID, sub: 'g-123', email: 'google1@example.com', email_verified: true, name: 'Test Google', ...o
}, key, { algorithm: 'RS256', keyid: 'k1', ...(o.exp ? {} : { expiresIn: 600 }) });

async function start(env) {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const p = spawn(process.execPath, ['index.js'], { cwd: SERVER_DIR, env: { ...process.env, PORT: String(port), DB_PATH: path.join(tmp, 'test.db'), JWT_SECRET: 'g-test-' + 'z'.repeat(40), NODE_ENV: 'test', ...env } });
  await new Promise((resolve, reject) => {
    let out = ''; const t = setTimeout(() => reject(new Error('server ishga tushmadi: ' + out)), 8000);
    p.stdout.on('data', d => { out += d; if (/Smart3D server:/.test(out)) { clearTimeout(t); resolve(); } });
    p.stderr.on('data', d => { out += d; });
  });
  return [p, `http://127.0.0.1:${port}`];
}

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-goog-'));
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: path.join(tmp, 'test.db'), ADMIN_PASSWORD: 'test-admin-parol-2', ADMIN_EMAIL: 'admin@smart3d.uz' }, stdio: 'pipe' });
  jwks = http.createServer((q, r) => { r.setHeader('cache-control', 'public, max-age=3600'); r.setHeader('content-type', 'application/json'); r.end(JSON.stringify({ keys: [jwk] })); });
  await new Promise(r => jwks.listen(0, '127.0.0.1', r));
  const jurl = `http://127.0.0.1:${jwks.address().port}/certs`;
  [proc, base] = await start({ GOOGLE_CLIENT_ID: CID, GOOGLE_JWKS_URL: jurl });
  [proc2, base2] = await start({ GOOGLE_CLIENT_ID: '' });
});
after(() => { proc && proc.kill(); proc2 && proc2.kill(); jwks && jwks.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const post = (b, body, h = {}) => fetch(b + '/api/auth/google', { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(body) });

test('to\'g\'ri token → 200, yangi foydalanuvchi, httpOnly cookie, kalit javobda yo\'q (sessiya: cookie)', async () => {
  const r = await post(base, { credential: token(), sessiya: 'cookie' });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.user.email, 'google1@example.com'); assert.equal(j.yangi, true); assert.equal(j.token, undefined);
  const ck = r.headers.get('set-cookie') || '';
  assert.match(ck, /HttpOnly/i);
  const me = await fetch(base + '/api/me', { headers: { cookie: ck.split(';')[0] } });
  assert.equal(me.status, 200);
  const r2 = await post(base, { credential: token(), sessiya: 'cookie' });          // qayta kirish — yangi emas
  assert.equal((await r2.json()).yangi, false);
});

test('usullar: google va googleClientId', async () => {
  const j = await (await fetch(base + '/api/auth/usullar')).json();
  assert.equal(j.google, true); assert.equal(j.googleClientId, CID);
  const k = await (await fetch(base2 + '/api/auth/usullar')).json();
  assert.equal(k.google, false);
});

test('mavjud email — shu akkauntga kirish (google_sub bog\'lanadi), parol bilan kirish saqlanadi', async () => {
  const reg = await fetch(base + '/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'mavjud@example.com', password: 'parol-12345', name: 'Mavjud' }) });
  const id = (await reg.json()).user.id;
  const r = await post(base, { credential: token({ email: 'Mavjud@Example.com', sub: 'g-777' }) });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.user.id, id); assert.equal(j.yangi, false);
  assert.equal((await fetch(base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'mavjud@example.com', password: 'parol-12345' }) })).status, 200);
  const x = await post(base, { credential: token({ email: 'mavjud@example.com', sub: 'g-boshqa' }) });   // boshqa Google shu emailga
  assert.equal(x.status, 409); assert.equal((await x.json()).code, 'S3D-AUTH-018');
});

test('rad etiladi: noto\'g\'ri aud, eskirgan, email_verified=false, buzilgan imzo, noto\'g\'ri issuer, bo\'sh', async () => {
  const kutilgan = [
    [token({ aud: 'boshqa' }), 401, 'S3D-AUTH-017'],
    [token({ exp: Math.floor(Date.now() / 1000) - 60 }), 401, 'S3D-AUTH-017'],
    [token({ email_verified: false }), 403, 'S3D-AUTH-019'],
    [token({}, B.privateKey), 401, 'S3D-AUTH-017'],
    [token({ iss: 'https://evil.example' }), 401, 'S3D-AUTH-017'],
    ['', 401, 'S3D-AUTH-017'],
    ['a.b.c', 401, 'S3D-AUTH-017']
  ];
  for (const [c, st, code] of kutilgan) {
    const r = await post(base, { credential: c });
    assert.equal(r.status, st, code + ' / ' + c.slice(0, 20)); assert.equal((await r.json()).code, code);
  }
  const bad = await post(base, { credential: token().slice(0, -6) + 'AAAAAA' });   // imzo buzildi
  assert.equal(bad.status, 401);
});

test('GOOGLE_CLIENT_ID yo\'q → 503 S3D-AUTH-016', async () => {
  const r = await post(base2, { credential: token() });
  assert.equal(r.status, 503); assert.equal((await r.json()).code, 'S3D-AUTH-016');
});

test('CSP: Google Identity Services uchun faqat kerakli manbalar', async () => {
  const c = (await fetch(base + '/index.html')).headers.get('content-security-policy') || '';
  assert.match(c, /script-src [^;]*https:\/\/accounts\.google\.com\/gsi\/client/);
  assert.match(c, /frame-src https:\/\/accounts\.google\.com\/gsi\//);
  assert.match(c, /connect-src [^;]*https:\/\/accounts\.google\.com\/gsi\//);
});
