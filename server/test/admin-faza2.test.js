/* Smart3D server — TZ-37 (2-faza): admin panel — Materiallar (Asosiy 100: rang, rasm, varaq narxi), Modullar katalogi (nom, yashirish, o'lcham
 * chegarasi, narx rejimi), Foydalanuvchilar / loyihalar / buyurtmalar (ko'rish, qidirish, bloklash). Vaqtinchalik bazada (asl bazaga tegmaydi, S8).
 * Tekshiriladi: admin bo'lmasa 404 S3D-AUTH-006; kirish tekshiruvi; ochiq GET'lar fayl ustiga baza qatlami; audit va qaytarish; CSRF (Origin);
 * bloklangan foydalanuvchi parol, SMS orqali kira olmaydi va ochiq kaliti yaroqsiz; admin va o'zini bloklab bo'lmaydi. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.join(__dirname, '..');
const DATA = path.join(SERVER_DIR, '../app/data');
const ADMIN_PW = 'test-admin-faza2-7';
let tmp, proc, base, dbPath, adminT, ustaA, ustaB, ipN = 0;
const ADMINLAR = [];                                   // bir nechta admin: har birining yozish chegarasi (60/daq) alohida — test tez ketadi
const J = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const shaOl = (f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(DATA, f))).digest('hex');
const MANBA = ['dekor-asosiy.json', 'rasmlar.json', 'sheet-catalog.json', 'materials-index.json', 'fragments.json', 'fragments-mc.json', 'appliances.json', 'sex-standartlari.json', 'nomlar.ru.json', 'nomlar.en.json'];
const FAYL_SHA = Object.fromEntries(MANBA.map(f => [f, shaOl(f)]));        // testdan oldin

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-adm2-'));
  const db = dbPath = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: ADMIN_PW, ADMIN_EMAIL: 'admin@smart3d.uz' }, stdio: 'pipe' });
  const port = 29000 + Math.floor(Math.random() * 900);
  base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), DB_PATH: db, JWT_SECRET: 'adm2-test-' + 'z'.repeat(40), NODE_ENV: 'test', TRUST_PROXY: '1' };           // TRUST_PROXY: har so'rovga X-Forwarded-For — umumiy IP chegarasi (300/daq) testni to'smasin
  delete env.ESKIZ_EMAIL; delete env.ESKIZ_PASSWORD;
  for (const k of ['AI_PROVIDER', 'AI_API_KEY', 'AI_MODEL', 'AI_BASE_URL', 'ANTHROPIC_API_KEY']) delete env[k];
  proc = spawn(process.execPath, ['index.js'], { cwd: SERVER_DIR, env });
  await new Promise((resolve, reject) => {
    let out = '';
    const t = setTimeout(() => reject(new Error('server ishga tushmadi: ' + out)), 8000);
    proc.stdout.on('data', d => { out += d; if (/Smart3D server:/.test(out)) { clearTimeout(t); resolve(); } });
    proc.stderr.on('data', d => { out += d; });
  });
  adminT = (await (await api('/api/login', { method: 'POST', body: { email: 'admin@smart3d.uz', password: ADMIN_PW } })).json()).token;
  const dbq = new Database(dbPath);
  const asl = dbq.prepare("SELECT password_hash FROM users WHERE email = 'admin@smart3d.uz'").get();
  for (let i = 2; i <= 5; i++) dbq.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')").run('Admin ' + i, `admin${i}@smart3d.uz`, asl.password_hash);
  dbq.close();
  ADMINLAR.push(adminT);
  for (let i = 2; i <= 5; i++) ADMINLAR.push((await (await api('/api/login', { method: 'POST', body: { email: `admin${i}@smart3d.uz`, password: ADMIN_PW } })).json()).token);
  ustaA = await smsKirish('998901234567', 'Aziz Usta');
  ustaB = await smsKirish('998935551122', 'Bobur Usta');
});
after(() => { proc && proc.kill(); fs.rmSync(tmp, { recursive: true, force: true }); });

const api = (p, { method = 'GET', body, token, headers = {} } = {}) => fetch(base + p, {
  method, headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.9.${Math.floor(ipN++ / 40) % 250}.1`, ...(token ? { authorization: 'Bearer ' + token } : {}), ...headers },
  body: body !== undefined ? JSON.stringify(body) : undefined
});
let adminN = 0;
const A = (p, o = {}) => api(p, { ...o, token: ADMINLAR[adminN++ % ADMINLAR.length] });
async function smsKirish(tel, name) {
  const { dev_code } = await (await api('/api/auth/sms/send', { method: 'POST', body: { phone: tel } })).json();
  const j = await (await api('/api/auth/sms/verify', { method: 'POST', body: { phone: tel, code: dev_code, name } })).json();
  return { token: j.token, id: j.user.id, tel };
}
const LOYIHA = { doc: { room: { outline: [[0, 0], [3000, 0], [3000, 2500], [0, 2500]] }, placements: [{ id: 'p1', frg: 'MC-KP-02', x: 0, y: 0, z: 100, w: 600, d: 450, h: 708 }, { id: 'p2', frg: 'MC-KP-01', x: 600, y: 0, z: 100, w: 600, d: 450, h: 708 }] } };
const kod = (c) => encodeURIComponent(c);
const KALIT = 'белый гладкий';                       // dekor-asosiy.json: 1-dekor
const png = () => Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const sqlOch = () => new Database(dbPath);
const auditOxirgi = async (bolim, kalit) => (await (await A('/api/admin/audit?bolim=' + bolim + '&limit=50')).json()).find(x => x.kalit === kalit);

test('admin bo\'lmasa hamma yangi /api/admin/* — 404 S3D-AUTH-006 (kirmagan ham, usta ham)', async () => {
  const yo = [['GET', '/api/admin/materiallar'], ['PUT', `/api/admin/materiallar/dekor/${kod(KALIT)}`, {}], ['DELETE', `/api/admin/materiallar/dekor/${kod(KALIT)}`],
    ['PUT', `/api/admin/materiallar/dekor/${kod(KALIT)}/rasm`, {}], ['DELETE', `/api/admin/materiallar/dekor/${kod(KALIT)}/rasm`], ['PUT', '/api/admin/materiallar/narx/ERP-x', {}],
    ['DELETE', '/api/admin/materiallar/narx/ERP-x'], ['GET', '/api/admin/katalog'], ['PUT', '/api/admin/katalog/SP-K-001', {}], ['DELETE', '/api/admin/katalog/SP-K-001'],
    ['GET', '/api/admin/foydalanuvchilar'], ['GET', '/api/admin/foydalanuvchilar/1'], ['PUT', '/api/admin/foydalanuvchilar/2/blok', {}],
    ['GET', '/api/admin/loyihalar'], ['GET', '/api/admin/buyurtmalar']];
  for (const [m, p, b] of yo) for (const token of [undefined, ustaA.token]) {
    const r = await api(p, { method: m, body: b, token });
    assert.equal(r.status, 404, `${m} ${p} ${token ? 'usta' : 'mehmon'}`);
    assert.equal((await r.json()).code, 'S3D-AUTH-006');
  }
});

test('ochiq GET: /api/materiallar va /api/katalog — kirmasdan, boshida bo\'sh (hammasi fayldagidek)', async () => {
  assert.deepEqual(await (await api('/api/materiallar')).json(), { dekor: {}, narx: {} });
  assert.deepEqual(await (await api('/api/katalog')).json(), { modullar: {} });
  assert.equal((await api('/api/materiallar/rasm/' + kod(KALIT))).status, 404);
});

/* ═══════════ MATERIALLAR ═══════════ */
test('materiallar: ro\'yxat — 100 dekor, har birida rang, ERP varaqlari va fayl narxi; boshlang\'ich manba "fayl"', async () => {
  const j = await (await A('/api/admin/materiallar')).json();
  assert.equal(j.dekorlar.length, 100);
  const e = j.dekorlar[0];
  assert.equal(e.kalit, KALIT);
  assert.ok(/^#[0-9a-f]{6}$/.test(e.rang) && e.rang === e.rang_fayl && e.rang_manba === 'fayl' && !e.tahrir);
  assert.ok(e.variantlar.length >= 1 && e.variantlar.every(v => /^ERP-/.test(v.kod) && v.nom && v.narx_fayl > 0 && v.narx === v.narx_fayl && v.narx_manba === 'fayl'));
  assert.equal(j.dekorlar.reduce((a, d) => a + d.variantlar.length, 0), 175, 'dekor-asosiy.json: 175 ERP varaq');
  assert.ok(j.dekorlar.some(d => d.rasm && d.rasm.manba === 'fayl' && d.rasm.url.startsWith('/data/rasm/material/')), 'fayldagi rasmlar');
  assert.ok(!JSON.stringify(j).includes('password'), 'maxfiy maydon yo\'q');
});

test('materiallar: rang — tekshiruv, saqlash, ochiq GET, fayldagiga qaytarish', async () => {
  const put = (k, body) => A(`/api/admin/materiallar/dekor/${kod(k)}`, { method: 'PUT', body });
  for (const rang_hex of ['red', '#fff', '#gggggg', '#1234567', 123456, null, {}, ['#aabbcc']]) {
    const r = await put(KALIT, { rang_hex });
    assert.equal(r.status, 400, JSON.stringify(rang_hex)); assert.equal((await r.json()).code, 'S3D-ADM-012');
  }
  assert.equal((await put(KALIT, {})).status, 400);
  const yoq = await put('yo\'q dekor', { rang_hex: '#aabbcc' });
  assert.equal(yoq.status, 404); assert.equal((await yoq.json()).code, 'S3D-ADM-011');
  const r = await put(KALIT, { rang_hex: '#AABBCC' });
  assert.equal(r.status, 200); assert.equal((await r.json()).rang_hex, '#aabbcc');
  assert.equal((await (await api('/api/materiallar')).json()).dekor[KALIT].rang_hex, '#aabbcc');
  const e = (await (await A('/api/admin/materiallar')).json()).dekorlar[0];
  assert.deepEqual([e.rang, e.rang_manba, e.rang_ishonch, e.tahrir], ['#aabbcc', 'baza', 'aniq', true]);
  assert.ok(e.rang_fayl !== '#aabbcc', 'fayldagi qiymat o\'zgarmadi');
  assert.equal(J('dekor-asosiy.json').items[0].rang_hex, e.rang_fayl, 'fayl o\'zgarmagan');
  const a = await auditOxirgi('materiallar', 'dekor:' + KALIT);
  assert.ok(a && a.yangi.rang_hex === '#aabbcc' && a.eski === null && a.kim);
  const d = await A(`/api/admin/materiallar/dekor/${kod(KALIT)}`, { method: 'DELETE' });
  assert.equal(d.status, 200);
  assert.deepEqual(await (await api('/api/materiallar')).json(), { dekor: {}, narx: {} });
  const d2 = await A(`/api/admin/materiallar/dekor/${kod(KALIT)}`, { method: 'DELETE' });
  assert.equal(d2.status, 404); assert.equal((await d2.json()).code, 'S3D-ADM-016');
});

test('materiallar: rasm — turi baytlardan aniqlanadi, hajm 600 KB, ochiq GET rasmni beradi (ETag, nosniff), o\'chirish', async () => {
  const yukla = (data) => A(`/api/admin/materiallar/dekor/${kod(KALIT)}/rasm`, { method: 'PUT', body: { data } });
  const yomon = [Buffer.from('salom dunyo, bu rasm emas').toString('base64'), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64'),
    'AAAA!!!', '', 123, Buffer.concat([png().subarray(0, 8), Buffer.alloc(700 * 1024)]).toString('base64'), 'a'.repeat(900 * 1024)];
  for (const d of yomon) {
    const r = await yukla(d);
    assert.equal(r.status, 400, String(d).slice(0, 20)); assert.equal((await r.json()).code, 'S3D-ADM-013');
  }
  assert.equal((await (await api('/api/materiallar')).json()).dekor[KALIT], undefined, 'xato rasm saqlanmadi');
  const ok = await yukla('data:image/png;base64,' + png().toString('base64'));
  assert.equal(ok.status, 200);
  const oj = await ok.json();
  assert.equal(oj.mime, 'image/png'); assert.equal(oj.hajm, png().length);
  const pub = (await (await api('/api/materiallar')).json()).dekor[KALIT];
  assert.ok(pub.rasm.startsWith('api/materiallar/rasm/' + kod(KALIT) + '?v='), pub.rasm);
  const img = await api('/' + pub.rasm);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png'); assert.equal(img.headers.get('x-content-type-options'), 'nosniff');
  assert.match(img.headers.get('cache-control'), /immutable/);
  assert.ok(Buffer.from(await img.arrayBuffer()).equals(png()));
  const kesh = await api('/' + pub.rasm, { headers: { 'if-none-match': img.headers.get('etag') } });
  assert.equal(kesh.status, 304);
  assert.match((await api('/api/materiallar/rasm/' + kod(KALIT))).headers.get('cache-control'), /no-cache/, 'versiyasiz so\'rov keshlanmaydi');
  const e = (await (await A('/api/admin/materiallar')).json()).dekorlar[0];
  assert.deepEqual([e.rasm.manba, e.rasm.mime, e.tahrir], ['baza', 'image/png', true]);
  /* qaytarish: yangi qo'shilgan rasmni olib tashlaydi; almashtirilgan rasmni qaytarib bo'lmaydi (baytlar saqlanmaydi) */
  const a1 = await auditOxirgi('materiallar', 'rasm:' + KALIT);
  assert.ok(a1 && a1.eski === null && a1.yangi.mime === 'image/png' && a1.yangi.sha.length === 64);
  assert.equal((await A('/api/admin/qaytar/' + a1.id, { method: 'POST' })).status, 200);
  assert.equal((await api('/api/materiallar/rasm/' + kod(KALIT))).status, 404);
  await yukla(png().toString('base64'));
  const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40, 1)]);
  assert.equal((await yukla(jpg.toString('base64'))).status, 200, 'JPEG');
  const a2 = await auditOxirgi('materiallar', 'rasm:' + KALIT);
  assert.ok(a2.eski && a2.eski.mime === 'image/png');
  const q = await A('/api/admin/qaytar/' + a2.id, { method: 'POST' });
  assert.equal(q.status, 409); assert.equal((await q.json()).code, 'S3D-ADM-007');
  assert.equal((await A(`/api/admin/materiallar/dekor/${kod(KALIT)}/rasm`, { method: 'DELETE' })).status, 200);
  assert.equal((await A(`/api/admin/materiallar/dekor/${kod(KALIT)}/rasm`, { method: 'DELETE' })).status, 404);
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([1, 0, 0, 0]), Buffer.from('WEBPVP8 '), Buffer.alloc(20)]);
  const w = await yukla(webp.toString('base64'));
  assert.equal(w.status, 200); assert.equal((await w.json()).mime, 'image/webp');
  await A(`/api/admin/materiallar/dekor/${kod(KALIT)}/rasm`, { method: 'DELETE' });
});

