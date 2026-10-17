/* Smart3D server — TZ-20 (2026-10-17): narx stavkalari (/api/narxlar).
 * Hamma o'qiydi; faqat admin o'zgartiradi (tokensiz 401, usta 403); noto'g'ri qiymat 400 (S3D-NARX-001) va hech narsa o'zgarmaydi;
 * har o'zgarish tarixga (kim, qachon, eski → yangi). Vaqtinchalik bazada (S8) — asl bazaga tegmaydi.
 * Stavkalar — test uchun (sex jadvalidagi qiymat shaklida), haqiqiy tanlov emas. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.join(__dirname, '..');
const ADMIN_PW = 'test-admin-narx-3';
let tmp, proc, base;

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-narx-'));
  const db = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: ADMIN_PW, ADMIN_EMAIL: 'admin@smart3d.uz' }, stdio: 'pipe' });
  const port = 20000 + Math.floor(Math.random() * 20000);
  base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), DB_PATH: db, JWT_SECRET: 'narx-test-' + 'z'.repeat(40), NODE_ENV: 'test' };
  delete env.ESKIZ_EMAIL; delete env.ESKIZ_PASSWORD;
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
async function usta(tel) {
  const { dev_code } = await (await api('/api/auth/sms/send', { method: 'POST', body: { phone: tel } })).json();
  return (await api('/api/auth/sms/verify', { method: 'POST', body: { phone: tel, code: dev_code, name: 'Usta' } })).json();
}
const admin = async () => (await (await api('/api/login', { method: 'POST', body: { email: 'admin@smart3d.uz', password: ADMIN_PW } })).json()).token;
const RASPIL = { '780236010807': { nom: 'Услуга Распила Altendorf 1', guruh: 'raspil', qiymat: 18000, birlik: 'list', manba: 'sex jadvali', sana: '2026-07-03' } };

test('boshlang\'ich holat: hamma o\'qiydi, ish haqi — "taxmin", ustama 35% — "egasi" (materials.json, TZ-30)', async () => {
  const r = await api('/api/narxlar');
  assert.equal(r.status, 200);
  const g = await r.json();
  assert.deepEqual(g.xizmatlar, {});
  assert.equal(g.tanlov.raspil, null);
  assert.equal(g.ish_haqi.detal.manba, 'taxmin');
  assert.equal(g.ish_haqi.detal.qiymat, 12000);
  assert.equal(g.ustama.foiz.qiymat, 35);
  assert.equal(g.ustama.foiz.manba, 'egasi');   // TZ-30: egasi tasdiqladi (#181, pricing.price_src "egasi, 2026-10-17")
  assert.equal(g.ustama.foiz.sana, '2026-10-17');
});

test('faqat admin: tokensiz 401, usta 403 (S3D-AUTH-006), tarix ham', async () => {
  const body = { xizmatlar: RASPIL };
  assert.equal((await api('/api/narxlar', { method: 'PUT', body })).status, 401);
  const U = await usta('998991110777');
  const r = await api('/api/narxlar', { method: 'PUT', token: U.token, body });
  assert.equal(r.status, 403);
  assert.equal((await r.json()).code, 'S3D-AUTH-006');
  assert.equal((await api('/api/narxlar/tarix', { token: U.token })).status, 403);
  assert.deepEqual((await (await api('/api/narxlar')).json()).xizmatlar, {}, 'usta so\'rovidan keyin o\'zgarmadi');
});

test('noto\'g\'ri qiymat rad etiladi (400, S3D-NARX-001) va hech narsa yozilmaydi', async () => {
  const T = await admin();
  const yomon = [
    { xizmatlar: { a1: { ...RASPIL['780236010807'], qiymat: -5 } } },
    { xizmatlar: { a1: { ...RASPIL['780236010807'], qiymat: 'abc' } } },
    { xizmatlar: { a1: { ...RASPIL['780236010807'], qiymat: 5e6 } } },                 // aql chegarasi: list boshiga 1 mln
    { xizmatlar: { a1: { ...RASPIL['780236010807'], guruh: 'boshqa' } } },
    { xizmatlar: { a1: { ...RASPIL['780236010807'], manba: 'taxmin' } } },              // taxmin — faqat boshlang'ich
    { xizmatlar: { a1: { ...RASPIL['780236010807'], nom: '<script>' } } },
    { xizmatlar: { 'yomon kod!': RASPIL['780236010807'] } },
    { tanlov: { raspil: 'yoq_kod' } },
    { tanlov: { prisadka: { nomalum_tur: 'x' } } },
    { ish_haqi: { detal: -1 } },
    { ish_haqi: { yoqilgan: 'ha' } },
    { ustama: { foiz: 500 } },
    { ustama: { foiz: '1e400' } },
    { ustama: [] }
  ];
  for (const body of yomon) {
    const r = await api('/api/narxlar', { method: 'PUT', token: T, body });
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.equal((await r.json()).code, 'S3D-NARX-001', JSON.stringify(body));
  }
  assert.deepEqual((await (await api('/api/narxlar')).json()).xizmatlar, {});
  assert.equal((await (await api('/api/narxlar/tarix', { token: T })).json()).length, 0, 'rad etilgani tarixga yozilmadi');
});

test('admin: xizmat + tanlov + ish haqi + ustama → saqlanadi, tarix (kim, eski → yangi), tanlovsiz xizmat o\'chsa tanlov ham', async () => {
  const T = await admin();
  let r = await api('/api/narxlar', { method: 'PUT', token: T, body: { xizmatlar: RASPIL } });
  assert.equal(r.status, 200);
  r = await api('/api/narxlar', { method: 'PUT', token: T, body: { tanlov: { raspil: '780236010807' }, ish_haqi: { yoqilgan: false, detal: '0' }, ustama: { foiz: 30 } } });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.ozgarish, 4);
  const g = await (await api('/api/narxlar')).json();
  assert.equal(g.tanlov.raspil, '780236010807');
  assert.equal(g.xizmatlar['780236010807'].manba, 'sex jadvali');
  assert.equal(g.xizmatlar['780236010807'].sana, '2026-07-03');
  assert.equal(g.ish_haqi.yoqilgan.qiymat, false);
  assert.equal(g.ish_haqi.detal.qiymat, 0);
  assert.equal(g.ish_haqi.detal.manba, 'egasi');
  assert.equal(g.ish_haqi.modul.manba, 'taxmin', 'tegilmagan qator o\'zgarmadi');
  assert.equal(g.ustama.foiz.qiymat, 30);
  assert.ok(g._meta.ozgartirildi);
  /* bir xil qiymat — o'zgarish yo'q, tarix ko'paymaydi */
  assert.equal((await (await api('/api/narxlar', { method: 'PUT', token: T, body: { ustama: { foiz: 30 } } })).json()).ozgarish, 0);
  const tarix = await (await api('/api/narxlar/tarix', { token: T })).json();
  assert.equal(tarix.length, 5);
  const ust = tarix.find(x => x.kalit === 'ustama.foiz');
  assert.equal(ust.eski.qiymat, 35);
  assert.equal(ust.yangi.qiymat, 30);
  assert.ok(ust.kim && ust.vaqt);
  assert.equal(tarix.find(x => x.kalit === 'xizmatlar.780236010807').eski, null);
  /* xizmat o'chirilsa — unga bog'langan tanlov ham bo'shaydi (tarixda) */
  r = await api('/api/narxlar', { method: 'PUT', token: T, body: { xizmatlar: { '780236010807': null } } });
  assert.equal(r.status, 200);
  const g2 = await (await api('/api/narxlar')).json();
  assert.equal(g2.tanlov.raspil, null);
  assert.ok((await (await api('/api/narxlar/tarix', { token: T })).json()).some(x => x.kalit === 'tanlov.raspil' && x.eski === '780236010807' && x.yangi === null));
});
