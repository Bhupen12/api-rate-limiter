import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { API_RESPONSES } from '../constants';

export class HealthController {
  public check = async (req: Request, res: Response): Promise<void> => {
    try {
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
      };

      res.status(200).json(healthData);
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: API_RESPONSES.SYSTEM_ERRORS.HEALTH_CHECK_FAILED,
      });
    }
  };

  public readiness = async (req: Request, res: Response): Promise<void> => {
    // Add readiness checks here (database connections, external services, etc.)
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  };

  public liveness = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  };
}
