-- ═══════════════════════════════════════════════════════════
-- Smart3D Production Schema v2 — Multi-tenant + Rollar + Loyiha
-- ═══════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════ ORGANIZATSIYA (Multi-tenant) ═══════════════════
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,              -- smart3d.uz/{slug}
  owner_id UUID NOT NULL,                 -- usta (workshop owner)
  plan TEXT DEFAULT 'free',               -- free / pro / enterprise
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════ FOYDALANUVCHI ═══════════════════
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name TEXT DEFAULT '',
  email TEXT UNIQUE NOT NULL,
  phone TEXT DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',               -- admin / owner / worker / client / user
  locale TEXT DEFAULT 'uz',               -- uz / ru / en
  avatar_url TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ═══════════════════ MATERIAL (ERP) ═══════════════════
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,                    -- 8 xonali ID
  name TEXT NOT NULL,
  sku TEXT DEFAULT '',
  cat TEXT DEFAULT '',
  cat_code TEXT DEFAULT '',               -- LDS/LMD/MDF/HDF/AKR/OYN/BOSH
  type TEXT DEFAULT '',                   -- LDSP/LMD/MDF/HDF/AKRIL/OYNA
  th REAL DEFAULT 0,
  l REAL DEFAULT 0,
  w REAL DEFAULT 0,
  uzs INTEGER DEFAULT 0,
  usd REAL DEFAULT 0,
  aliases JSONB DEFAULT '[]',
  search_text TEXT DEFAULT '',
  -- Multi-tenant: qaysi org uchun maxsus narx
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  org_price INTEGER DEFAULT 0,            -- org'ning maxsus narxi
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_materials_cat ON materials(cat_code);
CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(type);
CREATE INDEX IF NOT EXISTS idx_materials_sku ON materials(sku);
CREATE INDEX IF NOT EXISTS idx_materials_search ON materials USING gin(search_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_materials_org ON materials(org_id);

-- ═══════════════════ NARX TARIXI ═══════════════════
CREATE TABLE IF NOT EXISTS price_history (
  id SERIAL PRIMARY KEY,
  material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  old_uzs INTEGER,
  new_uzs INTEGER,
  old_usd REAL,
  new_usd REAL,
  changed_by UUID REFERENCES users(id),
  org_id UUID REFERENCES organizations(id),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_price_history_material ON price_history(material_id);
CREATE INDEX IF NOT EXISTS idx_price_history_org ON price_history(org_id);

-- ═══════════════════ FRAGMENT (Modul) ═══════════════════
CREATE TABLE IF NOT EXISTS fragments (
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
  data_json JSONB DEFAULT '{}',
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_fragments_org ON fragments(org_id);

-- ═══════════════════ FURNITURA ═══════════════════
CREATE TABLE IF NOT EXISTS furnitura (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT DEFAULT '',
  cat TEXT DEFAULT '',
  cat_code TEXT DEFAULT '',
  uzs INTEGER DEFAULT 0,
  usd REAL DEFAULT 0,
  aliases JSONB DEFAULT '[]',
  search_text TEXT DEFAULT '',
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  org_price INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_furnitura_search ON furnitura USING gin(search_text gin_trgm_ops);

-- ═══════════════════ LOYIHA ═══════════════════
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  client_name TEXT DEFAULT '',
  client_phone TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  -- Loyiha ma'lumotlari
  room JSONB DEFAULT '{}',                -- xona o'lchamlari, teshiklar
  placements JSONB DEFAULT '[]',          -- joylashtirilgan mebellar
  material_code TEXT DEFAULT 'MDF16',
  sheet_material JSONB DEFAULT NULL,      -- tanlangan real material
  settings JSONB DEFAULT '{}',            -- nesting config, va hokazo
  -- Hisoblar
  total_price INTEGER DEFAULT 0,
  production_cost INTEGER DEFAULT 0,
  nest_stats JSONB DEFAULT '{}',
  -- Status
  status TEXT DEFAULT 'draft',            -- draft / sent / approved / production / done
  -- Metadata
  tags JSONB DEFAULT '[]',
  notes TEXT DEFAULT '',
  version INTEGER DEFAULT 1,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ═══════════════════ ORDER (Buyurtma) ═══════════════════
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  org_id UUID REFERENCES organizations(id),
  client_name TEXT DEFAULT '',
  client_phone TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  -- Hisob
  subtotal INTEGER DEFAULT 0,
  discount_percent REAL DEFAULT 0,
  discount_amount INTEGER DEFAULT 0,
  total_price INTEGER DEFAULT 0,
  -- Material xarajatlari
  material_cost INTEGER DEFAULT 0,
  hardware_cost INTEGER DEFAULT 0,
  labor_cost INTEGER DEFAULT 0,
  other_cost INTEGER DEFAULT 0,
  -- Status
  status TEXT DEFAULT 'draft',            -- draft / confirmed / production / shipped / done / cancelled
  payment_status TEXT DEFAULT 'unpaid',   -- unpaid / partial / paid / refunded
  payment_method TEXT DEFAULT '',         -- click / payme / cash / card
  notes TEXT DEFAULT '',
  -- Rasm/JSON
  room_json JSONB DEFAULT '{}',
  placements_json JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_org ON orders(org_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ═══════════════════ EXPORT TARIXI ═══════════════════
CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  org_id UUID REFERENCES organizations(id),
  format TEXT NOT NULL,                   -- obj / bpj / giblab / xnc / dxf / gcode / ptp / project
  file_url TEXT DEFAULT '',
  file_size INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',            -- nest stats, qatorlar soni, va hokazo
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_exports_project ON exports(project_id);

-- ═══════════════════ AUDIT LOG ═══════════════════
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  org_id UUID REFERENCES organizations(id),
  action TEXT NOT NULL,                   -- create / update / delete / login / export / price_change
  entity_type TEXT DEFAULT '',            -- material / project / order / user
  entity_id TEXT DEFAULT '',
  old_value JSONB DEFAULT NULL,
  new_value JSONB DEFAULT NULL,
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

-- ═══════════════════ TO'LOV ═══════════════════
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id),
  org_id UUID REFERENCES organizations(id),
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'UZS',
  method TEXT DEFAULT '',                 -- click / payme / cash / card
  provider_ref TEXT DEFAULT '',           -- Click/Payme reference
  status TEXT DEFAULT 'pending',          -- pending / success / failed / refunded
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ═══════════════════ OBUNA (Subscription) ═══════════════════
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,                     -- free / pro / enterprise
  price_monthly INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  auto_renew BOOLEAN DEFAULT true,
  payment_method TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(org_id);

-- ═══════════════════ SETTINGS ═══════════════════
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════ DEFAULT DATA ═══════════════════
INSERT INTO settings (key, value) VALUES
  ('company_name', 'Smart 3D'),
  ('currency', 'UZS'),
  ('default_kerf', '4'),
  ('version', '2.0.0')
ON CONFLICT (key) DO NOTHING;
