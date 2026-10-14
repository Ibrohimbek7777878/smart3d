/* ═══════════════════ LOGGER (Winston) ═══════════════════ */
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: './logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: './logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

export function logError(message, error, meta = {}) {
  logger.error(message, { error: error?.message, stack: error?.stack, ...meta });
}

export function logInfo(message, meta = {}) {
  logger.info(message, meta);
}

export function logAudit(action, userId, orgId, entityType, entityId, oldValue, newValue, req) {
  logger.info('audit', {
    action,
    userId,
    orgId,
    entityType,
    entityId,
    oldValue,
    newValue,
    ip: req?.ip,
    userAgent: req?.headers?.['user-agent'],
  });
}
