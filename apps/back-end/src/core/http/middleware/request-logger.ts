import type { Request, Response, NextFunction } from "express";
import { logger } from "../../logger.js";

function sanitizePath(originalUrl: string): string {
  const path = originalUrl.split("?")[0] ?? "/";
  if (path.startsWith("/api/v1/auth")) {
    return "/api/v1/auth/*";
  }
  return path;
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const label = sanitizePath(req.originalUrl);
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${label} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
}
