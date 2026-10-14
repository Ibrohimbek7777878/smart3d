/* ═══════════════════ RATE LIMITING (Redis) ═══════════════════ */
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../redis.js';
import config from '../config.js';

/* Umumiy API limit */
export const apiLimiter = rateLimit({
  store: new RedisStore({ client: redis, prefix: 'rl:api:' }),
  windowMs: config.rateLimit.api.windowMs,
  max: config.rateLimit.api.max,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Rate limit exceeded', code: 'RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
});

/* Qidiruv limit */
export const searchLimiter = rateLimit({
  store: new RedisStore({ client: redis, prefix: 'rl:search:' }),
  windowMs: config.rateLimit.search.windowMs,
  max: config.rateLimit.search.max,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Search rate limit exceeded', code: 'RATE_LIMIT' },
});

/* Export limit (og'ir) */
export const exportLimiter = rateLimit({
  store: new RedisStore({ client: redis, prefix: 'rl:export:' }),
  windowMs: config.rateLimit.export.windowMs,
  max: config.rateLimit.export.max,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Export rate limit exceeded', code: 'RATE_LIMIT' },
});

/* Auth limit (brute force himoyasi) */
export const authLimiter = rateLimit({
  store: new RedisStore({ client: redis, prefix: 'rl:auth:' }),
  windowMs: config.rateLimit.auth.windowMs,
  max: config.rateLimit.auth.max,
  keyGenerator: (req) => req.ip,
  message: { error: 'Too many attempts', code: 'RATE_LIMIT' },
});
