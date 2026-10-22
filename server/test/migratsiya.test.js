/* Smart3D server — yangilashda baza migratsiyasi (DEPLOY.md, "Yangilashdan keyin baza"): lib/sxema.js idempotent.
 * Eski (init-db) bazaga yangi jadval/ustunlar qo'shiladi, mavjud ma'lumot o'zgarmaydi, qayta ishga tushirish hech narsani takrorlamaydi.
 * Vaqtinchalik baza; server ishga tushirilmaydi. Ishga tushirish: npm test */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import * as S from '../lib/sxema.js';
import { APP_DIR } from '../lib/config.js';

const SERVER_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let tmp, db, d;
const jadvallar = (x) => Object.fromEntries(x.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()
  .map(t => [t.name, x.prepare(`SELECT COUNT(*) AS n FROM "${t.name}"`).get().n]));
const ustunlar = (x, t) => x.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name);
/** index.js dagi tartib bilan (createAuth'dan oldin); adminSxema3 (TZ-37 3-faza) main'ga qo'shilganda o'zi qamraladi */
const migratsiya = () => {
  S.yadroSxema(d); S.mcModullar(d, APP_DIR); S.adminSxema(d); S.aiSxema(d); S.adminSxema2(d);
  if (S.adminSxema3) S.adminSxema3(d);
  if (S.erpJonliSxema) S.erpJonliSxema(d);                                                          // TZ-44: ERP jonli sinxron jadvallari
  S.promptlarSeed(d, APP_DIR);
};

before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-mig-'));
  db = path.join(tmp, 'eski.db');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: 'migratsiya-test-3' }, stdio: 'pipe' });
  d = new Database(db);
  d.pragma('journal_mode = WAL');
  /* "production" ma'lumoti: foydalanuvchi, sozlama — migratsiya ularni o'zgartirmasligi kerak */
  d.prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('Usta', 'usta@example.com', 'x', 'user')").run();
  d.prepare("INSERT INTO settings (key, value) VALUES ('narx_stavkalari', '{\"eski\":true}')").run();
});
after(() => { d.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

let oldin, birinchi;

test('migratsiya: eski bazaga yangi jadvallar va ustunlar qo\'shiladi, mavjud ma\'lumot o\'zgarmaydi', () => {
  oldin = jadvallar(d);
  for (const t of ['mat_rasm', 'mat_admin', 'mat_narx', 'katalog_admin', 'furn_boglash', 'promptlar_admin', 'admin_audit', 'ai_kesh', 'ai_sarf']) assert.ok(!(t in oldin), t + ' eski bazada bo\'lmasligi kerak');
  assert.ok(!ustunlar(d, 'users').includes('bloklangan'));
  migratsiya();
  birinchi = jadvallar(d);
  for (const t of ['mat_rasm', 'mat_admin', 'mat_narx', 'katalog_admin', 'furn_boglash', 'promptlar_admin', 'admin_audit', 'ai_kesh', 'ai_sarf', 'erp_jonli_holat', 'erp_jonli_obyekt', 'erp_jonli_kat', 'erp_jonli_tarix']) assert.ok(t in birinchi, t + ' yaratilmadi');
  assert.ok(ustunlar(d, 'erp_partiya').includes('manba'), 'erp_partiya.manba (TZ-44) qo\'shilmadi');
  for (const c of ['bloklangan', 'blok_sabab', 'blok_vaqt']) assert.ok(ustunlar(d, 'users').includes(c), 'users.' + c);
  for (const c of ['spec_json', 'spec_manba', 'spec_sana', 'spec_versiya', 'spec_hash', 'spec_tasdiq']) assert.ok(ustunlar(d, 'promptlar_admin').includes(c), 'promptlar_admin.' + c);
  /* mavjud ma'lumot */
  const u = d.prepare("SELECT name, role, bloklangan FROM users WHERE email = 'usta@example.com'").get();
  assert.deepEqual({ ...u }, { name: 'Usta', role: 'user', bloklangan: 0 }, 'mavjud foydalanuvchi bloklanmagan holda qoladi');
  assert.equal(d.prepare("SELECT value FROM settings WHERE key = 'narx_stavkalari'").get().value, '{"eski":true}');
  for (const t of ['users', 'materials', 'orders', 'price_history']) assert.equal(birinchi[t], oldin[t], t + ': qatorlar soni o\'zgarmasligi kerak');
});

test('migratsiya: ikkinchi ishga tushirish idempotent — jadval, ustun va qatorlar soni o\'zgarmaydi (xatosiz)', () => {
  const ust = Object.fromEntries(Object.keys(birinchi).map(t => [t, ustunlar(d, t).join(',')]));
  migratsiya(); migratsiya();
  assert.deepEqual(jadvallar(d), birinchi);
  assert.deepEqual(Object.fromEntries(Object.keys(birinchi).map(t => [t, ustunlar(d, t).join(',')])), ust);
});

test('migratsiya: boshlang\'ich ma\'lumot (modullar, tayyor so\'rovlar) bir marta qo\'shiladi; admin o\'chirgan so\'rov qaytib kelmaydi', () => {
  const n = birinchi.promptlar_admin;
  assert.ok(n > 0, 'tayyor so\'rovlar to\'plami qo\'shilmadi');
  assert.ok(d.prepare("SELECT COUNT(*) AS n FROM fragments WHERE code LIKE 'MC-FB-%'").get().n > 0, 'full base modullari qo\'shilmadi');
  d.prepare('DELETE FROM promptlar_admin WHERE id = (SELECT id FROM promptlar_admin LIMIT 1)').run();
  migratsiya();
  assert.equal(d.prepare('SELECT COUNT(*) AS n FROM promptlar_admin').get().n, n - 1, 'admin o\'chirgan tayyor so\'rov qaytib kelmasligi kerak (promptlar_seed_v1)');
});
