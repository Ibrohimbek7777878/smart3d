/* ISHLATILMAYDI (TZ-07, 2026-10-15): ishlaydigan server — index.js (SQLite). Bu PostgreSQL varianti
   ishga tushmaydi (AUDIT-2026-10-14 §5); o'chirilmagan, faqat belgilangan. */
/* Smart3D Production Backend — Masshtablanadigan architektura
 * 
 * Xususiyatlar:
 * - PostgreSQL + connection pool
 * - Redis cache + rate limit + pub/sub
 * - Cluster mode (CPU core sonida)
 * - Circuit breaker + bulkhead (isolatsiya)
 * - WebSocket (multi-instance)
 * - Monitoring (Prometheus metrics)
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import Redis from 'ioredis';
import promClient from 'prom-client';
import rateLimit from 'express-rate-limit';

const { Pool } = pg;

/* ═══════════════════ CONFIG ═══════════════════ */
const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  databaseUrl: process.env.DATABASE_URL || 'postgres://localhost:5432/smart3d',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:8811'],
  workers: process.env.WORKERS || 4,
};

/* ═══════════════════ MONITORING ═══════════════════ */
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

const activeConnections = new promClient.Gauge({
  name: 'websocket_connections',
  help: 'Active WebSocket connections',
  registers: [register],
});

const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['query'],
  registers: [register],
});

/* ═══════════════════ DB (PostgreSQL + Pool) ═══════════════════ */
const dbPool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/* ═══════════════════ REDIS ═══════════════════ */
const redis = new Redis(config.redisUrl);
const redisSub = new Redis(config.redisUrl);

/* ═══════════════════ CIRCUIT BREAKER ═══════════════════ */
class CircuitBreaker {
  constructor(failureThreshold = 5, recoveryTimeout = 30000) {
    this.failures = 0;
    this.state = 'CLOSED';
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
    this.lastFailureTime = null;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Service unavailable (circuit open)');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

const dbBreaker = new CircuitBreaker(5, 30000);

/* ═══════════════════ BULKHEAD ═══════════════════ */
class Bulkhead {
  constructor(name, maxConcurrent, maxQueue) {
    this.name = name;
    this.maxConcurrent = maxConcurrent;
    this.maxQueue = maxQueue;
    this.active = 0;
    this.queue = [];
  }

  async execute(fn) {
    if (this.active >= this.maxConcurrent) {
      if (this.queue.length >= this.maxQueue) {
        throw new Error(`Bulkhead ${this.name} full`);
      }
      return new Promise((resolve, reject) => {
        this.queue.push({ fn, resolve, reject });
      });
    }
    return this._run(fn);
  }

  async _run(fn) {
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        this._run(next.fn).then(next.resolve).catch(next.reject);
      }
    }
  }
}

const bulkheads = {
  api: new Bulkhead('api', 100, 50),
  search: new Bulkhead('search', 50, 25),
  export: new Bulkhead('export', 20, 10),
};

/* ═══════════════════ TIMEOUT ═══════════════════ */
function withTimeout(promise, ms, name = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${name} timeout (${ms}ms)`)), ms)
    ),
  ]);
}

/* ═══════════════════ CACHE ═══════════════════ */
async function getCachedMaterial(id) {
  const key = `mat:${id}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const result = await dbBreaker.execute(() =>
    withTimeout(dbPool.query('SELECT * FROM materials WHERE id = $1', [id]), 5000, 'material-query')
  );
  const material = result.rows[0];
  if (material) await redis.setex(key, 300, JSON.stringify(material));
  return material;
}

