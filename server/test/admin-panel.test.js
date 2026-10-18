/* Smart3D server — TZ-37 (1-faza): admin panel API. Admin bo'lmasa — 404 S3D-AUTH-006; furnitura bog'lash (koef, erp_id tekshiruvi),
 * tayyor promptlar (>= 50, uz matn), standart konstruksiya, audit va qaytarish; ochiq GET'lar. Vaqtinchalik bazada (asl bazaga tegmaydi). */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.join(__dirname, '..');
const ADMIN_PW = 'test-admin-panel-5';
let tmp, proc, base, adminT, ustaT;

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-admp-'));
  const db = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: ADMIN_PW, ADMIN_EMAIL: 'admin@smart3d.uz' }, stdio: 'pipe' });
  const port = 28000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), DB_PATH: db, JWT_SECRET: 'admp-test-' + 'q'.repeat(40), NODE_ENV: 'test' };
  delete env.ESKIZ_EMAIL; delete env.ESKIZ_PASSWORD;
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
after(() => { proc && proc.kill(); fs.rmSync(tmp, { recursive: true, force: true }); });

const api = (p, { method = 'GET', body, token } = {}) => fetch(base + p, {
  method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
  body: body !== undefined ? JSON.stringify(body) : undefined
});
const A = (p, o = {}) => api(p, { ...o, token: adminT });
const katalogdan = (n) => JSON.parse(fs.readFileSync(path.join(SERVER_DIR, '../app/data/furnitura-catalog.json'), 'utf8')).items.filter(x => x.uzs > 0).slice(0, n);

test('admin bo\'lmasa hamma /api/admin/* — 404 S3D-AUTH-006 (kirmagan ham, usta ham)', async () => {
  for (const [m, p, b] of [['GET', '/api/admin/furnitura-boglash'], ['PUT', '/api/admin/furnitura-boglash/X', {}], ['GET', '/api/admin/promptlar'], ['POST', '/api/admin/promptlar', {}],
    ['GET', '/api/admin/standart'], ['PUT', '/api/admin/standart', {}], ['GET', '/api/admin/audit'], ['POST', '/api/admin/qaytar/1']]) {
    for (const token of [undefined, ustaT]) {
      const r = await api(p, { method: m, body: b, token });
      assert.equal(r.status, 404, `${m} ${p} ${token ? 'usta' : 'mehmon'}`);
      assert.equal((await r.json()).code, 'S3D-AUTH-006');
    }
  }
});

test('ochiq GET: furnitura-boglash, promptlar, standart — kirmasdan', async () => {
  const f = await (await api('/api/furnitura-boglash')).json();
  assert.ok(Object.keys(f.links).length >= 20 && typeof f.koef === 'object');
  assert.equal(f.links['RU-1000'], '90001991');
  const s = await (await api('/api/standart')).json();
  assert.deepEqual([s.korpus.qalinlik, s.fasad.qalinlik, s.orqa.qalinlik, s.oyoqBalandlik, s.birikma, s.tag], [16, 16, 3, 100, 'konfirmat', 'oyoq']);
});

test('promptlar: jami >= 50, uz nom va matn bor, id takrorlanmaydi, kategoriyalar xona turi bo\'yicha', async () => {
  const j = await (await api('/api/promptlar')).json();
  const P = j.promptlar;
  assert.ok(P.length >= 50, 'soni ' + P.length);
  assert.equal(new Set(P.map(p => p.id)).size, P.length);
  assert.ok(P.every(p => p.nom.uz && p.nom.ru && p.nom.en && p.izoh.uz && p.kat), 'uz/ru/en nom va uz matn');
  assert.ok(P.filter(p => p.tur === 'matn').every(p => p.matn.uz.length >= 5 && p.matn.ru && p.matn.en));
  const kat = new Set(P.map(p => p.kat));
  for (const k of ['oshxona', 'yotoqxona', 'mehmonxona', 'bolalar', 'ofis']) assert.ok(kat.has(k), k);
  const matnlar = P.filter(p => p.tur === 'matn').map(p => p.matn.uz);
  for (const yoq of ['salom qalaysan', '3 4', 'bar peshtaxta aylana']) assert.ok(!matnlar.includes(yoq), yoq);
  assert.ok(!matnlar.some(m => /^tumba 500/.test(m)), 'katalogda yo\'q tumba kirmaydi');
  for (let i = 1; i < P.length; i++) assert.ok(P[i - 1].tartib <= P[i].tartib, 'tartib bo\'yicha');
});

