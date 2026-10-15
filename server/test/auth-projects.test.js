/* Smart3D server — TZ-07: telefon + SMS kirish (S1) va loyihalar.
 * Ishga tushirish: npm test   (vaqtinchalik bazada — asl bazaga tegmaydi, S8; SMS yuborilmaydi — dev_code)
 */
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
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-auth-'));
  const db = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['init-db.js'], {
    cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: 'test-admin-parol-2', ADMIN_EMAIL: 'admin@smart3d.uz' }, stdio: 'pipe'
  });
  const port = 20000 + Math.floor(Math.random() * 20000);
  base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), DB_PATH: db, JWT_SECRET: 'auth-test-' + 'y'.repeat(40), NODE_ENV: 'test' };
  delete env.ESKIZ_EMAIL; delete env.ESKIZ_PASSWORD;                 // haqiqiy SMS yuborilmasin
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
async function login(tel, name) {
  const s = await api('/api/auth/sms/send', { method: 'POST', body: { phone: tel } });
  assert.equal(s.status, 200, 'kod yuborilmadi');
  const { dev_code } = await s.json();
  const v = await api('/api/auth/sms/verify', { method: 'POST', body: { phone: tel, code: dev_code, name } });
  assert.equal(v.status, 200);
  return v.json();
}
const DOC = (n) => ({ app: 'smart3d', v: 2, name: 'Oshxona ' + n, doc: { room: { outline: [[0, 0], [3600, 0], [3600, 3000], [0, 3000]] }, placements: [{ id: 'p1', frg: 'MC-KP-02', x: 0, y: 50, z: 0, w: 600, d: 450, h: 708 }] } });

test('telefon formati noto\'g\'ri → 400', async () => {
  for (const tel of ['123', '+7 999 123 45 67', 'abc']) {
    const r = await api('/api/auth/sms/send', { method: 'POST', body: { phone: tel } });
    assert.equal(r.status, 400, tel);
  }
});

test('kod: dev rejimida qaytadi, 60 soniyada qayta yuborilmaydi, noto\'g\'ri kod — 400, 5 urinishdan keyin — 429', async () => {
  const s = await api('/api/auth/sms/send', { method: 'POST', body: { phone: '+998 93 111 22 33' } });
  assert.equal(s.status, 200);
  const j = await s.json();
  assert.match(j.dev_code, /^\d{6}$/);
  assert.equal((await api('/api/auth/sms/send', { method: 'POST', body: { phone: '931112233' } })).status, 429);
  const wrong = String((+j.dev_code + 1) % 1000000).padStart(6, '0');
  for (let i = 0; i < 5; i++) {
    assert.equal((await api('/api/auth/sms/verify', { method: 'POST', body: { phone: '998931112233', code: wrong } })).status, 400);
  }
  assert.equal((await api('/api/auth/sms/verify', { method: 'POST', body: { phone: '998931112233', code: j.dev_code } })).status, 429);
});

test('kirish: yangi raqam → akkaunt (998XXXXXXXXX), boshqa yozilishda — o\'sha akkaunt (oxirgi 9 raqam, S1)', async () => {
  const a = await login('+998 90 123 45 67', 'Usta Ali');
  assert.equal(a.yangi, true);
  assert.equal(a.user.phone, '998901234567');
  assert.equal(a.user.name, 'Usta Ali');
  const me = await (await api('/api/me', { token: a.token })).json();
  assert.equal(me.phone, '998901234567');
  await new Promise(r => setTimeout(r, 10));
  const b = await login('901234567');
  assert.equal(b.yangi, false);
  assert.equal(b.user.id, a.user.id);
});

test('email bilan ro\'yxat: telefon S1 formatiga keltiriladi, takror raqam — 409', async () => {
  const r = await api('/api/register', { method: 'POST', body: { email: 'usta2@smart3d.uz', password: 'parol-12345', phone: '+998 (90) 123-45-67' } });
  assert.equal(r.status, 409);
  const ok = await api('/api/register', { method: 'POST', body: { email: 'usta3@smart3d.uz', password: 'parol-12345', phone: '+998 97 555 66 77' } });
  assert.equal(ok.status, 200);
});

