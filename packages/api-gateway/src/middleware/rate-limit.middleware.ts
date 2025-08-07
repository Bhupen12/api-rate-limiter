import { Response, NextFunction } from 'express';
import {
  acquireToken,
  getBucketInfo,
  acquireTokensBatch,
} from '../services/rate-limiter.service';
import { logger } from '../utils/logger';
import { ApiResponse, AuthRequest, isAuthRequest } from '@monorepo/shared';
import { getRateLimitConfig } from '../config/rate-limit';
import { RateLimitConfig } from '../interfaces/rate-limit.interface';
import {
  HEADER_API_KEY,
  HEADER_RATE_LIMIT_LIMIT,
  HEADER_RATE_LIMIT_REMAINING,
  HEADER_RATE_LIMIT_RESET,
  HEADER_RETRY_AFTER,
} from '../constants/http.constants';
import { RateLimitKeyType } from '../constants/rate-limit.constants';

/**
 * Rate limiting middleware factory
 * Creates middleware that enforces rate limits using Redis-backed leaky bucket algorithm
 *
 * @param config - Rate limiting configuration
 * @returns Express middleware function
 */
export function createRateLimitMiddleware(
  configOverrides: RateLimitConfig = {}
) {
  const finalConfig = getRateLimitConfig(configOverrides);

  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract identifier from x-api-key header or authenticated user
      const apiKey = req.headers[HEADER_API_KEY] as string | undefined;
      const user = isAuthRequest(req) ? req.user : undefined;

      // Determine the rate limiting key
      let keyType: RateLimitKeyType;
      let identifier: string;

      if (apiKey) {
        keyType = RateLimitKeyType.ApiKey;
        identifier = apiKey;
      } else if (user?.id) {
        keyType = RateLimitKeyType.UserId;
        identifier = String(user.id);
      } else {
        keyType = RateLimitKeyType.Ip;
        identifier = req.ip || req.connection.remoteAddress || 'unknown';
      }

      const rateLimitKey = `${finalConfig.keyPrefix}:${keyType}:${identifier}`;
      logger.debug('Rate limiting check', {
        key: rateLimitKey,
        keyType,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        userId: user?.id,
        userEmail: user?.email,
      });

      // Attempt to acquire tokens based on configuration
      let tokenAcquired: boolean;

      if (finalConfig.tokensPerRequest === 1) {
        // Single token acquisition (more efficient)
        tokenAcquired = await acquireToken(
          rateLimitKey,
          finalConfig.capacity,
          finalConfig.refillRate
        );
      } else {
        // Batch token acquisition for multiple tokens per request
        tokenAcquired = await acquireTokensBatch(
          rateLimitKey,
          finalConfig.capacity,
          finalConfig.refillRate,
          finalConfig.tokensPerRequest
        );
      }

      if (!tokenAcquired) {
        // Get current bucket state for Retry-After header calculation
        const bucketInfo = await getBucketInfo(
          rateLimitKey,
          finalConfig.capacity,
          finalConfig.refillRate
        );

        // Calculate retry-after time based on refill rate
        const retryAfterSeconds = Math.ceil(
          bucketInfo.timeUntilNextToken / 1000
        );

        logger.warn('Rate limit exceeded', {
          key: rateLimitKey,
          keyType,
          method: req.method,
          path: req.path,
          userId: user?.id,
          userEmail: user?.email,
          capacity: finalConfig.capacity,
          refillRate: finalConfig.refillRate,
          currentTokens: bucketInfo.currentTokens,
          tokensRequested: finalConfig.tokensPerRequest,
          retryAfter: retryAfterSeconds,
        });

        // Set rate limit headers
        res.set({
          [HEADER_RATE_LIMIT_LIMIT]: finalConfig.capacity.toString(),
          [HEADER_RATE_LIMIT_REMAINING]: bucketInfo.currentTokens.toString(),
          [HEADER_RATE_LIMIT_RESET]: new Date(
            Date.now() + bucketInfo.timeUntilNextToken
          ).toISOString(),
          [HEADER_RETRY_AFTER]: retryAfterSeconds.toString(),
        });

        // Send 429 Too Many Requests response
        res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: retryAfterSeconds,
          limit: finalConfig.capacity,
          remaining: bucketInfo.currentTokens,
          timestamp: new Date().toISOString(),
        } as ApiResponse);

        return;
      }

      // Token acquired successfully - get updated bucket state for headers
      const bucketInfo = await getBucketInfo(
        rateLimitKey,
        finalConfig.capacity,
        finalConfig.refillRate
      );

      // Set rate limit headers for successful requests
      res.set({
        [HEADER_RATE_LIMIT_LIMIT]: finalConfig.capacity.toString(),
        [HEADER_RATE_LIMIT_REMAINING]: Math.max(
          0,
          bucketInfo.currentTokens
        ).toString(),
        HEADER_RATE_LIMIT_RESET: new Date(
          Date.now() + bucketInfo.timeUntilNextToken
        ).toISOString(),
      });

      logger.debug('Rate limit check passed', {
        key: rateLimitKey,
        keyType,
        userId: user?.id,
        userEmail: user?.email,
        tokensRemaining: bucketInfo.currentTokens,
        tokensRequested: finalConfig.tokensPerRequest,
      });

      // Proceed to next middleware
      next();
    } catch (error) {
      logger.error('Rate limiting middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        method: req.method,
        path: req.path,
        userId: req.user?.id,
        userEmail: req.user?.email,
      });

      // In case of rate limiter failure, we fail open (allow request) for better availability
      // but log the error for monitoring
      next();
    }
  };
}

/**
 * Pre-configured rate limiting middleware with default settings
 * Use this for basic rate limiting (100 req/s, 10/s refill)
 */
export const rateLimitMiddleware = createRateLimitMiddleware();

/**
 * Strict rate limiting middleware for sensitive endpoints
 * Lower limits for admin/auth endpoints
 */
export const strictRateLimitMiddleware = createRateLimitMiddleware({
  capacity: 20,
  refillRate: 2,
  keyPrefix: 'strict_rate_limit',
});

/**
 * Lenient rate limiting middleware for public endpoints
 * Higher limits for health checks, public content
 */
export const lenientRateLimitMiddleware = createRateLimitMiddleware({
  capacity: 1000,
  refillRate: 50,
  keyPrefix: 'lenient_rate_limit',
});

/**
 * Role-based rate limiting middleware
 * Different limits based on user roles
 */
export function createRoleBasedRateLimitMiddleware() {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const user = req.user;

    // Determine rate limit config based on user role
    let config: RateLimitConfig;

    switch (user?.role) {
      case 'admin':
        config = {
          capacity: 500,
          refillRate: 50,
          keyPrefix: 'admin_rate_limit',
        };
        break;
      case 'editor':
        config = {
          capacity: 200,
          refillRate: 20,
          keyPrefix: 'editor_rate_limit',
        };
        break;
      case 'moderator':
        config = {
          capacity: 100,
          refillRate: 10,
          keyPrefix: 'moderator_rate_limit',
        };
        break;
      case 'viewer':
        config = {
          capacity: 50,
          refillRate: 5,
          keyPrefix: 'viewer_rate_limit',
        };
        break;
      default:
        // Unauthenticated users get strict limits
        config = {
          capacity: 10,
          refillRate: 1,
          keyPrefix: 'anonymous_rate_limit',
        };
    }

    // Create and execute the rate limit middleware with role-specific config
    const roleBasedMiddleware = createRateLimitMiddleware(config);
    await roleBasedMiddleware(req, res, next);
  };
}

// Type exports for external usage
export type { RateLimitConfig };
