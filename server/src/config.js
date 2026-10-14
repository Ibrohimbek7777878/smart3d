/* ═══════════════════ CONFIG ═══════════════════ */
export default {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'smart3d-secret-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  databaseUrl: process.env.DATABASE_URL || 'postgres://localhost:5432/smart3d',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:8811'],
  // Rate limits
  rateLimit: {
    api: { windowMs: 60000, max: 100 },
    search: { windowMs: 60000, max: 30 },
    export: { windowMs: 60000, max: 5 },
    auth: { windowMs: 900000, max: 10 },  // 15 min, 10 urinish
  },
  // Circuit breaker
  circuitBreaker: { failureThreshold: 5, recoveryTimeout: 30000 },
  // Timeouts (ms)
  timeout: { db: 5000, ai: 30000, export: 60000 },
  // Upload
  upload: { maxSize: 50 * 1024 * 1024, dir: './uploads' },
  // AI
  ai: { provider: process.env.AI_PROVIDER || 'gemini', apiKey: process.env.AI_API_KEY || '' },
  // Voice
  voice: { yandexApiKey: process.env.YANDEX_SPEECH_KEY || '' },
  // Storage
  storage: { type: process.env.STORAGE_TYPE || 'local', s3Bucket: process.env.S3_BUCKET || '' },
};
