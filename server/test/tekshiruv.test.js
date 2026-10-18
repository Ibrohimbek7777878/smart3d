/* Smart3D server — TZ-36 P8: server/tekshiruv.sh (yangilashdan keyingi tekshiruv, faqat GET). Vaqtinchalik server va baza.
 * Skript: sog'lom server — chiqish 0; noto'g'ri javob beruvchi soxta server — 1; hech kim tinglamaydigan port — 2. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKRIPT = path.join(SERVER_DIR, 'tekshiruv.sh');
const HAS_WEB = fs.existsSync(path.join(SERVER_DIR, '../web/dist/index.html'));
let tmp, proc, base;
const sorovlar = [];

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-tek-'));
  const db = path.join(tmp, 't.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: 'tekshiruv-test-9' }, stdio: 'pipe' });
  const port = 29000 + Math.floor(Math.random() * 900);
  base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), DB_PATH: db, JWT_SECRET: 'tek-test-' + 'k'.repeat(40), NODE_ENV: 'test' };
  proc = spawn(process.execPath, ['index.js'], { cwd: SERVER_DIR, env });
  await new Promise((resolve, reject) => {
    let out = '';
    const t = setTimeout(() => reject(new Error('server ishga tushmadi: ' + out)), 8000);
    proc.stdout.on('data', d => { out += d; if (/Smart3D server:/.test(out)) { clearTimeout(t); resolve(); } });
    proc.stderr.on('data', d => { out += d; });
  });
});
after(() => { proc && proc.kill(); fs.rmSync(tmp, { recursive: true, force: true }); });

const ishga = (url) => spawnSync('bash', [SKRIPT, url], { encoding: 'utf8', timeout: 60000 });

test('tekshiruv.sh: sog\'lom server — hammasi ✅, chiqish kodi 0 (web/dist qurilgan bo\'lsa)', { skip: !HAS_WEB && 'web/dist yo\'q (vite build kerak)' }, () => {
  const r = ishga(base);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /✅ Hammasi joyida/);
  assert.ok(!r.stdout.includes('❌'));
  for (const yol of ['/loyihalar', '/sozlamalar/narxlar', '/api/narxlar/tarix -> 401', 'Content-Security-Policy bor', 'nosniff', '/sw.js: Cache-Control', 'immutable']) assert.ok(r.stdout.includes(yol), yol);
});

test('tekshiruv.sh: faqat GET yuboradi (soxta serverda ko\'rinadi) va noto\'g\'ri javobda ❌, chiqish kodi 1', async () => {
  const srv = http.createServer((req, res) => { sorovlar.push(req.method); res.statusCode = req.url === '/api/health' ? 200 : 500; res.end('{"ok":true}'); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${srv.address().port}`;
  const r = await new Promise((resolve) => { const p = spawn('bash', [SKRIPT, url]); let out = ''; p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; }); p.on('exit', code => resolve({ status: code, out })); });
  srv.close();
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /❌/);
  assert.ok(sorovlar.length >= 10);
  assert.ok(sorovlar.every(m => m === 'GET'), 'faqat GET: ' + [...new Set(sorovlar)].join(','));
});

test('tekshiruv.sh: server yo\'q — chiqish kodi 2; noto\'g\'ri manzil — 2', () => {
  assert.equal(ishga('http://127.0.0.1:1').status, 2);
  assert.equal(ishga('smart3d.bittada.uz').status, 2);
});
