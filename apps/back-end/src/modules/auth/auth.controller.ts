import type { Request, Response, NextFunction } from "express";
import { respondWithSuccess } from "../../core/http/respond.js";
import { unauthorized } from "../../core/http/errors.js";
import { authService, type AuthInput } from "./auth.service.js";
import type { AuthenticatedRequest } from "../../core/security/rbac.js";
import { clearSessionCookie, issueSessionCookie } from "../../core/security/session-cookie.js";
import { issueCsrfCookie } from "../../core/security/csrf.js";

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body as AuthInput;
    const { session, jwt } = await authService.register(payload);
    issueSessionCookie(res, jwt);
    return respondWithSuccess(res, session, 201);
  } catch (err) {
    return next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body as AuthInput;
    const { session, jwt } = await authService.login(payload);
    issueSessionCookie(res, jwt);
    return respondWithSuccess(res, session);
  } catch (err) {
    return next(err);
  }
}

export async function meHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      return next(unauthorized());
    }
    const sessionResult = await authService.me(req.user.id);
    if (!sessionResult) {
      return next(unauthorized());
    }
    issueSessionCookie(res, sessionResult.jwt);
    return respondWithSuccess(res, sessionResult.session);
  } catch (err) {
    return next(err);
  }
}

export async function logoutHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    clearSessionCookie(res);
    return respondWithSuccess(res, { loggedOut: true });
  } catch (err) {
    return next(err);
  }
}

export async function requestPasswordResetHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body as { email: string };
    await authService.requestPasswordReset(email);
    return respondWithSuccess(res, { message: "If that account exists, password reset instructions are on the way." });
  } catch (err) {
    return next(err);
  }
}

export function csrfTokenHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    issueCsrfCookie(res);
    return res.status(200).json({ success: true });
  } catch (err) {
    return next(err);
  }
}
