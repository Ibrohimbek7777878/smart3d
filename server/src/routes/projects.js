/* ═══════════════════ PROJECT ROUTES (CRUD) ═══════════════════ */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getOne, getMany, query } from '../db.js';
import { asyncHandler } from '../middleware/error.js';
import { validate, projectCreateSchema, projectUpdateSchema } from '../middleware/validate.js';
import { authenticate, attachOrg, requireOwnership } from '../middleware/auth.js';
import { audit } from '../middleware/audit.js';
import { NotFoundError } from '../errors.js';

const router = Router();

/* ═══ Loyiha yaratish ═══ */
router.post('/', authenticate, attachOrg, validate(projectCreateSchema), asyncHandler(async (req, res) => {
  const p = req.body;
  const project = await getOne(
    `INSERT INTO projects (user_id, org_id, name, client_name, client_phone, client_email, room, placements, material_code, sheet_material, settings, tags, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
    [
      req.user.id, req.orgId, p.name, p.client_name, p.client_phone, p.client_email,
      JSON.stringify(p.room), JSON.stringify(p.placements), p.material_code,
      p.sheet_material ? JSON.stringify(p.sheet_material) : null,
      JSON.stringify(p.settings), JSON.stringify(p.tags), p.notes,
    ]
  );

  audit('create', 'project', project.id, null, { name: p.name }, req);

  res.json(project);
}));

/* ═══ Loyihalar ro'yxati ═══ */
router.get('/', authenticate, attachOrg, asyncHandler(async (req, res) => {
  const { status, limit = 50, offset = 0, q } = req.query;

  let sql = `SELECT id, name, client_name, status, total_price, tags, created_at, updated_at
    FROM projects WHERE user_id = $1 AND is_deleted = false`;
  const params = [req.user.id];
  let paramCount = 1;

  if (req.orgId) {
    sql += ` AND (org_id IS NULL OR org_id = $${++paramCount})`;
    params.push(req.orgId);
  }
  if (status) {
    sql += ` AND status = $${++paramCount}`;
    params.push(status);
  }
  if (q) {
    sql += ` AND (name ILIKE $${++paramCount} OR client_name ILIKE $${++paramCount})`;
    const searchQ = `%${q}%`;
    params.push(searchQ, searchQ);
  }

  sql += ` ORDER BY updated_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
  params.push(Math.min(parseInt(limit), 200), parseInt(offset));

  const projects = await getMany(sql, params);

  // Count
  let countSql = `SELECT COUNT(*) as total FROM projects WHERE user_id = $1 AND is_deleted = false`;
  if (status) countSql += ` AND status = $2`;
  const countResult = await getOne(countSql, status ? [req.user.id, status] : [req.user.id]);

  res.json({ projects, total: parseInt(countResult.total) });
}));

/* ═══ Loyiha ID bo'yicha ═══ */
router.get('/:id', authenticate, requireOwnership('projects'), asyncHandler(async (req, res) => {
  const project = await getOne(
    `SELECT * FROM projects WHERE id = $1 AND is_deleted = false`,
    [req.params.id]
  );
  if (!project) throw new NotFoundError('Project not found');

  // JSON parse
  res.json({
    ...project,
    room: typeof project.room === 'string' ? JSON.parse(project.room) : project.room,
    placements: typeof project.placements === 'string' ? JSON.parse(project.placements) : project.placements,
    sheet_material: typeof project.sheet_material === 'string' ? JSON.parse(project.sheet_material) : project.sheet_material,
    settings: typeof project.settings === 'string' ? JSON.parse(project.settings) : project.settings,
    tags: typeof project.tags === 'string' ? JSON.parse(project.tags) : project.tags,
  });
}));

/* ═══ Loyiha yangilash ═══ */
router.put('/:id', authenticate, requireOwnership('projects'), validate(projectUpdateSchema), asyncHandler(async (req, res) => {
  const old = await getOne('SELECT * FROM projects WHERE id = $1', [req.params.id]);
  if (!old) throw new NotFoundError('Project not found');

  const p = req.body;
  const fields = [];
  const values = [];
  let paramCount = 0;

  // Faqat yuborilgan maydonlarni yangilash
  for (const [key, value] of Object.entries(p)) {
    if (value !== undefined) {
      fields.push(`${key} = $${++paramCount}`);
      values.push(typeof value === 'object' ? JSON.stringify(value) : value);
    }
  }

  if (fields.length === 0) return res.json(old);

  // Version qo'shish
  fields.push(`version = version + 1`);
  fields.push(`updated_at = CURRENT_TIMESTAMP`);

  const sql = `UPDATE projects SET ${fields.join(', ')} WHERE id = $${++paramCount} RETURNING *`;
  values.push(req.params.id);

  const updated = await getOne(sql, values);

  audit('update', 'project', req.params.id, old, p, req);

  res.json(updated);
}));

/* ═══ Loyiha o'chirish (soft) ═══ */
router.delete('/:id', authenticate, requireOwnership('projects'), asyncHandler(async (req, res) => {
  const old = await getOne('SELECT id, name FROM projects WHERE id = $1', [req.params.id]);
  if (!old) throw new NotFoundError('Project not found');

  await query('UPDATE projects SET is_deleted = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [req.params.id]);

  audit('delete', 'project', req.params.id, old, null, req);

  res.json({ ok: true });
}));

/* ═══ Loyiha nusxalash ═══ */
router.post('/:id/duplicate', authenticate, requireOwnership('projects'), asyncHandler(async (req, res) => {
  const original = await getOne('SELECT * FROM projects WHERE id = $1 AND is_deleted = false', [req.params.id]);
  if (!original) throw new NotFoundError('Project not found');

  const duplicate = await getOne(
    `INSERT INTO projects (user_id, org_id, name, client_name, client_phone, client_email, room, placements, material_code, sheet_material, settings, tags, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
    [
      req.user.id, req.orgId, `${original.name} (copy)`, original.client_name, original.client_phone,
      original.client_email, original.room, original.placements, original.material_code,
      original.sheet_material, original.settings, original.tags, original.notes,
    ]
  );

  audit('create', 'project', duplicate.id, null, { name: duplicate.name, copied_from: original.id }, req);

  res.json(duplicate);
}));

export default router;
