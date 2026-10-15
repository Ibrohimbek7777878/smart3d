/* TZ-09 Q7 / TZ-19 X11: sahifa yo'llari — yangi sayt "/" va "/app.html", eski sayt "/eski/", noma'lum sahifa 404,
 * kesh sarlavhalari. web/dist bo'lmasa (build qilinmagan) — o'tkaziladi. Ishga tushirish: npm test */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.join(__dirname, '..');
const DIST = path.join(SERVER_DIR, '../web/dist');
const HAS_WEB = fs.existsSync(path.join(DIST, 'index.html'));
let tmp, proc, base, out = '';

before(async () => {
  if (!HAS_WEB) return;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-sahifa-'));
  const db = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: 'test-admin-parol-1' }, stdio: 'pipe' });
  const port = 20000 + Math.floor(Math.random() * 20000);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['index.js'], { cwd: SERVER_DIR, env: { ...process.env, PORT: String(port), DB_PATH: db, JWT_SECRET: 's'.repeat(48), NODE_ENV: 'test' } });
  proc.stdout.on('data', d => { out += d; });
  proc.stderr.on('data', d => { out += d; });
  for (let i = 0; i < 100 && !/Smart3D server:/.test(out); i++) await new Promise(r => setTimeout(r, 100));
});
after(() => { if (proc) proc.kill(); if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); });

test('yangi sayt "/" va ilova "/app.html"; sahifa — no-cache', { skip: !HAS_WEB && 'web/dist yo\'q' }, async () => {
  const r = await fetch(base + '/');
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /\/assets\/main-/);
  assert.equal(r.headers.get('cache-control'), 'no-cache');
  const a = await (await fetch(base + '/app.html')).text();
  assert.match(a, /\/assets\/app-/);
  assert.match(a, /noindex/);
});

test('assets — o\'zgarmas kesh (1 yil); ma\'lumot (narx) va service worker — no-cache', { skip: !HAS_WEB && 'web/dist yo\'q' }, async () => {
  const js = fs.readdirSync(path.join(DIST, 'assets')).find(f => f.endsWith('.js'));
  assert.equal((await fetch(base + '/assets/' + js)).headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.equal((await fetch(base + '/data/materials.json')).headers.get('cache-control'), 'no-cache');
  assert.equal((await fetch(base + '/sw.js')).headers.get('cache-control'), 'no-cache');
});

test('eski sayt "/eski/" da (2 hafta zaxira) — importmap bilan, CSP ostida', { skip: !HAS_WEB && 'web/dist yo\'q' }, async () => {
  const r = await fetch(base + '/eski/');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /type="importmap"/);
  assert.ok(r.headers.get('content-security-policy'));
  assert.equal((await fetch(base + '/eski/js/app.js')).status, 200);
  assert.equal((await fetch(base + '/eski', { redirect: 'manual' })).status, 301);
});

test('noma\'lum sahifa — 404 (dizayndagi sahifa), noma\'lum API — JSON 404', { skip: !HAS_WEB && 'web/dist yo\'q' }, async () => {
  const r = await fetch(base + '/yoq-sahifa');
  assert.equal(r.status, 404);
  assert.match(await r.text(), /Sahifa topilmadi/);
  const a = await fetch(base + '/api/yoq');
  assert.equal(a.status, 404);
  assert.equal((await a.json()).code, 'S3D-SRV-002');
});