test('materiallar: varaq narxi — tekshiruv, ochiq GET, hisobga qo\'yiladigan qatlam, qaytarish', async () => {
  const e0 = (await (await A('/api/admin/materiallar')).json()).dekorlar[0], v = e0.variantlar[0];
  const put = (k, body) => A('/api/admin/materiallar/narx/' + kod(k), { method: 'PUT', body });
  for (const uzs of [0, -5, 1.5, 'abc', '', null, 60e6, [1], {}, '1e5']) {
    const r = await put(v.kod, { uzs });
    assert.equal(r.status, 400, JSON.stringify(uzs)); assert.equal((await r.json()).code, 'S3D-ADM-012');
  }
  const yoq = await put('ERP-yoq', { uzs: 1000 });
  assert.equal(yoq.status, 404); assert.equal((await yoq.json()).code, 'S3D-ADM-011');
  const yangi = v.narx_fayl + 12345;
  assert.equal((await put(v.kod, { uzs: String(yangi) })).status, 200, 'raqamli satr ham');
  assert.deepEqual((await (await api('/api/materiallar')).json()).narx, { [v.kod]: yangi });
  const e = (await (await A('/api/admin/materiallar')).json()).dekorlar[0];
  const x = e.variantlar.find(z => z.kod === v.kod);
  assert.deepEqual([x.narx, x.narx_fayl, x.narx_manba, e.tahrir], [yangi, v.narx_fayl, 'baza', true]);
  assert.equal(J('sheet-catalog.json').sheets.find(s => s.name === v.nom && s.sku === v.sku).uzs, v.narx_fayl, 'fayl o\'zgarmadi');
  const a = await auditOxirgi('materiallar', 'narx:' + v.kod);
  assert.ok(a && a.yangi.uzs === yangi && a.eski === null);
  assert.equal((await put(v.kod, { uzs: yangi + 1 })).status, 200);
  const a2 = await auditOxirgi('materiallar', 'narx:' + v.kod);
  assert.deepEqual([a2.eski.uzs, a2.yangi.uzs], [yangi, yangi + 1]);
  assert.equal((await A('/api/admin/qaytar/' + a2.id, { method: 'POST' })).status, 200);
  assert.equal((await (await api('/api/materiallar')).json()).narx[v.kod], yangi, 'qaytarish oldingi admin narxiga');
  assert.equal((await A('/api/admin/qaytar/' + a2.id, { method: 'POST' })).status, 409, 'bir marta');
  const d = await A('/api/admin/materiallar/narx/' + kod(v.kod), { method: 'DELETE' });
  assert.equal(d.status, 200); assert.equal((await d.json()).narx_fayl, v.narx_fayl);
  assert.deepEqual((await (await api('/api/materiallar')).json()).narx, {});
  assert.equal((await A('/api/admin/materiallar/narx/' + kod(v.kod), { method: 'DELETE' })).status, 404);
});

