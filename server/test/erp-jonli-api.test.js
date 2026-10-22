/* Smart3D server — TZ-44: ERP jonli sinxron API shartnomasi (haqiqiy server jarayoni + SOXTA ERP, haqiqiy katalog fayllari). Vaqtinchalik baza (asl bazaga tegmaydi).
 * ERP'ga hech narsa yozilmaydi va haqiqiy ERP'ga so'rov yuborilmaydi: server ERP_URL=<lokal soxta ERP>. ERP_SINOV_REJIM=1 — faqat sinov (qisqa kutishlar).
 * Tekshiriladi: GET /api/erp-narx (shakl, versiya, jonli, ETag/304), admin endpointlari (404 admin bo'lmasa, holat, hozir, pauza, chegara), tasdiq kutish →
 * mavjud /api/admin/erp/:id/qollash, avtomatik qo'llashni Tarixdan qaytarish (qayta qo'llanmaydi), ERP o'chganda oxirgi narx, parol hech qayerda yo'qligi, zaxira. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { erpKod } from '../../app/js/engine/erpKod.js';
import { nomKalit } from '../../app/js/engine/erpSinxron.js';
import { soxtaErp, erpMahsulot } from './erp-soxta.js';

const SERVER_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const J = (f) => JSON.parse(fs.readFileSync(path.join(SERVER_DIR, '../app/data', f), 'utf8'));
const ADMIN_PW = 'test-admin-erpjonli-9';
const PAROL = 'Haqiqiy-ERP-Parol-Q7z!m4k';
const LOGIN = 'erp-sinov-foydalanuvchi';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const SUKUT = J('materials.json').sukut_erp.LDSP16;
let tmp, proc, base, dbPath, erp, out = '', ipN = 0, plita, furn;
const admin = [];
let adm = 0;

/** katalogdan aniq (nomi yagona, narxi bor) qaynoq plita va bog'langan furnitura tanlash */
function tanlash() {
  const sh = J('sheet-catalog.json').sheets;
  const soni = new Map();
  for (const s of sh) soni.set(nomKalit(s.name), (soni.get(nomKalit(s.name)) || 0) + 1);
  const dekor = J('dekor-asosiy.json').items;
  let p = null;
  for (const it of dekor) for (const k of it.kodlar) { const s = sh.find(x => erpKod(x) === k); if (!p && s && s.uzs > 0 && soni.get(nomKalit(s.name)) === 1) p = { k, ...s }; }
  const fc = J('furnitura-catalog.json').items, fs_ = new Map();
  for (const i of fc) fs_.set(nomKalit(i.name), (fs_.get(nomKalit(i.name)) || 0) + 1);
  let f = null;
  for (const id of Object.values(J('furnitura-boglash.json').links)) { const i = fc.find(x => String(x.id) === String(id)); if (!f && i && i.uzs > 0 && !i.no_price && fs_.get(nomKalit(i.name)) === 1) f = i; }
  assert.ok(p && f, 'katalogdan sinov mahsuloti topilmadi');
  return [p, f];
}

