/* Smart3D server — TZ-40 (marshrutlar): tayyor prompt = Claude chaqirilmaydi; kesh; byudjet tugasa qoidaga o'tish; admin tuzilma va "AI sarfi".
 * Haqiqiy Claude chaqirilmaydi: SDK ANTHROPIC_BASE_URL orqali soxta serverga yuboradi va u chaqiruvlarni sanaydi. Ishga tushirish: npm test */
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
const ADMIN_PW = 'test-admin-tejash-7';
let tmp, proc, base, mock, adminT, ustaT;
let hits = 0;

const sistemlar = [];                // Claude'ga ketgan so'rovlarning system maydoni (prompt caching auto rejimi)
const PARSE_OUT = { room: { w_mm: 4200, d_mm: 3100, h_mm: 0, layout: 'linear', openings: [] },
  features: { sink: true, stove: false, fridge: false, corner: false, upper: false, tall: false, wardrobe: false, island: false },
  orders: [{ kind: 'pastki', qty: 3 }], unknown: [] };
const KONS_OUT = { tur: 'shkaf', nom: '', eni: 1200, chuqurligi: 600, boyi: 2200, tag: 'auto', qopqoq: 'auto', bolimlar: [], orqa: 'auto',
  material: { korpus: { nom: '', qalinlik: 0 }, polka: { nom: '', qalinlik: 0 }, fasad: { nom: '', qalinlik: 0 } },
  furnitura: { birikma: 'auto', polka: 'auto', ruchka: 0 }, eksport: 'yoq', tushunilmadi: [] };