/* ═══════════ KATALOG ═══════════ */
test('katalog: ro\'yxat — fayl katalogi (+ texnika), chegara (fayl + sex standarti), narx rejimi', async () => {
  const j = await (await A('/api/admin/katalog')).json();
  const fayl = new Set([...J('fragments.json'), ...J('fragments-mc.json').fragments].map(f => f.code));
  for (const f of ['fragments-fr.json']) if (fs.existsSync(path.join(DATA, f))) for (const x of J(f).fragments) fayl.add(x.code);
  for (const a of J('appliances.json').appliances) fayl.add(a.code);
  assert.equal(j.modullar.length, fayl.size);
  assert.deepEqual(new Set(j.modullar.map(m => m.kod)), fayl);
  const m = j.modullar.find(z => z.kod === 'SP-K-001');
  assert.ok(m && m.nom_fayl && m.kategoriya === 'cabinet' && m.narx_rejim === 'unit' && !m.yashirin && !m.tahrir && m.nom.uz === '');
  assert.ok(m.chegara.min_d > 0 && m.chegara.max_d > 0, 'o\'lcham chegarasi');
  assert.deepEqual(m.chegara, m.chegara_fayl); assert.deepEqual(m.chegara_baza, {});
  assert.ok(j.modullar.some(z => z.texnika) && j.modullar.filter(z => z.narx_rejim_fayl === 'm2').length >= 1);
});

