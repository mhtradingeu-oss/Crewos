import type { Response, NextFunction } from "express";
import { verifyToken } from "./jwt.js";
import type { AuthenticatedRequest } from "../http/http-types.js";
import { unauthorized, forbidden } from "../http/errors.js";

const AUTH_HEADER_PREFIX = "Bearer ";

export function authenticateRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.header("authorization");
  if (!header?.startsWith(AUTH_HEADER_PREFIX)) {
    return next(unauthorized());
  }

  const token = header.slice(AUTH_HEADER_PREFIX.length).trim();
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

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(forbidden());
    }
    return next();
  };
}
