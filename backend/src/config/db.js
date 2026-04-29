import pg from 'pg';
import { config } from './index.js';

const pool = new pg.Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  max: config.db.poolMax,
  idleTimeoutMillis: config.db.poolIdleTimeout,
  connectionTimeoutMillis: config.db.poolConnectionTimeout,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err.message);
});

export async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    console.log(`[DB] Query executed in ${Date.now() - start}ms`);
    return result;
  } catch (err) {
    console.error('[DB] Query error:', err.message);
    throw err;
  }
}

export async function getClient() {
  const client = await pool.connect();
  const originalRelease = client.release.bind(client);

  const timeout = setTimeout(() => {
    console.warn('[DB] Client has been checked out for more than 5 seconds!');
  }, 5000);

  client.release = () => {
    clearTimeout(timeout);
    return originalRelease();
  };

  return client;
}

export async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('[DB] Connection established successfully');
    client.release();
  } catch (err) {
    console.error('[DB] Failed to connect to database:', err.message);
    throw err;
  }
}

export { pool };