test('katalog: PUT tekshiruvi — nom, yashirin, chegara (butun 1…20000, min<=max), narx rejimi, texnika, noma\'lum modul', async () => {
  const put = (k, body) => A('/api/admin/katalog/' + kod(k), { method: 'PUT', body });
  const yaxshiXato = async (k, body, kodX = 'S3D-ADM-015', st = 400) => { const r = await put(k, body); assert.equal(r.status, st, JSON.stringify(body)); assert.equal((await r.json()).code, kodX); };
  await yaxshiXato('YO-Q', { yashirin: true }, 'S3D-ADM-014', 404);
  for (const b of [{}, { boshqa: 1 }, { yashirin: 'ha' }, { yashirin: 1 }, { nom_uz: 5 }, { nom_uz: '<b>x</b>' }, { nom_ru: 'x'.repeat(121) }, { min_w: 0 }, { min_w: -1 },
    { min_w: 20001 }, { min_w: 100.5 }, { min_w: '300' }, { max_d: [] }, { narx_rejim: 'kg' }, { narx_rejim: 5 }]) await yaxshiXato('SP-K-001', b);
  const asl = (await (await A('/api/admin/katalog')).json()).modullar.find(z => z.kod === 'SP-K-001');
  await yaxshiXato('SP-K-001', { min_w: 900, max_w: 800 });                                 // min > max
  await yaxshiXato('SP-K-001', { min_w: asl.chegara.max_w + 100 });                         // yangi min fayldagi max dan katta
  const texnika = (await (await A('/api/admin/katalog')).json()).modullar.find(z => z.texnika);
  await yaxshiXato(texnika.kod, { min_w: 100 }); await yaxshiXato(texnika.kod, { narx_rejim: 'm2' });
  assert.equal((await put(texnika.kod, { nom_ru: 'Техника', yashirin: true })).status, 200, 'texnika: nom va ko\'rinish ruxsat');
  await A('/api/admin/katalog/' + kod(texnika.kod), { method: 'DELETE' });
  assert.deepEqual(await (await api('/api/katalog')).json(), { modullar: {} }, 'xato kirishlarda hech narsa yozilmaydi');
  assert.equal((await api('/api/health')).status, 200);
});

