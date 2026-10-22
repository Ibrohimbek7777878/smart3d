/* TZ-44 (11): jonli ERP narxlari — HAQIQIY server + SOXTA ERP + haqiqiy brauzer (soxta API'siz). Server (agent/erpjonli: server/lib/erp-jonli.js) va soxta ERP serveri
 * (server/test/erp-soxta.js) mavjud bo'lmasa — o'tkazib yuboriladi (skipped). Haqiqiy ERP'ga HECH QACHON so'rov ketmaydi: server ERP_URL=<lokal soxta ERP>.
 * O'z serveri ishga tushiriladi (vaqtinchalik baza, web/dist ni o'zi beradi) va test oxirida PID bo'yicha to'xtatiladi.
 *   1) usta: ro'yxatdan o'tadi, oshxona, Narx: "ERP narxlari: HH:MM" (jonli yoqilgan — yangi); buyurtma beradi (narx serverda qotadi)
 *   2) soxta ERP'da plita narxi +5% → admin "Hozir" → brauzer /api/erp-narx ni so'raydi → katalogda yangi narx, "Narxlar yangilandi (1 ta)"; buyurtma narxi o'zgarmadi
 *   3) +150% (chegaradan katta) → qo'llanmaydi, brauzerdagi narx o'zgarmaydi, admin "tasdiq kutadi"
 *   4) soxta ERP uziladi → xato soni oshadi → narx panelida "ERP bilan aloqa yo'q"; qaytgach — oddiy; sayt ishlayveradi
 *   5) admin /admin/erp: "Jonli sinxronlash" kartasi (haqiqiy API): holat, "kutadi" qatori, tasdiq kutayotganlar havolasi → mavjud tasdiq oqimi, pauza, chegara, "Hozir"
 *   6) parol hech qayerda (ekran, sahifa xotirasi, ommaviy va admin javoblari)
 * Ishlatish: bash tests/ui/web.sh erpJonliHaqiqiy */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SERVER_DIR = path.join(ROOT, 'server');
const SOXTA = path.join(SERVER_DIR, 'test', 'erp-soxta.js');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export default async function run(page) {
  const R = {};
  if (!fs.existsSync(SOXTA) || !fs.existsSync(path.join(SERVER_DIR, 'lib', 'erp-jonli.js'))) return { skipped: 'server/lib/erp-jonli.js yoki server/test/erp-soxta.js yo\'q (TZ-44 server qismi birlashtirilmagan)', ok: true };
  let proc = null, erp = null, tmp = null;
  try { await asosiy(page, R, (p, e, t) => { proc = p; erp = e; tmp = t; }); } catch (e) {
    R.xato = String(e.message || e).split('\n')[0];
    await page.screenshot({ path: `${process.env.QA_OUT}/erpJonliHaqiqiy-xato.png` }).catch(() => {});
    R.ok = false;
  } finally {
    if (proc) proc.kill();                                    // faqat o'zimiz ochgan jarayon (PID bo'yicha)
    if (erp) await erp.yop().catch(() => {});
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  }
  return R;
}

