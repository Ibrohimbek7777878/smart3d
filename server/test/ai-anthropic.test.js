/* Smart3D server — TZ-12: Claude yo'li (rasmiy SDK) so'rov shakli. Haqiqiy API chaqirilmaydi (5.1):
 * SDK ANTHROPIC_BASE_URL orqali soxta serverga yuboradi. Ishga tushirish: npm test */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.join(__dirname, '..');
let tmp, proc, base, mock, reply = 'ok';
const seen = [];
const OUT = { room: { w_mm: 4200, d_mm: 3100, h_mm: 0, layout: 'linear', openings: [] },
  features: { sink: true, stove: false, fridge: false, corner: false, upper: false, tall: false, wardrobe: false, island: false },
  orders: [{ kind: 'pastki', qty: 3 }], unknown: [] };

before(async () => {
  mock = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      seen.push({ url: req.url, headers: req.headers, body: JSON.parse(body || '{}') });
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({
        id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5',
        content: reply === 'refusal' ? [] : [{ type: 'text', text: JSON.stringify(OUT) }],
        stop_reason: reply === 'refusal' ? 'refusal' : 'end_turn', stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 10 }
      }));
    });
  });
  await new Promise(r => mock.listen(0, '127.0.0.1', r));
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-aia-'));
  const db = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: 'test-admin-parol-4' }, stdio: 'pipe' });
  const port = 20000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), DB_PATH: db, JWT_SECRET: 'aia-test-' + 'w'.repeat(40), NODE_ENV: 'test',
    AI_PROVIDER: 'anthropic', AI_API_KEY: 'soxta-claude-kalit', ANTHROPIC_BASE_URL: `http://127.0.0.1:${mock.address().port}` };
  for (const k of ['ESKIZ_EMAIL', 'ESKIZ_PASSWORD', 'AI_MODEL', 'AI_BASE_URL', 'ANTHROPIC_AUTH_TOKEN']) delete env[k];
  proc = spawn(process.execPath, ['index.js'], { cwd: SERVER_DIR, env });
  await new Promise((resolve, reject) => {
    let out = '';
    const t = setTimeout(() => reject(new Error('server ishga tushmadi: ' + out)), 8000);
    proc.stdout.on('data', d => { out += d; if (/Smart3D server:/.test(out)) { clearTimeout(t); resolve(); } });
    proc.stderr.on('data', d => { out += d; });
  });
});
after(() => { proc && proc.kill(); mock && mock.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const api = (p, { method = 'GET', body, token } = {}) => fetch(base + p, {
  method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
  body: body ? JSON.stringify(body) : undefined
});

test('Claude: standart model claude-opus-5-5, tuzilgan JSON, effort low, server-side fallback', async () => {
  assert.deepEqual(await (await api('/api/ai/status')).json(), { enabled: true, provider: 'anthropic', model: 'claude-opus-5-5' });
  const s = await (await api('/api/auth/sms/send', { method: 'POST', body: { phone: '998977770001' } })).json();
  const { token } = await (await api('/api/auth/sms/verify', { method: 'POST', body: { phone: '998977770001', code: s.dev_code } })).json();
  const r = await api('/api/ai/parse', { method: 'POST', token, body: { text: '4.2 ga 3.1 oshxona, moyka, 3 ta pastki' } });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.engine, 'anthropic:claude-opus-5-5');
  assert.equal(j.parsed.room.w, 4200);
  const q = seen[seen.length - 1];
  assert.match(q.url, /^\/v1\/messages/);
  assert.equal(q.headers['x-api-key'], 'soxta-claude-kalit');
  assert.match(q.headers['anthropic-beta'] || '', /server-side-fallback-2026-07-01/);
  assert.equal(q.body.model, 'claude-opus-5-5');
  assert.equal(q.body.fallbacks, 'default');
  assert.equal(q.body.output_config.effort, 'low');
  assert.equal(q.body.output_config.format.type, 'json_schema');
  assert.equal(q.body.thinking, undefined);                 // Opus 5.5: thinking parametri yuborilmaydi
  assert.equal(q.body.messages[0].content, '4.2 ga 3.1 oshxona, moyka, 3 ta pastki');
});

test('Claude rad etsa (refusal) — 502, sayt qoidali tahlilchiga qaytadi', async () => {
  reply = 'refusal';
  const s = await (await api('/api/auth/sms/send', { method: 'POST', body: { phone: '998977770002' } })).json();
  const { token } = await (await api('/api/auth/sms/verify', { method: 'POST', body: { phone: '998977770002', code: s.dev_code } })).json();
  assert.equal((await api('/api/ai/parse', { method: 'POST', token, body: { text: 'oshxona' } })).status, 502);
  reply = 'ok';
});
