import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            const envKey = key?.trim();
            const envValue = valueParts.join('=').trim();
            // 이미 설정된 환경변수는 덮어쓰지 않음 (CLI/테스트 주입값 우선)
            if (envKey && envValue !== undefined && !(envKey in process.env)) {
                process.env[envKey] = envValue;
            }
        }
    }
    console.log('[Config] Loaded .env from:', envPath);
} else {
    console.log('[Config] .env not found at:', envPath);
}

export const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        name: process.env.DB_NAME || 'todolist_dev',
        user: process.env.DB_USER || 'todolist_user',
        password: process.env.DB_PASSWORD || '',
        poolMax: parseInt(process.env.DB_POOL_MAX, 10) || 10,
        poolIdleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT, 10) || 30000,
        poolConnectionTimeout: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT, 10) || 2000,
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'default-secret-change-me',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
};