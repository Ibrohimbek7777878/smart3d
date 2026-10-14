/* ═══════════════════ ERROR HANDLING ═══════════════════ */
import { logError } from '../logger.js';
import { AppError } from '../errors.js';

/* 404 handler */
export function notFound(req, res, next) {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
}

/* Global error handler */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Internal server error';

  // Log
  if (statusCode >= 500) {
    logError('Server error', err, { url: req.url, method: req.method, userId: req.user?.id });
  }

  // Response
  res.status(statusCode).json({
    error: message,
    code,
    ...(err.details && { details: err.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/* Async wrapper */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
