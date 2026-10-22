/* Smart3D server — TZ-10: production rejimi (DEPLOY.md da'volari). Vaqtinchalik bazada. Ishga tushirish: npm test */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-prod-'));
const db = path.join(tmp, 'p.db');
execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: 'prod-test-parol-7' }, stdio: 'pipe' });
const procs = [];
after(() => { procs.forEach(p => p.kill()); fs.rmSync(tmp, { recursive: true, force: true }); });

function start(extra) {
  const port = 28000 + Math.floor(Math.random() * 1000);
  const env = { ...process.env, PORT: String(port), DB_PATH: db, NODE_ENV: 'production', ...extra };
  for (const k of ['ESKIZ_EMAIL', 'ESKIZ_PASSWORD', 'AI_PROVIDER', 'AI_API_KEY']) delete env[k];
  if (extra.JWT_SECRET === undefined) delete env.JWT_SECRET;
  const p = spawn(process.execPath, ['index.js'], { cwd: SERVER_DIR, env });
  procs.push(p);
  return new Promise((resolve) => {
    let out = '';
    const t = setTimeout(() => resolve({ started: false, out }), 8000);
    p.stdout.on('data', d => { out += d; if (/Smart3D server:/.test(out)) { clearTimeout(t); resolve({ started: true, base: `http://127.0.0.1:${port}` }); } });
    p.stderr.on('data', d => { out += d; });
    p.on('exit', code => { clearTimeout(t); resolve({ started: false, code, out }); });
  });
}

test('production: JWT_SECRET yo\'q yoki qisqa — ishga tushmaydi', async () => {
  for (const s of [undefined, 'qisqa']) {
    const r = await start({ JWT_SECRET: s });
    assert.equal(r.started, false);
    assert.match(r.out, /JWT_SECRET/);
  }
});

