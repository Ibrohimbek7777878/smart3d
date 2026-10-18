/* Smart3D server — TZ-10: production rejimi (DEPLOY.md da'volari). Vaqtinchalik bazada. Ishga tushirish: npm test */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-prod-'));
const db = path.join(tmp, 'p.db');
execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: 'prod-test-parol-7' }, stdio: 'pipe' });
const procs = [];
after(() => { procs.forEach(p => p.kill()); fs.rmSync(tmp, { recursive: true, force: true }); });

function start(extra) {
  const port = 28000 + Math.floor(Math.random() * 1000);
  const env = { ...process.env, PORT: String(port), DB_PATH: db, NODE_ENV: 'production', ...extra };
  for (const k of ['ESKIZ_EMAIL', 'ESKIZ_PASSWORD', 'AI_PROVIDER', 'AI_API_KEY']) delete env[k];
  if (extra.JWT_SECRET === undefined) delete env.JWT_SECRET;
  const p = spawn(process.execPath, ['index.js'], { cwd: SERVER_DIR, env });
  procs.push(p);
  return new Promise((resolve) => {
    let out = '';
    const t = setTimeout(() => resolve({ started: false, out }), 8000);
    p.stdout.on('data', d => { out += d; if (/Smart3D server:/.test(out)) { clearTimeout(t); resolve({ started: true, base: `http://127.0.0.1:${port}` }); } });
    p.stderr.on('data', d => { out += d; });
    p.on('exit', code => { clearTimeout(t); resolve({ started: false, code, out }); });
  });
}

test('production: JWT_SECRET yo\'q yoki qisqa — ishga tushmaydi', async () => {
  for (const s of [undefined, 'qisqa']) {
    const r = await start({ JWT_SECRET: s });
    assert.equal(r.started, false);
    assert.match(r.out, /JWT_SECRET/);
  }
});

test('production: to\'g\'ri sozlamada ishlaydi; Eskiz sozlanmagan — SMS 503, dev_code yo\'q', async () => {
  const r = await start({ JWT_SECRET: 'prod-' + 'k'.repeat(48) });
  assert.ok(r.started, r.out);
  assert.equal((await (await fetch(r.base + '/api/health')).json()).ok, true);
  const s = await fetch(r.base + '/api/auth/sms/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: '998901234567' }) });
  assert.equal(s.status, 503);
  assert.equal((await s.json()).dev_code, undefined);
  /* TZ-23 C4: Eskiz yo'q — saytda SMS bilan kirish ko'rinmaydi */
  assert.deepEqual(await (await fetch(r.base + '/api/auth/usullar')).json(), { email: true, sms: false, google: false, googleClientId: '' });
});
