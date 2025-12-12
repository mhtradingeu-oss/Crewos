import rateLimit from "express-rate-limit";
import { emitSecurityEvent } from "../security/security-events.js";

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_LIMIT = 100;
const STRICT_WINDOW_MS = parseInt(process.env.AUTH_STRICT_WINDOW_MS || "900000", 10); // 15min default
const STRICT_LIMIT = parseInt(process.env.AUTH_STRICT_LIMIT || "10", 10); // 10 default

/**
 * Lightweight rate limiter wrapper. TODO: Phase 3 – move to Redis/multi-node store.
 */
export function createRateLimiter(options?: { windowMs?: number; limit?: number; onRateLimit?: (req: any, res: any, next: any) => void }) {
  return rateLimit({
    windowMs: options?.windowMs ?? DEFAULT_WINDOW_MS,
    limit: options?.limit ?? DEFAULT_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    handler: options?.onRateLimit,
  });
}

export function createStrictAuthRateLimiter() {
  return createRateLimiter({
    windowMs: STRICT_WINDOW_MS,
    limit: STRICT_LIMIT,
    onRateLimit: (req, res, _next) => {
      emitSecurityEvent({
        type: "RATE_LIMITED",
        scope: "auth",
        path: req.path,
        ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
        time: new Date().toISOString(),
      });
      res.status(429).json({
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many attempts, please try again later." },
      });
    },
  });
}
