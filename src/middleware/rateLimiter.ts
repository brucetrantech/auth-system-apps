import rateLimit, { IncrementResponse, Store } from 'express-rate-limit';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { config } from '@/config';
import { TooManyRequestsError } from '@/types';

// Create Redis client for rate limiting
let redisClient: Redis | undefined;

try {
  redisClient = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    db: config.redis.db,
    retryStrategy: (times) => {
      if (times > 3) {
        return null; // Stop retrying
      }
      return Math.min(times * 100, 3000);
    },
  });

  redisClient.on('error', (err) => {
    console.error('Redis rate limiter error:', err);
  });
} catch (error) {
  console.warn('Redis not available, using memory store for rate limiting');
}

/**
 * Custom store adapter to use rate-limiter-flexible with express-rate-limit
 */
class RateLimiterFlexibleStore implements Store {
  private limiter: RateLimiterRedis;

  constructor(limiter: RateLimiterRedis) {
    this.limiter = limiter;
  }

  // async increments(key: string): Promise<IncrementResponse> | IncrementResponse {
  //   try {
  //     const result = await this.limiter.consume(key, 1);
  //     const resetTime = new Date(Date.now() + result.msBeforeNext);
  //     return {
  //       totalHits: this.limiter.points - result.remainingPoints,
  //       resetTime,
  //     };
  //   } catch (rejRes: any) {
  //     // Rate limit exceeded
  //     const resetTime = new Date(Date.now() + rejRes.msBeforeNext);
  //     return {
  //       totalHits: this.limiter.points,
  //       resetTime,
  //     };
  //   }
  // }

  async increment(key: string): Promise<IncrementResponse> {
    try {
      const result = await this.limiter.consume(key, 1);
      const resetTime = new Date(Date.now() + result.msBeforeNext);
      return {
        totalHits: this.limiter.points - result.remainingPoints,
        resetTime,
      };
    } catch (rejRes: any) {
      // Rate limit exceeded
      const resetTime = new Date(Date.now() + rejRes.msBeforeNext);
      return {
        totalHits: this.limiter.points,
        resetTime,
      };
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      await this.limiter.reward(key, 1);
    } catch (error) {
      // Ignore errors on decrement
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await this.limiter.delete(key);
    } catch (error) {
      // Ignore errors on reset
    }
  }
}

/**
 * Create a rate limiter store
 */
function createRateLimiterStore(prefix: string, points: number, windowMs: number): Store | undefined {
  if (!redisClient) {
    return undefined;
  }

  const limiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: prefix,
    points, // Number of requests
    duration: Math.floor(windowMs / 1000), // Duration in seconds
  });

  return new RateLimiterFlexibleStore(limiter);
}

/**
 * General rate limiter for all routes
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimiterStore('rl:general:', 100, 15 * 60 * 1000),
  handler: (req, res) => {
    throw new TooManyRequestsError('Too many requests, please try again later');
  },
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs, // 15 minutes by default
  max: config.security.rateLimitMaxRequests, // 5 requests by default
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  store: createRateLimiterStore(
    'rl:auth:',
    config.security.rateLimitMaxRequests,
    config.security.rateLimitWindowMs
  ),
  handler: (req, res) => {
    throw new TooManyRequestsError(
      'Too many authentication attempts, please try again in 15 minutes'
    );
  },
});

/**
 * Rate limiter for password reset endpoints
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: 'Too many password reset attempts',
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimiterStore('rl:password:', 3, 60 * 60 * 1000),
  handler: (req, res) => {
    throw new TooManyRequestsError('Too many password reset attempts, please try again later');
  },
});

/**
 * Rate limiter for email verification resend
 */
export const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: 'Too many email verification requests',
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimiterStore('rl:email:', 5, 60 * 60 * 1000),
  handler: (req, res) => {
    throw new TooManyRequestsError('Too many email verification requests, please try again later');
  },
});

export default {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
};
