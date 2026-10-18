/* SQLite ulanish va umumiy jadval yordamchisi. Jadvallar — lib/sxema.js (asosiy) va o'z modulida (shablonlar, buyurtmalar, narxlar). */
import Database from 'better-sqlite3';
import fs from 'fs';

/** Baza fayli bo'lishi shart (init-db bilan yaratiladi); WAL — o'qish va yozish bir-birini to'xtatmaydi */
export function openDb(dbPath) {
  if (!fs.existsSync(dbPath)) {
    console.error(`XATO: baza topilmadi (${dbPath}). Avval: ADMIN_PASSWORD='…' npm run init-db`);
    process.exit(1);
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  return db;
}

/** TZ-09: yangi maydon — mavjud bazaga ham qo'shiladi (eski ma'lumot o'zgarmaydi) */
export function addColumn(db, table, col, def) {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
}
