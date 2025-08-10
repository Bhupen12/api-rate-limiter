// packages/api-gateway/src/validators/rate-limit.validator.ts
import { z } from 'zod';

export const RateLimitConfigSchema = z.object({
  apiKey: z.string().min(1, { message: 'API key is required' }),
  capacity: z
    .number()
    .int({ message: 'Capacity must be an integer' })
    .positive({ message: 'Capacity must be > 0' }),
  refillRate: z
    .number({ error: 'Refill rate must be a number' })
    .positive({ message: 'Refill rate must be > 0' }),
});

export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;
