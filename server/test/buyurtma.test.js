/* Smart3D server — TZ-23 C1 (egasi #138): sexga buyurtma (/api/orders) va admin holati (/api/admin/orders).
 * Tekshiriladi: mijoz ismi va telefon (S1) majburiy, loyihasiz buyurtma yo'q, holat "yangi"; faqat o'z buyurtmalari ko'rinadi;
 * holatni faqat admin o'zgartiradi (yangi → qabul → ishlab → tayyor | bekor), noto'g'ri holat — S3D-ORD-001. Vaqtinchalik baza (S8). */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.join(__dirname, '..');
let tmp, proc, base, dbPath;

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-ord-'));
  const db = dbPath = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: 'test-admin-parol-3', ADMIN_EMAIL: 'admin@smart3d.uz' }, stdio: 'pipe' });
  const port = 20000 + Math.floor(Math.random() * 20000);
  base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), DB_PATH: db, JWT_SECRET: 'ord-test-' + 'o'.repeat(40), NODE_ENV: 'test' };
  delete env.ESKIZ_EMAIL; delete env.ESKIZ_PASSWORD;
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
async function login(tel) {
  const { dev_code } = await (await api('/api/auth/sms/send', { method: 'POST', body: { phone: tel } })).json();
  return (await (await api('/api/auth/sms/verify', { method: 'POST', body: { phone: tel, code: dev_code, name: 'Usta' } })).json()).token;
}
const LOYIHA = { doc: { room: { outline: [[0, 0], [3000, 0], [3000, 2500], [0, 2500]] }, placements: [{ id: 'p1', frg: 'MC-KP-02', x: 0, y: 0, z: 100, w: 600, d: 450, h: 708 }] } };


async function admin() {
  const r = await api('/api/login', { method: 'POST', body: { email: 'admin@smart3d.uz', password: 'test-admin-parol-3' } });
  return (await r.json()).token;
}

test('buyurtma: mijoz ismi, telefon va loyiha majburiy; holat "yangi"; telefon 998XXXXXXXXX', async () => {
  assert.equal((await api('/api/orders', { method: 'POST', body: {} })).status, 401);
  const a = await login('998901120001');
  const yaxshi = { client_name: 'Aziz aka', client_phone: '+998 90 777 66 55', notes: 'oq rang <tez>', project_name: 'Oshxona', total_price: 5334289, doc: LOYIHA };
  assert.equal((await api('/api/orders', { method: 'POST', token: a, body: { ...yaxshi, client_name: '' } })).status, 400, 'ismsiz');
  assert.equal((await api('/api/orders', { method: 'POST', token: a, body: { ...yaxshi, client_phone: '12345' } })).status, 400, 'telefon noto\'g\'ri');
  assert.equal((await api('/api/orders', { method: 'POST', token: a, body: { ...yaxshi, doc: { room: {}, placements: [] } } })).status, 400, 'mebelsiz');
  const r = await api('/api/orders', { method: 'POST', token: a, body: yaxshi });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.status, 'yangi');
  const ro = await (await api('/api/orders', { token: a })).json();
  assert.equal(ro.length, 1);
  assert.deepEqual([ro[0].client_phone, ro[0].status, ro[0].modules, ro[0].total_price, ro[0].project_name], ['998907776655', 'yangi', 1, 5334289, 'Oshxona']);
  assert.equal(ro[0].doc_json, undefined, 'ro\'yxatda to\'liq hujjat yo\'q');
  const bitta = await (await api('/api/orders/' + j.id, { token: a })).json();
  assert.equal(bitta.doc.doc.placements[0].frg, 'MC-KP-02', 'sex uchun to\'liq loyiha saqlangan');
  const b = await login('998901120002');
  assert.equal((await api('/api/orders/' + j.id, { token: b })).status, 404, 'boshqa usta ko\'rmaydi');
  assert.equal((await (await api('/api/orders', { token: b })).json()).length, 0);
});

test('buyurtma holati: faqat admin; to\'g\'ri holatlar; admin ro\'yxatida usta', async () => {
  const a = await login('998901120003');
  const { id } = await (await api('/api/orders', { method: 'POST', token: a, body: { client_name: 'Mijoz', client_phone: '901112233', doc: LOYIHA, total_price: 100 } })).json();
  assert.equal((await api('/api/admin/orders', { token: a })).status, 403);
  assert.equal((await api('/api/admin/orders/' + id, { method: 'PUT', token: a, body: { status: 'tayyor' } })).status, 403);
  const t = await admin();
  const xato = await api('/api/admin/orders/' + id, { method: 'PUT', token: t, body: { status: 'pullandi' } });
  assert.equal(xato.status, 400);
  assert.equal((await xato.json()).code, 'S3D-ORD-001');
  for (const h of ['qabul', 'ishlab', 'tayyor']) assert.equal((await api('/api/admin/orders/' + id, { method: 'PUT', token: t, body: { status: h } })).status, 200, h);
  assert.equal((await api('/api/admin/orders/999999', { method: 'PUT', token: t, body: { status: 'qabul' } })).status, 404);
  const all = await (await api('/api/admin/orders', { token: t })).json();
  const o = all.find(x => x.id === id);
  assert.equal(o.status, 'tayyor');
  assert.equal(o.usta.phone, '998901120003');
  assert.equal((await (await api('/api/orders', { token: a })).json())[0].status, 'tayyor', 'usta yangi holatni ko\'radi');
});
