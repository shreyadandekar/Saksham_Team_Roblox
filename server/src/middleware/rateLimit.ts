/**
 * src/middleware/rateLimit.ts
 * In-memory sliding window rate limiter for brute-force protection on authentication endpoints.
 * Returns 429 Too Many Requests when limits are exceeded, without revealing account state.
 */

import { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const loginAttempts = new Map<string, RateLimitRecord>();

export interface RateLimitOptions {
  windowMs?: number; // default: 15 minutes
  maxAttempts?: number; // default: 5 attempts
}

export function createLoginRateLimiter(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const maxAttempts = options.maxAttempts ?? 5;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Derive client IP safely
    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      typeof forwarded === "string"
        ? forwarded.split(",")[0].trim()
        : req.socket.remoteAddress || "127.0.0.1";

    const now = Date.now();
    const record = loginAttempts.get(ip);

    if (record) {
      if (now > record.resetAt) {
        // Window expired, reset counter
        loginAttempts.set(ip, { count: 1, resetAt: now + windowMs });
      } else if (record.count >= maxAttempts) {
        const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
        res.setHeader("Retry-After", String(retryAfterSeconds));
        res.status(429).json({
          error: "Too Many Requests",
          message: "Too many login attempts. Please try again later.",
          retryAfterSeconds,
        });
        return;
      } else {
        record.count += 1;
      }
    } else {
      loginAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    }

    next();
  };
}

/**
 * Clear the rate limiter record for a given request's IP (called on successful authentication)
 */
export function clearLoginAttempt(req: Request): void {
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    typeof forwarded === "string"
      ? forwarded.split(",")[0].trim()
      : req.socket.remoteAddress || "127.0.0.1";
  loginAttempts.delete(ip);
}

/**
 * Utility for automated test suites to reset rate limiter state.
 */
export function resetLoginRateLimiter(): void {
  loginAttempts.clear();
}
