import compression from 'compression';
import express, { Application } from 'express';
import helmet from 'helmet';
import { corsMiddleware } from './middleware/cors.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { geoBlockMiddleware } from './middleware/geo-block.middleware';
import { IPMiddleware } from './middleware/ip.middleware';
import { loggerMiddleware } from './middleware/logger.middleware';
import { routes } from './routes';
import { logger } from './utils/logger.utils';
import { redisMiddleware } from './middleware/redis.middleware';
import { rateLimiterMiddleware } from './middleware/rate-limiter.middleware';
import { reputationMiddleware } from './middleware/reputation.middleware';

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

  // Unauthenticated, cheap checks. Block malicious actors as early as possible.
  app.use(rateLimiterMiddleware); // Rate limit by IP or API key first.
  app.use(geoBlockMiddleware); // Check whitelists, blacklists, and country blocks.
  app.use(reputationMiddleware); // Check third-party reputation (has own cache).

  // CORS middleware
  app.use(corsMiddleware);

  // Request logging
  app.use(loggerMiddleware);

  // IP address extraction middleware
  app.use(IPMiddleware);

  // Geo-block middleware
  app.use(geoBlockMiddleware);

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