before(async () => {
  [plita, furn] = tanlash();
  erp = await soxtaErp({
    login: LOGIN, parol: PAROL, kategoriyalar: [{ id: 1, name: 'Плиты', products_count: 6 }, { id: 2, name: 'Фурнитура', products_count: 1 }, { id: 3, name: 'Sukut plitalar', products_count: 1 }],
    mahsulotlar: [erpMahsulot({ id: 501, sku: plita.sku, name: plita.name, kat: 1, uzs: Math.round(plita.uzs) }), erpMahsulot({ id: 601, sku: furn.sku, name: furn.name, kat: 2, uzs: Math.round(furn.uzs) }),
      ...Array.from({ length: 5 }, (_, i) => erpMahsulot({ id: 700 + i, sku: 'Z' + i, name: 'Boshqa mahsulot ' + i, kat: 1, uzs: 1000 + i })),
      erpMahsulot({ id: 10807, sku: SUKUT.sku, name: SUKUT.nom, kat: 3, uzs: SUKUT.uzs })],            // materials.json sukut_erp.LDSP16 (ERP id 10807) — nom bo'yicha katalogda topilmaydi
    xizmatlar: [{ id: 6156, name: 'Услуга Распила Holzma 2', code: '7802360156', category_id: 1, category_name: 'Услуги Распила', is_active: true, client_price: 43000 }]
  });
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-erpjonli-'));
  dbPath = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: dbPath, ADMIN_PASSWORD: ADMIN_PW, ADMIN_EMAIL: 'admin@smart3d.uz' }, stdio: 'pipe' });
  const port = 34000 + Math.floor(Math.random() * 900);
  base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), DB_PATH: dbPath, JWT_SECRET: 'erpjonli-test-' + 'k'.repeat(40), NODE_ENV: 'test', TRUST_PROXY: '1',
    ERP_JONLI: '1', ERP_URL: erp.url, ERP_LOGIN: LOGIN, ERP_PASSWORD: PAROL, ERP_SINOV_REJIM: '1', BACKUP_DIR: path.join(tmp, 'zaxira') };
  proc = spawn(process.execPath, ['index.js'], { cwd: SERVER_DIR, env });
  proc.stdout.on('data', d => { out += d; }); proc.stderr.on('data', d => { out += d; });
  for (let i = 0; i < 100 && !/Smart3D server:/.test(out); i++) await sleep(100);
  assert.match(out, /Smart3D server:/, 'server ishga tushmadi: ' + out);
  const d = new Database(dbPath);
  const hash = d.prepare("SELECT password_hash FROM users WHERE email = 'admin@smart3d.uz'").get().password_hash;
  d.prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('Admin 2', 'admin2@smart3d.uz', ?, 'admin')").run(hash);
  d.close();
  for (const e of ['admin@smart3d.uz', 'admin2@smart3d.uz']) admin.push((await (await api('/api/login', { method: 'POST', body: { email: e, password: ADMIN_PW } })).json()).token);
});
after(() => { proc && proc.kill(); erp && erp.yop(); tmp && fs.rmSync(tmp, { recursive: true, force: true }); });

