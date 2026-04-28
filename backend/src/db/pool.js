import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT, 10) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT, 10) || 2000,
});

pool.on('connect', () => {
    console.log(`[DB] New client connected to PostgreSQL`);
});

pool.on('error', (err) => {
    console.error(`[DB] Unexpected error on idle client:`, err.message);
});

export async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log(`[DB] Query executed in ${duration}ms`);
        return result;
    } catch (error) {
        console.error(`[DB] Query error:`, error.message);
        throw error;
    }
}

export async function getClient() {
    const client = await pool.connect();
    const originalQuery = client.query.bind(client);
    const originalRelease = client.release.bind(client);

    const timeout = setTimeout(() => {
        console.error('[DB] Client has been checked out for more than 5 seconds!');
    }, 5000);

    client.query = (...args) => {
        return originalQuery(...args);
    };

    client.release = () => {
        clearTimeout(timeout);
        return originalRelease();
    };

    return client;
}

export default pool;