test('furnitura bog\'lash: admin ro\'yxati (nom, narx, manba) va narxsiz', async () => {
  const j = await (await A('/api/admin/furnitura-boglash')).json();
  const x = j.links.find(l => l.kod === 'RU-1000');
  assert.ok(x && x.erp_id === '90001991' && x.koef === 1 && x.manba === 'fayl' && x.narx > 0 && x.nom);
  assert.ok(Array.isArray(j.narxsiz) && j.narxsiz.length > 0 && j.narxsiz.every(k => typeof k === 'string'));
  assert.ok(j.narxsiz.includes('BZ-evro_51mm_alkan'), 'egasi savoli narxsiz');
});

test('furnitura bog\'lash: PUT tekshiruvi (erp_id katalogda, koef 0<x<=1000, izoh)', async () => {
  const [k] = katalogdan(1);
  const put = (kod, body) => A('/api/admin/furnitura-boglash/' + kod, { method: 'PUT', body });
  let r = await put('TEST-1', { erp_id: '99999999', koef: 1 });
  assert.equal(r.status, 400); assert.equal((await r.json()).code, 'S3D-ADM-002');
  for (const koef of [0, -1, 1001, 'abc', {}, [1]]) {
    r = await put('TEST-1', { erp_id: k.id, koef });
    assert.equal(r.status, 400, 'koef ' + JSON.stringify(koef)); assert.equal((await r.json()).code, 'S3D-ADM-001');
  }
  r = await put('TEST-1', { erp_id: k.id, koef: 1, izoh: '<b>x</b>' });
  assert.equal(r.status, 400);
  r = await put('TEST-1', { erp_id: k.id, koef: 1, izoh: 'x'.repeat(301) });
  assert.equal(r.status, 400);
  r = await put('TEST-1', { koef: 1 });
  assert.equal(r.status, 400);
  r = await put('bad%20kod%27', { erp_id: k.id });
  assert.equal(r.status, 400);
  r = await A('/api/admin/furnitura-boglash/TEST-1', { method: 'PUT', body: '{"erp_id":' });   // buzilgan JSON — server o'chmaydi
  assert.ok([400].includes(r.status));
  assert.equal((await api('/api/health')).status, 200);
  assert.equal((await (await A('/api/admin/furnitura-boglash')).json()).links.some(l => l.kod === 'TEST-1'), false, 'xato kirishda hech narsa yozilmaydi');
});

test('furnitura bog\'lash: CRUD, ochiq GET da koef, DELETE faylga qaytaradi', async () => {
  const [k1, k2] = katalogdan(2);
  let r = await A('/api/admin/furnitura-boglash/TEST-2', { method: 'PUT', body: { erp_id: k1.id, koef: 0.5, izoh: 'juft narxi' } });
  assert.equal(r.status, 200);
  let pub = await (await api('/api/furnitura-boglash')).json();
  assert.equal(pub.links['TEST-2'], k1.id); assert.equal(pub.koef['TEST-2'], 0.5);
  let adm = (await (await A('/api/admin/furnitura-boglash')).json()).links.find(l => l.kod === 'TEST-2');
  assert.equal(adm.manba, 'baza'); assert.equal(adm.izoh, 'juft narxi'); assert.equal(adm.narx, k1.uzs);
  await A('/api/admin/furnitura-boglash/TEST-2', { method: 'PUT', body: { erp_id: k2.id, koef: '2' } });   // yangilash (son matn ko'rinishida ham)
  pub = await (await api('/api/furnitura-boglash')).json();
  assert.equal(pub.links['TEST-2'], k2.id); assert.equal(pub.koef['TEST-2'], 2);
  /* fayldagi bog'lashni bazada qayta yozish (baza ustun), keyin DELETE — faylga qaytadi */
  await A('/api/admin/furnitura-boglash/RU-1000', { method: 'PUT', body: { erp_id: k1.id, koef: 3 } });
  assert.equal((await (await api('/api/furnitura-boglash')).json()).links['RU-1000'], k1.id);
  r = await A('/api/admin/furnitura-boglash/RU-1000', { method: 'DELETE' });
  assert.equal((await r.json()).fayl, '90001991');
  pub = await (await api('/api/furnitura-boglash')).json();
  assert.equal(pub.links['RU-1000'], '90001991'); assert.equal(pub.koef['RU-1000'], undefined);
  r = await A('/api/admin/furnitura-boglash/YOQ-KOD', { method: 'DELETE' });
  assert.equal(r.status, 404); assert.equal((await r.json()).code, 'S3D-ADM-008');
  await A('/api/admin/furnitura-boglash/TEST-2', { method: 'DELETE' });
  assert.equal((await (await api('/api/furnitura-boglash')).json()).links['TEST-2'], undefined);
});

