/* ISHLATILMAYDI (TZ-07, 2026-10-15): ishlaydigan server — index.js (SQLite). Bu PostgreSQL varianti
   ishga tushmaydi (AUDIT-2026-10-14 §5); o'chirilmagan, faqat belgilangan. */
/* ═══════════════════ SMART3D SERVER ═══════════════════ */
import http from 'http';
import { WebSocketServer } from 'ws';
import config from './config.js';
import app from './app.js';
import { subscribe } from './redis.js';
import { logger, logInfo } from './logger.js';

/* ═══════════════════ HTTP SERVER ═══════════════════ */
const server = http.createServer(app);

/* ═══════════════════ WEBSOCKET ═══════════════════ */
const wss = new WebSocketServer({ server, path: '/ws' });

/* Clientlar ro'yxati */
const clients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  clients.set(clientId, {
    ws,
    ip,
    connectedAt: Date.now(),
    subscriptions: new Set(),
  });

  logInfo('WS connected', { clientId, ip, total: clients.size });

  /* Ping/Pong */
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      switch (msg.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
          break;

        case 'subscribe_price':
          const client = clients.get(clientId);
          if (client) {
            client.subscriptions.add(msg.material_id);
          }
          break;

        case 'unsubscribe_price':
          const client2 = clients.get(clientId);
          if (client2) {
            client2.subscriptions.delete(msg.material_id);
          }
          break;

        default:
          break;
      }
    } catch (e) {
      // Ignore parse errors
    }
  });

  /* Disconnect */
  ws.on('close', () => {
    clients.delete(clientId);
    logInfo('WS disconnected', { clientId, total: clients.size });
  });

  /* Welcome */
  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    ts: Date.now(),
  }));
});

/* ═══════════════════ REDIS SUB → WS BROADCAST ═══════════════════ */
subscribe('price_updates', (message) => {
  broadcastToSubscribers(message.material_id, message);
});

subscribe('notifications', (message) => {
  broadcastAll(message);
});

function broadcastToSubscribers(materialId, data) {
  for (const [clientId, client] of clients) {
    if (client.subscriptions.has(materialId) && client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(data));
    }
  }
}

function broadcastAll(data) {
  for (const [clientId, client] of clients) {
    if (client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(data));
    }
  }
}

/* ═══════════════════ START ═══════════════════ */
server.listen(config.port, () => {
  logInfo('Smart3D Server started', {
    port: config.port,
    env: config.nodeEnv,
    pid: process.pid,
  });

  console.log(`
╔══════════════════════════════════════════════════╗
║           Smart3D Production Server v2.0          ║
╠══════════════════════════════════════════════════╣
║  HTTP:      http://localhost:${config.port}           ║
║  WebSocket: ws://localhost:${config.port}/ws          ║
║  Metrics:   http://localhost:${config.port}/metrics    ║
║  Health:    http://localhost:${config.port}/api/health ║
║  Environment: ${config.nodeEnv.padEnd(36)}║
╚══════════════════════════════════════════════════╝
  `);
});

/* ═══════════════════ GRACEFUL SHUTDOWN ═══════════════════ */
process.on('SIGTERM', async () => {
  logInfo('SIGTERM received, shutting down...');

  server.close(() => {
    logInfo('HTTP server closed');
  });

  // Close WebSocket
  wss.clients.forEach((ws) => ws.close());

  // Close DB pool
  const { pool } = await import('./db.js');
  await pool.end();

  // Close Redis
  const { redis, redisSub, redisPub } = await import('./redis.js');
  redis.disconnect();
  redisSub.disconnect();
  redisPub.disconnect();

  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason });
});

export default server;
