/* Asosiy jadvallar va boshlang'ich ma'lumot — server har ishga tushganda (IF NOT EXISTS: mavjud bazaga ham qo'shiladi,
 * eski ma'lumot o'zgarmaydi). Bitta modulga tegishli jadvallar — o'z modulida (routes/shablonlar, orders, narxlar). */
import fs from 'fs';
import path from 'path';
import { addColumn } from './db.js';

export function yadroSxema(db) {
  /* Remnants (Delovoy qoldiqlar) jadvali — Kamchilik 9 */
  db.exec(`
    CREATE TABLE IF NOT EXISTS remnants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remnant_id TEXT UNIQUE,
      material_code TEXT,
      length REAL,
      width REAL,
      thickness REAL,
      area_m2 REAL,
      status TEXT DEFAULT 'available',
      source_order_id INTEGER,
      used_order_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  /* TZ-07: telefon + SMS kirish va loyihalar */
  db.exec(`
    CREATE TABLE IF NOT EXISTS sms_codes (
      phone TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER DEFAULT 0,
      sent_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT DEFAULT '',
      doc_json TEXT NOT NULL,
      total_price INTEGER DEFAULT 0,
      archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id, archived);
    CREATE TABLE IF NOT EXISTS sex_std_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      old_json TEXT,
      new_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ai_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      text TEXT DEFAULT '',
      engine TEXT DEFAULT '',
      ok INTEGER DEFAULT 0,
      result_json TEXT DEFAULT '',
      error TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  /* TZ-09: yangi maydonlar */
  addColumn(db, 'users', 'shop', "TEXT DEFAULT ''");             // ro'yxatdagi "Sex nomi" (ixtiyoriy)
  addColumn(db, 'projects', 'client', "TEXT DEFAULT ''");        // loyiha kartasidagi mijoz ismi (dizayn: "Loyihalarim")
  addColumn(db, 'users', 'settings_json', "TEXT DEFAULT ''");    // dizayndagi "Sozlamalar": ustama, stanok profili, sex logosi
  /* TZ-19 §3: sessiya va bloklash */
  addColumn(db, 'users', 'token_version', 'INTEGER DEFAULT 0');  // oshsa — shu foydalanuvchining barcha kalitlari bekor (parol almashdi)
  addColumn(db, 'users', 'failed_logins', 'INTEGER DEFAULT 0');  // ketma-ket xato parol
  addColumn(db, 'users', 'locked_until', 'INTEGER DEFAULT 0');   // shu vaqtgacha kirish yopiq (ms)
  addColumn(db, 'users', 'telegram_id', 'INTEGER');              // TZ-16: Telegram Mini App (bitta Telegram — bitta akkaunt)
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tg ON users(telegram_id) WHERE telegram_id IS NOT NULL');
  db.exec('CREATE TABLE IF NOT EXISTS revoked_tokens (jti TEXT PRIMARY KEY, exp INTEGER NOT NULL)');   // "Chiqish" qilingan kalitlar
  setInterval(() => db.prepare('DELETE FROM revoked_tokens WHERE exp < ?').run(Math.floor(Date.now() / 1000)), 3600 * 1000).unref();
  /* S1: bitta raqam — bitta akkaunt (oxirgi 9 raqam bo'yicha). Eski bazada takror bo'lsa — kodda ham tekshiriladi */
  try { db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone9 ON users(substr(phone, -9)) WHERE phone <> ''"); }
  catch (e) { console.warn('DIQQAT: telefon noyob indeksi yaratilmadi (bazada takror raqam bor):', e.message); }
}

/** MebelCity modullari (app/data/fragments-mc.json) — bazada bo'lmasa bir marta qo'shiladi */
export function mcModullar(db, appDir) {
  const has = db.prepare("SELECT COUNT(*) AS n FROM fragments WHERE code LIKE 'MC-%'").get().n;
  const mcPath = path.join(appDir, 'data/fragments-mc.json');
  if (has || !fs.existsSync(mcPath)) return;
  const ins = db.prepare(`INSERT OR REPLACE INTO fragments
    (code, name, category, grp, w, d, h, min_w, max_w, min_d, max_d, stretch_axis, price_mode, price, material_code, production, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const mc = JSON.parse(fs.readFileSync(mcPath, 'utf8')).fragments || [];
  db.transaction(() => { for (const f of mc) ins.run(f.code, f.name, f.category || '', f.group || '', f.w || 0, f.d || 0, f.h || 0,
    f.min_w || 0, f.max_w || 0, f.min_d || 0, f.max_d || 0, f.stretch_axis || 'xy', f.price_mode || 'unit', f.price || 0,
    f.material_code || 'LDSP16', f.production || 'panel', JSON.stringify(f)); })();
  console.log(`MebelCity modullari bazaga qo'shildi: ${mc.length} ta`);
}
