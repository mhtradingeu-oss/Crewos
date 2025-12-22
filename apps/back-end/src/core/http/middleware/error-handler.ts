import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../errors.js";
import { isProdLikeEnv } from "../../config/env.js";
import { logger } from "../../logger.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    const sanitizedDetails = isProdLikeEnv ? null : err.details ?? null;
    return res.status(err.status).json({
      success: false,
      error: {
        code: err.code ?? "ERROR",
        message: err.message,
        details: sanitizedDetails,
      },
    });
  }

  logger.error("Unhandled error", err);
  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal Server Error",
    },
  });
}
