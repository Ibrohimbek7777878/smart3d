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
  addColumn(db, 'users', 'google_sub', 'TEXT');                  // TZ-31: Google bilan kirish (bitta Google — bitta akkaunt)
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google ON users(google_sub) WHERE google_sub IS NOT NULL');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tg ON users(telegram_id) WHERE telegram_id IS NOT NULL');
  db.exec('CREATE TABLE IF NOT EXISTS revoked_tokens (jti TEXT PRIMARY KEY, exp INTEGER NOT NULL)');   // "Chiqish" qilingan kalitlar
  setInterval(() => db.prepare('DELETE FROM revoked_tokens WHERE exp < ?').run(Math.floor(Date.now() / 1000)), 3600 * 1000).unref();
  /* S1: bitta raqam — bitta akkaunt (oxirgi 9 raqam bo'yicha). Eski bazada takror bo'lsa — kodda ham tekshiriladi */
  try { db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone9 ON users(substr(phone, -9)) WHERE phone <> ''"); }
  catch (e) { console.warn('DIQQAT: telefon noyob indeksi yaratilmadi (bazada takror raqam bor):', e.message); }
}

/** MebelCity modullari (app/data/fragments-mc.json va fragments-fr.json — TZ-37 full base) — bazada bo'lmasa bir marta qo'shiladi */
export function mcModullar(db, appDir) {
  const ins = db.prepare(`INSERT OR REPLACE INTO fragments
    (code, name, category, grp, w, d, h, min_w, max_w, min_d, max_d, stretch_axis, price_mode, price, material_code, production, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const [fayl, belgi, nom] of [['fragments-mc.json', 'MC-%', 'MebelCity'], ['fragments-fr.json', 'MC-FB-%', 'full base']]) {
    const has = db.prepare('SELECT COUNT(*) AS n FROM fragments WHERE code LIKE ?').get(belgi).n;
    const mcPath = path.join(appDir, 'data', fayl);
    if (has || !fs.existsSync(mcPath)) continue;
    const mc = JSON.parse(fs.readFileSync(mcPath, 'utf8')).fragments || [];
    db.transaction(() => { for (const f of mc) ins.run(f.code, f.name, f.category || '', f.group || '', f.w || 0, f.d || 0, f.h || 0,
      f.min_w || 0, f.max_w || 0, f.min_d || 0, f.max_d || 0, f.stretch_axis || 'xy', f.price_mode || 'unit', f.price || 0,
      f.material_code || 'LDSP16', f.production || 'panel', JSON.stringify(f)); })();
    console.log(`${nom} modullari bazaga qo'shildi: ${mc.length} ta`);
  }
}