before(async () => {
  mock = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      hits++;
      const b = JSON.parse(body || '{}');
      sistemlar.push(b.system);
      const kons = !!(b.output_config && b.output_config.format.schema.properties.tur);
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ id: 'msg_t', type: 'message', role: 'assistant', model: 'claude-sonnet-5-5', content: [{ type: 'text', text: JSON.stringify(kons ? KONS_OUT : PARSE_OUT) }],
        stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 600, output_tokens: 100, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } }));
    });
  });
  await new Promise(r => mock.listen(0, '127.0.0.1', r));
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-tejash-'));
  const db = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: ADMIN_PW, ADMIN_EMAIL: 'admin@smart3d.uz' }, stdio: 'pipe' });
  const port = 24000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), DB_PATH: db, JWT_SECRET: 'tejash-test-' + 'z'.repeat(40), NODE_ENV: 'test',
    AI_PROVIDER: 'anthropic', AI_MODEL: 'claude-sonnet-5-5', AI_API_KEY: 'soxta-claude-kalit', ANTHROPIC_BASE_URL: `http://127.0.0.1:${mock.address().port}`,
    AI_OYLIK_TOKEN: '1000', AI_KUNLIK_SOROV: '50' };
  for (const k of ['ESKIZ_EMAIL', 'ESKIZ_PASSWORD', 'AI_BASE_URL', 'ANTHROPIC_AUTH_TOKEN', 'AI_MAX_TOKENS', 'AI_PROMPT_CACHE']) delete env[k];
  proc = spawn(process.execPath, ['index.js'], { cwd: SERVER_DIR, env });
  await new Promise((resolve, reject) => {
    let out = '';
    const t = setTimeout(() => reject(new Error('server ishga tushmadi: ' + out)), 8000);
    proc.stdout.on('data', d => { out += d; if (/Smart3D server:/.test(out)) { clearTimeout(t); resolve(); } });
    proc.stderr.on('data', d => { out += d; });
  });
  adminT = (await (await api('/api/login', { method: 'POST', body: { email: 'admin@smart3d.uz', password: ADMIN_PW } })).json()).token;
  const tel = '9' + String(Date.now()).slice(-8);
  const { dev_code } = await (await api('/api/auth/sms/send', { method: 'POST', body: { phone: tel } })).json();
  ustaT = (await (await api('/api/auth/sms/verify', { method: 'POST', body: { phone: tel, code: dev_code, name: 'Usta' } })).json()).token;
});
after(() => { proc && proc.kill(); mock && mock.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const api = (p, { method = 'GET', body, token } = {}) => fetch(base + p, {
  method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
  body: body !== undefined && method !== 'GET' ? JSON.stringify(body) : undefined
});
const parse = (text, token = ustaT) => api('/api/ai/parse', { method: 'POST', token, body: { text } });
const kons = (text, token = ustaT) => api('/api/ai/konstruksiya', { method: 'POST', token, body: { text } });
const A = (p, o = {}) => api(p, { ...o, token: adminT });

test('tayyor prompt: parse va konstruksiya — Claude chaqirilmaydi (0 chaqiruv), manba "tayyor"', async () => {
  const a = await parse("oshxona 3 metr to'g'ri");
  assert.equal(a.status, 200);
  const j = await a.json();
  assert.deepEqual([j.manba, j.engine], ['tayyor', 'tayyor:qabul-01']);
  assert.ok(j.parsed.room && Array.isArray(j.parsed.orders));
  const b = await (await kons('Shkaf 1200x600x2200, 2 eshik!')).json();
  assert.equal(b.manba, 'tayyor'); assert.equal(b.spec.tur, 'shkaf'); assert.equal(b.spec.eni, 1200);
  assert.equal(hits, 0, 'tayyor prompt uchun Claude chaqirilmadi');
});

test('qoidali tahlilchi tushunsa — Claude chaqirilmaydi; qoldiq — Claude bir marta, takror — kesh', async () => {
  const q = await (await parse('4.2 ga 3.1 oshxona, moyka, 3 ta pastki')).json();
  assert.equal(q.manba, 'qoida'); assert.equal(q.parsed.room.w, 4200); assert.equal(hits, 0);
  const a = await (await parse('shkaf h 2400')).json();
  assert.equal(a.manba, 'claude'); assert.equal(a.engine, 'anthropic:claude-sonnet-5-5'); assert.equal(hits, 1);
  const b = await (await parse('  SHKAF H 2400 ')).json();
  assert.equal(b.manba, 'kesh'); assert.equal(hits, 1, 'kesh urildi');
});

test('AI sarfi kartasi (admin): bugun/oy, token, tayyor+kesh ulushi, byudjet; usta ko\'rolmaydi', async () => {
  assert.equal((await api('/api/admin/ai-sarf', { token: ustaT })).status, 404);
  const st = await (await A('/api/admin/ai-sarf')).json();
  assert.deepEqual([st.bugun.jami, st.bugun.tayyor, st.bugun.qoida, st.bugun.claude, st.bugun.kesh], [5, 2, 1, 1, 1]);
  assert.equal(st.bugun.token, 700); assert.equal(st.byudjet.chegara, 1000); assert.equal(st.byudjet.ishlatilgan, 700); assert.equal(st.byudjet.qoldiq, 300);
  assert.equal(st.bugun.tayyor_kesh_foiz, 60); assert.equal(st.promptlar.tuzilmali, 44); assert.equal(st.ai.yoqilgan, true);
});

test('byudjet tugasa: javob 200, qoidali natija va ogohlantirish S3D-AI-004 (sayt to\'xtamaydi); kesh va tayyor ishlayveradi', async () => {
  assert.equal((await (await parse('shkaf h 2500')).json()).manba, 'claude');         // 700 → 1400 (chegara 1000)
  assert.equal(hits, 2);
  /* prompt caching (auto): birinchi chaqiruvda yo'q (yozish narxi o'zini oqlamaydi), 5 daqiqa ichidagi ikkinchisida — cache_control */
  assert.equal(typeof sistemlar[0], 'string');
  assert.deepEqual(sistemlar[1][0].cache_control, { type: 'ephemeral' });
  const r = await parse('shkaf h 2600');
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.manba, 'qoida'); assert.equal(j.ogohlantirish.code, 'S3D-AI-004'); assert.match(j.ogohlantirish.error, /oylik/);
  assert.ok(j.parsed.room && Array.isArray(j.parsed.orders));
  const k = await (await kons('shkaf 1200 — ' + 'qo\'shimcha izoh, '.repeat(15) + 'oxiri')).json();
  assert.equal(k.ogohlantirish.code, 'S3D-AI-004'); assert.ok(k.spec);
  assert.equal(hits, 2, 'byudjet tugagach Claude chaqirilmadi');
  assert.equal((await (await parse('shkaf h 2400')).json()).manba, 'kesh');
  assert.equal((await (await parse("oshxona 3 metr to'g'ri")).json()).manba, 'tayyor');
  const st = await (await A('/api/admin/ai-sarf')).json();
  assert.equal(st.byudjet.qoldiq, 0); assert.equal(st.byudjet.foiz, 100);
});

test('admin yangi prompt qo\'shadi — tuzilma bir marta hosil bo\'ladi (qoida), ko\'rinadi va foydalanuvchiga 0 chaqiruv bilan beriladi', async () => {
  const c = await A('/api/admin/promptlar', { method: 'POST', body: { id: 'tejash-1', kat: 'oshxona', nom_uz: 'Sinov oshxona', matn_uz: 'oshxona 4x3 orol bilan, 5 ta pastki' } });
  assert.equal(c.status, 201);
  const cj = await c.json();
  assert.deepEqual([cj.spec.manba, cj.spec.yangilandi, cj.prompt.spec, cj.prompt.spec_tasdiq], ['qoida', true, true, false]);
  const sp = await (await A('/api/admin/promptlar/tejash-1/spec')).json();
  assert.equal(sp.spec.v, 1); assert.ok(sp.spec.parse.room); assert.equal(sp.spec_manba, 'qoida');
  const before = hits;
  assert.equal((await (await parse('Oshxona 4x3 orol bilan, 5 ta pastki')).json()).manba, 'tayyor');
  assert.equal(hits, before);
  /* matn tahrirlandi — tuzilma qayta hosil bo'ldi; eski matn endi tayyor emas */
  const u = await (await A('/api/admin/promptlar/tejash-1', { method: 'PUT', body: { matn_uz: 'oshxona 5x3 orol bilan, 6 ta pastki' } })).json();
  assert.equal(u.spec.yangilandi, true);
  assert.notEqual((await (await parse('oshxona 4x3 orol bilan, 5 ta pastki')).json()).manba, 'tayyor');
  assert.equal((await (await parse('oshxona 5x3 orol bilan, 6 ta pastki')).json()).manba, 'tayyor');
  /* tasdiq, qayta hosil qilish, xatolar */
  assert.equal((await (await A('/api/admin/promptlar/tejash-1/spec-tasdiq', { method: 'POST', body: {} })).json()).spec_tasdiq, true);
  const q = await (await A('/api/admin/promptlar/tejash-1/spec-qayta', { method: 'POST', body: {} })).json();
  assert.equal(q.spec.manba, 'qoida'); assert.equal(q.spec_tasdiq, false, 'qayta hosil qilingach tasdiq qaytadan');
  assert.equal(hits, before, 'admin amallari Claude chaqirmadi');
  for (const [m, p] of [['GET', '/api/admin/promptlar/yoq-id/spec'], ['POST', '/api/admin/promptlar/yoq-id/spec-tasdiq'], ['POST', '/api/admin/promptlar/yoq-id/spec-qayta']]) {
    const r = await A(p, { method: m, body: {} });
    assert.equal(r.status, 404); assert.equal((await r.json()).code, 'S3D-ADM-004');
  }
  for (const [m, p] of [['GET', '/api/admin/promptlar/tejash-1/spec'], ['POST', '/api/admin/promptlar/tejash-1/spec-tasdiq'], ['POST', '/api/admin/promptlar/tejash-1/spec-qayta']]) {
    assert.equal((await api(p, { method: m, body: {}, token: ustaT })).status, 404, 'usta: ' + p);
  }
});

test('ai_log va ai_sarf: har so\'rov yoziladi (manba bilan); kirmasdan 401; AI status o\'zgarmagan', async () => {
  assert.equal((await api('/api/ai/parse', { method: 'POST', body: { text: 'oshxona' } })).status, 401);
  assert.deepEqual(await (await api('/api/ai/status')).json(), { enabled: true, provider: 'anthropic', model: 'claude-sonnet-5-5' });
  const st = await (await A('/api/admin/ai-sarf')).json();
  assert.equal(st.oy_jami.jami, st.oy_jami.tayyor + st.oy_jami.kesh + st.oy_jami.qoida + st.oy_jami.claude);
  assert.ok(st.oy_jami.tejaldi >= 700, 'tejalgan token hisoblanadi');
});