test('promptlar: POST/PUT/DELETE, tekshiruv, ochiq GET ga ta\'siri', async () => {
  let r = await A('/api/admin/promptlar', { method: 'POST', body: { kat: 'oshxona', nom_uz: 'Test oshxona', matn_uz: 'oshxona 2 metr test' } });
  assert.equal(r.status, 201);
  const p = (await r.json()).prompt;
  assert.ok(/^[a-z0-9-]+$/.test(p.id) && p.faol === 1 && p.tartib > 0);
  let pub = (await (await api('/api/promptlar')).json()).promptlar.find(x => x.id === p.id);
  assert.equal(pub.nom.uz, 'Test oshxona'); assert.equal(pub.matn.ru, 'oshxona 2 metr test', 'ru yo\'q — uz');
  r = await A('/api/admin/promptlar', { method: 'POST', body: { id: p.id, kat: 'oshxona', nom_uz: 'x', matn_uz: 'y z q w e' } });
  assert.equal(r.status, 409); assert.equal((await r.json()).code, 'S3D-ADM-009');
  for (const b of [{ kat: 'oshxona', nom_uz: 'x' }, { kat: 'Katta', nom_uz: 'x', matn_uz: 'yyyyy' }, { kat: 'boshqa', nom_uz: 'x', matn_uz: 'yyyyy' }, { kat: 'boshqa', nom_uz: 'x', matn_uz: 'yyyyy' }, { kat: 'oshxona', nom_uz: '<b>', matn_uz: 'yyyyy' },
    { kat: 'oshxona', nom_uz: 'x', matn_uz: 'y'.repeat(2001) }, { kat: 'oshxona', nom_uz: 5, matn_uz: 'yyyyy' }, { kat: 'oshxona', nom_uz: 'x', matn_uz: 'yyyyy', tartib: -3 }, { kat: 'oshxona', nom_uz: 'x', matn_uz: 'yyyyy', faol: 'ha' }]) {
    r = await A('/api/admin/promptlar', { method: 'POST', body: b });
    assert.equal(r.status, 400, JSON.stringify(b)); assert.equal((await r.json()).code, 'S3D-ADM-003');
  }
  r = await A('/api/admin/promptlar/' + p.id, { method: 'PUT', body: { nom_ru: 'Тест кухня', matn_en: 'kitchen 2 m test', faol: 0 } });
  assert.equal(r.status, 200);
  pub = (await (await api('/api/promptlar')).json()).promptlar.find(x => x.id === p.id);
  assert.equal(pub, undefined, 'faol 0 — ochiq ro\'yxatda yo\'q');
  await A('/api/admin/promptlar/' + p.id, { method: 'PUT', body: { faol: true } });
  pub = (await (await api('/api/promptlar')).json()).promptlar.find(x => x.id === p.id);
  assert.equal(pub.nom.ru, 'Тест кухня'); assert.equal(pub.matn.en, 'kitchen 2 m test');
  /* fayldagi prompt: o'chirib bo'lmaydi, lekin yashirish (faol 0) mumkin; parametrli maydonlar saqlanadi */
  r = await A('/api/admin/promptlar/oshxona-l', { method: 'PUT', body: { nom_ru: 'Угловая кухня' } });
  assert.equal(r.status, 200);
  const oL = (await (await api('/api/promptlar')).json()).promptlar.find(x => x.id === 'oshxona-l');
  assert.equal(oL.nom.ru, 'Угловая кухня'); assert.ok(oL.maydon && oL.usul, 'usul/maydon saqlangan');
  r = await A('/api/admin/promptlar/yoq-id', { method: 'PUT', body: { nom_uz: 'x' } });
  assert.equal(r.status, 404); assert.equal((await r.json()).code, 'S3D-ADM-004');
  assert.equal((await A('/api/admin/promptlar/' + p.id, { method: 'DELETE' })).status, 200);
  assert.equal((await A('/api/admin/promptlar/' + p.id, { method: 'DELETE' })).status, 404);
  assert.ok((await (await api('/api/promptlar')).json()).promptlar.length >= 50);
});

test('standart konstruksiya: PUT tekshiruvi, saqlash, ochiq GET', async () => {
  let r = await A('/api/admin/standart', { method: 'PUT', body: { korpus: { nom: 'LDSP', qalinlik: 18 }, oyoqBalandlik: 120, birikma: 'ekssentrik', ruchka: { tur: 'uzun', uzunlik: 1000 } } });
  assert.equal(r.status, 200);
  const s = await r.json();
  assert.equal(s.korpus.qalinlik, 18); assert.equal(s.fasad.qalinlik, 16, 'aytilmagan — sukut');
  assert.deepEqual(await (await api('/api/standart')).json(), s);
  assert.deepEqual(await (await A('/api/admin/standart')).json(), s);
  for (const b of [{ korpus: { nom: 'LDSP', qalinlik: 0 } }, { korpus: { nom: '<x>', qalinlik: 16 } }, { korpus: 5 }, { oyoqBalandlik: 'baland' }, { tag: 'tekis' }, { birikma: 'mix' },
    { ruchka: { tur: 'x', uzunlik: 50 } }, { fasad: { nom: 'x'.repeat(61), qalinlik: 16 } }, [], 'matn', null]) {
    r = await A('/api/admin/standart', { method: 'PUT', body: b });
    assert.equal(r.status, 400, JSON.stringify(b)); assert.ok(['S3D-ADM-005', 'S3D-VAL-002'].includes((await r.json()).code));   // 'matn', null — JSON tahlilchi (VAL-002)
  }
  assert.deepEqual(await (await api('/api/standart')).json(), s, 'xato PUT standartni o\'zgartirmaydi');
});

