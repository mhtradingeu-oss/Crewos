import rateLimit from "express-rate-limit";

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_LIMIT = 100;

/**
 * Lightweight rate limiter wrapper. TODO: Phase 3 – move to Redis/multi-node store.
 */
export function createRateLimiter(options?: { windowMs?: number; limit?: number }) {
  return rateLimit({
    windowMs: options?.windowMs ?? DEFAULT_WINDOW_MS,
    limit: options?.limit ?? DEFAULT_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
  });
}
