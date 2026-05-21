import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '@aurea/shared';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const limitStore = new Map<string, RateLimitStore>();

/**
 * A lightweight, memory-based rate limiting middleware.
 * Prevents endpoint brute-force and request abuse.
 * @param windowMs Time window in milliseconds
 * @param maxRequests Maximum requests allowed in the window
 */
export function rateLimiter(windowMs: number, maxRequests: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    const record = limitStore.get(key);

    if (!record) {
      limitStore.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (now > record.resetTime) {
      // Window expired, reset limit
      limitStore.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    record.count += 1;

    if (record.count > maxRequests) {
      const remainingTime = Math.ceil((record.resetTime - now) / 1000);
      const response: ApiErrorResponse = {
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: `Too many requests from this IP. Please try again in ${remainingTime} seconds.`
        }
      };

      res.status(429).json(response);
      return;
    }

    next();
  };
}
