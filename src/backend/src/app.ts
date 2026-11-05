import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { createServer as httpServer } from 'node:http';
import type { Dependencies } from './core/contracts.js';
import { ApiError, errorHandler } from './core/errors.js';
import { asyncRoute } from './core/http.js';
import { authRoutes } from './modules/auth/routes.js';
import { merchantRoutes } from './modules/merchants/routes.js';
import pino from 'pino';
import { mediaRoutes } from './modules/media/routes.js';
import { offerRoutes } from './modules/offers/routes.js';
import { catalogRoutes } from './modules/catalog/routes.js';
import { orderRoutes } from './modules/orders/routes.js';
import { paymentRoutes, gatewayRoutes } from './modules/payments/routes.js';
import { pickupRoutes } from './modules/pickup/routes.js';
import { metricsRoutes } from './modules/metrics/routes.js';
import { complaintRoutes } from './modules/complaints/routes.js';
import { payoutRoutes } from './modules/payouts/routes.js';
import { reviewRoutes } from './modules/reviews/routes.js';
import { notificationRoutes } from './modules/notifications/routes.js';
import { SocketServer } from './modules/notifications/socket-server.js';
export function createApplication(deps: Dependencies) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', deps.config.TRUST_PROXY ? deps.config.TRUST_PROXY.split(',') : false);
  app.use((req, res, next) => {
    res.locals.requestId = randomUUID();
    res.setHeader('X-Request-Id', res.locals.requestId);
    next();
  });
  app.use(helmet());
  const log = pino({ enabled: deps.config.NODE_ENV !== 'test' });
  app.use((req, res, next) => {
    const started = Date.now();
    res.on('finish', () =>
      log.info(
        {
          request_id: res.locals.requestId,
          method: req.method,
          status: res.statusCode,
          duration_ms: Date.now() - started,
        },
        'request',
      ),
    );
    next();
  });
  app.use(
    cors({ origin: deps.config.CORS_ORIGINS.split(',').filter(Boolean), credentials: false }),
  );
  app.use('/api/v1/gateway', gatewayRoutes(deps));
  app.use(express.json({ limit: '64kb' }));
  app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
  app.get(
    '/health/ready',
    asyncRoute(async (_req, res) => {
      try {
        await deps.db.query('SELECT 1');
        res.json({ status: 'ready' });
      } catch {
        throw new ApiError(503, 'NOT_READY', 'Database belum tersedia.');
      }
    }),
  );
  app.use('/api/v1/auth', authRoutes(deps));
  app.use('/api/v1/merchant', merchantRoutes(deps));
  app.use('/api/v1/media', mediaRoutes(deps));
  app.use('/api/v1/offers', offerRoutes(deps));
  app.use('/api/v1/catalog', catalogRoutes(deps));
  app.use('/api/v1/orders', orderRoutes(deps));
  app.use('/api/v1/payments', paymentRoutes(deps));
  app.use('/api/v1/pickup', pickupRoutes(deps));
  app.use('/api/v1/metrics', metricsRoutes(deps));
  app.use('/api/v1/complaints', complaintRoutes(deps));
  app.use('/api/v1/payouts', payoutRoutes(deps));
  app.use('/api/v1/reviews', reviewRoutes(deps));
  app.use('/api/v1/notifications', notificationRoutes(deps));
  app.use((_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'Halaman tidak ditemukan.')));
  app.use(errorHandler);
  return app;
}
export function createServer(deps: Dependencies) {
  const server = httpServer(createApplication(deps));
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return Object.assign(server, { sockets: new SocketServer(server, deps) });
}