const api = (p, { method = 'GET', body, token, headers = {} } = {}) => fetch(base + p, {
  method, headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.9.${Math.floor(ipN++ / 40) % 250}.1`, ...(token ? { authorization: 'Bearer ' + token } : {}), ...headers },
  body: body !== undefined ? JSON.stringify(body) : undefined
});
const A = (p, o = {}) => api(p, { ...o, token: admin[adm++ % admin.length] });
const jonli = async () => (await A('/api/admin/erp/jonli')).json();
const narxQoy = (id, uzs) => { const m = erp.mahsulotlar.find(x => x.id === id); m.display_price_uzs = uzs; m.price = uzs.toFixed(2); };
let oxirgiHozir = 0;
async function hozir(b = { kut: true }) {
  const kut = 1600 - (Date.now() - oxirgiHozir);
  if (kut > 0) await sleep(kut);
  oxirgiHozir = Date.now();
  return A('/api/admin/erp/jonli/hozir', { method: 'POST', body: b });
}
async function boshlanishKut() {
  for (let i = 0; i < 150; i++) { const j = await jonli(); if (j.oxirgi_muvaffaqiyat && !j.band) return j; await sleep(100); }
  throw new Error('boshlang\'ich aylanish tugamadi: ' + out.slice(-600));
}

test('GET /api/erp-narx (ochiq): shakl, versiya, yangilangan, jonli maydonlari; ETag + If-None-Match → 304 (sarlavhalar bilan)', async () => {
  const j0 = await boshlanishKut();
  assert.equal(j0.yoqilgan, true); assert.equal(j0.xato_soni, 0);
  const r = await api('/api/erp-narx');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('cache-control'), /no-cache/);
  const etag = r.headers.get('etag');
  assert.match(etag, /^W\/"\d+-[0-9a-z]+"$/);
  const b = await r.json();
  assert.ok(b.plita && typeof b.plita === 'object' && b.furnitura && typeof b.furnitura === 'object');
  assert.equal(typeof b.sana, 'string');
  assert.ok(Number.isInteger(b.versiya));
  assert.ok(b.jonli && b.jonli.yoqilgan === true && b.jonli.pauza === false && typeof b.jonli.oxirgi_muvaffaqiyat === 'string' && b.jonli.xato_soni === 0 && b.jonli.eski === false);
  assert.ok('manba_sana' in b.jonli && 'kurs' in b.jonli && 'xato_kodi' in b.jonli);
  assert.equal(r.headers.get('x-erp-versiya'), String(b.versiya));
  assert.equal(r.headers.get('x-erp-oxirgi'), b.jonli.oxirgi_muvaffaqiyat);
  const r2 = await api('/api/erp-narx', { headers: { 'if-none-match': etag } });
  assert.equal(r2.status, 304); assert.equal(await r2.text(), '');
  assert.equal(r2.headers.get('etag'), etag); assert.equal(r2.headers.get('x-erp-versiya'), String(b.versiya));
  const r3 = await api('/api/erp-narx', { headers: { 'if-none-match': 'W/"0-eski"' } });
  assert.equal(r3.status, 200);
  assert.deepEqual(Object.keys(b).sort(), ['furnitura', 'jonli', 'plita', 'sana', 'sukut', 'versiya', 'yangilangan']);
  assert.ok(b.sukut && typeof b.sukut === 'object');
});

test('admin endpointlari faqat admin uchun: kirmagan / usta — 404 S3D-AUTH-006', async () => {
  const { dev_code } = await (await api('/api/auth/sms/send', { method: 'POST', body: { phone: '998901112233' } })).json();
  const usta = (await (await api('/api/auth/sms/verify', { method: 'POST', body: { phone: '998901112233', code: dev_code, name: 'Usta' } })).json()).token;
  for (const [m, p, b] of [['GET', '/api/admin/erp/jonli'], ['POST', '/api/admin/erp/jonli/hozir', {}], ['PUT', '/api/admin/erp/jonli', { pauza: true }]]) {
    for (const token of [undefined, usta]) {
      const r = await api(p, { method: m, body: b, token });
      assert.equal(r.status, 404, `${m} ${p}`); assert.equal((await r.json()).code, 'S3D-AUTH-006');
    }
  }
});

test('GET /api/admin/erp/jonli: holat + oxirgi 50 o\'zgarish + tasdiq kutayotganlar', async () => {
  const j = await jonli();
  for (const k of ['yoqilgan', 'sabab', 'manzil', 'pauza', 'chegara_foiz', 'band', 'versiya', 'yangilangan', 'oxirgi_urinish', 'oxirgi_muvaffaqiyat', 'manba_sana', 'xato_soni', 'xato_jami', 'oxirgi_xato',
    'eski', 'kurs', 'kurs_qabul', 'kurs_kutadi', 'keyingi_qaynoq', 'keyingi_toliq', 'oxirgi_qaynoq', 'oxirgi_toliq', 'kategoriyalar', 'sozlama', 'tasdiq_kutadi', 'ozgarishlar']) assert.ok(k in j, k + ' yo\'q');
  assert.equal(j.chegara_foiz, 30); assert.equal(j.pauza, false); assert.equal(j.manzil, erp.url);
  assert.deepEqual(j.sozlama, { qaynoq_soniya: 120, toliq_soniya: 900, taym_aut_soniya: 5, eski_daqiqa: 10 });
  assert.ok(Array.isArray(j.ozgarishlar) && j.ozgarishlar.length <= 50);
  assert.ok(j.tasdiq_kutadi && 'soni' in j.tasdiq_kutadi && 'partiya_id' in j.tasdiq_kutadi);
  assert.ok(j.kategoriyalar.jami >= 2);
  assert.ok(erp.faqatGet(), 'ERP\'ga faqat GET (login POST dan tashqari)');
  assert.equal(erp.loginSoni, 1);
});

let v1, etag1, auditId, eskiNarx;
test('avtomatik qo\'llash (±30%): "Hozir" → /api/erp-narx da yangi narx, versiya oshdi, ETag o\'zgardi; Tarix: "tizim: ERP jonli"', async () => {
  const a = await (await api('/api/erp-narx')).json();
  etag1 = (await api('/api/erp-narx')).headers.get('etag');
  v1 = a.versiya;
  eskiNarx = a.plita[plita.k];
  const yangi = Math.round(plita.uzs * 1.05);
  narxQoy(501, yangi);
  const r = await hozir();
  assert.equal(r.status, 200, JSON.stringify(await r.clone().json()));
  const h = await r.json();
  assert.equal(h.ok, true); assert.equal(h.tugadi, true); assert.equal(h.tur, 'qaynoq'); assert.equal(h.natija.xato, null); assert.ok(h.natija.qollandi >= 1);
  const b = await (await api('/api/erp-narx')).json();
  assert.equal(b.plita[plita.k], yangi);
  assert.equal(b.versiya, v1 + 1); assert.notEqual((await api('/api/erp-narx')).headers.get('etag'), etag1);
  assert.equal((await api('/api/erp-narx', { headers: { 'if-none-match': etag1 } })).status, 200, 'eski ETag — to\'liq javob');
  const t = await (await A('/api/admin/tarix?bolim=erp')).json();
  const it = t.items.find(x => x.bolim === 'erp' && x.yangi && x.yangi.tur === 'jonli');
  assert.ok(it, JSON.stringify(t.items.slice(0, 2))); assert.equal(it.kim, 'tizim: ERP jonli'); assert.equal(it.qaytariladi, true);
  const au = await (await A('/api/admin/audit?bolim=erp&limit=5')).json();
  const x = au.find(y => y.yangi && y.yangi.tur === 'jonli');
  auditId = x.id; assert.equal(x.kim, 'tizim');
  const j = await jonli();
  assert.ok(j.ozgarishlar.some(o => o.harakat === 'qollandi' && o.kalit === plita.k && o.yangi === yangi));
});

test('"Hozir" 30 soniyada bir marta (S3D-ERP-007, sinov rejimida 1,5 s)', async () => {
  await sleep(1600);
  const a = await A('/api/admin/erp/jonli/hozir', { method: 'POST', body: { kut: true } });
  assert.equal(a.status, 200); oxirgiHozir = Date.now();
  const b = await A('/api/admin/erp/jonli/hozir', { method: 'POST', body: {} });
  assert.equal(b.status, 429); assert.equal((await b.json()).code, 'S3D-ERP-007');
  const c = await A('/api/admin/erp/jonli/hozir', { method: 'POST', body: { toliq: 'ha' } });
  assert.equal(c.status, 400); assert.equal((await c.json()).code, 'S3D-ERP-008');
});

test('avtomatik qo\'llashni Tarixdan qaytarish: eski narx qaytadi, versiya oshadi, ERP narxi o\'zgarmaguncha qayta qo\'llanmaydi', async () => {
  const v = (await (await api('/api/erp-narx')).json()).versiya;
  const r = await A('/api/admin/qaytar/' + auditId, { method: 'POST' });
  assert.equal(r.status, 200, JSON.stringify(await r.clone().json()));
  const b = await (await api('/api/erp-narx')).json();
  assert.equal(b.plita[plita.k], eskiNarx, 'qaytarildi');
  assert.ok(b.versiya > v, 'qaytarish versiyani oshiradi — brauzerlar yangilanadi');
  const h = await (await hozir()).json();
  assert.equal(h.natija.xato, null);
  assert.equal((await (await api('/api/erp-narx')).json()).plita[plita.k], eskiNarx, 'admin qaytargan narx ERP\'da shu qiymatda turganda qayta qo\'llanmadi');
  assert.ok(h.natija.rad >= 1, JSON.stringify(h.natija));
  narxQoy(501, Math.round(plita.uzs * 1.08));                         // ERP narxi o'zgardi — yangi narx endi qo'llanadi
  await hozir();
  assert.equal((await (await api('/api/erp-narx')).json()).plita[plita.k], Math.round(plita.uzs * 1.08));
});

test('katta o\'zgarish (>30%) qo\'llanmaydi — tasdiq kutadi; mavjud tasdiq oqimi (/api/admin/erp/:id, /qollash) bilan qo\'llanadi; versiya oshadi', async () => {
  const oldin = (await (await api('/api/erp-narx')).json());
  const katta = Math.round(plita.uzs * 2.5);
  narxQoy(501, katta);
  const h = await (await hozir()).json();
  assert.ok(h.natija.kutadi >= 1);
  const b = await (await api('/api/erp-narx')).json();
  assert.equal(b.plita[plita.k], oldin.plita[plita.k], 'narx o\'zgarmadi');
  assert.equal(b.versiya, oldin.versiya);
  const j = await jonli();
  assert.ok(j.tasdiq_kutadi.soni >= 1 && j.tasdiq_kutadi.partiya_id, JSON.stringify(j.tasdiq_kutadi));
  const id = j.tasdiq_kutadi.partiya_id;
  const d = await (await A('/api/admin/erp/' + id)).json();
  assert.equal(d.manba, 'jonli'); assert.equal(d.holat, 'qoralama'); assert.equal(d.kim, 'tizim: ERP jonli');
  const q = d.items.find(x => x.k === plita.k);
  assert.ok(q && q.q === true && q.sabab === 'katta_ozgarish' && q.yangi === katta && q.h === 'ozgardi', JSON.stringify(q));
  const ro = await (await A('/api/admin/erp')).json();
  assert.ok(ro.partiyalar.some(p => p.id === id && p.manba === 'jonli'), 'qoralama ERP ro\'yxatida');
  assert.ok(ro.partiyalar.filter(p => p.manba === 'jonli' && p.holat !== 'qoralama').length === 0, 'qo\'llangan jonli to\'plamlar admin yuklashlar ro\'yxatini to\'ldirmaydi');
  const qo = await A('/api/admin/erp/' + id + '/qollash', { method: 'POST', body: { tasdiq: true } });
  assert.equal(qo.status, 200, JSON.stringify(await qo.clone().json()));
  const c = await (await api('/api/erp-narx')).json();
  assert.equal(c.plita[plita.k], katta); assert.ok(c.versiya > b.versiya);
  const j2 = await jonli();
  assert.equal(j2.tasdiq_kutadi.partiya_id === id, false, 'qo\'llangan qoralama endi kutmaydi');
});

test('sukut plita (materials.json sukut_erp.LDSP16, ERP id bo\'yicha): /api/erp-narx `sukut` bo\'limi yangilanadi; >30% — tasdiq kutadi va mavjud oqim bilan qo\'llanadi; qaytarish; admin qo\'lda narxi ustun', async () => {
  const b0 = await (await api('/api/erp-narx')).json();
  assert.deepEqual(b0.sukut, {}, 'narx fayldagidek — qatlam bo\'sh');
  const j0 = await jonli();
  assert.ok(j0.kuzatilayotgan.sukut >= 1 && j0.katalog.qaynoq_sukut === 3, JSON.stringify([j0.kuzatilayotgan, j0.katalog]));
  const yangi = Math.round(SUKUT.uzs * 1.04);
  narxQoy(10807, yangi);
  const h = await (await hozir()).json();
  assert.equal(h.natija.xato, null);
  const b1 = await (await api('/api/erp-narx')).json();
  assert.deepEqual(b1.sukut, { LDSP16: yangi }, JSON.stringify(b1.sukut));
  assert.ok(b1.versiya > b0.versiya);
  /* qaytarish (Tarix): sukut qatlami olib tashlanadi → fayldagi narx */
  const au = await (await A('/api/admin/audit?bolim=erp&limit=10')).json();
  const x = au.find(y => y.yangi && y.yangi.tur === 'jonli' && y.yangi.qollandi && y.yangi.qollandi.sukut === 1);
  assert.ok(x, JSON.stringify(au.slice(0, 2)));
  assert.equal((await A('/api/admin/qaytar/' + x.id, { method: 'POST' })).status, 200);
  assert.deepEqual((await (await api('/api/erp-narx')).json()).sukut, {}, 'qaytarildi');
  assert.equal((await (await hozir()).json()).natija.rad >= 1, true, 'qaytarilgan narx qayta qo\'llanmadi');
  assert.deepEqual((await (await api('/api/erp-narx')).json()).sukut, {});
  /* >30%: tasdiq kutadi, public o'zgarmaydi; mavjud /qollash bilan qo'llanadi */
  const katta = Math.round(SUKUT.uzs * 2);
  narxQoy(10807, katta);
  await hozir();
  assert.deepEqual((await (await api('/api/erp-narx')).json()).sukut, {});
  const j = await jonli();
  const d = await (await A('/api/admin/erp/' + j.tasdiq_kutadi.partiya_id + '?guruh=sukut')).json();
  const q = d.items.find(r => r.g === 'sukut' && r.k === 'LDSP16');
  assert.ok(q && q.q === true && q.sabab === 'katta_ozgarish' && q.yangi === katta, JSON.stringify(d.items.slice(0, 2)));
  const qo = await A('/api/admin/erp/' + j.tasdiq_kutadi.partiya_id + '/qollash', { method: 'POST', body: { tasdiq: true, guruhlar: ['sukut'] } });
  assert.equal(qo.status, 200, JSON.stringify(await qo.clone().json()));
  assert.equal((await qo.json()).qollandi.sukut, 1);
  assert.deepEqual((await (await api('/api/erp-narx')).json()).sukut, { LDSP16: katta });
  /* admin qo'lda narxi (mat_narx.kod = LDSP16) ustun */
  const dbq = new Database(dbPath);
  dbq.prepare("INSERT OR REPLACE INTO mat_narx (kod, uzs) VALUES ('LDSP16', 777000)").run(); dbq.close();
  narxQoy(10807, Math.round(katta * 1.05));
  await hozir();
  assert.deepEqual((await (await api('/api/erp-narx')).json()).sukut, { LDSP16: katta }, 'qo\'lda narx bor — ERP o\'zgartirmaydi');
  const dbw = new Database(dbPath);
  dbw.prepare("DELETE FROM mat_narx WHERE kod = 'LDSP16'").run(); dbw.close();
  narxQoy(10807, SUKUT.uzs);                                              // keyingi sinovlar uchun asl narx
  const sk = await A('/api/admin/erp/sukut', { method: 'POST', body: { tasdiq: true, guruh: 'sukut' } });
  assert.equal(sk.status, 200); assert.equal((await sk.json()).olib_tashlandi.sukut, 1);
  assert.deepEqual((await (await api('/api/erp-narx')).json()).sukut, {}, 'sukutga qaytarish');
});

test('PUT /api/admin/erp/jonli: pauza va chegara_foiz (5…100) tekshiriladi; pauzada "Hozir" 409 S3D-ERP-006; audit yoziladi', async () => {
  for (const b of [{}, { chegara_foiz: 4 }, { chegara_foiz: 101 }, { chegara_foiz: 'x' }, { pauza: 'ha' }]) {
    const r = await A('/api/admin/erp/jonli', { method: 'PUT', body: b });
    assert.equal(r.status, 400, JSON.stringify(b)); assert.equal((await r.json()).code, 'S3D-ERP-008');
  }
  const ok = await A('/api/admin/erp/jonli', { method: 'PUT', body: { chegara_foiz: 50, pauza: true } });
  assert.equal(ok.status, 200); assert.deepEqual(await ok.json(), { ok: true, pauza: true, chegara_foiz: 50 });
  const j = await jonli();
  assert.equal(j.pauza, true); assert.equal(j.chegara_foiz, 50); assert.equal(j.keyingi_qaynoq, null);
  assert.equal((await api('/api/erp-narx').then(r => r.json())).jonli.pauza, true);
  await sleep(1600);
  const h = await A('/api/admin/erp/jonli/hozir', { method: 'POST', body: {} });
  assert.equal(h.status, 409); assert.equal((await h.json()).code, 'S3D-ERP-006');
  const au = await (await A('/api/admin/audit?bolim=erp_jonli&limit=5')).json();
  assert.ok(au.some(x => x.kalit === 'sozlama' && x.yangi.pauza === true && x.eski.pauza === false && x.kim !== 'tizim'));
  await A('/api/admin/erp/jonli', { method: 'PUT', body: { chegara_foiz: 30, pauza: false } });
  assert.equal((await jonli()).pauza, false);
});

test('ERP o\'chdi: "Hozir" xatoni qaytaradi (S3D-ERP-003), oxirgi narx /api/erp-narx da qoladi, xato sanalgichi va xato kodi chiqadi, sayt ishlayveradi', async () => {
  const oldin = await (await api('/api/erp-narx')).json();
  erp.rejim = 'uzilgan';
  const r = await hozir();
  const h = await r.json();
  assert.equal(h.natija.xato.kod, 'S3D-ERP-003');
  const b = await (await api('/api/erp-narx')).json();
  assert.deepEqual(b.plita, oldin.plita); assert.deepEqual(b.furnitura, oldin.furnitura);
  assert.equal(b.jonli.xato_soni, 1); assert.equal(b.jonli.xato_kodi, 'S3D-ERP-003'); assert.equal(b.jonli.oxirgi_muvaffaqiyat, oldin.jonli.oxirgi_muvaffaqiyat);
  const j = await jonli();
  assert.equal(j.oxirgi_xato.kod, 'S3D-ERP-003'); assert.ok(j.keyingi_qaynoq);
  assert.equal((await api('/api/health')).status, 200, 'sayt ishlaydi');
  erp.rejim = 'ok';
});

test('parol va login hech qayerda yo\'q: server chiqishi (log), hamma javoblar, baza jadvallari, zaxira nusxa', async () => {
  const javoblar = JSON.stringify([await (await api('/api/erp-narx')).json(), await jonli(), await (await A('/api/admin/tizim')).json(), await (await A('/api/admin/tarix?limit=200')).json(),
    await (await A('/api/admin/erp')).json(), await (await A('/api/admin/xatolar')).json()]);
  for (const x of [PAROL, LOGIN]) {
    assert.ok(!out.includes(x), 'server chiqishida: ' + x);
    assert.ok(!javoblar.includes(x), 'javoblarda: ' + x);
  }
  const d = new Database(dbPath, { readonly: true });
  for (const t of d.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()) {
    const s = JSON.stringify(d.prepare(`SELECT * FROM "${t.name}"`).all());
    for (const x of [PAROL, LOGIN]) assert.ok(!s.includes(x), `${t.name} jadvalida ${x === PAROL ? 'parol' : 'login'}`);
  }
  d.close();
  /* zaxira yangi jadvallarni ham oladi, tiklangan nusxada ham maxfiy ma'lumot yo'q */
  const z = execFileSync(process.execPath, ['backup.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: dbPath, BACKUP_DIR: path.join(tmp, 'zaxira') } }).toString();
  const nusxa = JSON.parse(z.trim().split('\n').pop()).nusxa;
  const c = new Database(nusxa, { readonly: true }), asl = new Database(dbPath, { readonly: true });
  for (const t of ['erp_jonli_holat', 'erp_jonli_obyekt', 'erp_jonli_kat', 'erp_jonli_tarix']) {
    assert.ok(c.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n > 0, t + ' zaxirada bo\'sh');
    assert.equal(c.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n, asl.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n);
  }
  assert.ok(!JSON.stringify(c.prepare('SELECT * FROM erp_jonli_holat').all()).includes(PAROL));
  c.close(); asl.close();
});

test('migratsiya ikki marta ishlasa zararsiz va mavjud baza saqlanadi (server qayta ishga tushsa holat/versiya qoladi)', async () => {
  const oldin = await jonli();
  proc.kill();
  await new Promise(r => proc.on('exit', r));
  const port = Number(new URL(base).port);
  out = '';
  proc = spawn(process.execPath, ['index.js'], { cwd: SERVER_DIR, env: { ...process.env, PORT: String(port), DB_PATH: dbPath, JWT_SECRET: 'erpjonli-test-' + 'k'.repeat(40), NODE_ENV: 'test', TRUST_PROXY: '1',
    ERP_JONLI: '1', ERP_URL: erp.url, ERP_LOGIN: LOGIN, ERP_PASSWORD: PAROL, ERP_SINOV_REJIM: '1' } });
  proc.stdout.on('data', d => { out += d; }); proc.stderr.on('data', d => { out += d; });
  for (let i = 0; i < 100 && !/Smart3D server:/.test(out); i++) await sleep(100);
  assert.match(out, /Smart3D server:/, out);
  admin.length = 0;
  for (const e of ['admin@smart3d.uz', 'admin2@smart3d.uz']) admin.push((await (await api('/api/login', { method: 'POST', body: { email: e, password: ADMIN_PW } })).json()).token);
  const j = await jonli();
  assert.equal(j.versiya, oldin.versiya, 'versiya saqlanadi');
  assert.equal(j.xato_jami, oldin.xato_jami);
  assert.ok(j.ozgarishlar.length >= 1);
});

test('ERP_JONLI yo\'q server: jonli sinxron o\'chiq — xato yo\'q, ERP\'ga so\'rov yo\'q, /api/erp-narx ishlaydi (jonli.yoqilgan=false), "Hozir" 409 S3D-ERP-001', async () => {
  const d2 = path.join(tmp, 'o.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: d2, ADMIN_PASSWORD: ADMIN_PW, ADMIN_EMAIL: 'admin@smart3d.uz' }, stdio: 'pipe' });
  const port = 35000 + Math.floor(Math.random() * 900);
  const env = { ...process.env, PORT: String(port), DB_PATH: d2, JWT_SECRET: 'erpjonli-o-' + 'k'.repeat(40), NODE_ENV: 'test', TRUST_PROXY: '1' };
  for (const k of ['ERP_JONLI', 'ERP_URL', 'ERP_LOGIN', 'ERP_PASSWORD', 'ERP_SINOV_REJIM']) delete env[k];
  const p = spawn(process.execPath, ['index.js'], { cwd: SERVER_DIR, env });
  let o = '';
  p.stdout.on('data', d => { o += d; }); p.stderr.on('data', d => { o += d; });
  try {
    for (let i = 0; i < 100 && !/Smart3D server:/.test(o); i++) await sleep(100);
    assert.match(o, /Smart3D server:/);
    const n0 = erp.sorovlar.length;
    const b = await (await fetch(`http://127.0.0.1:${port}/api/erp-narx`)).json();
    assert.equal(b.jonli.yoqilgan, false); assert.equal(b.jonli.eski, false); assert.deepEqual(b.plita, {}); assert.equal(b.versiya, 0);
    const tk = (await (await fetch(`http://127.0.0.1:${port}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'admin@smart3d.uz', password: ADMIN_PW }) })).json()).token;
    const h = await fetch(`http://127.0.0.1:${port}/api/admin/erp/jonli/hozir`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tk }, body: '{}' });
    assert.equal(h.status, 409); assert.equal((await h.json()).code, 'S3D-ERP-001');
    const g = await (await fetch(`http://127.0.0.1:${port}/api/admin/erp/jonli`, { headers: { authorization: 'Bearer ' + tk } })).json();
    assert.equal(g.yoqilgan, false); assert.equal(g.sabab, 'ochirilgan');
    assert.equal(erp.sorovlar.length, n0, 'ERP\'ga so\'rov yuborilmadi');
    assert.ok(!/xato|error/i.test(o.replace(/JWT_SECRET[^\n]*/g, '').replace(/DIQQAT[^\n]*/g, '')), 'o\'chiq holatda xato yo\'q: ' + o.slice(0, 300));
  } finally { p.kill(); }
});
