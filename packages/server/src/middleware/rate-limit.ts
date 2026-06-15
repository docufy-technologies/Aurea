import { Request, Response, NextFunction } from "express";
import { ApiErrorResponse } from "@aurea/shared";

interface FailedAttemptsStore {
  attempts: number;
  lockedUntil: number | null;
}

const failedIpStore = new Map<string, FailedAttemptsStore>();

/**
 * Increments the count of failed login attempts from a given IP.
 * Locks the IP for 30 minutes if failed attempts reach or exceed 5.
 */
export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = failedIpStore.get(ip);

  if (!record) {
    failedIpStore.set(ip, { attempts: 1, lockedUntil: null });
  } else {
    record.attempts += 1;
    if (record.attempts >= 5) {
      record.lockedUntil = now + 30 * 60 * 1000; // 30 minutes lockout
    }
  }
}

/**
 * Resets failed login attempt counts for a successful login IP.
 */
export function clearFailedAttempts(ip: string): void {
  failedIpStore.delete(ip);
}

/**
 * Express middleware that blocks login requests from an IP if it has failed 5 times
 * within the lock duration.
 */
export function loginIpRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const record = failedIpStore.get(ip);

  if (record && record.lockedUntil) {
    if (now < record.lockedUntil) {
      const remainingMinutes = Math.ceil(
        (record.lockedUntil - now) / (60 * 1000),
      );
      const response: ApiErrorResponse = {
        success: false,
        error: {
          code: "ACCOUNT_LOCKED",
          message: `Too many failed attempts from this IP. Please try again in ${remainingMinutes} minutes.`,
          details: {
            lockedUntil: new Date(record.lockedUntil).toISOString(),
          },
        },
      };
      res.status(429).json(response);
      return;
    } else {
      // Lockout expired, clear record
      failedIpStore.delete(ip);
    }
  }

  next();
}
