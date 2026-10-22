/* Smart3D server — TZ-36 P8: server/tekshiruv.sh (yangilashdan keyingi tekshiruv, faqat GET). Vaqtinchalik server va baza.
 * Skript: sog'lom server — chiqish 0; noto'g'ri javob beruvchi soxta server — 1; hech kim tinglamaydigan port — 2.
 * TZ-36 P8 (davomi): /admin sahifalari, ochiq API (JSON), admin API kirishsiz, material rasmi keshi (admin yuklagan rasm bilan);
 * nginx material rasmiga "doim immutable" qo'ysa (xato sozlama) — skript buni ushlaydi. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKRIPT = path.join(SERVER_DIR, 'tekshiruv.sh');
const HAS_WEB = fs.existsSync(path.join(SERVER_DIR, '../web/dist/index.html'));
let tmp, proc, base;
const sorovlar = [];

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-tek-'));
  const db = path.join(tmp, 't.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: 'tekshiruv-test-9' }, stdio: 'pipe' });
  const port = 29000 + Math.floor(Math.random() * 900);
  base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), DB_PATH: db, JWT_SECRET: 'tek-test-' + 'k'.repeat(40), NODE_ENV: 'test' };
  proc = spawn(process.execPath, ['index.js'], { cwd: SERVER_DIR, env });
  await new Promise((resolve, reject) => {
    let out = '';
    const t = setTimeout(() => reject(new Error('server ishga tushmadi: ' + out)), 8000);
    proc.stdout.on('data', d => { out += d; if (/Smart3D server:/.test(out)) { clearTimeout(t); resolve(); } });
    proc.stderr.on('data', d => { out += d; });
  });
});
after(() => { proc && proc.kill(); fs.rmSync(tmp, { recursive: true, force: true }); });

const ishga = (url) => spawnSync('bash', [SKRIPT, url], { encoding: 'utf8', timeout: 60000 });
/* asinxron variant: tekshiruv.sh bilan bir jarayonda turgan soxta proksi so'rovlarga javob berishi uchun spawnSync yaramaydi */
const ishgaAsync = (url) => new Promise((resolve) => { const p = spawn('bash', [SKRIPT, url]); let out = ''; p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; }); p.on('exit', code => resolve({ status: code, out })); });
/* admin material rasmini yuklaydi (1x1 PNG) — tekshiruv.sh rasm keshini shu bilan sinaydi */
async function rasmYukla() {
  const lg = await fetch(base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json', origin: base }, body: JSON.stringify({ email: 'admin@smart3d.uz', password: 'tekshiruv-test-9' }) });
  const token = (await lg.json()).token;
  const kalit = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, '../app/data/dekor-asosiy.json'), 'utf8')).items[0].kalit;
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const r = await fetch(base + '/api/admin/materiallar/dekor/' + encodeURIComponent(kalit) + '/rasm', { method: 'PUT',
    headers: { 'content-type': 'application/json', origin: base, authorization: 'Bearer ' + token }, body: JSON.stringify({ data: png }) });
  assert.equal(r.status, 200, 'rasm yuklanmadi: ' + await r.text());
}

test('tekshiruv.sh: sog\'lom server — hammasi ✅, chiqish kodi 0 (web/dist qurilgan bo\'lsa); rasm yuklanmagan — rasm keshi o\'tkazib yuboriladi', { skip: !HAS_WEB && 'web/dist yo\'q (vite build kerak)' }, () => {
  const r = ishga(base);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /✅ Hammasi joyida/);
  assert.ok(!r.stdout.includes('❌'));
  for (const yol of ['/loyihalar', '/sozlamalar/narxlar', '/api/narxlar/tarix -> 401', 'Content-Security-Policy bor', 'nosniff', '/sw.js: Cache-Control', 'immutable']) assert.ok(r.stdout.includes(yol), yol);
  /* TZ-37: admin sahifalari, ochiq API'lar, admin API kirishsiz */
  for (const yol of ['/admin -> 200', '/admin/materiallar -> 200', '/admin/foydalanuvchilar -> 200', '/admin/tarix -> 200', '/admin/noma-lum-bolim -> 404',
    '/api/materiallar -> 200, JSON', '/api/katalog -> 200, JSON', '/api/furnitura-boglash -> 200, JSON', '/api/promptlar -> 200, JSON', '/api/standart -> 200, JSON',
    '/api/admin/audit -> 404, JSON', '/admin: /app.html bilan bir xil hujjat', '/admin: Content-Security-Policy bor']) assert.ok(r.stdout.includes(yol), yol);
  assert.match(r.stdout, /material rasmi yuklanmagan/);
});

