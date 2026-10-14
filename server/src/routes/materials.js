/* ═══════════════════ MATERIAL ROUTES ═══════════════════ */
import { Router } from 'express';
import { query, getOne, getMany, update } from '../db.js';
import { cacheGet, cacheSet, cacheDel, publish } from '../redis.js';
import { asyncHandler } from '../middleware/error.js';
import { validate, materialUpdateSchema, searchSchema } from '../middleware/validate.js';
import { authenticate, requireAdmin, attachOrg } from '../middleware/auth.js';
import { searchLimiter } from '../middleware/rateLimit.js';
import { audit } from '../middleware/audit.js';
import { NotFoundError } from '../errors.js';

const router = Router();

/* ═══ Qidiruv (multi-til fuzzy) ═══ */
router.get('/', searchLimiter, attachOrg, validate(searchSchema, 'query'), asyncHandler(async (req, res) => {
  const { q, cat_code, type, limit } = req.query;
  const orgId = req.orgId;

  // Cache key
  const cacheKey = `search:${q}:${cat_code || ''}:${type || ''}:${limit}:${orgId || 'global'}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  // SQL query
  let sql = `SELECT id, name, sku, cat, cat_code, type, th, l, w, 
    COALESCE(NULLIF(org_price, 0), uzs) as uzs, 
    COALESCE(NULLIF(org_price, 0), uzs) / 12000.0 as usd,
    aliases, updated_at
    FROM materials WHERE is_active = true`;
  const params = [];
  let paramCount = 0;

  if (orgId) {
    sql += ` AND (org_id IS NULL OR org_id = $${++paramCount})`;
    params.push(orgId);
  }
  if (cat_code) {
    sql += ` AND cat_code = $${++paramCount}`;
    params.push(cat_code);
  }
  if (type) {
    sql += ` AND type = $${++paramCount}`;
    params.push(type);
  }
  if (q) {
    sql += ` AND (id = $${++paramCount} OR sku ILIKE $${++paramCount} OR name ILIKE $${++paramCount} OR search_text ILIKE $${++paramCount})`;
    const searchQ = `%${q}%`;
    params.push(q, searchQ, searchQ, `%${q.toLowerCase()}%`);
  }

  sql += ` ORDER BY uzs DESC LIMIT $${++paramCount}`;
  params.push(Math.min(parseInt(limit) || 100, 500));

  const result = await getMany(sql, params);

  // Cache 5 daqiqa
  await cacheSet(cacheKey, result, 300);

  res.json(result);
}));

/* ═══ ID bo'yicha ═══ */
router.get('/:id', asyncHandler(async (req, res) => {
  const cacheKey = `mat:${req.params.id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  const material = await getOne(
    `SELECT * FROM materials WHERE id = $1 AND is_active = true`,
    [req.params.id]
  );
  if (!material) throw new NotFoundError('Material not found');

  await cacheSet(cacheKey, material, 300);
  res.json(material);
}));

/* ═══ Narx yangilash (admin) ═══ */
router.put('/:id/price', authenticate, requireAdmin, validate(materialUpdateSchema), asyncHandler(async (req, res) => {
  const { uzs, usd } = req.body;
  const old = await getOne('SELECT uzs, usd FROM materials WHERE id = $1', [req.params.id]);
  if (!old) throw new NotFoundError('Material not found');

  await update('materials', req.params.id, { uzs, usd });
  await query(
    'INSERT INTO price_history (material_id, old_uzs, new_uzs, old_usd, new_usd, changed_by) VALUES ($1, $2, $3, $4, $5, $6)',
    [req.params.id, old.uzs, uzs, old.usd, usd || 0, req.user.id]
  );

  // Cache invalidation
  await cacheDel(`mat:${req.params.id}`);
  await cacheDelPattern(`search:*`);

  // WebSocket broadcast
  await publish('price_updates', {
    type: 'price_update',
    material_id: req.params.id,
    uzs,
    usd,
    ts: Date.now(),
  });

  audit('update', 'material', req.params.id, old, { uzs, usd }, req);

  res.json({ ok: true, old: old.uzs, new: uzs });
}));

/* ═══ Narx tarixi ═══ */
router.get('/:id/history', asyncHandler(async (req, res) => {
  const history = await getMany(
    `SELECT ph.*, u.name as changed_by_name 
     FROM price_history ph 
     LEFT JOIN users u ON ph.changed_by = u.id
     WHERE ph.material_id = $1 
     ORDER BY ph.changed_at DESC LIMIT 50`,
    [req.params.id]
  );
  res.json(history);
}));

export default router;
