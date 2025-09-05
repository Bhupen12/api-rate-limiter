import { createApp } from './app';
import { config } from './config';
import { RedisConnection } from './middleware/redis.middleware';
import { logger } from './utils/logger.utils';

const PORT = config.server.port;
const HOST = config.server.host;

async function startServer(): Promise<void> {
  try {
    try {
      await RedisConnection.getClient();
      logger.info('Redis initialized at startup');
    } catch (err) {
      logger.error('Failed to initialize Redis at startup, exiting', err);
      process.exit(1);
    }

    const app = await createApp();

    const server = app.listen(PORT, HOST, () => {
      logger.info(`🚀 API Gateway server running on http://${HOST}:${PORT}`);
      logger.info(`📚 Health check available at http://${HOST}:${PORT}/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string): void => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
