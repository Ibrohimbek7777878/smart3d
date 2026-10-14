/* ═══════════════════ REDIS ═══════════════════ */
import Redis from 'ioredis';
import config from '../config.js';

export const redis = new Redis(config.redisUrl);
export const redisSub = new Redis(config.redisUrl);
export const redisPub = new Redis(config.redisUrl);

redis.on('error', (err) => console.error('Redis error:', err));
redis.on('connect', () => console.log('Redis connected'));

/* ═══════════════════ Cache helpers ═══════════════════ */
export async function cacheGet(key) {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function cacheSet(key, value, ttlSeconds = 300) {
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}

export async function cacheDel(key) {
  await redis.del(key);
}

export async function cacheDelPattern(pattern) {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) await redis.del(...keys);
}

/* ═══════════════════ Pub/Sub ═══════════════════ */
export async function publish(channel, message) {
  await redisPub.publish(channel, JSON.stringify(message));
}

export function subscribe(channel, handler) {
  redisSub.subscribe(channel);
  redisSub.on('message', (ch, msg) => {
    if (ch === channel) {
      try {
        handler(JSON.parse(msg));
      } catch (e) {
        console.error('Sub handler error:', e);
      }
    }
  });
}
