import Joi from 'joi';

export const rateLimitConfigSchema = Joi.object({
  apiKey: Joi.string().required().trim(),
  capacity: Joi.number().integer().min(1).max(1000).required(),
  refillRate: Joi.number().positive().max(100).required(),
});

export interface RateLimitConfigBody {
  apiKey: string;
  capacity: number;
  refillRate: number;
}
