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
