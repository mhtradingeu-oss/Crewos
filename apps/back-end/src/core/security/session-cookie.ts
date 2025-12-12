import type { Request, Response } from "express";
import { SESSION_COOKIE_MAX_AGE_SECONDS, SESSION_COOKIE_NAME } from "@mh-os/shared";
import { readCookie } from "./cookies.js";

const isProduction = process.env.NODE_ENV === "production";
const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
};

export function issueSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.cookie(SESSION_COOKIE_NAME, "", {
    ...baseCookieOptions,
    maxAge: 0,
  });
}

export function readSessionToken(req: Request): string | null {
  return readCookie(req, SESSION_COOKIE_NAME);
}
