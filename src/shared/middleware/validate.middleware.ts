import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject } from "zod";
import { AppError } from "../errors/AppError.js";

export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse({ body: req.body, params: req.params, query: req.query });

    if (!parsed.success) {
      return next(new AppError(400, "VALIDATION_ERROR", "Request validation failed", parsed.error.flatten()));
    }

    next();
  };
}

