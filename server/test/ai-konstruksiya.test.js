/* Smart3D server — TZ-26: AI konstruksiya (/api/ai/konstruksiya). Haqiqiy pullik AI chaqirilmaydi (qoida 5.1):
 * test o'zi soxta "OpenAI'ga mos" va soxta Claude (Anthropic) serverlarini ochadi. Tekshiriladi: tizim ko'rsatmasi va
 * sxema yuboriladi; AI javobi server tekshiruvidan o'tadi (o'lcham chegarasi, eshik va polka qoidalari); "xona" — konstruksiya
 * emas; noto'g'ri javob — 502 (sayt AI'siz tahlilchiga qaytadi); login kerak; AI ulanmagan — 503; jurnalga yoziladi.
 * Ishga tushirish: npm test */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { KONS_SCHEMA } from '../ai-llm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.join(__dirname, '..');
const serverlar = [], seen = [];
let mock, tmp, javob = 'ok';

const AI_JAVOB = {
  tur: 'shkaf', nom: 'Garderob', eni: 5000, chuqurligi: 600, boyi: 2200, tag: 'sokol', qopqoq: 'auto',
  bolimlar: [{ eni: 0, eshik: 1, petlya: 'chap', polka: 1, tortma: 0, shtanga: true, qatlamlar: [] },
    { eni: 0, eshik: 1, petlya: 'ong', polka: 4, tortma: 0, shtanga: false, qatlamlar: [] }],
  tushunilmadi: ['oyna rangi']
};
const kontent = () => (javob === 'ok' ? JSON.stringify(AI_JAVOB) : javob === 'xona' ? JSON.stringify({ ...AI_JAVOB, tur: 'xona' })
  : javob === 'buzuq' ? JSON.stringify({ tur: 'stol', bolimlar: 5 }) : 'bu JSON emas');

async function serverOch(env0) {
  tmp = tmp || fs.mkdtempSync(path.join(os.tmpdir(), 's3d-kons-'));
  const db = path.join(tmp, 'test' + serverlar.length + '.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: 'test-admin-parol-6' }, stdio: 'pipe' });
  const port = 20000 + Math.floor(Math.random() * 20000);
  const env = { ...process.env, PORT: String(port), DB_PATH: db, JWT_SECRET: 'kons-test-' + 'k'.repeat(40), NODE_ENV: 'test' };
  for (const k of ['ESKIZ_EMAIL', 'ESKIZ_PASSWORD', 'AI_PROVIDER', 'AI_API_KEY', 'AI_MODEL', 'AI_BASE_URL', 'ANTHROPIC_API_KEY', 'ANTHROPIC_BASE_URL', 'ANTHROPIC_AUTH_TOKEN']) delete env[k];
  Object.assign(env, env0);
  const proc = spawn(process.execPath, ['index.js'], { cwd: SERVER_DIR, env });
  await new Promise((resolve, reject) => {
    let out = '';
    const t = setTimeout(() => reject(new Error('server ishga tushmadi: ' + out)), 8000);
    proc.stdout.on('data', d => { out += d; if (/Smart3D server:/.test(out)) { clearTimeout(t); resolve(); } });
    proc.stderr.on('data', d => { out += d; });
  });
  const s = { proc, base: `http://127.0.0.1:${port}`, db };
  serverlar.push(s);
  return s;
}
const api = (s, p, { method = 'GET', body, token } = {}) => fetch(s.base + p, {
  method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
  body: body ? JSON.stringify(body) : undefined
});
async function login(s, tel) {
  const x = await (await api(s, '/api/auth/sms/send', { method: 'POST', body: { phone: tel } })).json();
  return (await (await api(s, '/api/auth/sms/verify', { method: 'POST', body: { phone: tel, code: x.dev_code } })).json()).token;
}

let openai, claude, yoq;
before(async () => {
  /* bitta soxta server: /v1/chat/completions — OpenAI'ga mos, /v1/messages — Claude */
  mock = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      seen.push({ url: req.url, headers: req.headers, body: JSON.parse(body || '{}') });
      res.setHeader('content-type', 'application/json');
      if (/\/messages/.test(req.url)) {
        res.end(JSON.stringify({ id: 'msg_k', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [{ type: 'text', text: kontent() }],
          stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } }));
      } else res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: kontent() } }] }));
    });
  });
  await new Promise(r => mock.listen(0, '127.0.0.1', r));
  const mp = mock.address().port;
  openai = await serverOch({ AI_PROVIDER: 'openai', AI_BASE_URL: `http://127.0.0.1:${mp}/v1`, AI_API_KEY: 'soxta-kalit', AI_MODEL: 'soxta-model' });
  claude = await serverOch({ AI_PROVIDER: 'anthropic', AI_API_KEY: 'soxta-claude-kalit', ANTHROPIC_BASE_URL: `http://127.0.0.1:${mp}` });
  yoq = await serverOch({});
});
after(() => { serverlar.forEach(s => s.proc.kill()); mock && mock.close(); if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); });

