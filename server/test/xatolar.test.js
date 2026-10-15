/* TZ-19 §2: xato kodlari va jurnal — har xato javobida kod va rid, brauzer xatosi jurnalga yoziladi, shaxsiy ma'lumot niqoblanadi,
 * jurnalni faqat admin ko'radi. Ishga tushirish: npm test (vaqtinchalik bazada). */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { XATOLAR } from '../../app/js/xatolar.js';
import { niqob } from '../jurnal.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.join(__dirname, '..');
const ADMIN_PW = 'test-admin-parol-1';
let tmp, proc, base, out = '';

const api = (p, opts = {}) => fetch(base + p, { ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) } });
const bearer = (t) => ({ authorization: 'Bearer ' + t });

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-xato-'));
  const db = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: ADMIN_PW, ADMIN_EMAIL: 'admin@smart3d.uz' }, stdio: 'pipe' });
  const port = 20000 + Math.floor(Math.random() * 20000);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['index.js'], { cwd: SERVER_DIR, env: { ...process.env, PORT: String(port), DB_PATH: db, JWT_SECRET: 'x'.repeat(48), NODE_ENV: 'test' } });
  proc.stdout.on('data', d => { out += d; });
  proc.stderr.on('data', d => { out += d; });
  for (let i = 0; i < 80 && !/Smart3D server:/.test(out); i++) await new Promise(r => setTimeout(r, 100));
  assert.match(out, /Smart3D server:/, 'server ishga tushmadi: ' + out);
});
after(() => { proc && proc.kill(); fs.rmSync(tmp, { recursive: true, force: true }); });

async function login(email, password) {
  const r = await api('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  return (await r.json()).token;
}
async function register() {
  const r = await api('/api/register', { method: 'POST', body: JSON.stringify({ email: `x${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.uz`, password: 'yaxshi-parol-1', name: 'Usta' }) });
  return (await r.json()).token;
}

test('kodlar ro\'yxati: shakl S3D-XXX-NNN, server kodlarida HTTP status bor', () => {
  for (const [k, v] of Object.entries(XATOLAR)) {
    assert.match(k, /^S3D-[A-Z]{2,6}-\d{3}$/, k);
    assert.ok(v.matn, k + ' matni');
    if (+k.slice(-3) < 100) assert.ok(v.http >= 400 && v.http < 600, k + ' http');
  }
});

test('xato javobi: error + code + rid, sarlavhada X-Request-Id', async () => {
  const r = await api('/api/projects');
  assert.equal(r.status, 401);
  const j = await r.json();
  assert.equal(j.code, 'S3D-AUTH-004');
  assert.ok(j.error);
  assert.match(j.rid, /^[a-f0-9]{12}$/);
  assert.equal(r.headers.get('x-request-id'), j.rid);
  const nf = await (await api('/api/yoq-endpoint')).json();
  assert.equal(nf.code, 'S3D-SRV-002');
  const v = await (await api('/api/register', { method: 'POST', body: JSON.stringify({ email: 'x@test.uz', password: '1' }) })).json();
  assert.equal(v.code, 'S3D-VAL-001');
  assert.equal((await (await api('/api/login', { method: 'POST', body: '{"a":' })).json()).code, 'S3D-VAL-002');
  assert.equal((await (await api('/api/login', { method: 'POST', body: JSON.stringify({ email: 'yoq@test.uz', password: 'notogri-parol' }) })).json()).code, 'S3D-AUTH-001');
});

test('brauzer xatosi: /api/log qabul qiladi (204), noto\'g\'risi — S3D-LOG-001, katta — 413', async () => {
  let r = await api('/api/log', { method: 'POST', body: JSON.stringify({ code: 'S3D-EXP-101', modul: 'editor/files', sahifa: 'app.html', xabar: 'dxf: test' }) });
  assert.equal(r.status, 204);
  r = await api('/api/log', { method: 'POST', body: JSON.stringify({ code: 'salom' }) });
  assert.equal((await r.json()).code, 'S3D-LOG-001');
  r = await api('/api/log', { method: 'POST', body: JSON.stringify({ code: 'S3D-JS-101', parol: 'x' }) });
  assert.equal(r.status, 400, 'ruxsat etilmagan maydon');
  r = await api('/api/log', { method: 'POST', body: JSON.stringify({ code: 'S3D-JS-101', xabar: 'a'.repeat(6000) }) });
  assert.equal(r.status, 413);
});

test('jurnal: faqat admin; kod bo\'yicha guruh; rid bo\'yicha topiladi; email va telefon niqoblangan', async () => {
  const user = await register();
  assert.equal((await api('/api/admin/xatolar', { headers: bearer(user) })).status, 403);
  assert.equal((await api('/api/admin/xatolar')).status, 401);
  await api('/api/log', { method: 'POST', body: JSON.stringify({ code: 'S3D-CALC-101', modul: 'editor', xabar: 'usta jasur@mail.uz 998901234567 hisob' }) });
  const bad = await (await api('/api/projects/999999', { headers: bearer(user) })).json();
  const admin = await login('admin@smart3d.uz', ADMIN_PW);
  const j = await (await api('/api/admin/xatolar', { headers: bearer(admin) })).json();
  const calc = j.guruhlar.find(g => g.code === 'S3D-CALC-101');
  assert.ok(calc && calc.source === 'web' && calc.n >= 1, 'brauzer xatosi guruhda');
  assert.ok(!/jasur@mail\.uz|901234567/.test(calc.msg), 'niqoblangan: ' + calc.msg);
  assert.ok(j.guruhlar.find(g => g.code === 'S3D-AUTH-006'), '403 (xavfsizlik) bazada');
  /* 404 bazaga yozilmaydi (faqat stdout), lekin rid stdout jurnalida bor */
  assert.ok(out.includes(bad.rid), 'rid stdout jurnalida');
  const byRid = await (await api('/api/admin/xatolar?rid=' + j.oxirgi[0].rid, { headers: bearer(admin) })).json();
  assert.ok(byRid.oxirgi.length >= 1 && byRid.oxirgi.every(x => x.rid === j.oxirgi[0].rid));
  assert.equal((await api('/api/admin/xatolar?rid=<script>', { headers: bearer(admin) })).status, 400);
});

test('jurnal satri: JSON, parol va token yozilmaydi', async () => {
  await api('/api/login', { method: 'POST', body: JSON.stringify({ email: 'admin@smart3d.uz', password: 'maxfiy-notogri-parol' }) });
  await api('/api/projects', { headers: bearer('eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MX0.abc') });
  assert.ok(!out.includes('maxfiy-notogri-parol'), 'parol jurnalda');
  assert.ok(!out.includes('eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MX0.abc'), 'token jurnalda');
  const lines = out.split('\n').filter(l => l.startsWith('{'));
  assert.ok(lines.length > 3);
  for (const l of lines) JSON.parse(l);
  assert.equal(niqob('Bearer eyJa.eyJb.c x@y.uz 998901234567'), 'Bearer [token] x***@y.uz 99890*****67');
});
