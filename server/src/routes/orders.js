/* ═══════════════════ ORDER ROUTES ═══════════════════ */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getOne, getMany, query, update } from '../db.js';
import { asyncHandler } from '../middleware/error.js';
import { validate, orderCreateSchema } from '../middleware/validate.js';
import { authenticate, attachOrg, requireOwnership } from '../middleware/auth.js';
import { audit } from '../middleware/audit.js';
import { NotFoundError } from '../errors.js';

const router = Router();

/* ═══ Buyurtma yaratish ═══ */
router.post('/', authenticate, attachOrg, validate(orderCreateSchema), asyncHandler(async (req, res) => {
  const o = req.body;
  const orderId = uuidv4();

  const order = await getOne(
    `INSERT INTO orders (id, user_id, org_id, project_id, client_name, client_phone, client_email, subtotal, discount_percent, total_price, material_cost, hardware_cost, labor_cost, notes, room_json, placements_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
    [
      orderId, req.user.id, req.orgId, o.project_id, o.client_name, o.client_phone, o.client_email,
      o.subtotal, o.discount_percent, o.total_price, o.material_cost, o.hardware_cost, o.labor_cost,
      o.notes, JSON.stringify(o.room_json), JSON.stringify(o.placements_json),
    ]
  );

  audit('create', 'order', order.id, null, { client_name: o.client_name, total_price: o.total_price }, req);

  res.json(order);
}));

/* ═══ Buyurtmalar ro'yxati ═══ */
router.get('/', authenticate, attachOrg, asyncHandler(async (req, res) => {
  const { status, payment_status, limit = 50, offset = 0 } = req.query;

  let sql = `SELECT o.*, p.name as project_name
    FROM orders o
    LEFT JOIN projects p ON o.project_id = p.id
    WHERE o.user_id = $1`;
  const params = [req.user.id];
  let paramCount = 1;

  if (req.orgId) {
    sql += ` AND (o.org_id IS NULL OR o.org_id = $${++paramCount})`;
    params.push(req.orgId);
  }
  if (status) {
    sql += ` AND o.status = $${++paramCount}`;
    params.push(status);
  }
  if (payment_status) {
    sql += ` AND o.payment_status = $${++paramCount}`;
    params.push(payment_status);
  }

  sql += ` ORDER BY o.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
  params.push(Math.min(parseInt(limit), 200), parseInt(offset));

  const orders = await getMany(sql, params);

  // Parse JSON
  const parsed = orders.map(o => ({
    ...o,
    room_json: typeof o.room_json === 'string' ? JSON.parse(o.room_json) : o.room_json,
    placements_json: typeof o.placements_json === 'string' ? JSON.parse(o.placements_json) : o.placements_json,
  }));

  res.json(parsed);
}));

/* ═══ Buyurtma ID bo'yicha ═══ */
router.get('/:id', authenticate, requireOwnership('orders'), asyncHandler(async (req, res) => {
  const order = await getOne(
    `SELECT o.*, p.name as project_name
     FROM orders o
     LEFT JOIN projects p ON o.project_id = p.id
     WHERE o.id = $1`,
    [req.params.id]
  );
  if (!order) throw new NotFoundError('Order not found');

  res.json({
    ...order,
    room_json: typeof order.room_json === 'string' ? JSON.parse(order.room_json) : order.room_json,
    placements_json: typeof order.placements_json === 'string' ? JSON.parse(order.placements_json) : order.placements_json,
  });
}));

/* ═══ Buyurtma status yangilash ═══ */
router.put('/:id/status', authenticate, requireOwnership('orders'), asyncHandler(async (req, res) => {
  const { status, payment_status, payment_method } = req.body;
  const old = await getOne('SELECT status, payment_status FROM orders WHERE id = $1', [req.params.id]);
  if (!old) throw new NotFoundError('Order not found');

  const updated = await getOne(
    `UPDATE orders SET 
      status = COALESCE($1, status),
      payment_status = COALESCE($2, payment_status),
      payment_method = COALESCE($3, payment_method),
      updated_at = CURRENT_TIMESTAMP
     WHERE id = $4 RETURNING *`,
    [status, payment_status, payment_method, req.params.id]
  );

  audit('update', 'order', req.params.id, old, { status, payment_status }, req);

  res.json(updated);
}));

export default router;