test('sxema: tur ro\'yxati xona bilan, bo\'limlar va qatlamlar, hamma maydon majburiy', () => {
  assert.deepEqual(KONS_SCHEMA.properties.tur.enum, ['shkaf', 'pastki', 'ustki', 'tumba', 'erkin', 'xona']);
  assert.equal(KONS_SCHEMA.additionalProperties, false);
  const b = KONS_SCHEMA.properties.bolimlar.items;
  assert.ok(b.required.includes('qatlamlar') && b.properties.qatlamlar.items.required.includes('boyi'));
});

test('OpenAI\'ga mos: ko\'rsatma va sxema yuboriladi; javob tekshiriladi va to\'g\'rilanadi; jurnalga yoziladi', async () => {
  javob = 'ok';
  const token = await login(openai, '998977771001');
  const r = await api(openai, '/api/ai/konstruksiya', { method: 'POST', token, body: { text: 'garderob 5 metr, chapda shtanga, o\'ngda 4 polka' } });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.engine, 'openai:soxta-model');
  assert.equal(j.spec.tur, 'shkaf');
  assert.equal(j.spec.eni, 2750);                                  // 5000 → chegara (varaqqa sig'adi)
  assert.ok(j.tuzatish.some(t => t.kod === 'olcham' && t.n === 5000 && t.m === 2750));
  assert.ok(j.spec.bolimlar.length >= 4);                          // keng bo'limlar — bo'lindi (polka 800, eshik 600)
  assert.deepEqual(j.tushunilmadi, ['oyna rangi']);
  const q = seen[seen.length - 1];
  assert.match(q.body.messages[0].content, /konstruksiya tiliga/);
  assert.match(q.body.messages[0].content, /PASTDAN YUQORIGA/);
  assert.match(q.body.messages[0].content, /"bolimlar"/);          // sxema ko'rsatmada
  assert.equal(q.body.messages[1].content, 'garderob 5 metr, chapda shtanga, o\'ngda 4 polka');
  const db = new Database(openai.db, { readonly: true });
  const log = db.prepare("SELECT engine, ok FROM ai_log ORDER BY id DESC LIMIT 1").get();
  db.close();
  assert.deepEqual(log, { engine: 'openai:soxta-model konstruksiya', ok: 1 });
});

test('Claude: tuzilgan JSON (konstruksiya sxemasi), effort medium', async () => {
  javob = 'ok';
  const token = await login(claude, '998977771002');
  const r = await api(claude, '/api/ai/konstruksiya', { method: 'POST', token, body: { text: 'shkaf 1200, 2 eshik' } });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).engine, 'anthropic:claude-opus-5-5');
  const q = seen[seen.length - 1];
  assert.match(q.url, /^\/v1\/messages/);
  assert.equal(q.body.output_config.format.type, 'json_schema');
  assert.deepEqual(q.body.output_config.format.schema.properties.tur.enum, KONS_SCHEMA.properties.tur.enum);
  assert.equal(q.body.output_config.effort, 'medium');
  assert.match(q.body.system, /konstruksiya tiliga/);
});

test('"xona" — konstruksiya emas; noto\'g\'ri javob — 502; login kerak; AI ulanmagan — 503', async () => {
  const token = await login(openai, '998977771003');
  javob = 'xona';
  const x = await (await api(openai, '/api/ai/konstruksiya', { method: 'POST', token, body: { text: 'oshxona 3x4 m' } })).json();
  assert.equal(x.xona, true);
  javob = 'buzuq';
  const b = await api(openai, '/api/ai/konstruksiya', { method: 'POST', token, body: { text: 'shkaf' } });
  assert.equal(b.status, 502);
  assert.equal((await b.json()).code, 'S3D-AI-002');
  javob = 'matn';
  assert.equal((await api(openai, '/api/ai/konstruksiya', { method: 'POST', token, body: { text: 'shkaf' } })).status, 502);
  javob = 'ok';
  assert.equal((await api(openai, '/api/ai/konstruksiya', { method: 'POST', body: { text: 'shkaf' } })).status, 401);
  assert.equal((await api(openai, '/api/ai/konstruksiya', { method: 'POST', token, body: { text: '' } })).status, 400);
  const t2 = await login(yoq, '998977771004');
  const n = await api(yoq, '/api/ai/konstruksiya', { method: 'POST', token: t2, body: { text: 'shkaf 1200' } });
  assert.equal(n.status, 503);
  assert.equal((await n.json()).code, 'S3D-AI-001');
});
