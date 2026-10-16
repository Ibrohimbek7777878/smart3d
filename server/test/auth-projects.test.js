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

test('kirish usullari: test serverida SMS bor (dev_code bilan)', async () => {
  assert.deepEqual(await (await api('/api/auth/usullar')).json(), { email: true, sms: true });
});

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

test('TZ-09: email + parol bilan ro\'yxat va kirish — ism, telefon (S1), sex nomi saqlanadi; /api/me ham qaytaradi', async () => {
  const r = await api('/api/register', { method: 'POST', body: { email: 'usta.tz09@test.uz', password: 'parol12345', name: 'Jasur', phone: '+998 97 555 44 33', shop: 'Mebel-Pro' } });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.user.phone, '998975554433');
  assert.equal(j.user.shop, 'Mebel-Pro');
  const l = await api('/api/login', { method: 'POST', body: { email: 'USTA.tz09@test.uz', password: 'parol12345' } });
  assert.equal(l.status, 200);
  const lj = await l.json();
  assert.deepEqual([lj.user.name, lj.user.phone, lj.user.shop], ['Jasur', '998975554433', 'Mebel-Pro']);
  const me = await (await api('/api/me', { token: lj.token })).json();
  assert.deepEqual([me.email, me.phone, me.shop], ['usta.tz09@test.uz', '998975554433', 'Mebel-Pro']);
  const bad = await api('/api/login', { method: 'POST', body: { email: 'usta.tz09@test.uz', password: 'notogri-parol' } });
  assert.equal(bad.status, 401);
  const html = await api('/api/register', { method: 'POST', body: { email: 'x.tz09@test.uz', password: 'parol12345', shop: '<b>x</b>' } });
  assert.equal(html.status, 400, 'sex nomida HTML rad etiladi');
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

test('TZ-09: loyiha kartasi — mijoz ismi saqlanadi, ro\'yxatda modul soni', async () => {
  const { token } = await login('+998 99 777 66 55', 'Karta Usta');
  const body = { name: 'Oshxona-Aziza', client: 'Aziza Karimova', total_price: 5701103, doc: DOC('K') };
  const c = await api('/api/projects', { method: 'POST', token, body });
  assert.equal(c.status, 200);
  const { id } = await c.json();
  let list = await (await api('/api/projects', { token })).json();
  let it = list.find(p => p.id === id);
  assert.deepEqual([it.name, it.client, it.modules], ['Oshxona-Aziza', 'Aziza Karimova', 1]);
  const one = await (await api('/api/projects/' + id, { token })).json();
  assert.equal(one.client, 'Aziza Karimova');
  await api('/api/projects/' + id, { method: 'PUT', token, body: { ...body, client: 'Boshqa Mijoz' } });
  list = await (await api('/api/projects', { token })).json();
  assert.equal(list.find(p => p.id === id).client, 'Boshqa Mijoz');
  const bad = await api('/api/projects', { method: 'POST', token, body: { ...body, client: '<b>x</b>' } });
  assert.equal(bad.status, 400, 'mijoz nomida HTML rad etiladi');
});

test('TZ-09: sozlamalar — ustama, stanok profili, logo; har usta o\'zinikini; noto\'g\'ri qiymat 400', async () => {
  /* email bilan (SMS cheklovi — soatiga 10 ta — boshqa testlar uchun qolsin) */
  const reg = async (e) => (await api('/api/register', { method: 'POST', body: { email: e, password: 'parol12345' } })).json();
  const a = await reg('sozlama.a@test.uz'), b = await reg('sozlama.b@test.uz');
  assert.equal((await api('/api/settings')).status, 401);
  let g = await (await api('/api/settings', { token: a.token })).json();
  assert.deepEqual(g, { markup_pct: null, stanoklar: null, logo: null, til: null });
  const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const p = await api('/api/settings', { method: 'PUT', token: a.token, body: { markup_pct: 0.4, stanoklar: ['dxf', 'altendorf'], logo: LOGO } });
  assert.equal(p.status, 200);
  g = await (await api('/api/settings', { token: a.token })).json();
  assert.deepEqual([g.markup_pct, g.stanoklar, g.logo], [0.4, ['dxf', 'altendorf'], LOGO]);
  const gb = await (await api('/api/settings', { token: b.token })).json();
  assert.equal(gb.markup_pct, null, 'boshqa usta sozlamasi ko\'rinmaydi');
  for (const bad of [{ markup_pct: 5 }, { stanoklar: ['biesse'] }, { logo: 'data:image/svg+xml;base64,PHN2Zz4=' }, { logo: 'javascript:alert(1)' }]) {
    assert.equal((await api('/api/settings', { method: 'PUT', token: a.token, body: bad })).status, 400, JSON.stringify(bad));
  }
});

test('TZ-18: til akkauntda saqlanadi (uz/ru/en), boshqasi — 400', async () => {
  const a = await (await api('/api/register', { method: 'POST', body: { email: 'til.a@test.uz', password: 'parol12345' } })).json();
  assert.equal((await api('/api/settings', { method: 'PUT', token: a.token, body: { til: 'ru' } })).status, 200);
  assert.equal((await (await api('/api/settings', { token: a.token })).json()).til, 'ru');
  assert.equal((await api('/api/settings', { method: 'PUT', token: a.token, body: { til: 'de' } })).status, 400);
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

