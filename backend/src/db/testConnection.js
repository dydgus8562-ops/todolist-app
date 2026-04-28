import 'dotenv/config';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const baseDir = path.resolve(__dirname, '../..');

console.log('[Test] Base directory:', baseDir);
console.log('[Test] DB_PASSWORD from process.env:', JSON.stringify(process.env.DB_PASSWORD));

const { Pool } = pg;
const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

console.log('[Test] Attempting to connect...');
try {
    const result = await pool.query('SELECT NOW() AS now');
    console.log('[Test] Success! Server time:', result.rows[0].now);
    await pool.end();
    process.exit(0);
} catch (error) {
    console.error('[Test] Failed:', error.message);
    await pool.end();
    process.exit(1);
}