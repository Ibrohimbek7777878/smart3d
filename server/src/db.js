/* ═══════════════════ DB (PostgreSQL Pool) ═══════════════════ */
import pg from 'pg';
import config from '../config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('DB pool error:', err);
});

/* ═══════════════════ Query helper ═══════════════════ */
export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) console.warn(`Slow query (${duration}ms):`, text.slice(0, 100));
  return result;
}

export async function getOne(text, params) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

export async function getMany(text, params) {
  const result = await query(text, params);
  return result.rows;
}

export async function insert(table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
  const result = await query(sql, values);
  return result.rows[0];
}

export async function update(table, id, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const sql = `UPDATE ${table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${keys.length + 1} RETURNING *`;
  const result = await query(sql, [...values, id]);
  return result.rows[0];
}

export async function remove(table, id) {
  const sql = `UPDATE ${table} SET is_deleted = true WHERE id = $1 RETURNING id`;
  const result = await query(sql, [id]);
  return result.rows[0];
}
