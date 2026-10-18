/* Smart3D server — TZ-24 B: shaxsiy shablonlar (/api/shablonlar). Vaqtinchalik bazada (S8), SMS yuborilmaydi (dev_code). */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.join(__dirname, '..');
let tmp, proc, base, dbPath;

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-shb-'));
  const db = dbPath = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: 'test-admin-parol-3', ADMIN_EMAIL: 'admin@smart3d.uz' }, stdio: 'pipe' });
  const port = 31000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), DB_PATH: db, JWT_SECRET: 'shb-test-' + 'z'.repeat(40), NODE_ENV: 'test' };
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
const LOYIHA = { doc: { room: { outline: [[0, 0], [3000, 0], [3000, 2500], [0, 2500]] }, placements: [{ id: 'p1', frg: 'MC-KP-02', x: 0, y: 0, z: 100, w: 600, d: 450, h: 708 }] } };

test('shablon: login kerak; saqlash, ro\'yxat, o\'chirish — faqat o\'zi', async () => {
  assert.equal((await api('/api/shablonlar')).status, 401);
  const a = await login('998901110001'), b = await login('998901110002');
  const s1 = await api('/api/shablonlar', { method: 'POST', token: a, body: { tur: 'prompt', nom: 'Mening oshxonam', data: { promptId: 'oshxona-l', qiymatlar: { eni: 3800, chuqurligi: 3000 } } } });
  assert.equal(s1.status, 200);
  const s2 = await api('/api/shablonlar', { method: 'POST', token: a, body: { tur: 'loyiha', nom: 'Namuna', data: LOYIHA } });
  assert.equal(s2.status, 200);
  const ro = await (await api('/api/shablonlar', { token: a })).json();
  assert.equal(ro.length, 2);
  assert.equal(ro[0].nom, 'Namuna');
  assert.equal(ro[1].data.qiymatlar.eni, 3800);
  assert.equal((await (await api('/api/shablonlar', { token: b })).json()).length, 0, 'boshqa foydalanuvchi ko\'rmaydi');
  const { id } = await s1.json();
  assert.equal((await api('/api/shablonlar/' + id, { method: 'DELETE', token: b })).status, 404, 'boshqasi o\'chira olmaydi');
  assert.equal((await api('/api/shablonlar/' + id, { method: 'DELETE', token: a })).status, 200);
  assert.equal((await (await api('/api/shablonlar', { token: a })).json()).length, 1);
});

test('shablon: noto\'g\'ri tur, HTML nom, buzuq loyiha — 400; 100 dan ortig\'i — 409', async () => {
  const a = await login('998901110003');
  const yubor = (body) => api('/api/shablonlar', { method: 'POST', token: a, body });
  assert.equal((await yubor({ tur: 'boshqa', nom: 'x', data: {} })).status, 400);
  assert.equal((await yubor({ tur: 'prompt', nom: '<b>x</b>', data: { matn: 'a' } })).status, 400);
  assert.equal((await yubor({ tur: 'loyiha', nom: 'x', data: { doc: { room: {} } } })).status, 400);
  assert.equal((await yubor({ tur: 'prompt', nom: 'x', data: { matn: '<script>alert(1)</script>' } })).status, 400);
  /* 100 ta — to'g'ridan bazaga (API'da umumiy so'rov chegarasi bor) */
  const uid = (await (await api('/api/me', { token: a })).json()).id;
  const d = new Database(dbPath);
  const ins = d.prepare('INSERT INTO user_items (user_id, tur, nom, data_json) VALUES (?, ?, ?, ?)');
  for (let i = 0; i < 100; i++) ins.run(uid, 'prompt', 'S' + i, '{"matn":"oshxona 3x3"}');
  d.close();
  const r = await yubor({ tur: 'prompt', nom: 'ortiqcha', data: { matn: 'a' } });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, 'S3D-SHB-002');
});
