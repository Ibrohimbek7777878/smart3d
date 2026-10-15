/* Smart3D — SQLite zaxira nusxasi (TZ-10). Server ishlab turganda ham xavfsiz (better-sqlite3 backup API).
 *
 *   DB_PATH=/var/lib/smart3d/smart3d.db BACKUP_DIR=/var/backups/smart3d node backup.js
 *   KEEP — nechta oxirgi nusxa saqlanadi (standart 14). Har ishga tushishda bitta yangi nusxa.
 * Tiklash: servisni to'xtatib, nusxani DB_PATH ga ko'chiring (DEPLOY.md, "Zaxiradan tiklash").
 */
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'smart3d.db');
const DIR = process.env.BACKUP_DIR || path.join(__dirname, 'backups');
const KEEP = Math.max(1, Number(process.env.KEEP) || 14);

if (!fs.existsSync(DB_PATH)) { console.error('Baza topilmadi: ' + DB_PATH); process.exit(1); }
fs.mkdirSync(DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
const out = path.join(DIR, `smart3d-${stamp}.db`);

const db = new Database(DB_PATH, { readonly: true });
await db.backup(out);
db.close();

/* tekshiruv: nusxa ochiladi va butun. WAL o'rniga oddiy rejim — nusxa bitta fayl (-wal/-shm yo'q) */
const chk = new Database(out);
chk.pragma('journal_mode = DELETE');
const ok = chk.pragma('integrity_check', { simple: true });
const users = chk.prepare('SELECT COUNT(*) AS n FROM users').get().n;
chk.close();
if (ok !== 'ok') { console.error('Nusxa buzilgan: ' + ok); fs.rmSync(out, { force: true }); process.exit(1); }

/* eski nusxalar — oxirgi KEEP tasi qoladi */
const all = fs.readdirSync(DIR).filter(f => /^smart3d-[\d-]+\.db$/.test(f)).sort();
for (const f of all.slice(0, Math.max(0, all.length - KEEP))) {
  for (const x of ['', '-wal', '-shm']) fs.rmSync(path.join(DIR, f + x), { force: true });
}
console.log(JSON.stringify({ nusxa: out, foydalanuvchilar: users, saqlangan: Math.min(all.length, KEEP) }));
