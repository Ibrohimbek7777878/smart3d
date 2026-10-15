/* Smart3D server — TZ-12: istalgan AI provayderi.
 * Haqiqiy pullik AI chaqirilmaydi (qoida 5.1): test o'zi soxta "OpenAI'ga mos" server ochadi.
 * Ishga tushirish: npm test
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { normalizeParsed, AI_SCHEMA } from '../ai-llm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.join(__dirname, '..');
let tmp, proc, base, mock, dbPath, mockMode = 'ok';
const seen = [];

const SAMPLE = {
  room: { w_mm: 3600, d_mm: 3000, h_mm: 2700, layout: 'L', openings: [{ type: 'window', width_mm: 1200 }] },
  features: { sink: true, stove: true, fridge: false, corner: true, upper: true, tall: false, wardrobe: false, island: false },
  orders: [{ kind: 'pastki', qty: 4 }, { kind: 'ustki', qty: 3 }],
  unknown: []
};

before(async () => {
  /* soxta OpenAI'ga mos API */
  mock = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      seen.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(body || '{}') });
      res.setHeader('content-type', 'application/json');
      const content = mockMode === 'ok' ? JSON.stringify(SAMPLE) : mockMode === 'bad' ? 'bu JSON emas' : JSON.stringify({ room: 'x' });
      res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content } }] }));
    });
  });
  await new Promise(r => mock.listen(0, '127.0.0.1', r));
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-ai-'));
  dbPath = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: dbPath, ADMIN_PASSWORD: 'test-admin-parol-3' }, stdio: 'pipe' });
  const port = 20000 + Math.floor(Math.random() * 20000);
  base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), DB_PATH: dbPath, JWT_SECRET: 'ai-test-' + 'q'.repeat(40), NODE_ENV: 'test',
    AI_PROVIDER: 'openai', AI_BASE_URL: `http://127.0.0.1:${mock.address().port}/v1`, AI_API_KEY: 'soxta-kalit', AI_MODEL: 'soxta-model' };
  delete env.ESKIZ_EMAIL; delete env.ESKIZ_PASSWORD;
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
async function login(tel) {
  const s = await (await api('/api/auth/sms/send', { method: 'POST', body: { phone: tel } })).json();
  return (await (await api('/api/auth/sms/verify', { method: 'POST', body: { phone: tel, code: s.dev_code } })).json()).token;
}

test('normalizeParsed: to\'g\'ri javob → parseZamer shakli, o\'lcham bo\'lsa outline', () => {
  const p = normalizeParsed(SAMPLE);
  assert.equal(p.room.w, 3600); assert.equal(p.room.d, 3000); assert.equal(p.room.layoutType, 'L');
  assert.deepEqual(p.room.outline, [[0, 0], [3600, 0], [3600, 3000], [0, 3000]]);
  assert.deepEqual(p.orders, [{ kind: 'pastki', qty: 4 }, { kind: 'ustki', qty: 3 }]);
  assert.deepEqual(p.room.openings, [{ type: 'window', width: 1200 }]);
});

test('normalizeParsed: o\'ylab topilgan/yaroqsiz qiymatlar tozalanadi', () => {
  const p = normalizeParsed({ room: { w_mm: 50, d_mm: 999999, h_mm: 99, layout: 'X', openings: [{ type: 'pech', width_mm: 1 }] },
    features: { sink: 'ha' }, orders: [{ kind: 'raketa', qty: 3 }, { kind: 'pastki', qty: 0 }, { kind: 'ustki', qty: 900 }], unknown: ['a'.repeat(500)] });
  assert.equal(p.room.w, 0); assert.equal(p.room.d, 0); assert.equal(p.room.outline, null);
  assert.equal(p.room.h, 2700); assert.equal(p.room.layoutType, 'linear');
  assert.deepEqual(p.room.openings, []);
  assert.equal(p.room.features.sink, false);
  assert.deepEqual(p.orders, [{ kind: 'ustki', qty: 50 }]);
  assert.equal(p.unknown[0].length, 100);
  assert.throws(() => normalizeParsed({ room: 'x' }));
});

test('sxema: har obyekt additionalProperties:false va barcha maydon majburiy (structured outputs talabi)', () => {
  const walk = (s) => {
    if (s.type === 'object') {
      assert.equal(s.additionalProperties, false);
      assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort());
      Object.values(s.properties).forEach(walk);
    }
    if (s.type === 'array') walk(s.items);
  };
  walk(AI_SCHEMA);
});

test('status: yoqilgan, provayder va model ko\'rinadi, kalit ko\'rinmaydi', async () => {
  const j = await (await api('/api/ai/status')).json();
  assert.deepEqual(j, { enabled: true, provider: 'openai', model: 'soxta-model' });
});

test('parse: tokensiz 401; kirgan usta — AI javobi tekshirilib qaytadi, jurnalga yoziladi', async () => {
  assert.equal((await api('/api/ai/parse', { method: 'POST', body: { text: 'oshxona' } })).status, 401);
  const token = await login('998935550001');
  mockMode = 'ok';
  const r = await api('/api/ai/parse', { method: 'POST', token, body: { text: 'oshxona 3.6 ga 3, burchakli, 4 ta pastki 3 ta osma, deraza 1.2' } });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.engine, 'openai:soxta-model');
  assert.equal(j.parsed.room.w, 3600);
  assert.equal(j.parsed.orders.length, 2);
  const last = seen[seen.length - 1];
  assert.equal(last.url, '/v1/chat/completions');
  assert.equal(last.auth, 'Bearer soxta-kalit');
  assert.equal(last.body.model, 'soxta-model');
  assert.equal(last.body.response_format.type, 'json_object');
  const db = new Database(dbPath, { readonly: true });
  const row = db.prepare('SELECT * FROM ai_log ORDER BY id DESC LIMIT 1').get();
  db.close();
  assert.equal(row.ok, 1); assert.match(row.text, /3\.6 ga 3/);
});

test('parse: AI buzuq javob bersa — 502 (sayt qoidali tahlilchiga qaytadi), jurnalda xato', async () => {
  const token = await login('998935550002');
  for (const mode of ['bad', 'shape']) {
    mockMode = mode;
    const r = await api('/api/ai/parse', { method: 'POST', token, body: { text: 'oshxona' } });
    assert.equal(r.status, 502, mode);
  }
  mockMode = 'ok';
  const db = new Database(dbPath, { readonly: true });
  const n = db.prepare('SELECT COUNT(*) AS n FROM ai_log WHERE ok = 0').get().n;
  db.close();
  assert.ok(n >= 2);
});
