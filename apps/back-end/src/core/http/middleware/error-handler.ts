import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../errors.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      error: {
        code: err.code ?? "ERROR",
        message: err.message,
        details: err.details ?? null,
      },
    });
  }

  console.error("Unhandled error", err);
  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal Server Error",
    },
  });
}