test('production: to\'g\'ri sozlamada ishlaydi; Eskiz sozlanmagan — SMS 503, dev_code yo\'q', async () => {
  const r = await start({ JWT_SECRET: 'prod-' + 'k'.repeat(48) });
  assert.ok(r.started, r.out);
  assert.equal((await (await fetch(r.base + '/api/health')).json()).ok, true);
  const s = await fetch(r.base + '/api/auth/sms/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: '998901234567' }) });
  assert.equal(s.status, 503);
  assert.equal((await s.json()).dev_code, undefined);
  /* TZ-23 C4: Eskiz yo'q — saytda SMS bilan kirish ko'rinmaydi */
  assert.deepEqual(await (await fetch(r.base + '/api/auth/usullar')).json(), { email: true, sms: false, google: false, googleClientId: '' });
});

/* ───────── TZ-36 P6: production sozlama tekshiruvi (lib/config.js) va .env.example ───────── */
import { loadConfig } from '../lib/config.js';

function configSinov(env) {
  const eski = process.exit;
  const xabar = console.error, ogoh = console.warn;
  let chiqdi = null;
  process.exit = (k) => { chiqdi = k; throw new Error('exit'); };
  console.error = () => {}; console.warn = () => {};
  try { return { cfg: loadConfig(env), chiqdi }; }
  catch (e) { if (e.message !== 'exit') throw e; return { cfg: null, chiqdi }; }
  finally { process.exit = eski; console.error = xabar; console.warn = ogoh; }
}

test('production sozlama: JWT_SECRET chegarasi 32 belgi; SMS/Google/AI/Telegram talab qilinmaydi', () => {
  assert.equal(configSinov({ NODE_ENV: 'production', JWT_SECRET: 'a'.repeat(31) }).chiqdi, 1);
  assert.equal(configSinov({ NODE_ENV: 'production' }).chiqdi, 1);
  const ok = configSinov({ NODE_ENV: 'production', JWT_SECRET: 'a'.repeat(32), DB_PATH: '/x/y.db' });   // ixtiyoriy kalitlarsiz
  assert.equal(ok.chiqdi, null);
  assert.equal(ok.cfg.PROD, true);
  assert.equal(ok.cfg.DB_PATH, '/x/y.db');
  assert.equal(ok.cfg.JWT_SECRET, 'a'.repeat(32));
});

test('production sozlama: production bo\'lmasa kalit yo\'q — tasodifiy vaqtinchalik kalit (to\'xtamaydi)', () => {
  const r = configSinov({ NODE_ENV: 'development' });
  assert.equal(r.chiqdi, null);
  assert.ok(r.cfg.JWT_SECRET.length >= 32);
  assert.equal(r.cfg.PROD, false);
});

test('production: GOOGLE_CLIENT_ID berilsa — kirish usullarida google yoqiladi', async () => {
  const r = await start({ JWT_SECRET: 'prod-' + 'g'.repeat(48), GOOGLE_CLIENT_ID: 'sinov-id.apps.googleusercontent.com' });
  assert.ok(r.started, r.out);
  const u = await (await fetch(r.base + '/api/auth/usullar')).json();
  assert.equal(u.google, true);
  assert.equal(u.googleClientId, 'sinov-id.apps.googleusercontent.com');
});

test('.env.example: sirlarsiz, kodda o\'qiladigan har bir o\'zgaruvchi izohlangan', () => {
  const matn = fs.readFileSync(path.join(SERVER_DIR, '.env.example'), 'utf8');
  /* qiymatlar — faqat <...> namuna yoki oddiy sozlama; haqiqiy kalit ko'rinishi yo'q */
  assert.ok(!/AIza|GOCSPX|sk-ant-|ghp_|BEGIN [A-Z ]*PRIVATE|[0-9]{8,10}:[A-Za-z0-9_-]{30,}/.test(matn), 'sir ko\'rinishidagi qiymat');
  for (const q of matn.split('\n').filter(s => /^#?\s*[A-Z][A-Z0-9_]+=/.test(s))) {
    const qiymat = q.replace(/^#?\s*[A-Z0-9_]+=/, '').replace(/\s+#.*$/, '').trim();
    assert.ok(!/^[A-Za-z0-9+/_-]{32,}$/.test(qiymat), 'uzun kalit ko\'rinishi: ' + q);
  }
  /* server kodidagi process.env.X / env.X nomlari .env.example da bor (test uchun mo'ljallanganlar bundan mustasno) */
  const faqatTest = new Set(['TEST_REGISTER_LIMIT', 'TEST_API_LIMIT', 'ERP_SINOV_REJIM', 'GOOGLE_JWKS_URL', 'TELEGRAM_API_URL', 'ESKIZ_BASE_URL', 'ANTHROPIC_BASE_URL']);
  const nomlar = new Set();
  const yur = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    if (f.name === 'node_modules' || f.name === 'test' || f.name === 'src' || f.name === 'backups') continue;
    const p = path.join(d, f.name);
    if (f.isDirectory()) yur(p);
    else if (/\.(js|cjs)$/.test(f.name) && f.name !== 'production.js') {
      const kod = fs.readFileSync(p, 'utf8');
      for (const m of kod.matchAll(/(?:process\.env|\benv)\.([A-Z][A-Z0-9_]+)/g)) nomlar.add(m[1]);
      /* bilvosita o'qish: process.env['X'] va yordamchi (sonEnv('AI_OYLIK_TOKEN', …) — lib/ai-tejash.js); to'g'ridan-to'g'ri qidiruv ularni ko'rmas edi */
      for (const m of kod.matchAll(/process\.env\[\s*['"]([A-Z][A-Z0-9_]+)['"]\s*\]|\b\w*[eE]nv\(\s*['"]([A-Z][A-Z0-9_]+)['"]/g)) nomlar.add(m[1] || m[2]);
    } } };
  yur(SERVER_DIR);
  const yoq = [...nomlar].filter(n => !faqatTest.has(n) && !new RegExp('^#?\\s*' + n + '=', 'm').test(matn));
  assert.deepEqual(yoq, [], '.env.example da yo\'q: ' + yoq.join(', '));
});

test('.env.example: AI chegaralari (TZ-40) hujjatlangan va kod o\'qiydigan nomlar bilan bir xil', () => {
  const matn = fs.readFileSync(path.join(SERVER_DIR, '.env.example'), 'utf8');
  const kod = fs.readFileSync(path.join(SERVER_DIR, 'lib/ai-tejash.js'), 'utf8') + fs.readFileSync(path.join(SERVER_DIR, 'ai-llm.js'), 'utf8');
  for (const n of ['AI_OYLIK_TOKEN', 'AI_KUNLIK_SOROV', 'AI_KESH_KUN', 'AI_MAX_TOKENS', 'AI_PROMPT_CACHE', 'AI_TIMEOUT_MS']) {
    assert.ok(new RegExp('^#?\\s*' + n + '=', 'm').test(matn), n + ' .env.example da yo\'q');
    assert.ok(kod.includes(n), n + ' kodda o\'qilmaydi — .env.example eskirgan');
  }
});

test('nginx.conf namunasi: SPA yo\'llari serverga uzatiladi (try_files yo\'q), kesh qoidalari bor, qavslar teng', () => {
  const n = fs.readFileSync(path.join(SERVER_DIR, 'nginx.conf'), 'utf8').replace(/#.*$/gm, '');
  assert.ok(!/try_files/.test(n), 'try_files ishlatilmaydi — app.html ni server o\'zi beradi');
  assert.equal((n.match(/{/g) || []).length, (n.match(/}/g) || []).length);
  for (const k of ['location /ws', 'location ^~ /data/rasm/', 'location = /sw.js', 'location = /app.html', 'immutable', 'X-Forwarded-Proto', 'proxy_set_header Upgrade']) assert.ok(n.includes(k), k);
  assert.ok(!/add_header\s+(Content-Security-Policy|X-Content-Type-Options|Strict-Transport)/i.test(n), 'sarlavhalarni server qo\'yadi, nginx takrorlamasin');
  /* TZ-37: admin yuklagan material rasmi — kesh serverda hal bo'ladi (?v= xesh mos — immutable, aks holda no-cache + ETag); nginx sarlavhani o'zgartirmaydi */
  assert.ok(n.includes('location ^~ /api/materiallar/rasm/'), 'material rasmi uchun alohida (ochiq) blok');
  const blok = n.slice(n.indexOf('location ^~ /api/materiallar/rasm/')).split('}')[0];
  assert.ok(/proxy_pass\s+http:\/\/smart3d_app/.test(blok));
  assert.ok(!/proxy_hide_header|add_header|expires|proxy_cache|proxy_ignore_headers/.test(blok), 'material rasmi keshini nginx buzmasin (rasm shu nom ostida almashishi mumkin)');
});

/* nginx location'lari ilova manzillarini (SPA) tutib qolmasligi kerak: faqat `location /` (hammasi serverga) va aniq nomlangan yo'llar */
function nginxMos(n, yol) {
  const mos = [];
  for (const m of n.matchAll(/location\s+(=\s+|\^~\s+|~\*\s+|~\s+)?(\S+)\s*{/g)) {
    const mod = (m[1] || '').trim(), loc = m[2];
    const ok = mod === '=' ? yol === loc : mod.startsWith('~') ? new RegExp(loc, mod === '~*' ? 'i' : '').test(yol) : yol.startsWith(loc);
    if (ok && loc !== '/') mos.push((mod ? mod + ' ' : '') + loc);
  }
  return mos;
}
const ILOVA_NAMUNA = ['/kirish', '/royxat', '/loyihalar', '/loyiha/yangi', '/loyiha/15', '/sozlamalar', '/sozlamalar/narxlar', '/buyurtmalar', '/tg',
  '/admin', '/admin/narxlar', '/admin/furnitura', '/admin/materiallar', '/admin/katalog', '/admin/promptlar', '/admin/standart', '/admin/foydalanuvchilar', '/admin/tarix'];

test('nginx.conf: ilova (SPA) va admin manzillari (ILOVA_YOLI) maxsus blokka tushmaydi — hammasi `location /` orqali serverga; /api/* ham', async () => {
  const { ILOVA_YOLI } = await import('../routes/sahifalar.js');
  const n = fs.readFileSync(path.join(SERVER_DIR, 'nginx.conf'), 'utf8').replace(/#.*$/gm, '');
  for (const yol of ILOVA_NAMUNA) {
    assert.ok(ILOVA_YOLI.test(yol), yol + ' — server ILOVA_YOLI da yo\'q (namuna ro\'yxati eskirgan?)');
    assert.deepEqual(nginxMos(n, yol), [], yol + ' — nginx\'da maxsus blokka tushdi (SPA yo\'li serverga oddiy uzatilishi kerak)');
  }
  for (const yol of ['/admin/noma-lum', '/admin/narxlar/x', '/administrator']) assert.ok(!ILOVA_YOLI.test(yol), yol + ' — 404 bo\'lishi kerak');
  /* ochiq API'lar va admin API: maxsus blok yo'q (kesh/sarlavha serverdan keladi) */
  for (const yol of ['/api/materiallar', '/api/katalog', '/api/furnitura-boglash', '/api/promptlar', '/api/standart', '/api/admin/audit', '/api/admin/materiallar']) {
    assert.deepEqual(nginxMos(n, yol), [], yol + ' — nginx\'da maxsus blokka tushdi');
  }
  assert.deepEqual(nginxMos(n, '/api/materiallar/rasm/abc'), ['^~ /api/materiallar/rasm/']);
  assert.deepEqual(nginxMos(n, '/data/rasm/x.webp'), ['^~ /data/rasm/']);
});

test('ILOVA_YOLI (server) va ILOVA_YOL_RE (web, service worker) bir xil manzillarni qabul qiladi — admin bo\'limlari ham', async (t) => {
  const fayl = path.join(SERVER_DIR, '../web/src/app/marshrutlar.js');
  if (!fs.existsSync(fayl)) return t.skip('web/src yo\'q');
  const { ILOVA_YOLI } = await import('../routes/sahifalar.js');
  const lit = fs.readFileSync(fayl, 'utf8').match(/export const ILOVA_YOL_RE = (\/.*\/);/);
  assert.ok(lit, 'ILOVA_YOL_RE topilmadi');
  const web = new RegExp(lit[1].slice(1, -1));
  const nomzod = [...ILOVA_NAMUNA, ...ILOVA_NAMUNA.map(y => y + '/'), '/', '/app.html', '/admin/noma-lum', '/admin/narxlar/x', '/administrator', '/loyiha/abc', '/loyiha/1/2', '/eski/', '/api/health'];
  for (const y of nomzod) assert.equal(web.test(y), ILOVA_YOLI.test(y), `${y}: server=${ILOVA_YOLI.test(y)}, web=${web.test(y)} — ikkala ro'yxat birga o'zgarishi kerak`);
});
