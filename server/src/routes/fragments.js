/* ═══════════════════ FRAGMENT ROUTES ═══════════════════ */
import { Router } from 'express';
import { getOne, getMany, query, update } from '../db.js';
import { cacheGet, cacheSet, cacheDel } from '../redis.js';
import { asyncHandler } from '../middleware/error.js';
import { authenticate, attachOrg, requireAdmin } from '../middleware/auth.js';
import { NotFoundError } from '../errors.js';

const router = Router();

/* ═══ Fragmentlar ro'yxati ═══ */
router.get('/', attachOrg, asyncHandler(async (req, res) => {
  const cacheKey = `fragments:${req.orgId || 'global'}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  let sql = `SELECT * FROM fragments WHERE is_active = true`;
  const params = [];
  if (req.orgId) {
    sql += ` AND (org_id IS NULL OR org_id = $1)`;
    params.push(req.orgId);
  }
  sql += ` ORDER BY code`;

  const fragments = await getMany(sql, params);

  // Parse JSON
  const parsed = fragments.map(f => ({
    ...f,
    data_json: typeof f.data_json === 'string' ? JSON.parse(f.data_json) : f.data_json,
  }));

  await cacheSet(cacheKey, parsed, 600);  // 10 min

  res.json(parsed);
}));

/* ═══ Fragment ID bo'yicha ═══ */
router.get('/:code', asyncHandler(async (req, res) => {
  const cacheKey = `fragment:${req.params.code}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  const fragment = await getOne('SELECT * FROM fragments WHERE code = $1 AND is_active = true', [req.params.code]);
  if (!fragment) throw new NotFoundError('Fragment not found');

  const parsed = {
    ...fragment,
    data_json: typeof fragment.data_json === 'string' ? JSON.parse(fragment.data_json) : fragment.data_json,
  };

  await cacheSet(cacheKey, parsed, 600);

  res.json(parsed);
}));

/* ═══ Fragment yangilash (admin) ═══ */
router.put('/:code', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const old = await getOne('SELECT * FROM fragments WHERE code = $1', [req.params.code]);
  if (!old) throw new NotFoundError('Fragment not found');

  const { name, category, grp, w, d, h, min_w, max_w, min_d, max_d, stretch_axis, price_mode, price, material_code, production, data_json } = req.body;

  const updated = await getOne(
    `UPDATE fragments SET 
      name = COALESCE($1, name),
      category = COALESCE($2, category),
      grp = COALESCE($3, grp),
      w = COALESCE($4, w),
      d = COALESCE($5, d),
      h = COALESCE($6, h),
      min_w = COALESCE($7, min_w),
      max_w = COALESCE($8, max_w),
      min_d = COALESCE($9, min_d),
      max_d = COALESCE($10, max_d),
      stretch_axis = COALESCE($11, stretch_axis),
      price_mode = COALESCE($12, price_mode),
      price = COALESCE($13, price),
      material_code = COALESCE($14, material_code),
      production = COALESCE($15, production),
      data_json = COALESCE($16, data_json)
     WHERE code = $17 RETURNING *`,
    [
      name, category, grp, w, d, h, min_w, max_w, min_d, max_d,
      stretch_axis, price_mode, price, material_code, production,
      data_json ? JSON.stringify(data_json) : null,
      req.params.code,
    ]
  );

  await cacheDel(`fragment:${req.params.code}`);
  await cacheDel(`fragments:${req.orgId || 'global'}`);

  res.json(updated);
}));

export default router;
