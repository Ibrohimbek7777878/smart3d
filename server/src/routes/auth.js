/* ═══════════════════ AUTH ROUTES ═══════════════════ */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config.js';
import { getOne, insert } from '../db.js';
import { asyncHandler } from '../middleware/error.js';
import { validate, registerSchema, loginSchema } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { authenticate } from '../middleware/auth.js';
import { ConflictError, AuthError } from '../errors.js';
import { audit } from '../middleware/audit.js';

const router = Router();

/* ═══ Register ═══ */
router.post('/register', authLimiter, validate(registerSchema), asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  const exists = await getOne('SELECT id FROM users WHERE email = $1', [email]);
  if (exists) throw new ConflictError('Email already exists');

  const hash = await bcrypt.hash(password, 10);
  const user = await insert('users', { name, email, phone, password_hash: hash, role: 'user' });

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

  audit('create', 'user', user.id, null, { email, role: user.role }, req);

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}));

/* ═══ Login ═══ */
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await getOne('SELECT * FROM users WHERE email = $1', [email]);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new AuthError('Invalid credentials');
  }
  if (!user.is_active) throw new AuthError('Account deactivated');

  // Last login yangilash
  await getOne('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id', [user.id]);

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

  audit('login', 'user', user.id, null, { email }, req);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      org_id: user.org_id,
      locale: user.locale,
    },
  });
}));

/* ═══ Me ═══ */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await getOne(
    'SELECT id, name, email, phone, role, org_id, locale, avatar_url, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json(user);
}));

/* ═══ Update profile ═══ */
router.put('/me', authenticate, asyncHandler(async (req, res) => {
  const { name, phone, locale, avatar_url } = req.body;
  const user = await getOne(
    `UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone), locale = COALESCE($3, locale), avatar_url = COALESCE($4, avatar_url), updated_at = CURRENT_TIMESTAMP
     WHERE id = $5 RETURNING id, name, email, phone, role, locale, avatar_url`,
    [name, phone, locale, avatar_url, req.user.id]
  );
  res.json(user);
}));

/* ═══ Change password ═══ */
router.put('/password', authenticate, asyncHandler(async (req, res) => {
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password) throw new AuthError('Both passwords required');
  if (new_password.length < 6) throw new AuthError('Password too short');

  const user = await getOne('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!(await bcrypt.compare(old_password, user.password_hash))) {
    throw new AuthError('Wrong password');
  }

  const hash = await bcrypt.hash(new_password, 10);
  await getOne('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id', [hash, req.user.id]);

  res.json({ ok: true });
}));

export default router;
