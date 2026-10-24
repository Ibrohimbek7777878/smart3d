/* Smart3D server — TZ-57: Bazis plitasi → ERP plitasi tanlovi xotirasi (/api/plita-moslash). Vaqtinchalik bazada (S8), SMS yuborilmaydi (dev_code). */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.join(__dirname, '..');
let tmp, proc, base;

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-pm-'));
  const db = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: 'test-admin-parol-3', ADMIN_EMAIL: 'admin@smart3d.uz' }, stdio: 'pipe' });
  const port = 36000 + Math.floor(Math.random() * 900);
  base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), DB_PATH: db, JWT_SECRET: 'pm-test-' + 'z'.repeat(40), NODE_ENV: 'test' };
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
after(() => { proc && proc.kill(); fs.rmSync(tmp, { recursive: true, force: true }); });

const api = (p, { method = 'GET', body, token } = {}) => fetch(base + p, {
  method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
  body: body ? JSON.stringify(body) : undefined
});
async function login(tel) {
  const { dev_code } = await (await api('/api/auth/sms/send', { method: 'POST', body: { phone: tel } })).json();
  return (await (await api('/api/auth/sms/verify', { method: 'POST', body: { phone: tel, code: dev_code, name: 'Usta' } })).json()).token;
}

test('plita moslash: login kerak; saqlash, ro\'yxat, qayta yozish, o\'chirish — har foydalanuvchining o\'zi', async () => {
  for (const m of ['GET', 'PUT', 'DELETE']) assert.equal((await api('/api/plita-moslash' + (m === 'DELETE' ? '?kalit=x' : ''), { method: m, body: m === 'PUT' ? { kalit: 'x', kod: 'ERP-1' } : undefined })).status, 401, m);
  const a = await login('998901220001'), b = await login('998901220002');
  assert.deepEqual(await (await api('/api/plita-moslash', { token: a })).json(), { items: {} });

  const put = await api('/api/plita-moslash', { method: 'PUT', token: a, body: { kalit: 'egger16|16', kod: 'ERP-18a', nom: 'ЛДСП Egger 16' } });
  assert.equal(put.status, 200);
  assert.deepEqual((await (await api('/api/plita-moslash', { token: a })).json()).items, { 'egger16|16': { kod: 'ERP-18a', nom: 'ЛДСП Egger 16' } });
  assert.deepEqual((await (await api('/api/plita-moslash', { token: b })).json()).items, {}, 'boshqa foydalanuvchi ko\'rmaydi');

  await api('/api/plita-moslash', { method: 'PUT', token: a, body: { kalit: 'egger16|16', kod: 'ERP-19b', nom: 'Yangi' } });
  const qayta = (await (await api('/api/plita-moslash', { token: a })).json()).items;
  assert.equal(Object.keys(qayta).length, 1, 'bir kalit — bitta yozuv (qayta yozildi)');
  assert.equal(qayta['egger16|16'].kod, 'ERP-19b');

  assert.equal((await (await api('/api/plita-moslash?kalit=egger16|16', { method: 'DELETE', token: b })).json()).ochirildi, 0, 'boshqaning yozuvini o\'chirib bo\'lmaydi');
  assert.equal((await (await api('/api/plita-moslash?kalit=' + encodeURIComponent('egger16|16'), { method: 'DELETE', token: a })).json()).ochirildi, 1);
  assert.deepEqual((await (await api('/api/plita-moslash', { token: a })).json()).items, {});
});

test('plita moslash: kod ERP-… ko\'rinishida bo\'lishi shart, kalit/kod bo\'sh bo\'lmaydi (xato 400)', async () => {
  const a = await login('998901220003');
  for (const body of [
    { kalit: 'k|16', kod: 'LDSP16' }, { kalit: 'k|16', kod: 'ERP-' }, { kalit: 'k|16', kod: 'ERP-<script>' }, { kalit: 'k|16', kod: "ERP-1'; DROP TABLE x;--" },
    { kalit: '', kod: 'ERP-1' }, { kod: 'ERP-1' }, { kalit: 'k|16' }, { kalit: 'x'.repeat(161), kod: 'ERP-1' }
  ]) {
    const r = await api('/api/plita-moslash', { method: 'PUT', token: a, body });
    assert.equal(r.status, 400, JSON.stringify(body).slice(0, 60));
  }
  assert.deepEqual((await (await api('/api/plita-moslash', { token: a })).json()).items, {}, 'noto\'g\'ri so\'rovlar hech narsa saqlamaydi');
});