test('katalog: saqlash, qisman yangilash, ochiq GET, ustunlik (admin > sex standarti), butunlay faylga qaytarish', async () => {
  const put = (k, body) => A('/api/admin/katalog/' + kod(k), { method: 'PUT', body });
  const m0 = (await (await A('/api/admin/katalog')).json()).modullar.find(z => z.kod === 'SP-K-001');
  assert.equal((await put('SP-K-001', { nom_uz: 'Yangi nom', nom_ru: 'Новое имя', nom_en: '  New name ', yashirin: true, min_w: 350, max_w: 950, narx_rejim: 'm2' })).status, 200);
  assert.deepEqual((await (await api('/api/katalog')).json()).modullar['SP-K-001'], { nom_uz: 'Yangi nom', nom_ru: 'Новое имя', nom_en: 'New name', yashirin: true, min_w: 350, max_w: 950, price_mode: 'm2' });
  let m = (await (await A('/api/admin/katalog')).json()).modullar.find(z => z.kod === 'SP-K-001');
  assert.deepEqual([m.nom.uz, m.yashirin, m.chegara.min_w, m.chegara.max_w, m.chegara.min_d, m.narx_rejim, m.tahrir], ['Yangi nom', true, 350, 950, m0.chegara.min_d, 'm2', true]);
  assert.deepEqual(m.chegara_fayl, m0.chegara_fayl, 'fayl/sex chegarasi o\'zgarmagan'); assert.deepEqual(m.chegara_baza, { min_w: 350, max_w: 950 });
  assert.equal(m.narx_rejim_fayl, 'unit');
  /* qisman: faqat nom_ru o'zgaradi, qolganlari turadi; null — shu maydon fayldagidek */
  assert.equal((await put('SP-K-001', { nom_ru: 'Другое', min_w: null, yashirin: null })).status, 200);
  assert.deepEqual((await (await api('/api/katalog')).json()).modullar['SP-K-001'], { nom_uz: 'Yangi nom', nom_ru: 'Другое', nom_en: 'New name', max_w: 950, price_mode: 'm2' });
  /* hamma maydon tozalansa — qator o'chadi */
  assert.equal((await put('SP-K-001', { nom_uz: null, nom_ru: '', nom_en: null, max_w: null, narx_rejim: null })).status, 200);
  assert.deepEqual(await (await api('/api/katalog')).json(), { modullar: {} });
  assert.equal(db1().prepare('SELECT COUNT(*) AS n FROM katalog_admin').get().n, 0);
  /* butunlay qaytarish */
  await put('SP-K-001', { yashirin: true, min_d: 400 });
  assert.equal((await A('/api/admin/katalog/SP-K-001', { method: 'DELETE' })).status, 200);
  const d2 = await A('/api/admin/katalog/SP-K-001', { method: 'DELETE' });
  assert.equal(d2.status, 404); assert.equal((await d2.json()).code, 'S3D-ADM-016');
  assert.deepEqual(await (await api('/api/katalog')).json(), { modullar: {} });
});
const db1 = () => sqlOch();

