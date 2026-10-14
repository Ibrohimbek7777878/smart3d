/* ═══════════════════ AUTH MIDDLEWARE ═══════════════════ */
import jwt from 'jsonwebtoken';
import config from '../config.js';
import { AuthError, ForbiddenError } from '../errors.js';
import { getOne } from '../db.js';

/* Token tekshirish */
export async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new AuthError('Token required');

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await getOne('SELECT id, org_id, email, name, role, locale, is_active FROM users WHERE id = $1', [decoded.id]);
    if (!user) throw new AuthError('User not found');
    if (!user.is_active) throw new AuthError('Account deactivated');

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return next(new AuthError('Token expired'));
    if (error.name === 'JsonWebTokenError') return next(new AuthError('Invalid token'));
    next(error);
  }
}

/* Faqat admin */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return next(new ForbiddenError('Admin only'));
  next();
}

/* Faqat owner (workshop) */
export function requireOwner(req, res, next) {
  if (!['owner', 'admin'].includes(req.user?.role)) return next(new ForbiddenError('Owner only'));
  next();
}

/* Faqat owner yoki admin */
export function requireOwnerOrAdmin(req, res, next) {
  if (!['owner', 'admin'].includes(req.user?.role)) return next(new ForbiddenError('Owner or admin only'));
  next();
}

/* Ruxsat berilgan rollar */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return next(new ForbiddenError(`Requires role: ${roles.join(' or ')}`));
    next();
  };
}

/* Multi-tenancy: org_id ni req'da saqlash */
export function attachOrg(req, res, next) {
  req.orgId = req.user?.org_id || null;
  next();
}

/* Resource egasi tekshirish */
export function requireOwnership(table) {
  return async (req, res, next) => {
    try {
      const resource = await getOne(`SELECT user_id, org_id FROM ${table} WHERE id = $1`, [req.params.id]);
      if (!resource) throw new NotFoundError(`${table} not found`);

      // Admin hamma narsani ko'ra oladi
      if (req.user.role === 'admin') return next();

      // Owner faqat o'z org'sini ko'ra oladi
      if (req.user.role === 'owner' && resource.org_id === req.user.org_id) return next();

      // User faqat o'z resursini ko'ra oladi
      if (resource.user_id === req.user.id) return next();

      throw new ForbiddenError('Access denied');
    } catch (error) {
      next(error);
    }
  };
}
