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

/** TZ-37 (2-faza): admin panel — materiallar (Asosiy 100: rang, rasm, varaq narxi), modullar katalogi, foydalanuvchini bloklash.
 *  Idempotent (mavjud bazaga ham qo'shiladi; mavjud ma'lumot o'zgarmaydi). Fayllar (app/data/*.json) O'ZGARMAYDI: admin o'zgartirishi shu
 *  jadvallarda, fayl ustiga qo'yiladi (baza ustun); qator o'chirilsa — fayldagi qiymatga qaytadi ("sukutga qaytarish").
 *  NULL maydon = shu qiymat fayldagidek. users.bloklangan — kirish yopiq (lib/auth.js: sendSession va verifyToken tekshiradi). */
export function adminSxema2(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS mat_admin (
      kalit TEXT PRIMARY KEY,
      rang_hex TEXT,
      updated_by INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS mat_rasm (
      kalit TEXT PRIMARY KEY,
      mime TEXT NOT NULL,
      hajm INTEGER NOT NULL,
      sha TEXT NOT NULL DEFAULT '',
      data BLOB NOT NULL,
      updated_by INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS mat_narx (
      kod TEXT PRIMARY KEY,
      uzs INTEGER NOT NULL,
      updated_by INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS katalog_admin (
      kod TEXT PRIMARY KEY,
      nom_uz TEXT, nom_ru TEXT, nom_en TEXT,
      yashirin INTEGER,
      min_w INTEGER, max_w INTEGER, min_d INTEGER, max_d INTEGER, min_h INTEGER, max_h INTEGER,
      narx_rejim TEXT,
      updated_by INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  addColumn(db, 'users', 'bloklangan', 'INTEGER NOT NULL DEFAULT 0');   // 1 — admin blokladi: kirish yopiq, ochiq kalitlar yaroqsiz
  addColumn(db, 'users', 'blok_sabab', "TEXT NOT NULL DEFAULT ''");
  addColumn(db, 'users', 'blok_vaqt', 'DATETIME');
}

/** TZ-37 (3-faza): admin panel — ERP sinxronlash va tarix. Idempotent (mavjud bazaga ham qo'shiladi; mavjud ma'lumot o'zgarmaydi).
 *  erp_partiya — admin yuklagan ERP eksporti (qoralama: farq ro'yxati; qo'llangach: nima yozilgani — qaytarish uchun eski qiymatlar bilan);
 *  erp_narx — ERP qatlami: fayl narxi USTIGA, admin qo'lda narxidan (mat_narx) PASTGA qo'yiladi (tur: plita | furnitura; kalit: ERP-kod | furnitura ID);
 *  narx_qaytar — narx_history yozuvi qaytarilganini belgilaydi (narx_history o'zi routes/narxlar.js da, uning jadvali o'zgarmaydi);
 *  narx_history — routes/narxlar.js dagi bilan bir xil (IF NOT EXISTS): tarix sahifasi router tartibiga bog'liq bo'lmasin. */
export function adminSxema3(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS erp_partiya (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      tur TEXT NOT NULL,
      holat TEXT NOT NULL DEFAULT 'qoralama',
      fayl_nom TEXT NOT NULL DEFAULT '',
      erp_sana TEXT NOT NULL DEFAULT '',
      xulosa_json TEXT NOT NULL DEFAULT '{}',
      farq_json TEXT NOT NULL DEFAULT '',
      qollangan_json TEXT NOT NULL DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      qollangan_at DATETIME,
      qollagan_by INTEGER,
      qaytarilgan_at DATETIME
    );
    CREATE INDEX IF NOT EXISTS idx_erp_partiya_holat ON erp_partiya(holat, id);
    CREATE TABLE IF NOT EXISTS erp_narx (
      tur TEXT NOT NULL,
      kalit TEXT NOT NULL,
      uzs INTEGER NOT NULL,
      erp_id TEXT NOT NULL DEFAULT '',
      sku TEXT NOT NULL DEFAULT '',
      nom TEXT NOT NULL DEFAULT '',
      sana TEXT NOT NULL DEFAULT '',
      partiya_id INTEGER,
      updated_by INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (tur, kalit)
    );
    CREATE TABLE IF NOT EXISTS narx_history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, kalit TEXT NOT NULL,
      eski TEXT, yangi TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS narx_qaytar (
      history_id INTEGER PRIMARY KEY,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_admin_audit_vaqt ON admin_audit(created_at);
  `);
  addColumn(db, 'erp_partiya', 'manba', "TEXT NOT NULL DEFAULT ''");   // TZ-44: 'jonli' — ERP jonli sinxron yozuvi (tasdiq kutayotgan qoralama yoki qo'llangan to'plam); '' — admin yuklagan
}

/** TZ-44: ERP jonli sinxron (server/lib/erp-jonli.js) — faqat yangi jadvallar (idempotent; mavjud ma'lumot o'zgarmaydi; zaxira butun baza faylini oladi).
 *  erp_jonli_holat — kalit/qiymat (versiya, oxirgi muvaffaqiyat, xato sanalgichi, kurs, pauza, chegara …);
 *  erp_jonli_obyekt — katalog yozuvi (plita ERP-kod | furnitura ID | xizmat kodi) uchun ERP'dan oxirgi ko'rilgan narx, USD, kategoriya (qaynoq to'plam shundan tuziladi) va admin rad etgan narx;
 *  erp_jonli_kat — ERP kategoriyalari: nechta katalog yozuvi mos tushgani, sahifalar soni, oxirgi skanerlash (ERP yukini kamaytiradi: bizniki bo'lmagan kategoriya kamdan-kam o'qiladi);
 *  erp_jonli_tarix — har o'zgarish (qo'llandi | kutadi | rad | qaytarildi), eski → yangi, foiz. */
export function erpJonliSxema(db) {
  adminSxema3(db);                                              // erp_partiya.manba va erp_narx — shu yerda ham kafolatlanadi
  db.exec(`
    CREATE TABLE IF NOT EXISTS erp_jonli_holat (
      kalit TEXT PRIMARY KEY,
      qiymat TEXT NOT NULL DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS erp_jonli_obyekt (
      tur TEXT NOT NULL,
      kalit TEXT NOT NULL,
      kat_id TEXT NOT NULL DEFAULT '',
      kat_nom TEXT NOT NULL DEFAULT '',
      erp_id TEXT NOT NULL DEFAULT '',
      sku TEXT NOT NULL DEFAULT '',
      uzs INTEGER NOT NULL DEFAULT 0,
      usd REAL NOT NULL DEFAULT 0,
      erp_sana TEXT NOT NULL DEFAULT '',
      rad_uzs INTEGER NOT NULL DEFAULT 0,
      korilgan DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (tur, kalit)
    );
    CREATE INDEX IF NOT EXISTS idx_erp_jonli_obyekt_kat ON erp_jonli_obyekt(kat_id);
    CREATE TABLE IF NOT EXISTS erp_jonli_kat (
      kat_id TEXT PRIMARY KEY,
      nom TEXT NOT NULL DEFAULT '',
      mos INTEGER NOT NULL DEFAULT 0,
      jami INTEGER NOT NULL DEFAULT 0,
      sahifa INTEGER NOT NULL DEFAULT 0,
      skan_at DATETIME,
      qaynoq_at DATETIME
    );
    CREATE TABLE IF NOT EXISTS erp_jonli_tarix (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vaqt DATETIME DEFAULT CURRENT_TIMESTAMP,
      tur TEXT NOT NULL,
      kalit TEXT NOT NULL,
      nom TEXT NOT NULL DEFAULT '',
      eski REAL,
      yangi REAL,
      foiz REAL,
      harakat TEXT NOT NULL,
      sabab TEXT NOT NULL DEFAULT '',
      partiya_id INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_erp_jonli_tarix_id ON erp_jonli_tarix(id);
  `);
  /* kategoriya NOMI bo'yicha ustuvorlik (katalogdagi `cat` == ERP category_name): nom_norm — normallangan nom, kat_mos — shu nomli katalog yozuvlari soni,
   * erp_soni — ERP ro'yxatidagi products_count (-1 — noma'lum; 0 — bo'sh kategoriya, o'qilmaydi) */
  addColumn(db, 'erp_jonli_kat', 'nom_norm', "TEXT NOT NULL DEFAULT ''");
  addColumn(db, 'erp_jonli_kat', 'kat_mos', 'INTEGER NOT NULL DEFAULT 0');
  addColumn(db, 'erp_jonli_kat', 'erp_soni', 'INTEGER NOT NULL DEFAULT -1');
}
