/* Smart3D — admin parolini o'rnatish yoki almashtirish (mavjud bazada).
 *
 *   ADMIN_PASSWORD='kamida-8-belgi' npm run admin-password            # admin@smart3d.uz
 *   ADMIN_PASSWORD='…' ADMIN_EMAIL='boss@sex.uz' npm run admin-password
 *
 * Admin bo'lmasa — yaratadi. Parol konsolga chiqmaydi.
 */
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, 'smart3d.db');
const email = (process.env.ADMIN_EMAIL || 'admin@smart3d.uz').toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';

if (password.length < 8) { console.error('XATO: ADMIN_PASSWORD kamida 8 belgi bo\'lishi kerak'); process.exit(1); }
if (password === 'admin123') { console.error('XATO: standart parol ishlatilmaydi'); process.exit(1); }
if (!fs.existsSync(dbPath)) { console.error(`XATO: baza topilmadi (${dbPath}) — avval npm run init-db`); process.exit(1); }

const db = new Database(dbPath);
const hash = bcrypt.hashSync(password, 10);
const r = db.prepare("UPDATE users SET password_hash = ?, role = 'admin' WHERE email = ?").run(hash, email);
if (r.changes === 0) {
  db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run('Admin', email, hash, 'admin');
  console.log(`Admin yaratildi: ${email}`);
} else {
  console.log(`Admin paroli yangilandi: ${email}`);
}
db.close();
