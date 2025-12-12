import type { Response, NextFunction } from "express";
import { verifyToken } from "./jwt.js";
import type { AuthenticatedRequest } from "../http/http-types.js";
import { unauthorized, forbidden } from "../http/errors.js";
import { readSessionToken } from "./session-cookie.js";

const PUBLIC_PATH_PREFIXES = [
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/csrf",
  "/api/v1/auth/password/forgot",
  "/health",
] as const;

export function authenticateRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (isPublicPath(req)) {
    return next();
  }

  const token = readSessionToken(req);
  if (!token) {
    return next(unauthorized());
  }

  const payload = verifyToken(token);
  if (!payload) {
    return next(unauthorized());
  }

  req.user = payload;
  return next();
}

function isPublicPath(req: AuthenticatedRequest) {
  const pathname = (req.path || req.originalUrl || "").split("?")[0] ?? "";
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(forbidden());
    }
    return next();
  };
}
