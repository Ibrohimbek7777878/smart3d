/* ═══════════════════ AUDIT MIDDLEWARE ═══════════════════ */
import { query } from '../db.js';
import { logAudit } from '../logger.js';

/* Audit log yozish */
export async function audit(action, entityType, entityId, oldValue, newValue, req) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, org_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        req.user?.id || null,
        req.user?.org_id || null,
        action,
        entityType,
        entityId,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        req.ip,
        req.headers?.['user-agent'] || '',
      ]
    );
    logAudit(action, req.user?.id, req.user?.org_id, entityType, entityId, oldValue, newValue, req);
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

/* Audit middleware (auto) */
export function auditMiddleware(entityType) {
  return async (req, res, next) => {
    // Response'dan keyin audit yozish
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.method !== 'GET') {
        const action = req.method === 'POST' ? 'create' : req.method === 'PUT' || req.method === 'PATCH' ? 'update' : 'delete';
        const entityId = req.params.id || data?.id || '';
        audit(action, entityType, entityId, req.oldValue || null, data, req);
      }
      return originalJson(data);
    };
    next();
  };
}
