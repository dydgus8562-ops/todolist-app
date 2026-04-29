import app from './app.js';
import { config } from './config/index.js';
import { testConnection } from './config/db.js';

const PORT = config.port;

try {
  await testConnection();
} catch {
  console.warn('[Server] DB connection failed, starting server without DB');
}

const server = app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT} (${config.nodeEnv})`);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });

export default server;
