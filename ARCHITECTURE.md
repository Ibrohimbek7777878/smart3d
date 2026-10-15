# Smart3D — Production Architecture

## 1. Umumiy tuzilma

```
                    ┌─────────────────────────────────────────────────────┐
                    │                    CDN (Cloudflare)                  │
                    │              Static: app/ + assets/                  │
                    └──────────────────────┬──────────────────────────────┘
                                           │
                    ┌──────────────────────▼──────────────────────────────┐
                    │              Load Balancer (Nginx)                  │
                    │         Rate Limit + SSL + Compression              │
                    └──────────────────────┬──────────────────────────────┘
                                           │
          ┌────────────────────────────────┼────────────────────────────────┐
          │                                │                                │
┌─────────▼─────────┐          ┌──────────▼──────────┐          ┌──────────▼─────────┐
│   Node.js #1      │          │   Node.js #2        │          │   Node.js #N       │
│   (Worker)        │          │   (Worker)          │          │   (Worker)         │
│                   │          │                     │          │                    │
│  - REST API       │◄────────►│  - REST API         │◄────────►│  - REST API        │
│  - WebSocket      │  Redis   │  - WebSocket        │  Redis   │  - WebSocket       │
│    (local)        │  Pub/Sub │    (local)          │  Pub/Sub │    (local)         │
└─────────┬─────────┘          └──────────┬──────────┘          └──────────┬─────────┘
          │                               │                               │
          └───────────────────────────────┼───────────────────────────────┘
                                          │
                    ┌─────────────────────▼─────────────────────┐
                    │              Redis Cluster                │
                    │  - Session cache                          │
                    │  - Material cache (TTL 5 min)             │
                    │  - Price cache (TTL 1 min)                │
                    │  - Rate limit counters                    │
                    │  - WebSocket pub/sub                      │
                    └─────────────────────┬─────────────────────┘
                                          │
                    ┌─────────────────────▼─────────────────────┐
                    │         PostgreSQL (Primary + Replica)    │
                    │  - Users, Orders, Materials, Fragments    │
                    │  - Price history                          │
                    │  - Connection pool: 20 per worker         │
                    └─────────────────────┬─────────────────────┘
                                          │
                    ┌─────────────────────▼─────────────────────┐
                    │           S3 / MinIO (Storage)            │
                    │  - Project files (.bpj, .project)         │
                    │  - Exports (OBJ, DXF, NC)                 │
                    │  - Renders (PNG, JPG)                     │
                    └───────────────────────────────────────────┘
```

## 2. Masshtab strategiyasi (Scalability)

### 2.1 Horizontal scaling (ko'paytirish)