async function asosiy(page, R, tutqich) {
  const OUT = process.env.QA_OUT, errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 240)));
  const { soxtaErp, erpMahsulot } = await import(pathToFileURL(SOXTA).href);
  const { erpKod } = await import(pathToFileURL(path.join(ROOT, 'app/js/engine/erpKod.js')).href);
  const { nomKalit } = await import(pathToFileURL(path.join(ROOT, 'app/js/engine/erpSinxron.js')).href);
  const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'app/data', f), 'utf8'));
  const ADMIN_PW = 'e2e-admin-erpjonli-9', PAROL = 'E2E-ERP-Parol-Q7z!m4k', LOGIN = 'e2e-erp-foydalanuvchi';

  /* katalogdan aniq (nomi yagona, narxi bor) plita: dekor-asosiy kodli */
  const sheets = J('sheet-catalog.json').sheets, soni = new Map();
  for (const s of sheets) soni.set(nomKalit(s.name), (soni.get(nomKalit(s.name)) || 0) + 1);
  let plita = null;
  for (const it of J('dekor-asosiy.json').items) for (const k of it.kodlar) { const s = sheets.find(x => erpKod(x) === k); if (!plita && s && s.uzs > 0 && soni.get(nomKalit(s.name)) === 1) plita = { k, ...s }; }
  if (!plita) throw new Error('katalogdan sinov plitasi topilmadi');

  const erp = await soxtaErp({ login: LOGIN, parol: PAROL, kategoriyalar: [{ id: 1, name: 'Плиты' }],
    mahsulotlar: [erpMahsulot({ id: 501, sku: plita.sku, name: plita.name, kat: 1, uzs: Math.round(plita.uzs) }), ...Array.from({ length: 4 }, (_, i) => erpMahsulot({ id: 700 + i, sku: 'Z' + i, name: 'Boshqa ' + i, kat: 1, uzs: 1000 + i }))], xizmatlar: [] });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-erpjonli-e2e-'));
  const dbPath = path.join(tmp, 'e2e.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: dbPath, ADMIN_PASSWORD: ADMIN_PW, ADMIN_EMAIL: 'admin@smart3d.uz' }, stdio: 'pipe' });
  const port = 35000 + Math.floor(Math.random() * 900), base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), DB_PATH: dbPath, JWT_SECRET: 'e2e-erpjonli-' + 'k'.repeat(40), NODE_ENV: 'test', TEST_REGISTER_LIMIT: '100', TRUST_PROXY: '1',
    ERP_JONLI: '1', ERP_URL: erp.url, ERP_LOGIN: LOGIN, ERP_PASSWORD: PAROL, ERP_SINOV_REJIM: '1', BACKUP_DIR: path.join(tmp, 'zaxira') };
  for (const k of ['GOOGLE_CLIENT_ID', 'ESKIZ_EMAIL', 'ESKIZ_PASSWORD', 'AI_PROVIDER', 'AI_API_KEY', 'ANTHROPIC_API_KEY']) delete env[k];
  tutqich(null, erp, tmp);
  const proc = spawn(process.execPath, ['index.js'], { cwd: SERVER_DIR, env });
  tutqich(proc, erp, tmp);
  let chiqish = ''; proc.stdout.on('data', d => { chiqish += d; }); proc.stderr.on('data', d => { chiqish += d; });
  for (let i = 0; i < 100 && !/Smart3D server:/.test(chiqish); i++) await sleep(100);
  if (!/Smart3D server:/.test(chiqish)) throw new Error('server ishga tushmadi: ' + chiqish.slice(-300));

  /* ───── server tomoni yordamchilari ───── */
  let ipN = 0;
  const api = (p, { method = 'GET', body, token, headers = {} } = {}) => fetch(base + p, { method, headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.7.${Math.floor(ipN++ / 40) % 250}.1`, ...(token ? { authorization: 'Bearer ' + token } : {}), ...headers }, body: body !== undefined ? JSON.stringify(body) : undefined });
  const token = (await (await api('/api/login', { method: 'POST', body: { email: 'admin@smart3d.uz', password: ADMIN_PW } })).json()).token;
  const A = (p, o = {}) => api(p, { ...o, token });
  const jonli = async () => (await A('/api/admin/erp/jonli')).json();
  const narx = async () => (await api('/api/erp-narx')).json();
  const narxQoy = (uzs) => { const m = erp.mahsulotlar.find(x => x.id === 501); m.display_price_uzs = uzs; m.price = uzs.toFixed(2); };
  let oxirgiHozir = 0;
  const hozir = async () => { const kut = 1700 - (Date.now() - oxirgiHozir); if (kut > 0) await sleep(kut); oxirgiHozir = Date.now(); const r = await A('/api/admin/erp/jonli/hozir', { method: 'POST', body: { kut: true } }); return { status: r.status, j: await r.json().catch(() => null) }; };
  for (let i = 0; i < 150; i++) { const j = await jonli(); if (j.oxirgi_muvaffaqiyat && !j.band) break; await sleep(100); }
  R.boshlandi = (await jonli()).yoqilgan === true;
  const n0 = await narx();
  R.shakl = Object.keys(n0).sort().join(',');

  /* ───── brauzer yordamchilari ───── */
  const M = (fn, arg) => page.evaluate(fn, arg, false);
  const txt = () => M(() => document.body.innerText);
  const has = async (t) => (await txt()).includes(t);
  const fill = async (ph, v) => { await page.locator(`input[placeholder*="${ph}"]`).first().fill(v); };
  const kut = async (sel, ms = 8000) => { try { await page.locator(sel).first().waitFor({ timeout: ms }); return true; } catch (_) { return false; } };
  const waitText = async (t, ms = 8000) => { for (let i = 0; i < ms / 200; i++) { if (await has(t)) return true; await page.waitForTimeout(200); } return false; };
  const korsatkich = () => M(() => { const e = document.querySelector('[data-erp-korsatkich]'); return e ? { holat: e.dataset.erpHolat, matn: e.innerText.trim() } : null; });
  const tekshir = () => M(() => window.__app.erp.tekshir());
  const rasm = async (nom) => { await M(() => { const e = document.querySelector('[data-erp-korsatkich]'); if (e) e.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(250); await page.screenshot({ path: `${OUT}/erpJonliHaqiqiy-${nom}.png` }); };
  const katalogNarx = () => M(({ sku, name }) => { const s = window.__app.H.sheetCatalog.sheets.find(x => x.sku === sku && x.name === name); return s ? s.uzs : null; }, { sku: plita.sku, name: plita.name });

  /* 1) usta: ro'yxatdan o'tish, oshxona, Narx */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base + '/royxat'); await page.waitForTimeout(1500);
  await M(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('s3d-til', 'uz'); });
  await page.reload(); await page.waitForTimeout(1500);
  await fill('Jasur', 'E2E Usta'); await fill('jasur@', 'e2e' + Date.now() + '@test.uz');
  const tel = page.locator('input[inputmode=numeric]').first(); if (await tel.count()) { await tel.click(); await tel.type('9' + String(Date.now()).slice(-8)); }
  await fill('kamida 8', 'parol12345');
  await page.getByText(/^Ro'yxatdan o'tish$/).last().click(); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  await page.locator('[data-tez="kitchen"]').click(); await page.waitForTimeout(800);
  for (let i = 0; i < 60 && !(await M(() => window.__app && window.__app.res && window.__app.state.sceneOn)); i++) await page.waitForTimeout(250);
  await page.getByText(/^Narx$/).last().click(); await page.waitForTimeout(1200);
  R.korsatkich1 = await korsatkich();
  R.erpHolat1 = await M(() => { const e = window.__app.erp.holat(); return { bor: e.bor, yoqilgan: e.yoqilgan, versiya: e.versiya }; });
  R.katalogBoshida = await katalogNarx();
  await rasm('1440-narx');
  /* buyurtma — narx serverda qotadi */
  const jami0 = await M(() => window.__app.res.priceRes.total);
  await page.locator('[data-buyurtma-ber]').click(); await kut('[data-varaq="buyurtma"]');
  await page.locator('[data-buyurtma-ism]').fill('E2E Mijoz'); await page.locator('[data-buyurtma-tel]').fill('90 765 43 21');
  await page.locator('[data-buyurtma-yubor]').click(); R.buyurtmaYuborildi = await waitText('sexga yuborildi');
  await page.waitForTimeout(3500);
  const buyurtmalar = () => M(() => fetch('/api/orders', { cache: 'no-store' }).then(r => r.json()));
  R.buyurtma0 = (await buyurtmalar())[0].total_price === jami0;

  /* 2) +5%: avtomatik qo'llanadi → brauzer yangilaydi */
  const yangi = Math.round(plita.uzs * 1.05);
  narxQoy(yangi);
  const h1 = await hozir();
  R.hozir1 = { status: h1.status, qollandi: h1.j && h1.j.natija && h1.j.natija.qollandi };
  const n1 = await narx();
  R.versiya = { eski: n0.versiya, yangi: n1.versiya, plita: n1.plita[plita.k] === yangi };
  R.tekshir2 = await tekshir();
  R.katalogYangi = { narx: await katalogNarx(), kutilgan: yangi };
  R.xabar = await waitText('Narxlar yangilandi (1 ta)');
  await rasm('1440-yangilandi');
  R.buyurtmaQotgan = (await buyurtmalar())[0].total_price === jami0;
  R.etag = await M(async () => { const r1 = await fetch('/api/erp-narx', { cache: 'no-store' }); const e = r1.headers.get('ETag'); const r2 = await fetch('/api/erp-narx', { headers: { 'If-None-Match': e }, cache: 'no-store' }); return { e: /^W\//.test(e), s304: r2.status === 304, oxirgi: !!r2.headers.get('X-Erp-Oxirgi') }; });

  /* 3) +150%: chegaradan katta — qo'llanmaydi, tasdiq kutadi */
  narxQoy(Math.round(plita.uzs * 2.5));
  const h2 = await hozir();
  R.hozir2 = { status: h2.status, kutadi: h2.j && h2.j.natija && h2.j.natija.kutadi };
  R.tekshir3 = await tekshir();
  R.katta = { brauzer: await katalogNarx(), server: (await narx()).plita[plita.k], kutilgan: yangi, tasdiq: (await jonli()).tasdiq_kutadi };

  /* 4) ERP uziladi → xato; narx panelida ogohlantirish; qaytgach — oddiy */
  erp.rejim = 'uzilgan';
  const h3 = await hozir();
  R.hozir3 = { status: h3.status, kod: h3.j && h3.j.code };
  R.jonliXato = (await jonli()).xato_soni;
  await tekshir(); await page.waitForTimeout(400);
  R.uzildi = { k: await korsatkich(), narx: await katalogNarx(), saytIshlaydi: await M(() => !!window.__app.res) };
  await rasm('1440-uzildi');
  erp.rejim = 'ok'; narxQoy(yangi);
  await hozir(); await tekshir(); await page.waitForTimeout(400);
  R.tiklandi = await korsatkich();

  /* 5) admin: "Jonli sinxronlash" kartasi (haqiqiy API) */
  await page.context().clearCookies();
  await page.goto(base + '/kirish'); await page.waitForTimeout(1500);
  await fill('jasur@', 'admin@smart3d.uz'); await fill('kamida 8', ADMIN_PW);
  await page.getByText(/^Kirish$/).last().click(); await page.locator('[data-ishjoyi]').waitFor({ timeout: 15000 });
  narxQoy(Math.round(plita.uzs * 2.5)); await hozir();                       // yana bitta "tasdiq kutadi"
  await page.goto(base + '/admin/erp'); await kut('[data-erpj="karta"]'); await page.waitForTimeout(1200);
  R.karta = await M(() => { const q = (s) => (document.querySelector(s) || {}).innerText || ''; return { holat: q('[data-erpj="holat"]'), xato: q('[data-erpj-katak="xato"]'), kutayotgan: q('[data-erpj="kutayotgan"]'),
    qatorlar: [...document.querySelectorAll('[data-erpj-ozgarish]')].map(e => ({ holat: e.dataset.erpjHolat, matn: e.innerText.replace(/\s+/g, ' ').slice(0, 160) })).slice(0, 6) }; });
  await page.locator('[data-erpj="karta"]').screenshot({ path: `${OUT}/erpJonliHaqiqiy-1440-admin.png` });
  await page.locator('[data-erpj="kutayotgan-och"]').click(); R.havolaFarq = await kut('[data-erp="batafsil"]', 5000);
  R.havolaJadval = await M(() => document.querySelectorAll('[data-erp-qator]').length);
  await page.locator('[data-erp="yop"]').click().catch(() => {}); await page.waitForTimeout(300);
  await page.locator('[data-erpj="pauza"] button[role="switch"]').click(); await page.waitForTimeout(1200);
  R.pauza = { server: (await jonli()).pauza, karta: await M(() => (document.querySelector('[data-erpj="holat"]') || {}).innerText || '') };
  await page.locator('[data-erpj="pauza"] button[role="switch"]').click(); await page.waitForTimeout(1200);
  R.pauzaOlindi = (await jonli()).pauza === false;
  await page.locator('[data-erpj="chegara"]').fill('40'); await page.locator('[data-erpj="chegara-saqla"]').click(); await page.waitForTimeout(1200);
  R.chegara40 = (await jonli()).chegara_foiz === 40;
  await page.locator('[data-erpj="chegara"]').fill('30'); await page.locator('[data-erpj="chegara-saqla"]').click(); await page.waitForTimeout(1200);
  R.chegara30 = (await jonli()).chegara_foiz === 30;
  await page.locator('[data-erpj="hozir"]').click(); R.hozirTugma = { xabar: await waitText('Sinxronlash boshlandi'), ochiq: await page.locator('[data-erpj="hozir"]').isDisabled() };

  /* 6) parol hech qayerda */
  const ommaviy = JSON.stringify(await narx()), adminJ = JSON.stringify(await jonli());
  R.parolYoq = !(await txt()).includes(PAROL) && !(await M(() => JSON.stringify(Object.assign({}, localStorage, sessionStorage)))).includes(PAROL) && !ommaviy.includes(PAROL) && !adminJ.includes(PAROL) && !chiqish.includes(PAROL);
  R.faqatGet = erp.faqatGet();
  R.errs = errs;

  R.ok = R.boshlandi && R.shakl === 'furnitura,jonli,plita,sana,versiya,yangilangan' && R.korsatkich1 && R.korsatkich1.holat === 'yangi' && /^ERP narxlari: \d\d:\d\d$/.test(R.korsatkich1.matn) && R.erpHolat1.bor && R.erpHolat1.yoqilgan
    && R.buyurtmaYuborildi && R.buyurtma0 && R.hozir1.status === 200 && R.hozir1.qollandi >= 1 && R.versiya.yangi === R.versiya.eski + 1 && R.versiya.plita && R.tekshir2 === 'yangi'
    && R.katalogYangi.narx === yangi && R.katalogBoshida !== yangi && R.xabar && R.buyurtmaQotgan && R.etag.e && R.etag.s304 && R.etag.oxirgi
    && R.hozir2.kutadi >= 1 && R.katta.brauzer === yangi && R.katta.server === yangi && R.katta.tasdiq.soni >= 1
    && R.jonliXato >= 1 && R.uzildi.k && R.uzildi.k.holat === 'eski' && /^ERP bilan aloqa yo'q — oxirgi narx \d\d:\d\d$/.test(R.uzildi.k.matn) && R.uzildi.narx === yangi && R.uzildi.saytIshlaydi && R.tiklandi && R.tiklandi.holat === 'yangi'
    && /Yoqilgan/.test(R.karta.holat) && /Tasdiq kutayotganlar: \d/.test(R.karta.kutayotgan) && R.karta.qatorlar.some(q => q.holat === 'kutadi') && R.karta.qatorlar.some(q => q.holat === 'qollandi')
    && R.havolaFarq && R.havolaJadval >= 1 && R.pauza.server === true && /Pauza/.test(R.pauza.karta) && R.pauzaOlindi && R.chegara40 && R.chegara30 && R.hozirTugma.xabar && R.hozirTugma.ochiq
    && R.parolYoq && R.faqatGet && !errs.length;
}
