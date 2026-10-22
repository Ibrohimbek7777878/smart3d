/* TZ-09 Q7 / TZ-19 X11: sahifa yo'llari — yangi sayt "/" va "/app.html", eski sayt "/eski/", noma'lum sahifa 404,
 * kesh sarlavhalari. web/dist bo'lmasa (build qilinmagan) — o'tkaziladi. Ishga tushirish: npm test */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.join(__dirname, '..');
const DIST = path.join(SERVER_DIR, '../web/dist');
const HAS_WEB = fs.existsSync(path.join(DIST, 'index.html'));
let tmp, proc, base, out = '';

before(async () => {
  if (!HAS_WEB) return;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-sahifa-'));
  const db = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: 'test-admin-parol-1' }, stdio: 'pipe' });
  const port = 29000 + Math.floor(Math.random() * 1000);
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['index.js'], { cwd: SERVER_DIR, env: { ...process.env, PORT: String(port), DB_PATH: db, JWT_SECRET: 's'.repeat(48), NODE_ENV: 'test' } });
  proc.stdout.on('data', d => { out += d; });
  proc.stderr.on('data', d => { out += d; });
  for (let i = 0; i < 100 && !/Smart3D server:/.test(out); i++) await new Promise(r => setTimeout(r, 100));
});
after(() => { if (proc) proc.kill(); if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); });

test('yangi sayt "/" va ilova "/app.html"; sahifa — no-cache', { skip: !HAS_WEB && 'web/dist yo\'q' }, async () => {
  const r = await fetch(base + '/');
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /\/assets\/main-/);
  assert.equal(r.headers.get('cache-control'), 'no-cache');
  const a = await (await fetch(base + '/app.html')).text();
  assert.match(a, /\/assets\/app-/);
  assert.match(a, /noindex/);
});

test('assets — o\'zgarmas kesh (1 yil); ma\'lumot (narx) va service worker — no-cache', { skip: !HAS_WEB && 'web/dist yo\'q' }, async () => {
  const js = fs.readdirSync(path.join(DIST, 'assets')).find(f => f.endsWith('.js'));
  assert.equal((await fetch(base + '/assets/' + js)).headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.equal((await fetch(base + '/data/materials.json')).headers.get('cache-control'), 'no-cache');
  assert.equal((await fetch(base + '/sw.js')).headers.get('cache-control'), 'no-cache');
});

test('eski sayt "/eski/" da (2 hafta zaxira) — importmap bilan, CSP ostida', { skip: !HAS_WEB && 'web/dist yo\'q' }, async () => {
  const r = await fetch(base + '/eski/');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /type="importmap"/);
  assert.ok(r.headers.get('content-security-policy'));
  assert.equal((await fetch(base + '/eski/js/app.js')).status, 200);
  assert.equal((await fetch(base + '/eski', { redirect: 'manual' })).status, 301);
});

test('noma\'lum sahifa — 404 (dizayndagi sahifa), noma\'lum API — JSON 404', { skip: !HAS_WEB && 'web/dist yo\'q' }, async () => {
  const r = await fetch(base + '/yoq-sahifa');
  assert.equal(r.status, 404);
  assert.match(await r.text(), /Sahifa topilmadi/);
  const a = await fetch(base + '/api/yoq');
  assert.equal(a.status, 404);
  assert.equal((await a.json()).code, 'S3D-SRV-002');
});

/* /favicon.ico: HTML'da <link rel="icon"> bor, lekin brauzerlar /favicon.ico ni ham so'raydi — 404 emas, mavjud ikon (icons/icon-192.png) */
test('/favicon.ico — 200, mavjud ikon fayli (PNG), kesh sarlavhasi; HEAD ham', { skip: !HAS_WEB && 'web/dist yo\'q' }, async () => {
  const ikon = fs.readFileSync(path.join(DIST, 'icons', 'icon-192.png'));
  const r = await fetch(base + '/favicon.ico');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /^image\/png/);
  assert.equal(r.headers.get('cache-control'), 'public, max-age=86400');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(Buffer.from(await r.arrayBuffer()).equals(ikon), 'icon-192.png baytlari');
  const h = await fetch(base + '/favicon.ico', { method: 'HEAD' });
  assert.equal(h.status, 200);
  assert.equal(h.headers.get('content-length'), String(ikon.length));
  /* HTML dagi havola ham o'sha ikonga: ikkalasi bir xil fayl */
  const a = await (await fetch(base + '/app.html')).text();
  const href = (a.match(/<link rel="icon" href="([^"]+)"/) || [])[1];
  assert.equal(href, '/icons/icon-192.png');
  assert.equal((await fetch(base + href)).status, 200);
});

/* TZ-30: ilova manzillari (frontend bilan bir xil ro'yxat) — app.html, no-cache, /app.html bilan bir xil CSP; ro'yxatdan tashqari — 404 */
const ILOVA = ['/kirish', '/royxat', '/loyihalar', '/loyiha/yangi', '/loyiha/42', '/sozlamalar', '/sozlamalar/narxlar', '/buyurtmalar', '/tg', '/kirish/'];
test('TZ-30: ilova manzillari — app.html (200, no-cache, CSP /app.html bilan bir xil)', { skip: !HAS_WEB && 'web/dist yo\'q' }, async () => {
  const a = await fetch(base + '/app.html');
  const app = await a.text(), appCsp = a.headers.get('content-security-policy');
  assert.ok(appCsp);
  for (const p of ILOVA) {
    const r = await fetch(base + p);
    assert.equal(r.status, 200, p);
    assert.equal(await r.text(), app, p + ': app.html');
    assert.match(r.headers.get('content-type'), /text\/html/, p);
    assert.equal(r.headers.get('cache-control'), 'no-cache', p);
    assert.equal(r.headers.get('content-security-policy'), appCsp, p + ': CSP');
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff', p);
  }
  assert.equal((await fetch(base + '/loyihalar', { method: 'HEAD' })).status, 200);
});

test('TZ-30: ro\'yxatdan tashqari yo\'l — 404 sahifa; /api/yoq — JSON 404; bosh sahifa — avvalgidek', { skip: !HAS_WEB && 'web/dist yo\'q' }, async () => {
  for (const p of ['/loyiha/abc', '/loyiha', '/loyiha/', '/loyiha/1/2', '/kirishx', '/Kirish', '/sozlamalar/boshqa', '/buyurtmalar/5', '/tg/x', '/eski/loyihalar']) {
    const r = await fetch(base + p);
    assert.equal(r.status, 404, p);
    assert.match(await r.text(), /Sahifa topilmadi/, p);
  }
  const a = await fetch(base + '/api/yoq');
  assert.equal(a.status, 404);
  assert.match(a.headers.get('content-type'), /json/);
  assert.equal((await a.json()).code, 'S3D-SRV-002');
  const s = await fetch(base + '/');
  assert.match(s.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.match(await s.text(), /\/assets\/main-/);
});