async function getCachedPrice(id) {
  const key = `price:${id}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const result = await dbBreaker.execute(() =>
    withTimeout(dbPool.query('SELECT uzs, usd FROM materials WHERE id = $1', [id]), 3000, 'price-query')
  );
  const price = result.rows[0];
  if (price) await redis.setex(key, 60, JSON.stringify(price));
  return price;
}

/* ═══════════════════ EXPRESS APP ═══════════════════ */
const app = express();
app.use(helmet());
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: '10mb' }));

/* Metrics middleware */
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || req.path, status: res.statusCode });
  });
  next();
});

/* Rate limiters */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Rate limit exceeded' },
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id || req.ip,
});

const exportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.user?.id || req.ip,
});

/* ═══════════════════ AUTH ═══════════════════ */
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token required' });
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

/* ═══════════════════ AUTH API ═══════════════════ */
app.post('/api/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const exists = await dbPool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (exists.rows.length > 0) return res.status(409).json({ error: 'Email already exists' });

  const hash = await bcrypt.hash(password, 10);
  const result = await dbPool.query(
    'INSERT INTO users (name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [name || '', email, phone || '', hash, 'user']
  );

  const token = jwt.sign({ id: result.rows[0].id, email, role: 'user' }, config.jwtSecret, { expiresIn: '30d' });
  res.json({ token, user: { id: result.rows[0].id, name, email, role: 'user' } });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await dbPool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, config.jwtSecret, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get('/api/me', auth, async (req, res) => {
  const result = await dbPool.query('SELECT id, name, email, phone, role FROM users WHERE id = $1', [req.user.id]);
  res.json(result.rows[0]);
});

/* ═══════════════════ MATERIAL API ═══════════════════ */
app.get('/api/materials', searchLimiter, async (req, res) => {
  const { q, cat_code, type, limit } = req.query;

  const result = await bulkheads.search.execute(() =>
    withTimeout(
      dbPool.query(
        `SELECT * FROM materials WHERE 1=1
         ${cat_code ? 'AND cat_code = $1' : ''}
         ${type ? 'AND type = $2' : ''}
         ${q ? 'AND (id = $3 OR sku ILIKE $4 OR name ILIKE $5 OR search_text ILIKE $6)' : ''}
         ORDER BY uzs DESC LIMIT $7`,
        [
          cat_code, type, q, `%${q}%`, `%${q}%`, `%${q?.toLowerCase()}%`,
          Math.min(parseInt(limit) || 100, 500),
        ].filter(v => v !== undefined)
      ),
      5000,
      'materials-search'
    )
  );

  res.json(result.rows);
});

app.get('/api/materials/:id', async (req, res) => {
  const material = await getCachedMaterial(req.params.id);
  if (!material) return res.status(404).json({ error: 'Not found' });
  res.json(material);
});

app.put('/api/materials/:id/price', auth, adminOnly, async (req, res) => {
  const { uzs, usd } = req.body;
  const old = await getCachedMaterial(req.params.id);
  if (!old) return res.status(404).json({ error: 'Not found' });

  await dbPool.query('UPDATE materials SET uzs = $1, usd = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [uzs, usd || 0, req.params.id]);
  await dbPool.query('INSERT INTO price_history (material_id, old_uzs, new_uzs, old_usd, new_usd, changed_by) VALUES ($1, $2, $3, $4, $5, $6)', [req.params.id, old.uzs, uzs, old.usd, usd || 0, req.user.id]);

  /* Cache invalidation */
  await redis.del(`mat:${req.params.id}`);
  await redis.del(`price:${req.params.id}`);

  /* WebSocket broadcast */
  await redis.publish('price_updates', JSON.stringify({
    type: 'price_update',
    material_id: req.params.id,
    uzs,
    usd,
    ts: Date.now(),
  }));

  res.json({ ok: true, old: old.uzs, new: uzs });
});

/* ═══════════════════ FRAGMENT API ═══════════════════ */
app.get('/api/fragments', async (req, res) => {
  const result = await dbPool.query('SELECT * FROM fragments ORDER BY code');
  res.json(result.rows);
});

app.get('/api/fragments/:code', async (req, res) => {
  const result = await dbPool.query('SELECT * FROM fragments WHERE code = $1', [req.params.code]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
});

/* ═══════════════════ ORDER API ═══════════════════ */
app.post('/api/orders', auth, async (req, res) => {
  const { client_name, client_phone, client_email, room, placements, total_price, notes } = req.body;
  const result = await dbPool.query(
    `INSERT INTO orders (user_id, client_name, client_phone, client_email, room_json, placements_json, total_price, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [req.user.id, client_name || '', client_phone || '', client_email || '',
     JSON.stringify(room || {}), JSON.stringify(placements || []), total_price || 0, notes || '']
  );
  res.json({ id: result.rows[0].id, ok: true });
});

app.get('/api/orders', auth, async (req, res) => {
  const result = await dbPool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
  res.json(result.rows.map(o => ({
    ...o,
    room: JSON.parse(o.room_json || '{}'),
    placements: JSON.parse(o.placements_json || '[]'),
  })));
});

/* ═══════════════════ PRICE HISTORY ═══════════════════ */
app.get('/api/prices/history/:materialId', async (req, res) => {
  const result = await dbPool.query(
    'SELECT * FROM price_history WHERE material_id = $1 ORDER BY changed_at DESC LIMIT 50',
    [req.params.materialId]
  );
  res.json(result.rows);
});

/* ═══════════════════ HEALTH ═══════════════════ */
app.get('/api/health', async (req, res) => {
  const [users, mats, orders] = await Promise.all([
    dbPool.query('SELECT COUNT(*) as n FROM users'),
    dbPool.query('SELECT COUNT(*) as n FROM materials'),
    dbPool.query('SELECT COUNT(*) as n FROM orders'),
  ]);
  res.json({
    ok: true,
    users: users.rows[0].n,
    materials: mats.rows[0].n,
    orders: orders.rows[0].n,
    uptime: process.uptime(),
    circuitBreaker: dbBreaker.state,
  });
});

/* ═══════════════════ METRICS ═══════════════════ */
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

/* ═══════════════════ WEBSOCKET ═══════════════════ */
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

/* Redis pub/sub → WebSocket broadcast */
redisSub.subscribe('price_updates');
redisSub.on('message', (channel, message) => {
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(message);
  });
});

wss.on('connection', (ws) => {
  activeConnections.inc();
  ws.on('close', () => activeConnections.dec());

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
    } catch (e) { /* ignore */ }
  });

  ws.send(JSON.stringify({ type: 'connected', ts: Date.now() }));
});

/* ═══════════════════ START ═══════════════════ */
server.listen(config.port, () => {
  console.log(`Smart3D Production Server: http://localhost:${config.port}`);
  console.log(`WebSocket: ws://localhost:${config.port}/ws`);
  console.log(`Metrics: http://localhost:${config.port}/metrics`);
  console.log(`Workers: ${config.workers}`);
});