test('loyihalar: yaratish, ro\'yxat, ochish, yangilash; boshqa usta ko\'rmaydi; o\'chirish — yashirish', async () => {
  const A = await login('998991110001', 'A');
  const B = await login('998991110002', 'B');
  const c = await api('/api/projects', { method: 'POST', token: A.token, body: { name: 'Oshxona 1', doc: DOC(1), total_price: 6108627 } });
  assert.equal(c.status, 200);
  const { id } = await c.json();
  const list = await (await api('/api/projects', { token: A.token })).json();
  assert.equal(list.length, 1);
  assert.equal(list[0].total_price, 6108627);
  const g = await (await api('/api/projects/' + id, { token: A.token })).json();
  assert.equal(g.doc.doc.placements[0].frg, 'MC-KP-02');
  const u = await api('/api/projects/' + id, { method: 'PUT', token: A.token, body: { name: 'Oshxona 1b', doc: DOC(2), total_price: 1 } });
  assert.equal(u.status, 200);
  assert.equal((await (await api('/api/projects/' + id, { token: A.token })).json()).name, 'Oshxona 1b');
  /* boshqa usta */
  assert.equal((await api('/api/projects/' + id, { token: B.token })).status, 404);
  assert.equal((await api('/api/projects/' + id, { method: 'PUT', token: B.token, body: { doc: DOC(3) } })).status, 404);
  assert.equal((await (await api('/api/projects', { token: B.token })).json()).length, 0);
  assert.equal((await api('/api/projects/' + id, { method: 'DELETE', token: B.token })).status, 404);
  /* yashirish */
  assert.equal((await api('/api/projects/' + id, { method: 'DELETE', token: A.token })).status, 200);
  assert.equal((await (await api('/api/projects', { token: A.token })).json()).length, 0);
  assert.equal((await api('/api/projects/' + id, { token: A.token })).status, 404);
});

test('loyiha: tokensiz 401, buzilgan doc 400', async () => {
  assert.equal((await api('/api/projects')).status, 401);
  const A = await login('998991110003');
  for (const doc of [null, [], { room: {} }, { doc: { room: {}, placements: 'x' } }]) {
    assert.equal((await api('/api/projects', { method: 'POST', token: A.token, body: { name: 'x', doc } })).status, 400, JSON.stringify(doc));
  }
});

test('AI sozlanmagan: status o\'chiq, parse — 503 (sayt qoidali tahlilchi bilan ishlaydi)', async () => {
  assert.deepEqual(await (await api('/api/ai/status')).json(), { enabled: false, provider: null, model: null });
  const A = await login('998991110009');
  assert.equal((await api('/api/ai/parse', { method: 'POST', token: A.token, body: { text: 'oshxona 3x4' } })).status, 503);
});

test('MebelCity modullari bazada (38 ta)', async () => {
  const f = await (await api('/api/fragments')).json();
  assert.ok(f.filter(x => /^MC-/.test(x.code)).length >= 38);
});

test('sex standartlari (TZ-14): hamma o\'qiydi; tokensiz 401, usta 403, noto\'g\'ri 400, admin o\'zgartiradi', async () => {
  const g = await (await api('/api/sex-standartlari')).json();
  assert.equal(g.modullar.oshxona_pastki_2e.w.max, 1070);
  const body = { modullar: { oshxona_pastki_2e: { w: { min: 600, max: 1100 } } } };
  assert.equal((await api('/api/sex-standartlari', { method: 'PUT', body })).status, 401);
  const U = await login('998991110010');
  assert.equal((await api('/api/sex-standartlari', { method: 'PUT', token: U.token, body })).status, 403);
  const adm = await (await api('/api/login', { method: 'POST', body: { email: 'admin@smart3d.uz', password: 'test-admin-parol-2' } })).json();
  assert.ok(adm.token, 'admin kira olmadi');
  for (const bodyBad of [
    { modullar: { oshxona_pastki_2e: { w: { min: 900, max: 800 } } } },
    { modullar: { yoq_tur: { w: { min: 1, max: 2 } } } },
    { modullar: { oshxona_pastki_2e: { uzunlik: { min: 1, max: 2 } } } },
    { modullar: { oshxona_pastki_2e: { h: { min: 600, max: 880, std: [5000] } } } }
  ]) assert.equal((await api('/api/sex-standartlari', { method: 'PUT', token: adm.token, body: bodyBad })).status, 400, JSON.stringify(bodyBad));
  const ok = await api('/api/sex-standartlari', { method: 'PUT', token: adm.token, body });
  assert.equal(ok.status, 200);
  const g2 = await (await api('/api/sex-standartlari')).json();
  assert.equal(g2.modullar.oshxona_pastki_2e.w.max, 1100);
  assert.equal(g2.modullar.oshxona_pastki_2e.h.max, 880);                       // boshqa o'lchamlar saqlandi
  assert.equal(g2.modullar.oshxona_pastki_2e.nom, g.modullar.oshxona_pastki_2e.nom);
  assert.ok(g2._meta.ozgartirildi);
});

