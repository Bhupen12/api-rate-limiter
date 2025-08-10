import express, { Application } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { corsMiddleware } from './middleware/cors.middleware';
import { loggerMiddleware } from './middleware/logger.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { routes } from './routes';
import { logger } from './utils/logger.utils';

export async function createApp(): Promise<Application> {
  const app: Application = express();

  // Security middleware
  app.use(helmet());

  // Compression middleware
  app.use(compression());

  // CORS middleware
  app.use(corsMiddleware);

  // Request logging
  app.use(loggerMiddleware);

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
