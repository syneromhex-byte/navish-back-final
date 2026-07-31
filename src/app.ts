import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { env } from './config/env';
import { httpLoggerMiddleware } from './middleware/logger.middleware';
import { errorHandler } from './middleware/error.middleware';
import { corsConfig, rateLimiter } from './config/security';
import apiRouter from './routes/index.routes';

const app = express();

// ── BigInt JSON Serialization Polyfill ────────────────────────────────────────
(BigInt.prototype as any).toJSON = function () {
  const num = Number(this);
  return Number.isSafeInteger(num) ? num : this.toString();
};

import path from 'path';

// ── Basic Middlewares ────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// ── CORS & Security ──────────────────────────────────────────────────────────
app.use(corsConfig);
app.options('*', corsConfig);
app.use('/storage', express.static(path.join(__dirname, '../storage'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
}));

// Apply global HTTP rate limiting
app.use(rateLimiter);

// HTTP Access Logging via morgan & winston
app.use(httpLoggerMiddleware);

// ── Swagger Docs ─────────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── API Router ───────────────────────────────────────────────────────────────
app.use('/api/v1', apiRouter);

// Fallback 404 Route
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      status: 404,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
});

// Global central Error Handler
app.use(errorHandler);

export default app;
