import { Request, Response } from 'express';
import { success, failure } from '../utils/response.utils';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitConfigSchema } from '../validators/rate-limit.validator';

export class RateLimitController {
  static async updateConfig(req: Request, res: Response) {
    const parsed = RateLimitConfigSchema.safeParse(req.body);
    if (!parsed.success)
      return failure(
        res,
        400,
        parsed.error.issues
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ')
      );

    const data = await RateLimitService.updateConfig(req.redis, parsed.data);
    return success(res, data, 'Rate limit configuration updated successfully');
  }

  static async getConfig(req: Request, res: Response) {
    const defaults = {
      capacity: parseInt(process.env.DEFAULT_CAPACITY || '100', 10),
      refillRate: parseFloat(process.env.DEFAULT_REFILL_RATE || '1'),
    };
    const data = await RateLimitService.getConfig(
      req.redis,
      req.params.apiKey,
      defaults
    );
    return success(res, data);
  }

  static async deleteConfig(req: Request, res: Response) {
    const deleted = await RateLimitService.deleteConfig(
      req.redis,
      req.params.apiKey
    );
    if (!deleted) return failure(res, 404, 'Config not found');
    return success(
      res,
      { apiKey: req.params.apiKey },
      'Config deleted successfully'
    );
  }

  static async listConfigs(req: Request, res: Response) {
    const data = await RateLimitService.listConfigs(req.redis);
    return success(res, { configurations: data, count: data.length });
  }
}