```bash
# Har bir serverda CPU core sonida worker
# Masalan: 8 core → 8 worker process

# ecosystem.config.cjs (PM2)
module.exports = {
  apps: [{
    name: 'smart3d-api',
    script: 'index.js',
    instances: 'max',        // CPU core soni
    exec_mode: 'cluster',    // Cluster mode
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### 2.2 Database connection pooling

```javascript
// db.js
import pg from 'pg';
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Har bir worker uchun
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Read replica (yozuv → primary, o'qish → replica)
export const readPool = new Pool({
  connectionString: process.env.DATABASE_READ_URL,
  max: 30,
});
```

### 2.3 Redis caching

```javascript
// cache.js
import Redis from 'ioredis';
export const redis = new Redis(process.env.REDIS_URL);

// Material cache (TTL 5 min)
export async function getCachedMaterial(id) {
  const key = `mat:${id}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const material = await db.prepare('SELECT * FROM materials WHERE id = ?').get(id);
  if (material) await redis.setex(key, 300, JSON.stringify(material));
  return material;
}

// Price cache (TTL 1 min) — tez yangilanadi
export async function getCachedPrice(id) {
  const key = `price:${id}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const price = await db.prepare('SELECT uzs, usd FROM materials WHERE id = ?').get(id);
  if (price) await redis.setex(key, 60, JSON.stringify(price));
  return price;
}
```

## 3. Isolatsiya (Bir qism osa boshqasga ta'sir qilmasin)

### 3.1 Circuit Breaker

```javascript
// circuit-breaker.js
class CircuitBreaker {
  constructor(failureThreshold = 5, recoveryTimeout = 30000) {
    this.failures = 0;
    this.state = 'CLOSED';  // CLOSED, OPEN, HALF_OPEN
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
    this.lastFailureTime = null;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker OPEN');
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

// Ishlatish
const dbBreaker = new CircuitBreaker(5, 30000);
const material = await dbBreaker.execute(() => 
  db.prepare('SELECT * FROM materials WHERE id = ?').get(id)
);
```

### 3.2 Bulkhead Pattern (departmentlar)

```javascript
// bulkhead.js — Har bir xizmat uchun alohida limit
const BULKHEADS = {
  api: { maxConcurrent: 100, queue: 50 },      // REST API
  ws: { maxConcurrent: 1000, queue: 200 },     // WebSocket
  export: { maxConcurrent: 20, queue: 10 },    // Export (og'ir)
  search: { maxConcurrent: 50, queue: 25 },    // Qidiruv
};

class Bulkhead {
  constructor(name) {
    this.config = BULKHEADS[name];
    this.active = 0;
    this.queue = [];
  }

  async execute(fn) {
    if (this.active >= this.config.maxConcurrent) {
      if (this.queue.length >= this.config.queue) {
        throw new Error('Bulkhead full');
      }
      return new Promise((resolve, reject) => {
        this.queue.push({ fn, resolve, reject });
      });
    }
    return this.run(fn);
  }

  async run(fn) {
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        this.run(next.fn).then(next.resolve).catch(next.reject);
      }
    }
  }
}
```

### 3.3 Timeout har bir request uchun

```javascript
// timeout.js
function withTimeout(promise, ms, name = 'request') {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${name} timeout (${ms}ms)`)), ms)
    )
  ]);
}

// Ishlatish
const material = await withTimeout(
  db.prepare('SELECT * FROM materials WHERE id = ?').get(id),
  5000,
  'material-query'
);
```

## 4. Rate Limiting

```javascript
// rate-limit.js
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

export const apiLimiter = rateLimit({
  store: new RedisStore({ client: redis }),
  windowMs: 60 * 1000,      // 1 daqiqa
  max: 100,                  // Har user uchun 100 request
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Limit oshdi' }
});

export const searchLimiter = rateLimit({
  store: new RedisStore({ client: redis }),
  windowMs: 60 * 1000,
  max: 30,                   // Qidiruv: 30/min
  keyGenerator: (req) => req.user?.id || req.ip
});

export const exportLimiter = rateLimit({
  store: new RedisStore({ client: redis }),
  windowMs: 60 * 1000,
  max: 5,                    // Export: 5/min (og'ir)
  keyGenerator: (req) => req.user?.id || req.ip
});
```

## 5. WebSocket (multi-instance)

```javascript
// ws.js — Redis pub/sub bilan
import { WebSocketServer } from 'ws';
import Redis from 'ioredis';

const pub = new Redis(process.env.REDIS_URL);
const sub = new Redis(process.env.REDIS_URL);

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  // Har bir client uchun channel
  sub.subscribe('price_updates');
  sub.on('message', (channel, message) => {
    wss.clients.forEach(client => {
      if (client.readyState === 1) client.send(message);
    });
  });

  wss.on('connection', (ws) => {
    ws.on('message', async (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'subscribe_price') {
        // Material narxini kuzatish
        ws.subscriptions = ws.subscriptions || new Set();
        ws.subscriptions.add(msg.material_id);
      }
    });
  });

  return wss;
}

// Narx yangilashda barcha worker'larga yuborish
export async function broadcastPrice(materialId, uzs, usd) {
  await pub.publish('price_updates', JSON.stringify({
    type: 'price_update',
    material_id: materialId,
    uzs,
    usd,
    ts: Date.now()
  }));
}
```

## 6. Monitoring

```javascript
// monitoring.js
import promClient from 'prom-client';

// Metrikalar
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Active WebSocket connections'
});

const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['query']
});

// Middleware
export function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || req.path, status: res.statusCode });
  });
  next();
}
```

## 7. Nginx konfiguratsiya

```nginx
# /etc/nginx/sites-available/smart3d
upstream smart3d_backend {
    least_conn;
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
    keepalive 32;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=search:10m rate=30r/m;

server {
    listen 443 ssl http2;
    server_name smart3d.uz;
    
    ssl_certificate /etc/letsencrypt/live/smart3d.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/smart3d.uz/privkey.pem;
    
    # Gzip
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
    
    # Static (CDN ga topshiriladi)
    location / {
        proxy_pass http://smart3d_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # API rate limit
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://smart3d_backend;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://smart3d_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_read_timeout 86400;
    }
}
```

## 8. Deploy skripti

```bash
#!/bin/bash
# deploy.sh

# 1. Code yangilash
git pull origin main

# 2. Dependencies
cd server && npm ci --production

# 3. DB migration
npm run migrate

# 4. PM2 restart (zero-downtime)
pm2 reload ecosystem.config.cjs

# 5. Health check
sleep 5
curl -f http://localhost:3000/api/health || exit 1

echo "Deploy OK"
```

## 9. Resurs hisobi (1 million user)

| Parametr | Qiymat |
|----------|--------|
| Concurrent user | ~10,000 (1%) |
| Request/second | ~50,000 |
| WebSocket connections | ~50,000 |
| DB connections | 20 × 8 worker = 160 |
| Redis memory | ~2 GB |
| RAM (Node.js) | 512 MB × 8 = 4 GB |
| CPU | 8 core × 3 GHz |
| Disk (DB) | ~50 GB |
| Bandwidth | ~100 Mbps |

## 10. Xavfsizlik

```javascript
// security.js
import helmet from 'helmet';
import cors from 'cors';

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));

// SQL injection himoyasi (parameterized queries)
db.prepare('SELECT * FROM materials WHERE id = ?').get(id);  // ✅

// XSS himoyasi
import xss from 'xss-clean';
app.use(xss());

// CSRF token
import csrf from 'csurf';
app.use(csrf({ cookie: true }));
```