test('katalog: audit va qaytarish (qiymat, yaratilgan qator, o\'chirilgan qator)', async () => {
  const put = (k, body) => A('/api/admin/katalog/' + kod(k), { method: 'PUT', body });
  await put('SP-K-001', { yashirin: true });
  await put('SP-K-001', { min_d: 410, nom_ru: 'Тест' });
  const a2 = await auditOxirgi('katalog', 'SP-K-001');
  assert.deepEqual([a2.eski.yashirin, a2.yangi.min_d, a2.yangi.nom_ru, a2.yangi.yashirin], [1, 410, 'Тест', 1]);
  assert.equal((await A('/api/admin/qaytar/' + a2.id, { method: 'POST' })).status, 200);
  assert.deepEqual((await (await api('/api/katalog')).json()).modullar['SP-K-001'], { yashirin: true }, 'oldingi holatga');
  const a1 = (await (await A('/api/admin/audit?bolim=katalog&limit=50')).json()).filter(x => x.kalit === 'SP-K-001').pop();
  assert.equal(a1.eski, null);
  /* birinchi yozuvni qaytarish: eski yo'q edi — qator o'chadi */
  assert.equal((await A('/api/admin/qaytar/' + a1.id, { method: 'POST' })).status, 200);
  assert.deepEqual(await (await api('/api/katalog')).json(), { modullar: {} });
  /* DELETE ni qaytarish: qator tiklanadi */
  await put('SP-K-001', { max_h: 2500, narx_rejim: 'mm' });
  await A('/api/admin/katalog/SP-K-001', { method: 'DELETE' });
  const ad = await auditOxirgi('katalog', 'SP-K-001');
  assert.ok(ad.eski && ad.yangi === null);
  assert.equal((await A('/api/admin/qaytar/' + ad.id, { method: 'POST' })).status, 200);
  assert.deepEqual((await (await api('/api/katalog')).json()).modullar['SP-K-001'], { max_h: 2500, price_mode: 'mm' });
  await A('/api/admin/katalog/SP-K-001', { method: 'DELETE' });
});

/* ═══════════ FOYDALANUVCHILAR ═══════════ */
test('foydalanuvchilar: ro\'yxat, qidirish (ism, telefon raqamlari, #id), holat/rol, sahifalash; maxfiy maydonlar yo\'q', async () => {
  await api('/api/projects', { method: 'POST', token: ustaA.token, body: { name: 'Oshxona A', client: 'Mijoz Karimov', doc: LOYIHA, total_price: 5334289 } });
  await api('/api/orders', { method: 'POST', token: ustaA.token, body: { client_name: 'Karimov', client_phone: '+998 90 777 66 55', project_name: 'Oshxona A', total_price: 5334289, doc: LOYIHA } });
  const L = async (q = '') => (await (await A('/api/admin/foydalanuvchilar' + q)).json());
  const j = await L();
  assert.ok(j.jami >= 3 && j.items.length === j.jami && j.limit === 50 && j.offset === 0);
  assert.ok(j.items.every(u => !('password_hash' in u) && !('token_version' in u) && !('settings_json' in u)));
  const a = j.items.find(u => u.id === ustaA.id);
  assert.deepEqual([a.name, a.phone, a.role, a.bloklangan, a.loyihalar, a.buyurtmalar], ['Aziz Usta', '998901234567', 'user', false, 1, 1]);
  assert.ok(j.items.filter(u => u.role === 'admin').some(u => u.email === 'admin@smart3d.uz'));
  assert.deepEqual((await L('?q=Bobur')).items.map(u => u.id), [ustaB.id]);
  assert.deepEqual((await L('?q=' + encodeURIComponent('+998 93 555'))).items.map(u => u.id), [ustaB.id], 'telefon raqamlari bo\'yicha');
  assert.deepEqual((await L('?q=' + encodeURIComponent('#' + ustaA.id))).items.map(u => u.id), [ustaA.id]);
  assert.equal((await L('?q=' + encodeURIComponent('%'))).jami, 0, 'LIKE belgilari oddiy matn');
  assert.equal((await L('?q=' + encodeURIComponent('x\' OR 1=1 --'))).jami, 0);
  assert.equal((await L('?rol=admin')).jami, ADMINLAR.length);
  assert.equal((await L('?holat=bloklangan')).jami, 0);
  const s = await L('?limit=1&offset=1');
  assert.deepEqual([s.items.length, s.jami >= 3, s.limit, s.offset], [1, true, 1, 1]);
  for (const q of ['?limit=0', '?limit=201', '?limit=abc', '?offset=-1', '?rol=root', '?holat=x', '?q=' + 'a'.repeat(101), '?q[]=1']) assert.equal((await A('/api/admin/foydalanuvchilar' + q)).status, 400, q);
  const d = await (await A('/api/admin/foydalanuvchilar/' + ustaA.id)).json();
  assert.equal(d.loyihalar_royxat[0].name, 'Oshxona A'); assert.equal(d.loyihalar_royxat[0].modullar, 2); assert.equal(d.loyihalar_royxat[0].archived, false);
  assert.deepEqual([d.buyurtmalar_royxat[0].client_phone, d.buyurtmalar_royxat[0].status, d.buyurtmalar_royxat[0].modullar], ['998907776655', 'yangi', 2]);
  assert.ok(!JSON.stringify(d).includes('doc_json') && !JSON.stringify(d).includes('password'));
  for (const id of ['99999', 'abc', '-1', '1e3']) { const r = await A('/api/admin/foydalanuvchilar/' + id); assert.equal(r.status, 404, id); assert.equal((await r.json()).code, 'S3D-AUTH-007'); }
});

