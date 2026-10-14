/* ═══════════════════ ADMIN ROUTES ═══════════════════ */
import { Router } from 'express';
import { getOne, getMany, query, update } from '../db.js';
import { cacheDelPattern } from '../redis.js';
import { asyncHandler } from '../middleware/error.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { audit } from '../middleware/audit.js';

const router = Router();

/* Barcha route'lar uchun admin kerak */
router.use(authenticate, requireAdmin);

/* ═══ Statistika ═══ */
router.get('/stats', asyncHandler(async (req, res) => {
  const [users, materials, projects, orders, exports, revenue] = await Promise.all([
    getOne('SELECT COUNT(*) as total, COUNT(CASE WHEN created_at > NOW() - INTERVAL \'7 days\' THEN 1 END) as week FROM users'),
    getOne('SELECT COUNT(*) as total, SUM(uzs) as total_value FROM materials WHERE is_active = true'),
    getOne('SELECT COUNT(*) as total, COUNT(CASE WHEN status = \'done\' THEN 1 END) as done FROM projects WHERE is_deleted = false'),
    getOne('SELECT COUNT(*) as total, SUM(total_price) as revenue FROM orders'),
    getOne('SELECT COUNT(*) as total FROM exports'),
    getOne('SELECT SUM(total_price) as total FROM orders WHERE payment_status = \'paid\''),
  ]);

  res.json({
    users: users,
    materials: materials,
    projects: projects,
    orders: orders,
    exports: exports,
    revenue: revenue,
  });
}));

/* ═══ Users ═══ */
router.get('/users', asyncHandler(async (req, res) => {
  const { q, role, limit = 50, offset = 0 } = req.query;
  let sql = 'SELECT id, name, email, phone, role, org_id, is_active, last_login_at, created_at FROM users WHERE 1=1';
  const params = [];
  let paramCount = 0;

  if (q) {
    sql += ` AND (name ILIKE $${++paramCount} OR email ILIKE $${++paramCount})`;
    const searchQ = `%${q}%`;
    params.push(searchQ, searchQ);
  }
  if (role) {
    sql += ` AND role = $${++paramCount}`;
    params.push(role);
  }

  sql += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
  params.push(Math.min(parseInt(limit), 200), parseInt(offset));

  const users = await getMany(sql, params);
  res.json(users);
}));

router.put('/users/:id/role', asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'owner', 'worker', 'client', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const old = await getOne('SELECT role FROM users WHERE id = $1', [req.params.id]);
  const updated = await update('users', req.params.id, { role });

  audit('update', 'user', req.params.id, old, { role }, req);

  res.json({ ok: true, role: updated.role });
}));

router.put('/users/:id/active', asyncHandler(async (req, res) => {
  const { is_active } = req.body;
  const old = await getOne('SELECT is_active FROM users WHERE id = $1', [req.params.id]);
  const updated = await update('users', req.params.id, { is_active });

  audit('update', 'user', req.params.id, old, { is_active }, req);

  res.json({ ok: true, is_active: updated.is_active });
}));

/* ═══ Organizations ═══ */
router.get('/orgs', asyncHandler(async (req, res) => {
  const orgs = await getMany(
    `SELECT o.*, u.name as owner_name, u.email as owner_email,
     (SELECT COUNT(*) FROM users WHERE org_id = o.id) as user_count,
     (SELECT COUNT(*) FROM projects WHERE org_id = o.id AND is_deleted = false) as project_count
     FROM organizations o
     LEFT JOIN users u ON o.owner_id = u.id
     ORDER BY o.created_at DESC`
  );
  res.json(orgs);
}));

/* ═══ Audit logs ═══ */
router.get('/audit', asyncHandler(async (req, res) => {
  const { user_id, action, entity_type, limit = 100, offset = 0 } = req.query;
  let sql = `SELECT a.*, u.name as user_name, u.email as user_email
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE 1=1`;
  const params = [];
  let paramCount = 0;

  if (user_id) {
    sql += ` AND a.user_id = $${++paramCount}`;
    params.push(user_id);
  }
  if (action) {
    sql += ` AND a.action = $${++paramCount}`;
    params.push(action);
  }
  if (entity_type) {
    sql += ` AND a.entity_type = $${++paramCount}`;
    params.push(entity_type);
  }

  sql += ` ORDER BY a.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
  params.push(Math.min(parseInt(limit), 500), parseInt(offset));

  const logs = await getMany(sql, params);
  res.json(logs);
}));

/* ═══ Cache tozalash ═══ */
router.post('/cache/clear', asyncHandler(async (req, res) => {
  const { pattern } = req.body;
  if (pattern) {
    await cacheDelPattern(pattern);
  } else {
    await cacheDelPattern('*');
  }
  res.json({ ok: true });
}));

export default router;
