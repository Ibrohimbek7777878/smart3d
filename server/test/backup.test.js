/* Smart3D server — TZ-10: zaxira nusxasi (backup.js). Vaqtinchalik papkada. Ishga tushirish: npm test */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const SERVER_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let tmp, db, dir;
before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's3d-bak-'));
  db = path.join(tmp, 'test.db'); dir = path.join(tmp, 'zaxira');
  execFileSync(process.execPath, ['init-db.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, ADMIN_PASSWORD: 'test-admin-parol-5' }, stdio: 'pipe' });
  fs.mkdirSync(dir);
  for (let i = 1; i <= 4; i++) fs.writeFileSync(path.join(dir, `smart3d-2026-01-0${i}-10-00-00.db`), 'eski');
});
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

test('zaxira: nusxa yaratiladi, butun, ma\'lumot bor; oxirgi KEEP tasi qoladi', () => {
  const out = execFileSync(process.execPath, ['backup.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, BACKUP_DIR: dir, KEEP: '3' } }).toString();
  const j = JSON.parse(out.trim().split('\n').pop());
  assert.ok(fs.existsSync(j.nusxa));
  assert.equal(j.foydalanuvchilar, 1);                      // init-db yaratgan admin
  const files = fs.readdirSync(dir).sort();
  assert.equal(files.length, 3);
  assert.ok(files.includes(path.basename(j.nusxa)), 'yangi nusxa saqlanmadi');
  assert.ok(!files.includes('smart3d-2026-01-01-10-00-00.db'), 'eng eski nusxa o\'chmadi');
  const c = new Database(j.nusxa, { readonly: true });
  assert.equal(c.pragma('integrity_check', { simple: true }), 'ok');
  assert.ok(c.prepare("SELECT COUNT(*) AS n FROM fragments").get().n > 0);
  c.close();
});

test('zaxira: baza yo\'q bo\'lsa — xato kodi bilan to\'xtaydi', () => {
  assert.throws(() => execFileSync(process.execPath, ['backup.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: path.join(tmp, 'yoq.db'), BACKUP_DIR: dir }, stdio: 'pipe' }));
});

test('TZ-36 P9: tiklash sinovi — DEPLOY.md qadamlari (nusxani joyiga ko\'chirish, -wal/-shm o\'chirish) bazani nusxa holatiga qaytaradi', () => {
  const jadvallar = (d) => Object.fromEntries(d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()
    .map(t => [t.name, d.prepare(`SELECT COUNT(*) AS n FROM "${t.name}"`).get().n]));
  const asl = new Database(db);
  const oldin = jadvallar(asl);
  const out = execFileSync(process.execPath, ['backup.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, BACKUP_DIR: dir, KEEP: '5' } }).toString();
  const nusxa = JSON.parse(out.trim().split('\n').pop()).nusxa;
  /* "ofat": zaxiradan keyin ma'lumot buziladi (foydalanuvchi qo'shildi, loyiha jadvali o'chdi) */
  asl.prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('Keyin', 'keyin@example.com', 'x', 'user')").run();
  asl.exec('DROP TABLE IF EXISTS narx_history; DELETE FROM fragments');
  assert.notDeepEqual(jadvallar(asl), oldin);
  asl.close();
  /* tiklash: servis to'xtagan; nusxa -> DB_PATH; -wal va -shm o'chiriladi */
  for (const x of ['-wal', '-shm']) fs.rmSync(db + x, { force: true });
  fs.copyFileSync(nusxa, db);
  const t = new Database(db);
  assert.equal(t.pragma('integrity_check', { simple: true }), 'ok');
  const keyin = jadvallar(t);
  assert.equal(t.prepare("SELECT COUNT(*) AS n FROM users WHERE email='keyin@example.com'").get().n, 0, 'zaxiradan keyingi yozuv qaytmasligi kerak');
  for (const [nom, n] of Object.entries(oldin)) assert.equal(keyin[nom], n, `${nom}: qatorlar soni nusxadagi bilan bir xil`);
  t.close();
});

test('TZ-37/TZ-40: zaxira admin panel va AI jadvallarini ham qamraydi (material rasmi BLOB bayt-bayt), tiklash ularni qaytaradi', async () => {
  /* init-db faqat asosiy jadvallarni yaratadi; admin panel jadvallari server ishga tushganda (lib/sxema.js) qo'shiladi — shu yerda ham xuddi shunday */
  const S = await import('../lib/sxema.js');
  const d = new Database(db);
  for (const f of [S.yadroSxema, S.adminSxema, S.aiSxema, S.adminSxema2, S.adminSxema3, S.erpJonliSxema].filter(Boolean)) f(d);   // adminSxema3 (3-faza) qo'shilganda ham o'zi qamraladi
  const YANGI = ['furn_boglash', 'promptlar_admin', 'admin_audit', 'ai_kesh', 'ai_sarf', 'mat_admin', 'mat_rasm', 'mat_narx', 'katalog_admin', 'erp_jonli_holat', 'erp_jonli_obyekt', 'erp_jonli_kat', 'erp_jonli_tarix'];
  const rasm = Buffer.from(Array.from({ length: 4096 }, (_, i) => (i * 7 + 13) % 256));
  d.prepare("INSERT INTO mat_rasm (kalit, mime, hajm, sha, data) VALUES ('sinov-dekor', 'image/png', ?, 'abc123', ?)").run(rasm.length, rasm);
  d.prepare("INSERT INTO mat_admin (kalit, rang_hex) VALUES ('sinov-dekor', '#aabbcc')").run();
  d.prepare("INSERT INTO mat_narx (kod, uzs) VALUES ('ERP-SINOV', 123000)").run();
  d.prepare("INSERT INTO katalog_admin (kod, nom_uz, yashirin) VALUES ('MC-SINOV', 'Sinov modul', 1)").run();
  d.prepare("INSERT INTO furn_boglash (kod, erp_id, koef) VALUES ('BZ-sinov', '90000001', 2)").run();
  d.prepare("INSERT INTO promptlar_admin (id, kat) VALUES ('sinov-prompt', 'oshxona')").run();
  d.prepare("INSERT INTO erp_jonli_holat (kalit, qiymat) VALUES ('versiya', '7')").run();                       // TZ-44: ERP jonli sinxron holati zaxirada
  d.prepare("INSERT INTO erp_jonli_tarix (tur, kalit, harakat, yangi) VALUES ('plita', 'ERP-sinov', 'qollandi', 123000)").run();
  d.prepare("INSERT INTO admin_audit (user_id, bolim, kalit, eski, yangi) VALUES (1, 'materiallar', 'dekor:sinov-dekor', NULL, '{}')").run();
  d.prepare("INSERT INTO ai_kesh (kalit, yol, natija_json, yaratildi, muddat) VALUES ('k1', 'parse', '{}', 1, 2)").run();
  d.prepare("INSERT INTO ai_sarf (sana, manba) VALUES ('2026-10-22', 'kesh')").run();
  d.prepare("UPDATE users SET bloklangan = 1, blok_sabab = 'sinov' WHERE id = 1").run();
  const jadvallar = (x) => Object.fromEntries(x.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()
    .map(t => [t.name, x.prepare(`SELECT COUNT(*) AS n FROM "${t.name}"`).get().n]));
  const oldin = jadvallar(d);
  for (const t of YANGI) assert.ok(t in oldin, t + ' sxemada yaratilmadi');
  d.close();
  const out = execFileSync(process.execPath, ['backup.js'], { cwd: SERVER_DIR, env: { ...process.env, DB_PATH: db, BACKUP_DIR: dir, KEEP: '6' } }).toString();
  const nusxa = JSON.parse(out.trim().split('\n').pop()).nusxa;
  const c = new Database(nusxa, { readonly: true });
  assert.equal(c.pragma('integrity_check', { simple: true }), 'ok');
  assert.deepEqual(jadvallar(c), oldin, 'zaxirada hamma jadval (yangilari ham) qatorlar soni bilan bir xil bo\'lishi kerak');
  assert.ok(c.prepare("SELECT data FROM mat_rasm WHERE kalit = 'sinov-dekor'").get().data.equals(rasm), 'material rasmi (BLOB) bayt-bayt bir xil bo\'lishi kerak');
  assert.equal(c.prepare('SELECT bloklangan FROM users WHERE id = 1').get().bloklangan, 1, 'users.bloklangan zaxirada');
  c.close();
  /* tiklash: bazani buzamiz, nusxani joyiga ko'chiramiz (DEPLOY.md) — yangi jadvallar qaytadi */
  const b = new Database(db);
  b.exec('DROP TABLE mat_rasm; DELETE FROM admin_audit; DELETE FROM mat_narx');
  b.close();
  for (const x of ['-wal', '-shm']) fs.rmSync(db + x, { force: true });
  fs.copyFileSync(nusxa, db);
  const t = new Database(db);
  assert.deepEqual(jadvallar(t), oldin);
  assert.ok(t.prepare("SELECT data FROM mat_rasm WHERE kalit = 'sinov-dekor'").get().data.equals(rasm));
  t.close();
});