test('loyihalar va buyurtmalar: umumiy ro\'yxat, qidirish, holat; hujjat (doc_json) javobda yo\'q', async () => {
  const lj = await (await A('/api/admin/loyihalar')).json();
  const p = lj.items.find(x => x.name === 'Oshxona A');
  assert.ok(p && p.usta === 'Aziz Usta' && p.usta_phone === '998901234567' && p.modullar === 2 && p.client === 'Mijoz Karimov' && p.total_price === 5334289 && p.archived === false);
  assert.ok(!JSON.stringify(lj).includes('doc_json') && !JSON.stringify(lj).includes('placements'));
  for (const q of ['Oshxona', 'Karimov', 'Aziz']) assert.ok((await (await A('/api/admin/loyihalar?q=' + q)).json()).items.some(x => x.id === p.id), q);
  assert.equal((await (await A('/api/admin/loyihalar?user=' + ustaB.id)).json()).jami, 0);
  assert.equal((await (await A('/api/admin/loyihalar?user=' + ustaA.id + '&arxiv=0')).json()).jami, 1);
  assert.equal((await (await A('/api/admin/loyihalar?arxiv=1')).json()).jami, 0);
  for (const q of ['?user=abc', '?arxiv=2', '?limit=0']) assert.equal((await A('/api/admin/loyihalar' + q)).status, 400, q);
  const bj = await (await A('/api/admin/buyurtmalar')).json();
  const o = bj.items[0];
  assert.deepEqual([o.client_name, o.client_phone, o.status, o.usta, o.modullar, o.project_name], ['Karimov', '998907776655', 'yangi', 'Aziz Usta', 2, 'Oshxona A']);
  assert.ok(!JSON.stringify(bj).includes('doc_json') && !JSON.stringify(bj).includes('placements'));
  for (const q of ['Karimov', '777 66', '90 123', '#' + o.id, 'Aziz']) assert.equal((await (await A('/api/admin/buyurtmalar?q=' + encodeURIComponent(q))).json()).jami, 1, q);
  assert.equal((await (await A('/api/admin/buyurtmalar?holat=yangi')).json()).jami, 1);
  assert.equal((await (await A('/api/admin/buyurtmalar?holat=tayyor')).json()).jami, 0);
  assert.equal((await A('/api/admin/buyurtmalar?holat=boshqa')).status, 400);
});

test('bloklash: tekshiruv; admin va o\'zini bloklab bo\'lmaydi; bloklangan — ochiq kalit yaroqsiz, parol/SMS bilan kira olmaydi; ochilsa — kiradi', async () => {
  const blok = (id, body) => A(`/api/admin/foydalanuvchilar/${id}/blok`, { method: 'PUT', body });
  const adminId = (await (await A('/api/admin/foydalanuvchilar?rol=admin')).json()).items[0].id;
  for (const b of [{}, { bloklangan: 'ha' }, { bloklangan: 1 }, { bloklangan: true, sabab: '<b>x</b>' }, { bloklangan: true, sabab: 'x'.repeat(201) }, { bloklangan: true, sabab: 5 }]) {
    const r = await blok(ustaB.id, b); assert.equal(r.status, 400, JSON.stringify(b)); assert.equal((await r.json()).code, 'S3D-ADM-001');
  }
  for (const id of [adminId]) { const r = await blok(id, { bloklangan: true }); assert.equal(r.status, 409); assert.equal((await r.json()).code, 'S3D-ADM-017'); }
  assert.equal((await blok(99999, { bloklangan: true })).status, 404);
  assert.equal((await (await A('/api/admin/foydalanuvchilar/' + ustaB.id)).json()).bloklangan, false);
  /* parol bilan ro'yxatdan o'tgan foydalanuvchi */
  const em = 'blok' + Date.now() + '@test.uz';
  const reg = await (await api('/api/register', { method: 'POST', body: { email: em, password: 'parol12345', name: 'Blok Sinov' } })).json();
  const C = { id: reg.user.id, token: reg.token };
  assert.equal((await api('/api/me', { token: C.token })).status, 200);
  const r = await blok(C.id, { bloklangan: true, sabab: 'spam' });
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), { ok: true, id: C.id, bloklangan: true, sabab: 'spam' });
  const u = await (await A('/api/admin/foydalanuvchilar/' + C.id)).json();
  assert.deepEqual([u.bloklangan, u.blok_sabab, !!u.blok_vaqt], [true, 'spam', true]);
  assert.equal((await (await A('/api/admin/foydalanuvchilar?holat=bloklangan')).json()).items[0].id, C.id);
  assert.equal((await api('/api/me', { token: C.token })).status, 401, 'ochiq kalit yaroqsiz');
  const lg = await api('/api/login', { method: 'POST', body: { email: em, password: 'parol12345' } });
  assert.equal(lg.status, 403); assert.equal((await lg.json()).code, 'S3D-AUTH-021');
  assert.equal((await api('/api/login', { method: 'POST', body: { email: em, password: 'noto\'g\'ri-parol' } })).status, 401, 'noto\'g\'ri parol — oddiy xato');
  assert.equal((await api('/api/projects', { token: C.token })).status, 401);
  /* ikkinchi marta bir xil — o'zgarmadi, audit yozilmaydi */
  const auditN = async () => (await (await A('/api/admin/audit?bolim=foydalanuvchilar&limit=100')).json()).length;
  const n0 = await auditN();
  const r2 = await blok(C.id, { bloklangan: true, sabab: 'spam' });
  assert.equal((await r2.json()).ozgarmadi, true); assert.equal(await auditN(), n0);
  /* ochish */
  const och = await blok(C.id, { bloklangan: false });
  assert.deepEqual(await och.json(), { ok: true, id: C.id, bloklangan: false, sabab: '' });
  assert.equal((await api('/api/me', { token: C.token })).status, 401, 'eski kalit qaytib yaroqli bo\'lmaydi (token_version)');
  const lg2 = await api('/api/login', { method: 'POST', body: { email: em, password: 'parol12345' } });
  assert.equal(lg2.status, 200);
  assert.equal((await api('/api/me', { token: (await lg2.json()).token })).status, 200);
  /* tarix: bloklash va ochish yozilgan, qaytarish */
  const ar = (await (await A('/api/admin/audit?bolim=foydalanuvchilar&limit=100')).json()).filter(x => x.kalit === String(C.id));
  assert.equal(ar.length, 2);
  assert.deepEqual([ar[0].bolim, ar[0].yangi.bloklangan, ar[0].eski.bloklangan, ar[1].yangi.bloklangan], ['foydalanuvchilar', false, true, true]);
  assert.equal((await A('/api/admin/qaytar/' + ar[0].id, { method: 'POST' })).status, 200, 'ochishni qaytarish = yana bloklash');
  assert.equal((await api('/api/login', { method: 'POST', body: { email: em, password: 'parol12345' } })).status, 403);
  assert.equal((await A('/api/admin/qaytar/' + ar[1].id, { method: 'POST' })).status, 200, 'bloklashni qaytarish = ochish');
  assert.equal((await api('/api/login', { method: 'POST', body: { email: em, password: 'parol12345' } })).status, 200);
});

