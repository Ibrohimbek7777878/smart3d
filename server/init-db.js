/* Smart3D DB init — jadvallar + data import
 * Ishga tushirish: npm run init-db
 */
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'smart3d.db');
const dataDir = path.join(__dirname, '../app/data');

/* Eski DB bo'lsa o'chirish */
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  fs.unlinkSync(dbPath + '-wal');
  fs.unlinkSync(dbPath + '-shm');
  console.log('Eski DB o\'chirildi');
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ═══════════════════ JADVALLAR ═══════════════════ */

db.exec(`
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT DEFAULT '',
  email TEXT UNIQUE NOT NULL,
  phone TEXT DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT DEFAULT '',
  cat TEXT DEFAULT '',
  cat_code TEXT DEFAULT '',
  type TEXT DEFAULT '',
  th REAL DEFAULT 0,
  l REAL DEFAULT 0,
  w REAL DEFAULT 0,
  uzs INTEGER DEFAULT 0,
  usd REAL DEFAULT 0,
  aliases TEXT DEFAULT '[]',
  search_text TEXT DEFAULT '',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_mat_cat ON materials(cat_code);
CREATE INDEX idx_mat_type ON materials(type);
CREATE INDEX idx_mat_sku ON materials(sku);

CREATE TABLE price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_id TEXT NOT NULL,
  old_uzs INTEGER,
  new_uzs INTEGER,
  old_usd REAL,
  new_usd REAL,
  changed_by INTEGER,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (material_id) REFERENCES materials(id)
);

CREATE TABLE fragments (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  grp TEXT DEFAULT '',
  w REAL DEFAULT 0,
  d REAL DEFAULT 0,
  h REAL DEFAULT 0,
  min_w REAL DEFAULT 0,
  max_w REAL DEFAULT 0,
  min_d REAL DEFAULT 0,
  max_d REAL DEFAULT 0,
  stretch_axis TEXT DEFAULT 'xy',
  price_mode TEXT DEFAULT 'unit',
  price INTEGER DEFAULT 0,
  material_code TEXT DEFAULT 'MDF16',
  production TEXT DEFAULT 'panel',
  data_json TEXT DEFAULT '{}'
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  client_name TEXT DEFAULT '',
  client_phone TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  room_json TEXT DEFAULT '{}',
  placements_json TEXT DEFAULT '[]',
  total_price INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

console.log('Jadvallar yaratildi');

/* ═══════════════════ DATA IMPORT ═══════════════════ */

// 1) Materials index
const matIdxPath = path.join(dataDir, 'materials-index.json');
if (fs.existsSync(matIdxPath)) {
  const matIdx = JSON.parse(fs.readFileSync(matIdxPath, 'utf8'));
  const insert = db.prepare(`INSERT OR REPLACE INTO materials (id, name, sku, cat, cat_code, type, th, l, w, uzs, usd, aliases, search_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  let n = 0;
  for (const m of matIdx.items) {
    insert.run(m.id, m.name, m.sku || '', m.cat || '', m.cat_code || '', m.type || '',
      m.th || 0, m.l || 0, m.w || 0, m.uzs || 0, m.usd || 0,
      JSON.stringify(m.aliases || []), m.search_text || '');
    n++;
  }
  console.log(`Materials: ${n} ta import qilindi`);
}

// 2) Fragments
const fragsPath = path.join(dataDir, 'fragments.json');
if (fs.existsSync(fragsPath)) {
  const frags = JSON.parse(fs.readFileSync(fragsPath, 'utf8'));
  const insert = db.prepare(`INSERT OR REPLACE INTO fragments
    (code, name, category, grp, w, d, h, min_w, max_w, min_d, max_d, stretch_axis, price_mode, price, material_code, production, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  let n = 0;
  for (const f of frags) {
    insert.run(f.code, f.name, f.category || '', f.group || '',
      f.w || 0, f.d || 0, f.h || 0, f.min_w || 0, f.max_w || 0, f.min_d || 0, f.max_d || 0,
      f.stretch_axis || 'xy', f.price_mode || 'unit', f.price || 0,
      f.material_code || 'MDF16', f.production || 'panel',
      JSON.stringify(f));
    n++;
  }
  console.log(`Fragments: ${n} ta import qilindi`);
}

// 3) Default settings
const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
insertSetting.run('company_name', 'Smart 3D');
insertSetting.run('currency', 'UZS');
insertSetting.run('default_kerf', '4');
insertSetting.run('version', '1.0.0');
console.log('Settings: default qo\'yildi');

/* ═══════════════════ ADMIN USER ═══════════════════ */
import bcrypt from 'bcryptjs';
const hash = await bcrypt.hash('admin123', 10);
db.prepare('INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
  .run('Admin', 'admin@smart3d.uz', hash, 'admin');
console.log('Admin user: admin@smart3d.uz / admin123');

console.log('\n✅ DB tayyor:', dbPath);
db.close();