/** TZ-37: admin panel jadvallari (idempotent — mavjud bazaga ham qo'shiladi): furnitura bog'lash (fayl ustiga baza), tayyor promptlar, tarix. */
export function adminSxema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS furn_boglash (
      kod TEXT PRIMARY KEY,
      erp_id TEXT NOT NULL,
      koef REAL NOT NULL DEFAULT 1,
      izoh TEXT NOT NULL DEFAULT '',
      updated_by INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS promptlar_admin (
      id TEXT PRIMARY KEY,
      kat TEXT NOT NULL DEFAULT '',
      nom_uz TEXT NOT NULL DEFAULT '', nom_ru TEXT NOT NULL DEFAULT '', nom_en TEXT NOT NULL DEFAULT '',
      matn_uz TEXT NOT NULL DEFAULT '', matn_ru TEXT NOT NULL DEFAULT '', matn_en TEXT NOT NULL DEFAULT '',
      tartib INTEGER NOT NULL DEFAULT 0,
      faol INTEGER NOT NULL DEFAULT 1,
      updated_by INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS admin_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      bolim TEXT NOT NULL,
      kalit TEXT NOT NULL,
      eski TEXT,
      yangi TEXT,
      qaytarilgan INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_admin_audit_bolim ON admin_audit(bolim, id);
  `);
}

/** TZ-40: AI token tejash jadvallari (idempotent; faqat yangi jadval/ustun — mavjud ma'lumot o'zgarmaydi):
 *  promptlar_admin.spec_* — tayyor promptning oldindan hosil qilingan va tekshirilgan tuzilmasi (AI'siz taqdim etiladi);
 *  ai_kesh — erkin matn natijasi (30 kun); ai_sarf — har AI yo'li so'rovi (manba: tayyor | kesh | qoida | claude) va token. */
export function aiSxema(db) {
  addColumn(db, 'promptlar_admin', 'spec_json', "TEXT NOT NULL DEFAULT ''");      // { v, tur, kons, parse } (lib/ai-tejash.js)
  addColumn(db, 'promptlar_admin', 'spec_manba', "TEXT NOT NULL DEFAULT ''");     // qoida | claude
  addColumn(db, 'promptlar_admin', 'spec_sana', "TEXT NOT NULL DEFAULT ''");      // tekshiruv sanasi (UTC, ISO)
  addColumn(db, 'promptlar_admin', 'spec_versiya', 'INTEGER NOT NULL DEFAULT 0'); // tahlil qoidalari versiyasi
  addColumn(db, 'promptlar_admin', 'spec_hash', "TEXT NOT NULL DEFAULT ''");      // tuzilma hosil qilingan matnlar (uz|ru|en) belgisi
  addColumn(db, 'promptlar_admin', 'spec_tasdiq', 'INTEGER NOT NULL DEFAULT 0');  // admin ko'rib tasdiqladi (Claude tuzilmasi — faqat shundan keyin ishlatiladi)
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_kesh (
      kalit TEXT PRIMARY KEY,
      yol TEXT NOT NULL,
      til TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      versiya INTEGER NOT NULL DEFAULT 0,
      natija_json TEXT NOT NULL,
      engine TEXT NOT NULL DEFAULT '',
      kirish INTEGER NOT NULL DEFAULT 0,
      chiqish INTEGER NOT NULL DEFAULT 0,
      yaratildi INTEGER NOT NULL,
      muddat INTEGER NOT NULL,
      urilgan INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_ai_kesh_muddat ON ai_kesh(muddat);
    CREATE TABLE IF NOT EXISTS ai_sarf (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sana TEXT NOT NULL,
      vaqt DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER,
      yol TEXT NOT NULL DEFAULT '',
      manba TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT '',
      kirish INTEGER NOT NULL DEFAULT 0,
      chiqish INTEGER NOT NULL DEFAULT 0,
      kesh_yozildi INTEGER NOT NULL DEFAULT 0,
      kesh_oqildi INTEGER NOT NULL DEFAULT 0,
      tejaldi INTEGER NOT NULL DEFAULT 0,
      ok INTEGER NOT NULL DEFAULT 1,
      sabab TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_ai_sarf_sana ON ai_sarf(sana, manba);
    CREATE INDEX IF NOT EXISTS idx_ai_sarf_user ON ai_sarf(user_id, sana);
  `);
}

/** Tayyor so'rovlarning dastlabki to'plami (app/data/promptlar-matn.json — scripts/promptlar_seed.mjs yaratadi): bazada hali
 *  hech qachon qo'shilmagan bo'lsa — bir marta (settings.promptlar_seed_v1). Admin o'chirsa — qaytib kelmaydi. → qo'shilgan soni */
export function promptlarSeed(db, appDir) {
  if (db.prepare("SELECT 1 FROM settings WHERE key = 'promptlar_seed_v1'").get()) return 0;
  const f = path.join(appDir, 'data/promptlar-matn.json');
  if (!fs.existsSync(f)) return 0;
  const list = JSON.parse(fs.readFileSync(f, 'utf8')).promptlar || [];
  const ins = db.prepare(`INSERT OR IGNORE INTO promptlar_admin (id, kat, nom_uz, nom_ru, nom_en, matn_uz, matn_ru, matn_en, tartib, faol)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`);
  let n = 0;
  db.transaction(() => {
    for (const p of list) n += ins.run(p.id, p.kat, p.nom.uz, p.nom.ru || '', p.nom.en || '', p.matn.uz, p.matn.ru || '', p.matn.en || '', p.tartib).changes;
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('promptlar_seed_v1', ?, CURRENT_TIMESTAMP)").run(String(n));
  })();
  return n;
}