test('bloklash: SMS orqali kirish ham yopiq (S3D-AUTH-021); ochilgach kiradi', async () => {
  const blok = (id, bloklangan) => A(`/api/admin/foydalanuvchilar/${id}/blok`, { method: 'PUT', body: { bloklangan, sabab: bloklangan ? 'sinov' : '' } });
  assert.equal((await api('/api/me', { token: ustaB.token })).status, 200);
  assert.equal((await blok(ustaB.id, true)).status, 200);
  assert.equal((await api('/api/me', { token: ustaB.token })).status, 401);
  const dbx = sqlOch(); dbx.prepare('UPDATE sms_codes SET sent_at = 0').run(); dbx.close();                   // 60 soniyalik qayta yuborish chegarasi
  const send = await (await api('/api/auth/sms/send', { method: 'POST', body: { phone: ustaB.tel } })).json();
  const v = await api('/api/auth/sms/verify', { method: 'POST', body: { phone: ustaB.tel, code: send.dev_code } });
  assert.equal(v.status, 403); assert.equal((await v.json()).code, 'S3D-AUTH-021');
  assert.equal((await blok(ustaB.id, false)).status, 200);
  const dby = sqlOch(); dby.prepare('UPDATE sms_codes SET sent_at = 0').run(); dby.close();
  const send2 = await (await api('/api/auth/sms/send', { method: 'POST', body: { phone: ustaB.tel } })).json();
  const v2 = await api('/api/auth/sms/verify', { method: 'POST', body: { phone: ustaB.tel, code: send2.dev_code } });
  assert.equal(v2.status, 200);
  assert.equal((await api('/api/me', { token: (await v2.json()).token })).status, 200);
});

test('CSRF (Origin): cookie bilan yozuvchi so\'rov — boshqa saytdan rad (S3D-AUTH-009), o\'z saytidan o\'tadi', async () => {
  const lg = await api('/api/login', { method: 'POST', body: { email: 'admin@smart3d.uz', password: ADMIN_PW, sessiya: 'cookie' } });
  const cookie = lg.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  assert.ok(cookie);
  const put = (origin, p, body) => api(p, { method: 'PUT', body, headers: { cookie, ...(origin ? { origin } : {}) } });
  for (const p of ['/api/admin/katalog/SP-K-001', `/api/admin/materiallar/dekor/${kod(KALIT)}`, '/api/admin/foydalanuvchilar/' + ustaA.id + '/blok']) {
    for (const o of ['https://evil.example', undefined]) {
      const r = await put(o, p, { yashirin: true, rang_hex: '#aabbcc', bloklangan: true });
      assert.equal(r.status, 403, p + ' ' + o); assert.equal((await r.json()).code, 'S3D-AUTH-009');
    }
  }
  assert.deepEqual(await (await api('/api/katalog')).json(), { modullar: {} }, 'rad etilgan so\'rov hech narsa yozmadi');
  const ok = await put(base, '/api/admin/katalog/SP-K-001', { yashirin: true });
  assert.equal(ok.status, 200);
  await A('/api/admin/katalog/SP-K-001', { method: 'DELETE' });
});

test('ma\'lumot manbalari (app/data/*.json) admin yozuvlaridan keyin ham o\'zgarmagan (baytma-bayt)', () => {
  assert.ok(Object.keys(FAYL_SHA).length >= 6);
  for (const [f, h] of Object.entries(FAYL_SHA)) assert.equal(shaOl(f), h, f + ' o\'zgargan');
});
