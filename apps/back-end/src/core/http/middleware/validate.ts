import type { Request, Response, NextFunction } from "express";
import { badRequest } from "../errors.js";

type SafeParseSuccess = {
  success: true;
  data: unknown;
  error?: undefined;
};

type SafeParseError = {
  success: false;
  data?: undefined;
  error: { flatten(): unknown };
};

type ParsableSchema = {
  safeParse(input: unknown): SafeParseSuccess | SafeParseError;
};

export function validateBody(schema: ParsableSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(badRequest("Validation error", result.error.flatten()));
    }
    req.body = result.data;
    return next();
  };
}
