import compression from 'compression';
import express, { Application } from 'express';
import helmet from 'helmet';
import { corsMiddleware } from './middleware/cors.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { geoPolicyMiddleware } from './middleware/geoPolicy.middleware';
import { IPMiddleware } from './middleware/ip.middleware';
import { loggerMiddleware } from './middleware/logger.middleware';
import { redisMiddleware } from './middleware/redis.middleware';
import { reputationMiddleware } from './middleware/reputation.middleware';
import { routes } from './routes';
import { healthRoutes } from './routes/health.routes';
import { logger } from './utils/logger.utils';
import { metricsMiddleware } from './middleware/metrics.middleware';
import { metricsRoutes } from './routes/metrics.routes';

export async function createApp(): Promise<Application> {
  const app: Application = express();

  // Set trust proxy to true if you are behind a load balancer or reverse proxy
  // This allows Express to trust the X-Forwarded-* headers
  app.set('trust proxy', true);

  // Security middleware
  app.use(helmet());

  // Compression middleware
  app.use(compression());

  // Attach essential data to the request. MUST BE FIRST.
  app.use(IPMiddleware);

  // Attach Redis client for other middleware to use.
  app.use(redisMiddleware);

  // CORS middleware
  app.use(corsMiddleware);

  // Request logging
  app.use(loggerMiddleware);

  // Metrics middleware (captures response time + increments counter)
  app.use(metricsMiddleware);

  // Expose /metrics for Prometheus
  app.use('/metrics', metricsRoutes);

  app.use('/health', healthRoutes);

  // Unauthenticated, cheap checks. Block malicious actors as early as possible.
  app.use(geoPolicyMiddleware); // Check whitelists, blacklists, and country blocks.
  app.use(reputationMiddleware); // Check third-party reputation (has own cache).

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Routes
  app.use('/', routes);

  // Error handling middleware (must be last)
  app.use(errorMiddleware);

  logger.info('Express app configured successfully');

  return app;
}
