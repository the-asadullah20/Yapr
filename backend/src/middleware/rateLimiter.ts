import { Request, Response, NextFunction } from 'express';
import { cacheClient } from '../config/redis.js';
import { env } from '../config/env.js';

export function createRateLimiter(options: {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
  errorMessage?: string;
}) {
  const windowMs = options.windowMs || env.RATE_LIMIT_WINDOW_MS;
  const maxRequests = options.maxRequests || env.RATE_LIMIT_MAX_REQUESTS;
  const keyPrefix = options.keyPrefix || 'rl:general';
  const errorMessage = options.errorMessage || 'Too many requests, please slow down.';

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const identifier = req.user?.id || req.ip || 'anonymous';
      const key = `${keyPrefix}:${identifier}`;

      const current = await cacheClient.incr(key);
      if (current === 1) {
        // Set expiry on first hit
        await cacheClient.expire(key, Math.ceil(windowMs / 1000));
      }

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));

      if (current > maxRequests) {
        return res.status(429).json({
          error: errorMessage,
          retryAfterSeconds: Math.ceil(windowMs / 1000),
        });
      }

      next();
    } catch {
      // In case of cache errors, fail open to avoid bringing down the app
      next();
    }
  };
}

// Pre-configured rate limiters
export const generalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyPrefix: 'rl:api',
});

export const otpLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 3,
  keyPrefix: 'rl:otp',
  errorMessage: 'Too many OTP requests. Please wait a minute before retrying.',
});

export const yapPostLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15,
  keyPrefix: 'rl:yap',
  errorMessage: 'You are yapping too fast! Please wait a moment.',
});
