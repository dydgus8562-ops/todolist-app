import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import { corsMiddleware } from './middlewares/cors.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import authRouter from './routes/auth.js';
import categoryRouter from './routes/categories.js';
import taskRouter from './routes/tasks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Swagger JSON 로드
const swaggerPath = path.join(__dirname, '../../swagger/swagger.json');
const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));

const app = express();

// 미들웨어 등록 순서: cors → json → requestLogger
app.use(corsMiddleware);
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

// Swagger UI 등록
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 라우터 등록
app.use('/api/auth', authRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/tasks', taskRouter);

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// 404 핸들러
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } });
});

// 전역 에러 핸들러 (반드시 마지막)
app.use(errorHandler);

export default app;