test('tekshiruv.sh: admin yuklagan material rasmi — ?v= bilan immutable, ?v= siz no-cache (ikkalasi ✅)', { skip: !HAS_WEB && 'web/dist yo\'q (vite build kerak)' }, async () => {
  await rasmYukla();
  const r = ishga(base);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /✅ material rasmi \(\?v= bilan\): 200, image\/png, public, max-age=31536000, immutable/);
  assert.match(r.stdout, /✅ material rasmi \(\?v= siz\): no-cache/);
});

test('tekshiruv.sh: nginx material rasmiga "doim immutable" qo\'ysa (almashtirilgan rasm qotib qoladi) — ❌, chiqish kodi 1', { skip: !HAS_WEB && 'web/dist yo\'q (vite build kerak)' }, async () => {
  /* soxta proksi: haqiqiy serverga uzatadi, faqat /api/materiallar/rasm/ javobida Cache-Control ni immutable qilib almashtiradi (xato nginx sozlamasi) */
  const target = new URL(base);
  const proksi = http.createServer((req, res) => {
    const up = http.request({ host: target.hostname, port: target.port, path: req.url, method: req.method, headers: req.headers }, (ur) => {
      const h = { ...ur.headers };
      if (req.url.startsWith('/api/materiallar/rasm/')) h['cache-control'] = 'public, max-age=2592000, immutable';
      res.writeHead(ur.statusCode, h); ur.pipe(res);
    });
    up.on('error', () => { res.statusCode = 502; res.end(); });
    req.pipe(up);
  });
  await new Promise(r => proksi.listen(0, '127.0.0.1', r));
  const r = await ishgaAsync(`http://127.0.0.1:${proksi.address().port}`);
  proksi.close();
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /✅ material rasmi \(\?v= bilan\)/);
  assert.match(r.out, /❌ material rasmi \(\?v= siz\)/);
});

test('tekshiruv.sh: /admin yo\'li serverga yetmasa (nginx boshqa hujjat bersa) — ❌, chiqish kodi 1', { skip: !HAS_WEB && 'web/dist yo\'q (vite build kerak)' }, async () => {
  /* soxta proksi: /admin* ga nginx'ning o'z 404 sahifasini beradi (admin yo'llari serverga uzatilmagan) */
  const target = new URL(base);
  const proksi = http.createServer((req, res) => {
    if (req.url.startsWith('/admin')) { res.statusCode = 404; res.setHeader('content-type', 'text/html'); return res.end('<html>nginx 404</html>'); }
    const up = http.request({ host: target.hostname, port: target.port, path: req.url, method: req.method, headers: req.headers }, (ur) => { res.writeHead(ur.statusCode, ur.headers); ur.pipe(res); });
    up.on('error', () => { res.statusCode = 502; res.end(); });
    req.pipe(up);
  });
  await new Promise(r => proksi.listen(0, '127.0.0.1', r));
  const r = await ishgaAsync(`http://127.0.0.1:${proksi.address().port}`);
  proksi.close();
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /❌ \/admin -> 404, kutilgan 200/);
  assert.match(r.out, /❌ \/admin -> 404 yoki \/app.html dan farq qiladi/);
});

test('tekshiruv.sh: faqat GET yuboradi (soxta serverda ko\'rinadi) va noto\'g\'ri javobda ❌, chiqish kodi 1', async () => {
  const srv = http.createServer((req, res) => { sorovlar.push(req.method); res.statusCode = req.url === '/api/health' ? 200 : 500; res.end('{"ok":true}'); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${srv.address().port}`;
  const r = await new Promise((resolve) => { const p = spawn('bash', [SKRIPT, url]); let out = ''; p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; }); p.on('exit', code => resolve({ status: code, out })); });
  srv.close();
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /❌/);
  assert.ok(sorovlar.length >= 10);
  assert.ok(sorovlar.every(m => m === 'GET'), 'faqat GET: ' + [...new Set(sorovlar)].join(','));
});

test('tekshiruv.sh: server yo\'q — chiqish kodi 2; noto\'g\'ri manzil — 2', () => {
  assert.equal(ishga('http://127.0.0.1:1').status, 2);
  assert.equal(ishga('smart3d.bittada.uz').status, 2);
});