test('audit va qaytarish: har yozuv jurnalda, qaytarish eski holatga, bir marta', async () => {
  const [k1, k2] = katalogdan(2);
  await A('/api/admin/furnitura-boglash/AUD-1', { method: 'PUT', body: { erp_id: k1.id, koef: 1 } });
  await A('/api/admin/furnitura-boglash/AUD-1', { method: 'PUT', body: { erp_id: k2.id, koef: 4, izoh: 'ikkinchi' } });
  let au = await (await A('/api/admin/audit?bolim=furnitura&limit=5')).json();
  assert.ok(Array.isArray(au) && au.length >= 2 && au.every(x => x.bolim === 'furnitura'));
  const oxirgi = au.find(x => x.kalit === 'AUD-1');
  assert.deepEqual([oxirgi.eski.erp_id, oxirgi.yangi.erp_id, oxirgi.yangi.koef], [k1.id, k2.id, 4]);
  assert.ok(oxirgi.kim && oxirgi.vaqt && oxirgi.qaytarilgan === false);
  let r = await A('/api/admin/qaytar/' + oxirgi.id, { method: 'POST' });
  assert.equal(r.status, 200);
  const pub = await (await api('/api/furnitura-boglash')).json();
  assert.equal(pub.links['AUD-1'], k1.id); assert.equal(pub.koef['AUD-1'], undefined);
  r = await A('/api/admin/qaytar/' + oxirgi.id, { method: 'POST' });
  assert.equal(r.status, 409); assert.equal((await r.json()).code, 'S3D-ADM-007');
  /* birinchi yaratilgan yozuvni qaytarish (eski yo'q edi) — o'chiradi */
  const birinchi = (await (await A('/api/admin/audit?bolim=furnitura&limit=50')).json()).find(x => x.kalit === 'AUD-1' && x.eski === null);
  assert.equal((await A('/api/admin/qaytar/' + birinchi.id, { method: 'POST' })).status, 200);
  assert.equal((await (await api('/api/furnitura-boglash')).json()).links['AUD-1'], undefined);
  /* standart va prompt qaytarish */
  const std0 = await (await api('/api/standart')).json();
  await A('/api/admin/standart', { method: 'PUT', body: { ...std0, oyoqBalandlik: 150 } });
  const sa = (await (await A('/api/admin/audit?bolim=standart')).json())[0];
  assert.equal((await A('/api/admin/qaytar/' + sa.id, { method: 'POST' })).status, 200);
  assert.deepEqual(await (await api('/api/standart')).json(), std0);
  const pr = (await (await A('/api/admin/promptlar', { method: 'POST', body: { kat: 'ofis', nom_uz: 'Audit prompt', matn_uz: 'ofis 3x3 audit' } })).json()).prompt;
  const pa = (await (await A('/api/admin/audit?bolim=promptlar&limit=1')).json())[0];
  assert.equal(pa.kalit, pr.id);
  await A('/api/admin/qaytar/' + pa.id, { method: 'POST' });
  assert.equal((await A('/api/admin/promptlar/' + pr.id, { method: 'DELETE' })).status, 404, 'qaytarish yaratilganni o\'chirdi');
  /* noto'g'ri kirish */
  for (const p of ['/api/admin/qaytar/99999', '/api/admin/qaytar/abc', '/api/admin/qaytar/-1']) assert.equal((await A(p, { method: 'POST' })).status, 404, p);
  for (const q of ['?limit=0', '?limit=abc', '?limit=5000', '?bolim=A;DROP']) assert.equal((await A('/api/admin/audit' + q)).status, 400, q);
  assert.equal((await A('/api/admin/audit?limit=3')).status, 200);
});

test('sahifa: /admin va bo\'limlari ilova sahifasi (app.html) yo\'li ro\'yxatida', async () => {
  const { ILOVA_YOLI } = await import('../routes/sahifalar.js');
  for (const p of ['/admin', '/admin/', '/admin/narxlar', '/admin/furnitura', '/admin/promptlar', '/admin/standart', '/admin/tarix']) assert.ok(ILOVA_YOLI.test(p), p);
  for (const p of ['/admin/boshqa', '/admin/tarix/x', '/administrator']) assert.ok(!ILOVA_YOLI.test(p), p);
});
